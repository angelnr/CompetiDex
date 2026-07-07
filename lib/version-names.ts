/**
 * Mapas estáticos de nombres de juegos (version-groups) y métodos de
 * aprendizaje a español. No hay endpoint de PokeAPI que devuelva estos
 * nombres traducidos, así que se mantienen aquí como fuente de verdad.
 *
 * Fallback: capitalize(name.replace(/-/g, " ")).
 */

import { capitalize } from "@/lib/pokemon-utils";

// ---------------------------------------------------------------------------
// Versiones excluidas (japonesas, spinoffs)
// ---------------------------------------------------------------------------

/** Versiones (encuentros) a filtrar: ediciones japonesas antiguas. */
export const EXCLUDED_VERSIONS = new Set([
  "red-japan",
  "green-japan",
  "blue-japan",
  "crystal-japan",
]);

/** Version-groups (movimientos) a filtrar: spinoffs tipo "Champions". */
export const EXCLUDED_VERSION_GROUPS = new Set([
  "colosseum",
  "xd",
  "pokemon-pinball-ruby-sapphire",
  "pokemon-tcg",
]);

export function isExcludedVersion(name: string): boolean {
  return EXCLUDED_VERSIONS.has(name) || name.endsWith("-japan");
}

export function isExcludedVersionGroup(name: string): boolean {
  return EXCLUDED_VERSION_GROUPS.has(name);
}

// ---------------------------------------------------------------------------
// Nombre en español
// ---------------------------------------------------------------------------

export const VERSION_GROUP_ES: Record<string, string> = {
  "red-blue": "Rojo/Azul",
  yellow: "Amarillo",
  "gold-silver": "Oro/Plata",
  crystal: "Cristal",
  "ruby-sapphire": "Rubí/Zafiro",
  emerald: "Esmeralda",
  "firered-leafgreen": "Rojo Fuego/Verde Hoja",
  "diamond-pearl": "Diamante/Perla",
  platinum: "Platino",
  "heartgold-soulsilver": "HeartGold/SoulSilver",
  "black-white": "Negro/Blanco",
  colosseum: "Colosseum",
  xd: "XD",
  "black-2-white-2": "Negro 2/Blanco 2",
  "x-y": "X/Y",
  "omega-ruby-alpha-sapphire": "Rubí Omega/Zafiro Alfa",
  "sun-moon": "Sol/Luna",
  "ultra-sun-ultra-moon": "Ultrasol/Ultraluna",
  "lets-go-pikachu-lets-go-eevee": "Let's Go Pikachu/Let's Go Eevee",
  "sword-shield": "Espada/Escudo",
  "the-isle-of-armor": "Isla de la Armadura",
  "the-crown-tundra": "Las Nieves de la Corona",
  "brilliant-diamond-shining-pearl": "Diamante Brillante/Perla Reluciente",
  "legends-arceus": "Leyendas: Arceus",
  "scarlet-violet": "Escarlata/Púrpura",
  "the-teal-mask": "La Máscara Turquesa",
  "the-indigo-disk": "El Disco Índigo",
};

export const MOVE_LEARN_METHOD_ES: Record<string, string> = {
  "level-up": "Subir de nivel",
  machine: "MT/MA",
  tutor: "Tutor",
  egg: "Movimiento huevo",
  "light-ball-egg": "Huevo (Light Ball)",
  "form-change": "Cambio de forma",
  "zygarde-cube": "Zygrade Cube",
};

export function getVersionGroupLabel(name: string): string {
  return VERSION_GROUP_ES[name] ?? capitalize(name.replace(/-/g, " "));
}

export function getMoveLearnMethodLabel(name: string): string {
  return MOVE_LEARN_METHOD_ES[name] ?? capitalize(name.replace(/-/g, " "));
}

// ---------------------------------------------------------------------------
// Orden cronológico
// ---------------------------------------------------------------------------

const VERSION_GROUP_ORDER = [
  "red-blue",
  "yellow",
  "gold-silver",
  "crystal",
  "ruby-sapphire",
  "emerald",
  "firered-leafgreen",
  "diamond-pearl",
  "platinum",
  "heartgold-soulsilver",
  "black-white",
  "black-2-white-2",
  "x-y",
  "omega-ruby-alpha-sapphire",
  "sun-moon",
  "ultra-sun-ultra-moon",
  "lets-go-pikachu-lets-go-eevee",
  "sword-shield",
  "the-isle-of-armor",
  "the-crown-tundra",
  "brilliant-diamond-shining-pearl",
  "legends-arceus",
  "scarlet-violet",
  "the-teal-mask",
  "the-indigo-disk",
];

const VERSION_ORDER = [
  "red",
  "blue",
  "yellow",
  "gold",
  "silver",
  "crystal",
  "ruby",
  "sapphire",
  "emerald",
  "firered",
  "leafgreen",
  "diamond",
  "pearl",
  "platinum",
  "heartgold",
  "soulsilver",
  "black",
  "white",
  "black-2",
  "white-2",
  "x",
  "y",
  "omega-ruby",
  "alpha-sapphire",
  "sun",
  "moon",
  "ultra-sun",
  "ultra-moon",
  "lets-go-pikachu",
  "lets-go-eevee",
  "sword",
  "shield",
  "brilliant-diamond",
  "shining-pearl",
  "legends-arceus",
  "scarlet",
  "violet",
];

/** Comparador para version-groups (movimientos): orden cronológico. */
export function versionGroupOrder(a: string, b: string): number {
  const ia = VERSION_GROUP_ORDER.indexOf(a);
  const ib = VERSION_GROUP_ORDER.indexOf(b);
  return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
}

/** Comparador para versiones (encuentros): orden cronológico. */
export function versionOrder(a: string, b: string): number {
  const ia = VERSION_ORDER.indexOf(a);
  const ib = VERSION_ORDER.indexOf(b);
  return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
}
