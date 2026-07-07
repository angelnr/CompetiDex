/**
 * Filtros y orden cronológico de versiones/version-groups.
 * Los labels se resuelven via messages/{locale}.json (useTranslations("versionGroups")).
 */

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
