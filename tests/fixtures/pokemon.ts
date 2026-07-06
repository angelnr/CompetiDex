import type { Pokemon, NamedAPIResourceList } from "@/lib/pokeapi";

/**
 * Fixture mínima de un Pokémon para component tests.
 * Sintetiza Pikachu (#25) con sprite oficial y tipo eléctrico.
 */
export function makePokemonFixture(overrides: Partial<Pokemon> = {}): Pokemon {
  return {
    id: 25,
    name: "pikachu",
    base_experience: 112,
    height: 4,
    weight: 60,
    order: 35,
    is_default: true,
    species: { name: "pikachu", url: "https://pokeapi.co/api/v2/pokemon-species/25/" },
    abilities: [
      {
        is_hidden: false,
        slot: 1,
        ability: { name: "static", url: "https://pokeapi.co/api/v2/ability/9/" },
      },
    ],
    types: [
      {
        slot: 1,
        type: { name: "electric", url: "https://pokeapi.co/api/v2/type/13/" },
      },
    ],
    stats: [
      { base_stat: 35, effort: 0, stat: { name: "hp", url: "" } },
      { base_stat: 55, effort: 0, stat: { name: "attack", url: "" } },
      { base_stat: 40, effort: 0, stat: { name: "defense", url: "" } },
    ],
    sprites: {
      front_default:
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png",
      front_shiny: null,
      front_female: null,
      front_shiny_female: null,
      back_default: null,
      back_shiny: null,
      back_female: null,
      back_shiny_female: null,
      other: {
        dream_world: null,
        "official-artwork": {
          front_default:
            "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png",
          front_shiny: null,
          front_female: null,
        },
      },
    },
    moves: [],
    cries: { latest: null, legacy: null },
    ...overrides,
  };
}

/** Fixture para `NamedAPIResourceList` (lista paginada de Pokémon). */
export function makeResourceListFixture(
  overrides: Partial<NamedAPIResourceList> = {},
): NamedAPIResourceList {
  return {
    count: 3,
    next: null,
    previous: null,
    results: [
      { name: "bulbasaur", url: "https://pokeapi.co/api/v2/pokemon/1/" },
      { name: "ivysaur", url: "https://pokeapi.co/api/v2/pokemon/2/" },
      { name: "venusaur", url: "https://pokeapi.co/api/v2/pokemon/3/" },
    ],
    ...overrides,
  };
}
