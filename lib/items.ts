/**
 * Catálogo de objetos equipables para el creador de equipos.
 *
 * Datos curados (Champions / competitivo). Las descripciones están en inglés.
 * Cada objeto tiene un `slug` derivado de su nombre que apunta al sprite de
 * PokeAPI (`sprites/items/{slug}.png`); si el sprite no existe, la UI cae a un
 * placeholder.
 */

export type ItemCategory = "popular" | "battle" | "pokemon" | "useless";

export interface Item {
  /** Slug para el sprite de PokeAPI. */
  slug: string;
  /** Nombre canónico (tal como se exporta a Showdown/Poképaste). */
  name: string;
  /** Descripción del efecto. */
  description: string;
  /** Categoría para agrupar/filtrar en la UI. */
  category: ItemCategory;
}

/** Normaliza un nombre de objeto a slug de sprite: "King's Rock" → "kings-rock". */
export function itemSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type RawItem = readonly [name: string, description: string, category: ItemCategory];

const RAW_ITEMS: readonly RawItem[] = [
  // ── Populares ──
  ["Air Balloon", "Holder is immune to Ground-type attacks. Pops when holder is hit.", "popular"],
  [
    "Choice Scarf",
    "Holder's Speed is 1.5×, but it can only select the first move it executes.",
    "popular",
  ],
  [
    "Expert Belt",
    "Holder's attacks that are super effective against the target do 1.2× damage.",
    "popular",
  ],
  [
    "Focus Sash",
    "If holder's HP is full, will survive an attack that would KO it with 1 HP. Single use.",
    "popular",
  ],
  ["Leftovers", "At the end of every turn, holder restores 1/16 of its max HP.", "popular"],
  [
    "Life Orb",
    "Holder's attacks do 1.3× damage, and it loses 1/10 its max HP after the attack.",
    "popular",
  ],
  [
    "Mental Herb",
    "Cures holder of Attract, Disable, Encore, Heal Block, Taunt, Torment. Single use.",
    "popular",
  ],
  [
    "Rocky Helmet",
    "If holder is hit by a contact move, the attacker loses 1/6 of its max HP.",
    "popular",
  ],

  // ── Objetos ──
  [
    "Babiri Berry",
    "Halves damage taken from a supereffective Steel-type attack. Single use.",
    "battle",
  ],
  ["Black Belt", "Holder's Fighting-type attacks have 1.2× power.", "battle"],
  ["Black Glasses", "Holder's Dark-type attacks have 1.2× power.", "battle"],
  ["Bright Powder", "The accuracy of attacks against the holder is 0.9×.", "battle"],
  ["Charcoal", "Holder's Fire-type attacks have 1.2× power.", "battle"],
  [
    "Charti Berry",
    "Halves damage taken from a supereffective Rock-type attack. Single use.",
    "battle",
  ],
  ["Chesto Berry", "Holder wakes up if it is asleep. Single use.", "battle"],
  ["Chilan Berry", "Halves damage taken from a Normal-type attack. Single use.", "battle"],
  [
    "Chople Berry",
    "Halves damage taken from a supereffective Fighting-type attack. Single use.",
    "battle",
  ],
  [
    "Coba Berry",
    "Halves damage taken from a supereffective Flying-type attack. Single use.",
    "battle",
  ],
  [
    "Colbur Berry",
    "Halves damage taken from a supereffective Dark-type attack. Single use.",
    "battle",
  ],
  ["Damp Rock", "Holder's use of Rain Dance lasts 8 turns instead of 5.", "battle"],
  ["Dragon Fang", "Holder's Dragon-type attacks have 1.2× power.", "battle"],
  [
    "Eject Button",
    "If holder survives a hit, it immediately switches out to a chosen ally. Single use.",
    "battle",
  ],
  [
    "Electric Seed",
    "If the terrain is Electric Terrain, raises holder's Defense by 1 stage. Single use.",
    "battle",
  ],
  ["Fairy Feather", "Holder's Fairy-type attacks have 1.2× power.", "battle"],
  [
    "Grassy Seed",
    "If the terrain is Grassy Terrain, raises holder's Defense by 1 stage. Single use.",
    "battle",
  ],
  [
    "Haban Berry",
    "Halves damage taken from a supereffective Dragon-type attack. Single use.",
    "battle",
  ],
  ["Hard Stone", "Holder's Rock-type attacks have 1.2× power.", "battle"],
  ["Heat Rock", "Holder's use of Sunny Day lasts 8 turns instead of 5.", "battle"],
  ["Icy Rock", "Holder's use of Snowscape lasts 8 turns instead of 5.", "battle"],
  [
    "Kasib Berry",
    "Halves damage taken from a supereffective Ghost-type attack. Single use.",
    "battle",
  ],
  [
    "Kebia Berry",
    "Halves damage taken from a supereffective Poison-type attack. Single use.",
    "battle",
  ],
  [
    "King's Rock",
    "Holder's attacks without a chance to flinch gain a 10% chance to flinch.",
    "battle",
  ],
  [
    "Leppa Berry",
    "Restores 10 PP to the first of the holder's moves to reach 0 PP. Single use.",
    "battle",
  ],
  [
    "Light Clay",
    "Holder's use of Aurora Veil, Light Screen, or Reflect lasts 8 turns instead of 5.",
    "battle",
  ],
  [
    "Lum Berry",
    "Holder cures itself if it has a non-volatile status or is confused. Single use.",
    "battle",
  ],
  ["Magnet", "Holder's Electric-type attacks have 1.2× power.", "battle"],
  ["Metal Coat", "Holder's Steel-type attacks have 1.2× power.", "battle"],
  [
    "Metronome",
    "Damage of moves used on consecutive turns is increased. Max 2× after 5 turns.",
    "battle",
  ],
  ["Miracle Seed", "Holder's Grass-type attacks have 1.2× power.", "battle"],
  [
    "Misty Seed",
    "If the terrain is Misty Terrain, raises holder's Sp. Def by 1 stage. Single use.",
    "battle",
  ],
  ["Muscle Band", "Holder's physical attacks have 1.1× power.", "battle"],
  ["Mystic Water", "Holder's Water-type attacks have 1.2× power.", "battle"],
  ["Never-Melt Ice", "Holder's Ice-type attacks have 1.2× power.", "battle"],
  [
    "Normal Gem",
    "Holder's first successful Normal-type attack will have 1.3× power. Single use.",
    "battle",
  ],
  [
    "Occa Berry",
    "Halves damage taken from a supereffective Fire-type attack. Single use.",
    "battle",
  ],
  [
    "Passho Berry",
    "Halves damage taken from a supereffective Water-type attack. Single use.",
    "battle",
  ],
  [
    "Payapa Berry",
    "Halves damage taken from a supereffective Psychic-type attack. Single use.",
    "battle",
  ],
  ["Poison Barb", "Holder's Poison-type attacks have 1.2× power.", "battle"],
  [
    "Psychic Seed",
    "If the terrain is Psychic Terrain, raises holder's Sp. Def by 1 stage. Single use.",
    "battle",
  ],
  [
    "Quick Claw",
    "Each turn, holder has a 20% chance to move first in its priority bracket.",
    "battle",
  ],
  [
    "Red Card",
    "If holder survives a hit, attacker is forced to switch to a random ally. Single use.",
    "battle",
  ],
  [
    "Rindo Berry",
    "Halves damage taken from a supereffective Grass-type attack. Single use.",
    "battle",
  ],
  [
    "Roseli Berry",
    "Halves damage taken from a supereffective Fairy-type attack. Single use.",
    "battle",
  ],
  ["Scope Lens", "Holder's critical hit ratio is raised by 1 stage.", "battle"],
  ["Sharp Beak", "Holder's Flying-type attacks have 1.2× power.", "battle"],
  ["Shed Shell", "Holder cannot be prevented from choosing to switch out by any effect.", "battle"],
  [
    "Shell Bell",
    "After an attack, holder gains 1/8 of the damage in HP dealt to other Pokemon.",
    "battle",
  ],
  [
    "Shuca Berry",
    "Halves damage taken from a supereffective Ground-type attack. Single use.",
    "battle",
  ],
  ["Silk Scarf", "Holder's Normal-type attacks have 1.2× power.", "battle"],
  ["Silver Powder", "Holder's Bug-type attacks have 1.2× power.", "battle"],
  ["Sitrus Berry", "Restores 1/4 max HP when at 1/2 max HP or less. Single use.", "battle"],
  ["Smooth Rock", "Holder's use of Sandstorm lasts 8 turns instead of 5.", "battle"],
  ["Soft Sand", "Holder's Ground-type attacks have 1.2× power.", "battle"],
  ["Spell Tag", "Holder's Ghost-type attacks have 1.2× power.", "battle"],
  [
    "Tanga Berry",
    "Halves damage taken from a supereffective Bug-type attack. Single use.",
    "battle",
  ],
  [
    "Terrain Extender",
    "Holder's use of Electric/Grassy/Misty/Psychic Terrain lasts 8 turns instead of 5.",
    "battle",
  ],
  ["Twisted Spoon", "Holder's Psychic-type attacks have 1.2× power.", "battle"],
  [
    "Wacan Berry",
    "Halves damage taken from a supereffective Electric-type attack. Single use.",
    "battle",
  ],
  [
    "White Herb",
    "Restores all lowered stat stages to 0 when one is less than 0. Single use.",
    "battle",
  ],
  ["Wide Lens", "The accuracy of attacks by the holder is 1.1×.", "battle"],
  ["Wise Glasses", "Holder's special attacks have 1.1× power.", "battle"],
  [
    "Yache Berry",
    "Halves damage taken from a supereffective Ice-type attack. Single use.",
    "battle",
  ],
  [
    "Zoom Lens",
    "The accuracy of attacks by the holder is 1.2× if it moves after its target.",
    "battle",
  ],

  // ── Específicos de Pokémon (piedras Mega + objetos de especie) ──
  [
    "Abomasite",
    "If held by an Abomasnow, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  [
    "Absolite",
    "If held by an Absol, this item allows it to Mega Evolve into Mega Absol in battle.",
    "pokemon",
  ],
  [
    "Absolite Z",
    "If held by an Absol, this item allows it to Mega Evolve into Mega Absol Z in battle.",
    "pokemon",
  ],
  [
    "Aerodactylite",
    "If held by an Aerodactyl, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  ["Aggronite", "If held by an Aggron, this item allows it to Mega Evolve in battle.", "pokemon"],
  ["Alakazite", "If held by an Alakazam, this item allows it to Mega Evolve in battle.", "pokemon"],
  [
    "Altarianite",
    "If held by an Altaria, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  [
    "Ampharosite",
    "If held by an Ampharos, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  ["Audinite", "If held by an Audino, this item allows it to Mega Evolve in battle.", "pokemon"],
  ["Banettite", "If held by a Banette, this item allows it to Mega Evolve in battle.", "pokemon"],
  [
    "Barbaracite",
    "If held by a Barbaracle, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  [
    "Baxcalibrite",
    "If held by a Baxcalibur, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  [
    "Beedrillite",
    "If held by a Beedrill, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  [
    "Blastoisinite",
    "If held by a Blastoise, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  [
    "Blazikenite",
    "If held by a Blaziken, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  [
    "Cameruptite",
    "If held by a Camerupt, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  [
    "Chandelurite",
    "If held by a Chandelure, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  [
    "Charizardite X",
    "If held by a Charizard, this item allows it to Mega Evolve into Mega Charizard X.",
    "pokemon",
  ],
  [
    "Charizardite Y",
    "If held by a Charizard, this item allows it to Mega Evolve into Mega Charizard Y.",
    "pokemon",
  ],
  [
    "Chesnaughtite",
    "If held by a Chesnaught, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  ["Chimechite", "If held by a Chimecho, this item allows it to Mega Evolve in battle.", "pokemon"],
  ["Clefablite", "If held by a Clefable, this item allows it to Mega Evolve in battle.", "pokemon"],
  [
    "Crabominite",
    "If held by a Crabominable, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  ["Delphoxite", "If held by a Delphox, this item allows it to Mega Evolve in battle.", "pokemon"],
  ["Dragalgite", "If held by a Dragalge, this item allows it to Mega Evolve in battle.", "pokemon"],
  [
    "Dragoninite",
    "If held by a Dragonite, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  ["Drampanite", "If held by a Drampa, this item allows it to Mega Evolve in battle.", "pokemon"],
  [
    "Eelektrossite",
    "If held by an Eelektross, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  ["Emboarite", "If held by an Emboar, this item allows it to Mega Evolve in battle.", "pokemon"],
  [
    "Excadrite",
    "If held by an Excadrill, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  ["Falinksite", "If held by a Falinks, this item allows it to Mega Evolve in battle.", "pokemon"],
  [
    "Feraligite",
    "If held by a Feraligatr, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  [
    "Floettite",
    "If held by an Eternal Flower Floette, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  [
    "Froslassite",
    "If held by a Froslass, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  ["Galladite", "If held by a Gallade, this item allows it to Mega Evolve in battle.", "pokemon"],
  [
    "Garchompite",
    "If held by a Garchomp, this item allows it to Mega Evolve into Mega Garchomp.",
    "pokemon",
  ],
  [
    "Garchompite Z",
    "If held by a Garchomp, this item allows it to Mega Evolve into Mega Garchomp Z.",
    "pokemon",
  ],
  [
    "Gardevoirite",
    "If held by a Gardevoir, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  ["Gengarite", "If held by a Gengar, this item allows it to Mega Evolve in battle.", "pokemon"],
  ["Glalitite", "If held by a Glalie, this item allows it to Mega Evolve in battle.", "pokemon"],
  [
    "Glimmoranite",
    "If held by a Glimmora, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  [
    "Golisopite",
    "If held by a Golisopod, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  ["Golurkite", "If held by a Golurk, this item allows it to Mega Evolve in battle.", "pokemon"],
  ["Greninjite", "If held by a Greninja, this item allows it to Mega Evolve in battle.", "pokemon"],
  [
    "Gyaradosite",
    "If held by a Gyarados, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  [
    "Hawluchanite",
    "If held by a Hawlucha, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  [
    "Heracronite",
    "If held by a Heracross, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  [
    "Houndoominite",
    "If held by a Houndoom, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  [
    "Kangaskhanite",
    "If held by a Kangaskhan, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  [
    "Leek",
    "If held by a Farfetch'd or Sirfetch'd, its critical hit ratio is raised by 2 stages.",
    "pokemon",
  ],
  ["Light Ball", "If held by a Pikachu, its Attack and Sp. Atk are doubled.", "pokemon"],
  ["Lopunnite", "If held by a Lopunny, this item allows it to Mega Evolve in battle.", "pokemon"],
  [
    "Lucarionite",
    "If held by a Lucario, this item allows it to Mega Evolve into Mega Lucario in battle.",
    "pokemon",
  ],
  [
    "Lucarionite Z",
    "If held by a Lucario, this item allows it to Mega Evolve into Mega Lucario Z in battle.",
    "pokemon",
  ],
  ["Malamarite", "If held by a Malamar, this item allows it to Mega Evolve in battle.", "pokemon"],
  ["Manectite", "If held by a Manectric, this item allows it to Mega Evolve in battle.", "pokemon"],
  ["Mawilite", "If held by a Mawile, this item allows it to Mega Evolve in battle.", "pokemon"],
  [
    "Medichamite",
    "If held by a Medicham, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  [
    "Meganiumite",
    "If held by a Meganium, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  [
    "Meowsticite",
    "If held by a Meowstic, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  [
    "Metagrossite",
    "If held by a Metagross, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  ["Pidgeotite", "If held by a Pidgeot, this item allows it to Mega Evolve in battle.", "pokemon"],
  ["Pinsirite", "If held by a Pinsir, this item allows it to Mega Evolve in battle.", "pokemon"],
  ["Pyroarite", "If held by a Pyroar, this item allows it to Mega Evolve in battle.", "pokemon"],
  [
    "Raichunite X",
    "If held by a Raichu, this item allows it to Mega Evolve into Mega Raichu X in battle.",
    "pokemon",
  ],
  [
    "Raichunite Y",
    "If held by a Raichu, this item allows it to Mega Evolve into Mega Raichu Y in battle.",
    "pokemon",
  ],
  ["Sablenite", "If held by a Sableye, this item allows it to Mega Evolve in battle.", "pokemon"],
  [
    "Salamencite",
    "If held by a Salamence, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  ["Sceptilite", "If held by a Sceptile, this item allows it to Mega Evolve in battle.", "pokemon"],
  ["Scizorite", "If held by a Scizor, this item allows it to Mega Evolve in battle.", "pokemon"],
  ["Scolipite", "If held by a Scolipede, this item allows it to Mega Evolve in battle.", "pokemon"],
  [
    "Scovillainite",
    "If held by a Scovillain, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  ["Scraftinite", "If held by a Scrafty, this item allows it to Mega Evolve in battle.", "pokemon"],
  [
    "Sharpedonite",
    "If held by a Sharpedo, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  ["Skarmorite", "If held by a Skarmory, this item allows it to Mega Evolve in battle.", "pokemon"],
  [
    "Slowbronite",
    "If held by a Slowbro (not Galarian Slowbro), this item allows it to Mega Evolve.",
    "pokemon",
  ],
  [
    "Staraptite",
    "If held by a Staraptor, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  ["Starminite", "If held by a Starmie, this item allows it to Mega Evolve in battle.", "pokemon"],
  ["Steelixite", "If held by a Steelix, this item allows it to Mega Evolve in battle.", "pokemon"],
  [
    "Swampertite",
    "If held by a Swampert, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  [
    "Tyranitarite",
    "If held by a Tyranitar, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  [
    "Venusaurite",
    "If held by a Venusaur, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],
  [
    "Victreebelite",
    "If held by a Victreebel, this item allows it to Mega Evolve in battle.",
    "pokemon",
  ],

  // ── Poco útiles ──
  ["Aspear Berry", "Holder is cured if it is frozen. Single use.", "useless"],
  [
    "Big Root",
    "Holder gains 1.3× HP from draining/Aqua Ring/Ingrain/Leech Seed/Strength Sap.",
    "useless",
  ],
  [
    "Binding Band",
    "Holder's partial-trapping moves deal 1/6 max HP per turn instead of 1/8.",
    "useless",
  ],
  ["Cheri Berry", "Holder cures itself if it is paralyzed. Single use.", "useless"],
  [
    "Focus Band",
    "Holder has a 10% chance to survive an attack that would KO it with 1 HP.",
    "useless",
  ],
  [
    "Iron Ball",
    "Holder is grounded, Speed halved. If Flying type, takes neutral Ground damage.",
    "useless",
  ],
  ["Oran Berry", "Restores 10 HP when at 1/2 max HP or less. Single use.", "useless"],
  ["Pecha Berry", "Holder is cured if it is poisoned. Single use.", "useless"],
  ["Persim Berry", "Holder is cured if it is confused. Single use.", "useless"],
  ["Rawst Berry", "Holder is cured if it is burned. Single use.", "useless"],
];

export const ITEMS: Item[] = RAW_ITEMS.map(([name, description, category]) => ({
  slug: itemSlug(name),
  name,
  description,
  category,
}));

/** URL del sprite del objeto (PokeAPI). Puede no existir para objetos nuevos. */
export function getItemSpriteUrl(slug: string): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`;
}

/** Busca un objeto por nombre canónico o slug (case-insensitive). */
export function findItem(value: string | null | undefined): Item | undefined {
  if (!value) return undefined;
  const v = value.trim().toLowerCase();
  return ITEMS.find((item) => item.name.toLowerCase() === v || item.slug === v);
}
