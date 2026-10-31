/**
 * Preferencia del último juego consultado.
 *
 * La ficha usa dos granularidades distintas:
 * - Movimientos: version-groups (`sword-shield`, `the-indigo-disk`...).
 * - Encuentros: versiones (`sword`, `scarlet`...).
 *
 * Se guarda una preferencia común para que ambos selectores recuerden el
 * mismo juego al cambiar de especie. Los DLC comparten las versiones de su
 * juego base, así que al elegir una versión en encuentros se restaura el
 * version-group base en movimientos.
 */

const VERSION_GROUP_KEY = "competidex:last-version-group";
const VERSION_KEY = "competidex:last-version";

/** Evento interno para sincronizar ambos selectores en la misma pestaña. */
export const GAME_PREFERENCE_EVENT = "competidex:game-preference";

interface GameFamily {
  group: string;
  versions: string[];
}

/**
 * Familias de juegos. Los DLC repiten las versiones de su juego base para
 * poder restaurar un version-group de DLC y, a la vez, caer a la versión base
 * en el selector de encuentros.
 */
const GAME_FAMILIES: GameFamily[] = [
  { group: "red-blue", versions: ["red", "blue"] },
  { group: "yellow", versions: ["yellow"] },
  { group: "gold-silver", versions: ["gold", "silver"] },
  { group: "crystal", versions: ["crystal"] },
  { group: "ruby-sapphire", versions: ["ruby", "sapphire"] },
  { group: "emerald", versions: ["emerald"] },
  { group: "firered-leafgreen", versions: ["firered", "leafgreen"] },
  { group: "diamond-pearl", versions: ["diamond", "pearl"] },
  { group: "platinum", versions: ["platinum"] },
  { group: "heartgold-soulsilver", versions: ["heartgold", "soulsilver"] },
  { group: "black-white", versions: ["black", "white"] },
  { group: "black-2-white-2", versions: ["black-2", "white-2"] },
  { group: "x-y", versions: ["x", "y"] },
  { group: "omega-ruby-alpha-sapphire", versions: ["omega-ruby", "alpha-sapphire"] },
  { group: "sun-moon", versions: ["sun", "moon"] },
  { group: "ultra-sun-ultra-moon", versions: ["ultra-sun", "ultra-moon"] },
  {
    group: "lets-go-pikachu-lets-go-eevee",
    versions: ["lets-go-pikachu", "lets-go-eevee"],
  },
  { group: "sword-shield", versions: ["sword", "shield"] },
  { group: "the-isle-of-armor", versions: ["sword", "shield"] },
  { group: "the-crown-tundra", versions: ["sword", "shield"] },
  {
    group: "brilliant-diamond-shining-pearl",
    versions: ["brilliant-diamond", "shining-pearl"],
  },
  { group: "legends-arceus", versions: ["legends-arceus"] },
  { group: "scarlet-violet", versions: ["scarlet", "violet"] },
  { group: "the-teal-mask", versions: ["scarlet", "violet"] },
  { group: "the-indigo-disk", versions: ["scarlet", "violet"] },
  { group: "champions", versions: ["champions"] },
  { group: "legends-za", versions: ["legends-za"] },
  { group: "mega-dimension", versions: ["mega-dimension"] },
];

const GROUP_TO_VERSIONS = new Map(
  GAME_FAMILIES.map((family) => [family.group, family.versions] as const),
);

/**
 * Version-groups que representan un juego base. Las versiones de los DLC se
 * resuelven contra estos para que el selector de encuentros, que no distingue
 * DLC, pueda restaurar una versión concreta.
 */
const BASE_GROUPS = new Set([
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
  "brilliant-diamond-shining-pearl",
  "legends-arceus",
  "scarlet-violet",
  "champions",
  "legends-za",
  "mega-dimension",
]);

const VERSION_TO_GROUP = new Map<string, string>();
for (const family of GAME_FAMILIES) {
  if (!BASE_GROUPS.has(family.group)) continue;
  for (const version of family.versions) VERSION_TO_GROUP.set(version, family.group);
}

export interface GamePreference {
  versionGroup?: string | undefined;
  version?: string | undefined;
}

function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // localStorage puede estar bloqueado (modo privado, políticas del navegador).
  }
}

function notify(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(GAME_PREFERENCE_EVENT));
}

/** Lee la preferencia guardada (sin validar contra la especie actual). */
export function readGamePreference(): GamePreference {
  return {
    versionGroup: readStorage(VERSION_GROUP_KEY) ?? undefined,
    version: readStorage(VERSION_KEY) ?? undefined,
  };
}

/**
 * Guarda el version-group elegido en Movimientos. Si la versión recordada no
 * pertenece a ese grupo (p. ej. se pasa de Escarlata a Espada/Escudo), se
 * actualiza a la primera versión del nuevo grupo.
 */
export function saveVersionGroup(versionGroup: string): void {
  const versions = GROUP_TO_VERSIONS.get(versionGroup) ?? [];
  const currentVersion = readStorage(VERSION_KEY);

  writeStorage(VERSION_GROUP_KEY, versionGroup);
  if (!currentVersion || !versions.includes(currentVersion)) {
    writeStorage(VERSION_KEY, versions[0] ?? null);
  }

  notify();
}

/**
 * Guarda la versión elegida en Encuentros y actualiza su version-group base
 * (p. ej. `shield` → `sword-shield`) para que Movimientos use el mismo juego.
 */
export function saveVersion(version: string): void {
  writeStorage(VERSION_KEY, version);

  const group = VERSION_TO_GROUP.get(version);
  if (group) writeStorage(VERSION_GROUP_KEY, group);

  notify();
}

/** Versión de encuentros que corresponde a la preferencia, si está disponible. */
export function preferredVersion(available: string[]): string | undefined {
  const { version, versionGroup } = readGamePreference();
  if (version && available.includes(version)) return version;

  if (versionGroup) {
    const versions = GROUP_TO_VERSIONS.get(versionGroup) ?? [];
    const match = versions.find((candidate) => available.includes(candidate));
    if (match) return match;
  }

  return undefined;
}

/** Version-group de movimientos que corresponde a la preferencia, si está disponible. */
export function preferredVersionGroup(available: string[]): string | undefined {
  const { version, versionGroup } = readGamePreference();
  if (versionGroup && available.includes(versionGroup)) return versionGroup;

  if (version) {
    const group = VERSION_TO_GROUP.get(version);
    if (group && available.includes(group)) return group;

    // Si la especie solo tiene learnset en un DLC de esa versión, se usa el
    // version-group del DLC en lugar de caer al juego por defecto.
    const dlc = GAME_FAMILIES.find(
      (family) => family.versions.includes(version) && available.includes(family.group),
    )?.group;
    if (dlc) return dlc;
  }

  return undefined;
}

/** Suscribe un callback a los cambios de preferencia (misma pestaña u otra). */
export function subscribeGamePreference(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key === VERSION_GROUP_KEY || event.key === VERSION_KEY) listener();
  };

  window.addEventListener(GAME_PREFERENCE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(GAME_PREFERENCE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}
