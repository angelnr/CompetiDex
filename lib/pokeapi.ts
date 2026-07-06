/**
 * Cliente tipado para PokeAPI.
 *
 * Toda llamada a https://pokeapi.co/api/v2 pasa por `pokeapiFetch`, que
 * consulta primero Redis (cache-aside vía `lib/redis.getOrSet`) y solo
 * golpea la API externa en caso de miss. Esto cumple la política de
 * caché del AGENTS.md §4.2 y evita rate-limiting.
 *
 * Ningún componente o ruta debe hacer `fetch` directo a pokeapi.co: debe
 * usar las funciones exportadas aquí o el proxy `/api/pokemon` (que a
 * su vez delega en este módulo).
 */

import { getOrSet } from "@/lib/redis";

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

const BASE_URL = process.env.POKEAPI_BASE ?? "https://pokeapi.co/api/v2";

/** TTL por defecto (24h). Los tipos usan 7d vía `CACHE_TTL.types`. */
const CACHE_TTL = {
  pokemon: 86_400, // 24h
  species: 86_400,
  evolution: 86_400,
  types: 604_800, // 7d
  list: 86_400,
} as const;

const FETCH_TIMEOUT_MS = 8_000;

// ---------------------------------------------------------------------------
// Tipos shared
// ---------------------------------------------------------------------------

export interface NamedAPIResource {
  name: string;
  url: string;
}

export interface NamedAPIResourceList {
  count: number;
  next: string | null;
  previous: string | null;
  results: NamedAPIResource[];
}

export interface APIResource {
  url: string;
}

// ---------------------------------------------------------------------------
// Pokemon
// ---------------------------------------------------------------------------

export interface PokemonTypeSlot {
  slot: number;
  type: NamedAPIResource;
}

export interface PokemonStat {
  base_stat: number;
  effort: number;
  stat: NamedAPIResource;
}

export interface PokemonAbilitySlot {
  is_hidden: boolean;
  slot: number;
  ability: NamedAPIResource;
}

export interface PokemonSprites {
  front_default: string | null;
  front_shiny: string | null;
  front_female: string | null;
  front_shiny_female: string | null;
  back_default: string | null;
  back_shiny: string | null;
  back_female: string | null;
  back_shiny_female: string | null;
  other?: {
    dream_world?: { front_default: string | null; front_female: string | null };
    "official-artwork"?: {
      front_default: string | null;
      front_shiny: string | null;
      front_female: string | null;
    };
    home?: {
      front_default: string | null;
      front_shiny: string | null;
      front_female: string | null;
    };
  };
}

export interface PokemonMoveVersion {
  level_learned_at: number;
  version_group: NamedAPIResource;
  move_learn_method: NamedAPIResource;
}

export interface PokemonMoveSlot {
  move: NamedAPIResource;
  version_group_details: PokemonMoveVersion[];
}

export interface Pokemon {
  id: number;
  name: string;
  base_experience: number | null;
  height: number; // decímetros
  weight: number; // hectogramos
  order: number;
  is_default: boolean;
  species: NamedAPIResource;
  abilities: PokemonAbilitySlot[];
  types: PokemonTypeSlot[];
  stats: PokemonStat[];
  sprites: PokemonSprites;
  moves: PokemonMoveSlot[];
  cries?: { latest: string | null; legacy: string | null };
}

// ---------------------------------------------------------------------------
// PokemonSpecies (flavor text, género, evolution chain ref)
// ---------------------------------------------------------------------------

export interface PokemonSpeciesFlavorText {
  flavor_text: string;
  language: NamedAPIResource;
  version: NamedAPIResource;
}

export interface PokemonSpeciesGenus {
  genus: string;
  language: NamedAPIResource;
}

export interface PokemonSpeciesName {
  name: string;
  language: NamedAPIResource;
}

export interface PokemonSpecies {
  id: number;
  name: string;
  order: number;
  gender_rate: number; // -1 = sin género
  capture_rate: number;
  base_happiness: number;
  is_baby: boolean;
  is_legendary: boolean;
  is_mythical: boolean;
  hatch_counter: number;
  color: NamedAPIResource;
  evolution_chain: { url: string };
  evolves_from_species: NamedAPIResource | null;
  generation: NamedAPIResource;
  names: PokemonSpeciesName[];
  genera: PokemonSpeciesGenus[];
  flavor_text_entries: PokemonSpeciesFlavorText[];
  habitat: NamedAPIResource | null;
}

// ---------------------------------------------------------------------------
// EvolutionChain
// ---------------------------------------------------------------------------

export interface EvolutionDetail {
  item: NamedAPIResource | null;
  trigger: NamedAPIResource | null;
  gender: number | null;
  min_level: number | null;
  min_happiness: number | null;
  min_beauty: number | null;
  min_affection: number | null;
  needs_overworld_rain: boolean;
  time_of_day: string;
  trade_species: NamedAPIResource | null;
  turn_upside_down: boolean;
  known_move: NamedAPIResource | null;
  known_move_type: NamedAPIResource | null;
  location: NamedAPIResource | null;
  held_item: NamedAPIResource | null;
  party_species: NamedAPIResource | null;
  party_type: NamedAPIResource | null;
  relative_physical_stats: number | null;
  method?: string;
}

export interface ChainLink {
  species: NamedAPIResource;
  evolution_details: EvolutionDetail[];
  evolves_to: ChainLink[];
}

export interface EvolutionChain {
  id: number;
  chain: ChainLink;
}

// ---------------------------------------------------------------------------
// Type (para tablas de efectividad)
// ---------------------------------------------------------------------------

export interface TypeRelations {
  no_damage_to: NamedAPIResource[];
  half_damage_to: NamedAPIResource[];
  double_damage_to: NamedAPIResource[];
  no_damage_from: NamedAPIResource[];
  half_damage_from: NamedAPIResource[];
  double_damage_from: NamedAPIResource[];
}

export interface Type {
  id: number;
  name: string;
  damage_relations: TypeRelations;
  pokemon: { slot: number; pokemon: NamedAPIResource }[];
  move_damage_class: NamedAPIResource | null;
  names: { name: string; language: NamedAPIResource }[];
  generation: NamedAPIResource;
}

// ---------------------------------------------------------------------------
// Fetcher cacheado
// ---------------------------------------------------------------------------

class PokeAPIError extends Error {
  readonly status: number;
  readonly endpoint: string;

  constructor(status: number, endpoint: string, message?: string) {
    super(message ?? `PokeAPI ${status} en ${endpoint}`);
    this.name = "PokeAPIError";
    this.status = status;
    this.endpoint = endpoint;
  }
}

async function rawFetch<T>(endpoint: string): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      next: { revalidate: 86_400 },
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new PokeAPIError(res.status, endpoint);
  }
  return (await res.json()) as T;
}

/**
 * Lee de Redis (cache-aside) o golpea PokeAPI en miss.
 * La clave cachea por endpoint exacto, así que `?offset=20&limit=20`
 * es distinto a `?offset=0&limit=20`.
 */
async function pokeapiFetch<T>(
  endpoint: string,
  ttlSeconds: number = CACHE_TTL.pokemon,
): Promise<T> {
  const key = `pokeapi:${endpoint}`;
  return getOrSet(key, () => rawFetch<T>(endpoint), ttlSeconds);
}

// ---------------------------------------------------------------------------
// Helpers públicos
// ---------------------------------------------------------------------------

export interface ListOptions {
  offset?: number;
  limit?: number;
}

function withQuery(endpoint: string, opts: ListOptions | undefined): string {
  if (!opts) return endpoint;
  const params = new URLSearchParams();
  if (opts.offset !== undefined) params.set("offset", String(opts.offset));
  if (opts.limit !== undefined) params.set("limit", String(opts.limit));
  const qs = params.toString();
  return qs ? `${endpoint}?${qs}` : endpoint;
}

/** Lista paginada de Pokémon: /pokemon?offset=0&limit=20 */
export function getPokemonList(opts: ListOptions = { limit: 20 }): Promise<NamedAPIResourceList> {
  return pokeapiFetch<NamedAPIResourceList>(withQuery("/pokemon", opts), CACHE_TTL.list);
}

/** Detalle de un Pokémon por id o nombre: /pokemon/{idOrName} */
export function getPokemon(idOrName: number | string): Promise<Pokemon> {
  const id = typeof idOrName === "number" ? String(idOrName) : idOrName;
  return pokeapiFetch<Pokemon>(`/pokemon/${id}`, CACHE_TTL.pokemon);
}

/** Species con flavor text, géneros, leyenda, evolution_chain: /pokemon-species/{idOrName} */
export function getPokemonSpecies(idOrName: number | string): Promise<PokemonSpecies> {
  const id = typeof idOrName === "number" ? String(idOrName) : idOrName;
  return pokeapiFetch<PokemonSpecies>(`/pokemon-species/${id}`, CACHE_TTL.species);
}

/** Cadena evolutiva: /evolution-chain/{id} */
export function getEvolutionChain(id: number): Promise<EvolutionChain> {
  return pokeapiFetch<EvolutionChain>(`/evolution-chain/${id}`, CACHE_TTL.evolution);
}

/** Tipo (con damage_relations): /type/{idOrName} */
export function getType(idOrName: number | string): Promise<Type> {
  const id = typeof idOrName === "number" ? String(idOrName) : idOrName;
  return pokeapiFetch<Type>(`/type/${id}`, CACHE_TTL.types);
}

/** Lista paginada de tipos: /type?offset=0&limit=20 */
export function getTypeList(opts: ListOptions = { limit: 20 }): Promise<NamedAPIResourceList> {
  return pokeapiFetch<NamedAPIResourceList>(withQuery("/type", opts), CACHE_TTL.types);
}

export { PokeAPIError };
