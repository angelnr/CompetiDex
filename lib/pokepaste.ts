import type { Team, TeamMember } from "@/lib/team";
import { normalizeMember, STAT_KEYS, totalEvs } from "@/lib/team";

/**
 * Convierte un slug like "thunder-bolt" a "Thunder Bolt".
 */
export function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Serializa un equipo al formato PokePaste / Showdown.
 *
 * Formato de salida:
 * ```
 * Team Name
 *
 * Pokémon @ Item
 * Ability: Ability
 * Level: 50
 * Nature: Adamant
 * EVs: HP 4 / Atk 252 / Spe 252
 * IVs: HP 31 / Atk 31 / Def 31
 * - Move One
 * - Move Two
 * - Move Three
 * - Move Four
 *
 * Next Pokémon...
 * ```
 */
export function teamToPokepaste(team: Team): string {
  const lines: string[] = [];

  // Línea del nombre del equipo (sin espacios extra si el nombre está vacío)
  const trimmedName = team.name.trim();
  lines.push(trimmedName || "Untitled Team");

  for (const rawMember of team.members) {
    const member = normalizeMember(rawMember);
    lines.push(""); // línea en blanco separadora

    // ── Nickname + especie + objeto ──
    // Showdown: "Pokémon @ Item" (sin nick a menos que haya uno)
    const speciesLine = slugToTitle(member.name);
    if (member.heldItem) {
      lines.push(`${speciesLine} @ ${slugToTitle(member.heldItem)}`);
    } else {
      lines.push(speciesLine);
    }

    // ── Ability ──
    if (member.ability) {
      lines.push(`Ability: ${slugToTitle(member.ability)}`);
    }

    // ── Level (solo si no es 100, que es el default competitivo) ──
    if (member.level !== undefined && member.level !== 100) {
      lines.push(`Level: ${member.level}`);
    }

    // ── Nature ──
    if (member.nature && member.nature !== "hardy") {
      lines.push(`${slugToTitle(member.nature)} Nature`);
    }

    // ── EVs (solo stats no-cero) ──
    const evs = member.evs!;
    const evParts = STAT_KEYS.filter((k) => evs[k] > 0).map((k) => `${evs[k]} ${statLabel(k)}`);
    if (evParts.length > 0) {
      lines.push(`EVs: ${evParts.join(" / ")}`);
    }

    // ── IVs (solo stats que no sean 31) ──
    const ivs = member.ivs!;
    const ivParts = STAT_KEYS.filter((k) => ivs[k] !== 31).map((k) => `${ivs[k]} ${statLabel(k)}`);
    if (ivParts.length > 0) {
      lines.push(`IVs: ${ivParts.join(" / ")}`);
    }

    // ── Movimientos ──
    if (member.moves && member.moves.length > 0) {
      for (const move of member.moves) {
        lines.push(`- ${slugToTitle(move)}`);
      }
    }
  }

  return lines.join("\n");
}

function statLabel(key: string): string {
  const map: Record<string, string> = {
    hp: "HP",
    attack: "Atk",
    defense: "Def",
    "special-attack": "SpA",
    "special-defense": "SpD",
    speed: "Spe",
  };
  return map[key] ?? key;
}
