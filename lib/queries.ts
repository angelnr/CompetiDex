/**
 * Hooks de TanStack Query para consumir el proxy /api/pokemon.
 *
 * Política de cacheo:
 * - Datos casi estáticos (Pokemon, Species, Evolution, Type): staleTime Infinity.
 * - Listado: staleTime 1h (suficiente para que el usuario no la mate a fetch).
 *
 * Se usa el endpoint local (`/api/pokemon`) en lugar de pokeapi.co para
 * pasar por el caché Redis server-side. Ver AGENTS.md §4.2.
 */

import { useQuery, useInfiniteQuery, type UseQueryOptions } from "@tanstack/react-query";
import type {
  NamedAPIResourceList,
  Pokemon,
  PokemonSpecies,
  EvolutionChain,
  Type,
  Ability,
  Move,
  LocationAreaEncounter,
} from "@/lib/pokeapi";

const STALE_STATIC = Infinity;
const STALE_LIST = 60 * 60 * 1000; // 1h

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const message = await res.json().catch(() => ({}));
    throw new Error((message as { error?: string }).error ?? `Error ${res.status}`);
  }
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Lista paginada simple
// ---------------------------------------------------------------------------

export function useAbility(idOrName: number | string | undefined) {
  return useQuery<Ability>({
    queryKey: ["ability", idOrName],
    queryFn: () => fetchJson<Ability>(`/api/pokemon?ability=${idOrName}`),
    enabled: idOrName !== undefined && idOrName !== "",
    staleTime: STALE_STATIC,
  });
}

export function useMove(idOrName: number | string | undefined) {
  return useQuery<Move>({
    queryKey: ["move", idOrName],
    queryFn: () => fetchJson<Move>(`/api/pokemon?move=${idOrName}`),
    enabled: idOrName !== undefined && idOrName !== "",
    staleTime: STALE_STATIC,
  });
}

export function useEncounters(id: number | undefined) {
  return useQuery<LocationAreaEncounter[]>({
    queryKey: ["encounters", id],
    queryFn: () => fetchJson<LocationAreaEncounter[]>(`/api/pokemon?encounters=${id}`),
    enabled: id !== undefined,
    staleTime: STALE_STATIC,
  });
}

export function usePokemonList(opts: { offset?: number; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (opts.offset !== undefined) params.set("offset", String(opts.offset));
  if (opts.limit !== undefined) params.set("limit", String(opts.limit));
  const qs = params.toString();
  const url = qs ? `/api/pokemon?${qs}` : "/api/pokemon";

  return useQuery<NamedAPIResourceList>({
    queryKey: ["pokemon-list", opts],
    queryFn: () => fetchJson<NamedAPIResourceList>(url),
    staleTime: STALE_LIST,
  });
}

// ---------------------------------------------------------------------------
// Lista infinita (para grid con scroll infinito)
// ---------------------------------------------------------------------------

const DEFAULT_PAGE_SIZE = 24;

export function usePokemonInfiniteList(initialLimit: number = DEFAULT_PAGE_SIZE) {
  return useInfiniteQuery<NamedAPIResourceList>({
    queryKey: ["pokemon-infinite", initialLimit],
    queryFn: ({ pageParam }) => {
      const offset = typeof pageParam === "number" ? pageParam : 0;
      return fetchJson<NamedAPIResourceList>(`/api/pokemon?offset=${offset}&limit=${initialLimit}`);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage.next) return undefined;
      const nextUrl = new URL(lastPage.next);
      const offset = nextUrl.searchParams.get("offset");
      return offset ? Number(offset) : undefined;
    },
    staleTime: STALE_LIST,
  });
}

// ---------------------------------------------------------------------------
// Detalle de Pokémon
// ---------------------------------------------------------------------------

export function usePokemon(idOrName: number | string | undefined) {
  return useQuery<Pokemon>({
    queryKey: ["pokemon", idOrName],
    queryFn: () => fetchJson<Pokemon>(`/api/pokemon?id=${idOrName}`),
    enabled: idOrName !== undefined && idOrName !== "",
    staleTime: STALE_STATIC,
  });
}

// ---------------------------------------------------------------------------
// Species
// ---------------------------------------------------------------------------

export function usePokemonSpecies(idOrName: number | string | undefined) {
  return useQuery<PokemonSpecies>({
    queryKey: ["pokemon-species", idOrName],
    queryFn: () => fetchJson<PokemonSpecies>(`/api/pokemon?species=${idOrName}`),
    enabled: idOrName !== undefined && idOrName !== "",
    staleTime: STALE_STATIC,
  });
}

// ---------------------------------------------------------------------------
// Evolution chain
// ---------------------------------------------------------------------------

export function useEvolutionChain(id: number | undefined) {
  return useQuery<EvolutionChain>({
    queryKey: ["evolution-chain", id],
    queryFn: () => fetchJson<EvolutionChain>(`/api/pokemon?evolution=${id}`),
    enabled: id !== undefined,
    staleTime: STALE_STATIC,
  });
}

// ---------------------------------------------------------------------------
// Tipo
// ---------------------------------------------------------------------------

export function useType(idOrName: number | string | undefined) {
  return useQuery<Type>({
    queryKey: ["type", idOrName],
    queryFn: () => fetchJson<Type>(`/api/pokemon?type=${idOrName}`),
    enabled: idOrName !== undefined && idOrName !== "",
    staleTime: STALE_STATIC,
  });
}

// ---------------------------------------------------------------------------
// Type list (para filtros)
// ---------------------------------------------------------------------------

export function useTypeList(opts: { offset?: number; limit?: number } = { limit: 20 }) {
  const params = new URLSearchParams({ "type-list": "true" });
  if (opts.offset !== undefined) params.set("offset", String(opts.offset));
  if (opts.limit !== undefined) params.set("limit", String(opts.limit));

  return useQuery<NamedAPIResourceList>({
    queryKey: ["type-list", opts],
    queryFn: () => fetchJson<NamedAPIResourceList>(`/api/pokemon?${params.toString()}`),
    staleTime: STALE_LIST,
  });
}

// Hook genérico re-exportable para casos puntuales (con options custom)
export function usePokeapiQuery<T>(
  queryKey: unknown[],
  url: string,
  options?: Partial<UseQueryOptions<T>>,
) {
  return useQuery<T>({
    queryKey,
    queryFn: () => fetchJson<T>(url),
    ...options,
  });
}
