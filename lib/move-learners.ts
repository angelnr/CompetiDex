/**
 * Pokémon que aprenden un movimiento, con el método y nivel de cada uno.
 *
 * La API REST de PokeAPI (`/move/{id}`) solo devuelve una lista plana de
 * aprendices, sin método ni version-group. Para evitar hacer N peticiones a
 * `/pokemon/{id}`, se consulta el endpoint GraphQL oficial (beta), que permite
 * filtrar por movimiento y juego en una sola petición. El resultado se cachea
 * en Redis 7 días.
 *
 * Nota: el GraphQL beta puede ir por detrás del REST (p. ej. aún no incluye el
 * version-group `champions`). En ese caso el movimiento simplemente no ofrece
 * esa opción en el selector; el resto de juegos funciona igual.
 */

import { getOrSet } from "@/lib/redis";
import { isExcludedVersionGroup } from "@/lib/version-names";

const POKEAPI_GRAPHQL = "https://beta.pokeapi.co/graphql/v1beta";
const LEARNERS_TTL_S = 604_800;
const GRAPHQL_TIMEOUT_MS = 15_000;

/** El GraphQL beta usa un identificador distinto al REST para BDSP. */
const VERSION_GROUP_ALIASES: Record<string, string> = {
  "brilliant-diamond-and-shining-pearl": "brilliant-diamond-shining-pearl",
};

function normalizeVersionGroup(name: string): string {
  return VERSION_GROUP_ALIASES[name] ?? name;
}

function toGraphqlVersionGroup(name: string): string {
  const found = Object.entries(VERSION_GROUP_ALIASES).find(([, alias]) => alias === name);
  return found?.[0] ?? name;
}

export interface MoveLearnerGame {
  name: string;
  order: number;
  count: number;
}

export interface MoveLearnerMethod {
  name: string;
  level: number;
}

export interface MoveLearner {
  pokemonId: number;
  pokemonName: string;
  methods: MoveLearnerMethod[];
}

interface GamesQueryData {
  pokemon_v2_versiongroup: Array<{
    name: string;
    order: number;
    pokemon_v2_pokemonmoves_aggregate: { aggregate: { count: number } };
  }>;
}

interface LearnersQueryData {
  pokemon_v2_move: Array<{
    pokemon_v2_pokemonmoves: Array<{
      level: number;
      pokemon_v2_movelearnmethod: { name: string };
      pokemon_v2_pokemon: { id: number; name: string };
    }>;
  }>;
}

interface EggChainsQueryData {
  pokemon_v2_pokemonspecies: Array<{
    id: number;
    name: string;
    evolution_chain_id: number;
    pokemon_v2_evolutionchain: {
      pokemon_v2_pokemonspecies: Array<{
        id: number;
        name: string;
        evolves_from_species_id: number | null;
        pokemon_v2_pokemons: Array<{
          id: number;
          name: string;
          pokemon_v2_pokemonmoves: Array<{ id: number }>;
        }>;
      }>;
    };
  }>;
}

const METHOD_ORDER = ["level-up", "machine", "tutor", "egg", "train"];

function methodRank(name: string): number {
  const index = METHOD_ORDER.indexOf(name);
  return index === -1 ? METHOD_ORDER.length : index;
}

async function graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GRAPHQL_TIMEOUT_MS);

  try {
    const res = await fetch(POKEAPI_GRAPHQL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
      next: { revalidate: 86_400 },
    });
    if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`);

    const payload = (await res.json()) as {
      data?: T;
      errors?: { message: string }[];
    };
    if (payload.errors?.length) {
      throw new Error(payload.errors.map((e) => e.message).join("; "));
    }
    if (!payload.data) throw new Error("GraphQL sin datos");
    return payload.data;
  } finally {
    clearTimeout(timer);
  }
}

/** Agrupa las filas del GraphQL por Pokémon y elimina métodos duplicados. */
export function groupMoveLearners(
  rows: Array<{
    pokemonId: number;
    pokemonName: string;
    method: string;
    level: number;
  }>,
): MoveLearner[] {
  const byPokemon = new Map<number, MoveLearner>();

  for (const row of rows) {
    let learner = byPokemon.get(row.pokemonId);
    if (!learner) {
      learner = {
        pokemonId: row.pokemonId,
        pokemonName: row.pokemonName,
        methods: [],
      };
      byPokemon.set(row.pokemonId, learner);
    }

    const duplicate = learner.methods.some(
      (method) => method.name === row.method && method.level === row.level,
    );
    if (!duplicate) learner.methods.push({ name: row.method, level: row.level });
  }

  return [...byPokemon.values()]
    .map((learner) => ({
      ...learner,
      methods: [...learner.methods].sort(
        (a, b) => methodRank(a.name) - methodRank(b.name) || a.level - b.level,
      ),
    }))
    .sort((a, b) => a.pokemonId - b.pokemonId);
}

/** Version-groups en los que algún Pokémon aprende el movimiento. */
export async function getMoveLearnerGames(moveId: number): Promise<MoveLearnerGame[]> {
  const query = `
    query MoveGames($id: Int!) {
      pokemon_v2_versiongroup(order_by: { order: asc }) {
        name
        order
        pokemon_v2_pokemonmoves_aggregate(
          where: {
            move_id: { _eq: $id }
            pokemon_v2_pokemon: { id: { _lte: 1025 }, is_default: { _eq: true } }
          }
        ) {
          aggregate { count }
        }
      }
    }
  `;

  try {
    const data = await getOrSet(
      `pokeapi:move-learner-games:${moveId}:v1`,
      () => graphql<GamesQueryData>(query, { id: moveId }),
      LEARNERS_TTL_S,
    );

    const byName = new Map<string, MoveLearnerGame>();
    for (const vg of data.pokemon_v2_versiongroup) {
      const count = vg.pokemon_v2_pokemonmoves_aggregate.aggregate.count;
      if (count === 0 || isExcludedVersionGroup(vg.name)) continue;

      const name = normalizeVersionGroup(vg.name);
      const existing = byName.get(name);
      if (existing) {
        existing.count += count;
      } else {
        byName.set(name, { name, order: vg.order, count });
      }
    }

    return [...byName.values()].sort((a, b) => a.order - b.order);
  } catch (err) {
    console.error(`[move-learners] no se pudieron cargar los juegos de ${moveId}:`, err);
    return [];
  }
}

interface LearnerRow {
  pokemonId: number;
  pokemonName: string;
  method: string;
  level: number;
}

/**
 * Un movimiento huevo de una preevolución también lo pueden conocer sus
 * evoluciones, aunque PokeAPI no lo liste en su ficha (Pawmot/Fake Out).
 * Añade esos descendientes solo si existen en el juego seleccionado y no
 * aparecen ya por otro método.
 */
async function expandInheritedEggLearners(
  rows: LearnerRow[],
  versionGroup: string,
): Promise<LearnerRow[]> {
  const eggNames = [
    ...new Set(rows.filter((row) => row.method === "egg").map((row) => row.pokemonName)),
  ];
  if (eggNames.length === 0) return rows;

  const query = `
    query EggChains($names: [String!]!, $game: String!) {
      pokemon_v2_pokemonspecies(where: { name: { _in: $names } }) {
        id
        name
        evolution_chain_id
        pokemon_v2_evolutionchain {
          pokemon_v2_pokemonspecies(order_by: { id: asc }) {
            id
            name
            evolves_from_species_id
            pokemon_v2_pokemons(where: { is_default: { _eq: true } }) {
              id
              name
              pokemon_v2_pokemonmoves(
                where: { pokemon_v2_versiongroup: { name: { _eq: $game } } }
                limit: 1
              ) {
                id
              }
            }
          }
        }
      }
    }
  `;

  try {
    const data = await graphql<EggChainsQueryData>(query, {
      names: eggNames,
      game: toGraphqlVersionGroup(versionGroup),
    });

    const chains = new Map<
      number,
      {
        nodes: EggChainsQueryData["pokemon_v2_pokemonspecies"][number]["pokemon_v2_evolutionchain"]["pokemon_v2_pokemonspecies"];
        eggSpeciesIds: Set<number>;
      }
    >();

    for (const species of data.pokemon_v2_pokemonspecies) {
      const nodes = species.pokemon_v2_evolutionchain.pokemon_v2_pokemonspecies;
      const existing = chains.get(species.evolution_chain_id);
      if (existing) {
        existing.eggSpeciesIds.add(species.id);
      } else {
        chains.set(species.evolution_chain_id, {
          nodes,
          eggSpeciesIds: new Set([species.id]),
        });
      }
    }

    const existingIds = new Set(rows.map((row) => row.pokemonId));
    const added: LearnerRow[] = [];

    for (const { nodes, eggSpeciesIds } of chains.values()) {
      const childrenByParent = new Map<number, typeof nodes>();
      for (const node of nodes) {
        if (node.evolves_from_species_id === null) continue;
        const children = childrenByParent.get(node.evolves_from_species_id) ?? [];
        children.push(node);
        childrenByParent.set(node.evolves_from_species_id, children);
      }

      const stack = [...eggSpeciesIds];
      const visited = new Set<number>();
      while (stack.length > 0) {
        const parent = stack.pop()!;
        for (const child of childrenByParent.get(parent) ?? []) {
          if (visited.has(child.id)) continue;
          visited.add(child.id);
          stack.push(child.id);

          const pokemon = child.pokemon_v2_pokemons[0];
          if (!pokemon || pokemon.pokemon_v2_pokemonmoves.length === 0) continue;
          if (existingIds.has(pokemon.id)) continue;

          existingIds.add(pokemon.id);
          added.push({
            pokemonId: pokemon.id,
            pokemonName: pokemon.name,
            method: "egg",
            level: 0,
          });
        }
      }
    }

    return added.length > 0 ? [...rows, ...added] : rows;
  } catch (err) {
    console.error(`[move-learners] no se pudieron expandir los huevos de ${versionGroup}:`, err);
    return rows;
  }
}

/** Aprendices de un movimiento en un version-group concreto. */
export async function getMoveLearners(
  moveId: number,
  versionGroup: string,
): Promise<MoveLearner[]> {
  const query = `
    query MoveLearners($id: Int!, $game: String!) {
      pokemon_v2_move(where: { id: { _eq: $id } }) {
        pokemon_v2_pokemonmoves(
          where: {
            pokemon_v2_versiongroup: { name: { _eq: $game } }
            pokemon_v2_pokemon: { id: { _lte: 1025 }, is_default: { _eq: true } }
          }
          order_by: { pokemon_v2_pokemon: { id: asc } }
        ) {
          level
          pokemon_v2_movelearnmethod { name }
          pokemon_v2_pokemon { id name }
        }
      }
    }
  `;

  try {
    const data = await getOrSet(
      `pokeapi:move-learners:${moveId}:${versionGroup}:v2`,
      () =>
        graphql<LearnersQueryData>(query, {
          id: moveId,
          game: toGraphqlVersionGroup(versionGroup),
        }),
      LEARNERS_TTL_S,
    );

    const rows = data.pokemon_v2_move[0]?.pokemon_v2_pokemonmoves ?? [];
    const learners = rows.map((row) => ({
      pokemonId: row.pokemon_v2_pokemon.id,
      pokemonName: row.pokemon_v2_pokemon.name,
      method: row.pokemon_v2_movelearnmethod.name,
      level: row.level,
    }));
    const expanded = await expandInheritedEggLearners(learners, versionGroup);
    return groupMoveLearners(expanded);
  } catch (err) {
    console.error(
      `[move-learners] no se pudieron cargar los aprendices de ${moveId} en ${versionGroup}:`,
      err,
    );
    return [];
  }
}
