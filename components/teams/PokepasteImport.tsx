"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useMoveCatalog, usePokemonCatalog } from "@/lib/queries";
import {
  buildMoveLookup,
  buildSpeciesLookup,
  lookupSpecies,
  moveLookupKey,
  parsePokepaste,
} from "@/lib/pokepaste";
import { getNature } from "@/lib/natures";
import { findItem } from "@/lib/items";
import {
  capEvs,
  DEFAULT_EVS,
  DEFAULT_IVS,
  MAX_EV_PER_STAT,
  MAX_EV_PER_STAT_CHAMPIONS,
  MAX_TEAM_SIZE,
  STAT_KEYS,
  type StatSpread,
  type TeamMember,
} from "@/lib/team";

export interface PokepasteImportProps {
  /** Modo Champions: recorta las EVs a los límites de ese formato. */
  champions: boolean;
  /** Callback con los miembros resueltos (slots 0..n-1). */
  onImport: (members: TeamMember[]) => void | Promise<void>;
}

interface PokemonDetails {
  id: number;
  name: string;
  sprite: string | null;
  types: string[];
  abilities: string[];
}

/** Detalle mínimo de una especie para construir el miembro del equipo. */
async function fetchDetails(slug: string): Promise<PokemonDetails | null> {
  try {
    const res = await fetch(`/api/pokemon?id=${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    const data: {
      id: number;
      name: string;
      sprites: { front_default: string | null };
      types: { type: { name: string } }[];
      abilities: { ability: { name: string } }[];
    } = await res.json();
    return {
      id: data.id,
      name: data.name,
      sprite: data.sprites.front_default,
      types: data.types.map((t) => t.type.name),
      abilities: data.abilities.map((a) => a.ability.name),
    };
  } catch {
    return null;
  }
}

/**
 * Importación de equipos en formato Poképaste/Showdown. Resuelve especies,
 * movimientos, objeto y naturaleza contra los catálogos ya cacheados y avisa
 * de lo que no ha podido interpretar. Un error de especie aborta la
 * importación; el resto de problemas solo se avisan.
 */
export function PokepasteImport({ champions, onImport }: PokepasteImportProps) {
  const t = useTranslations("teams");
  const { data: pokemonCatalog } = usePokemonCatalog();
  const { data: moveCatalog } = useMoveCatalog();

  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);

  const speciesLookup = useMemo(() => buildSpeciesLookup(pokemonCatalog ?? []), [pokemonCatalog]);
  const moveLookup = useMemo(() => buildMoveLookup(moveCatalog ?? []), [moveCatalog]);

  const maxEvPerStat = champions ? MAX_EV_PER_STAT_CHAMPIONS : MAX_EV_PER_STAT;

  const handleImport = useCallback(async () => {
    setImporting(true);
    setError(null);
    setWarnings([]);
    setSuccess(null);

    try {
      const sets = parsePokepaste(text);
      if (sets.length === 0) {
        setError(t("importEmpty"));
        return;
      }

      // 1. Resolver especies: si alguna falla, no se importa nada.
      const resolved: { set: (typeof sets)[number]; slug: string }[] = [];
      for (const set of sets) {
        const entry = lookupSpecies(speciesLookup, set.speciesToken, set.genderMarker);
        if (!entry) {
          setError(t("importUnknownSpecies", { name: set.speciesToken }));
          return;
        }
        resolved.push({ set, slug: entry.slug });
      }

      // 2. Detalles (id, sprite, tipos, habilidades) en paralelo.
      const details = await Promise.all(resolved.map(({ slug }) => fetchDetails(slug)));
      if (details.some((d) => d === null)) {
        setError(t("importError"));
        return;
      }

      const warn: string[] = [];
      const members: TeamMember[] = [];
      const seen = new Set<number>();

      if (resolved.length > MAX_TEAM_SIZE) warn.push(t("importTooMany"));

      resolved.forEach(({ set }, index) => {
        const detail = details[index]!;
        if (members.length >= MAX_TEAM_SIZE) return;
        if (seen.has(detail.id)) {
          warn.push(t("importDuplicated", { name: detail.name }));
          return;
        }
        seen.add(detail.id);

        // Movimientos
        const moves: string[] = [];
        for (const name of set.moveNames) {
          if (moves.length >= 4) break;
          const slug = moveLookup.get(moveLookupKey(name));
          if (!slug) {
            warn.push(t("importUnknownMove", { name }));
            continue;
          }
          if (!moves.includes(slug)) moves.push(slug);
        }

        // Objeto equipado
        let heldItem: string | null = null;
        if (set.heldItemName) {
          const item = findItem(set.heldItemName);
          if (item) heldItem = item.name;
          else warn.push(t("importUnknownItem", { name: set.heldItemName }));
        }

        // Habilidad (debe existir en la especie)
        let ability: string | null = null;
        if (set.abilitySlug) {
          if (detail.abilities.includes(set.abilitySlug)) ability = set.abilitySlug;
          else warn.push(t("importUnknownAbility", { species: detail.name, name: set.abilitySlug }));
        }

        // Naturaleza
        let nature = "hardy";
        if (set.natureName) {
          const found = getNature(set.natureName);
          if (found) nature = found.name;
          else warn.push(t("importUnknownNature", { name: set.natureName }));
        }

        // IVs y EVs (clampeados a los límites del formato)
        const ivs: StatSpread = { ...DEFAULT_IVS };
        for (const k of STAT_KEYS) {
          const value = set.ivs[k];
          if (value !== undefined) ivs[k] = Math.min(Math.max(Math.round(value), 0), 31);
        }
        const evsRaw: StatSpread = { ...DEFAULT_EVS };
        for (const k of STAT_KEYS) {
          const value = set.evs[k];
          if (value !== undefined) {
            evsRaw[k] = Math.min(Math.max(Math.round(value), 0), maxEvPerStat);
          }
        }

        members.push({
          pokemonId: detail.id,
          name: detail.name,
          slot: members.length,
          sprite: detail.sprite,
          types: detail.types,
          level: set.level !== null ? Math.min(Math.max(set.level, 1), 100) : 100,
          heldItem,
          ability,
          nature,
          ivs,
          evs: capEvs(evsRaw, champions),
          moves,
        });
      });

      if (members.length === 0 && resolved.length > 0) {
        setError(t("importError"));
        return;
      }

      setWarnings(warn);
      await onImport(members);
      setSuccess(t("importSuccess", { count: members.length }));
    } catch (err) {
      console.error("[pokepaste] error al importar:", err);
      setError(t("importError"));
    } finally {
      setImporting(false);
    }
  }, [text, t, speciesLookup, moveLookup, maxEvPerStat, champions, onImport]);

  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("importPlaceholder")}
        aria-label={t("importTab")}
        className="h-56 w-full resize-none rounded-md border bg-muted p-3 font-mono text-xs"
      />

      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      {success && <p className="text-xs font-medium text-primary">{success}</p>}
      {warnings.length > 0 && (
        <ul className="max-h-24 space-y-0.5 overflow-auto text-[11px] text-muted-foreground">
          {warnings.map((warning, i) => (
            <li key={i}>• {warning}</li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        onClick={() => void handleImport()}
        disabled={importing || text.trim() === ""}
        className="w-full"
      >
        {importing ? t("importing") : t("importAction")}
      </Button>
    </div>
  );
}
