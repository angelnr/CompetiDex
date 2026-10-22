"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { List, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/routing";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ItemPicker } from "@/components/pokemon/ItemPicker";
import { ItemSprite } from "@/components/pokemon/ItemSprite";
import { MovePicker } from "@/components/pokemon/MovePicker";
import { MovepoolDialog } from "@/components/pokemon/MovepoolDialog";
import { SearchBar } from "@/components/pokemon/SearchBar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TeamMember, TeamMemberPatch } from "@/lib/team";
import {
  STAT_KEYS,
  MAX_EV_PER_STAT,
  MAX_EV_TOTAL,
  MAX_EV_TOTAL_CHAMPIONS,
  MAX_EV_PER_STAT_CHAMPIONS,
  CHAMPIONS_FIXED_IV,
  CHAMPIONS_LEVEL,
  DEFAULT_EVS,
  totalEvs,
} from "@/lib/team";
import type { Pokemon } from "@/lib/pokeapi";
import {
  baseSpeciesSlug,
  computeChampionsStat,
  computeStat,
  formatPokedexId,
  getName,
  getPixelSpriteById,
  isMegaName,
} from "@/lib/pokemon-utils";
import { useLocalizedSpeciesName } from "@/hooks/useLocalizedSpeciesName";
import { findItem, localizeItem } from "@/lib/items";
import { NATURE_STAT_LABELS, NATURES, type StatKey } from "@/lib/natures";
import { useAbilities, useItem, useMovepool, useNatures } from "@/lib/queries";
import { isMoveAvailableInGame, pickDefaultVersionGroup } from "@/lib/movepool-filter";
import { cn } from "@/lib/utils";

export interface TeamMemberEditorProps {
  member: TeamMember;
  pokemon: Pokemon;
  onChange: (patch: TeamMemberPatch) => void;
  onRemove: () => void;
  champions: boolean;
  /** Cambia la especie del miembro activo (resetea el set como Showdown). */
  onSpeciesChange?: ((pokemonId: number) => void) | undefined;
  /** IDs ya presentes en el equipo (se excluyen del selector de especie). */
  speciesExcludeIds?: number[] | undefined;
}

/**
 * Clases de color por stat según la naturaleza: rojo si sube, azul si baja
 * (etiqueta, IV y total).
 */
function natureClasses(relation: "up" | "down" | "neutral"): string {
  if (relation === "up") return "text-red-500 dark:text-red-400";
  if (relation === "down") return "text-blue-500 dark:text-blue-400";
  return "";
}

export function TeamMemberEditor({
  member,
  pokemon,
  onChange,
  onRemove,
  champions = false,
  onSpeciesChange,
  speciesExcludeIds,
}: TeamMemberEditorProps) {
  const t = useTranslations("teams.member");
  const tTeams = useTranslations("teams");
  const maxEvPerStat = champions ? MAX_EV_PER_STAT_CHAMPIONS : MAX_EV_PER_STAT;
  const maxEvTotal = champions ? MAX_EV_TOTAL_CHAMPIONS : MAX_EV_TOTAL;
  const evTotal = totalEvs(member.evs ?? DEFAULT_EVS);
  const evOver = evTotal > maxEvTotal;
  // En Champions los valores guardados son puntos de estadística, no EVs.
  const evLabel = champions ? t("statPoints") : t("evs");
  const evOverMessage = champions
    ? t("pointsOver", { max: maxEvTotal })
    : t("evOver", { max: maxEvTotal });
  const selectedItem = useMemo(() => findItem(member.heldItem), [member.heldItem]);
  const locale = useLocale();
  const localizedName = useLocalizedSpeciesName(member.name);
  const [movepoolSlot, setMovepoolSlot] = useState<number | null>(null);
  // Borradores de los inputs numéricos de EVs: permiten dejar el campo vacío
  // mientras se escribe sin que el valor controlado lo reponga al instante.
  const [evDrafts, setEvDrafts] = useState<Partial<Record<StatKey, string>>>({});
  // Refs de los 4 inputs de movimiento para saltar al siguiente con Tab.
  const moveInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    setEvDrafts({});
  }, [member.pokemonId, champions]);

  // Stat base por clave, para calcular el total (base + IVs + EVs + naturaleza).
  const baseStats = useMemo(() => {
    const map: Partial<Record<StatKey, number>> = {};
    for (const s of pokemon.stats) map[s.stat.name as StatKey] = s.base_stat;
    return map;
  }, [pokemon.stats]);

  const selectedNature = useMemo(
    () => NATURES.find((n) => n.name === (member.nature ?? "hardy")),
    [member.nature],
  );

  /** Relación de cada stat con la naturaleza activa (rojo sube, azul baja). */
  const statRelation = (stat: StatKey): "up" | "down" | "neutral" => {
    if (selectedNature?.increased === stat) return "up";
    if (selectedNature?.decreased === stat) return "down";
    return "neutral";
  };

  const abilities = useMemo(
    () =>
      pokemon.abilities.map((a) => ({
        name: a.ability.name,
        is_hidden: a.is_hidden,
      })),
    [pokemon.abilities],
  );

  // Nombres localizados (habilidad y naturaleza) para la UI; el valor guardado
  // sigue siendo el slug en inglés para que el export no cambie de idioma.
  const abilityNames = useMemo(() => abilities.map((a) => a.name), [abilities]);
  const abilityQueries = useAbilities(abilityNames);
  const natureQueries = useNatures(NATURES.map((n) => n.name));
  const { data: heldItemData } = useItem(selectedItem?.slug);

  const abilityLabel = (slug: string): string => {
    const idx = abilityNames.indexOf(slug);
    const data = idx >= 0 ? abilityQueries[idx]?.data : undefined;
    if (data) return getName(data.names, slug, locale);
    return slug.replace(/-/g, " ");
  };

  const natureLabel = (n: (typeof NATURES)[number], i: number): string => {
    const data = natureQueries[i]?.data;
    return data ? getName(data.names, n.name, locale) : n.name;
  };

  /** Sufijo "(+atk / -spa)" con los cambios de la naturaleza. */
  const natureHint = (n: (typeof NATURES)[number]): string => {
    const parts: string[] = [];
    if (n.increased) parts.push(`+${NATURE_STAT_LABELS[n.increased]}`);
    if (n.decreased) parts.push(`-${NATURE_STAT_LABELS[n.decreased]}`);
    return parts.length > 0 ? ` (${parts.join(" / ")})` : "";
  };

  // Descripción localizada del objeto equipado. localizeItem usa el texto del
  // version-group más reciente de PokeAPI (los de X/Y están mal atribuidos) y
  // en inglés/ausencia de datos cae a la descripción curada del catálogo.
  const heldItemDescription = selectedItem
    ? localizeItem(selectedItem, heldItemData, locale).description
    : null;

  // Movepool del Pokémon. Las megas comparten el learnset de la especie base
  // (PokeAPI les da uno parcial, p. ej. solo "champions"), así que se unen.
  const baseSlug = useMemo(
    () =>
      isMegaName(member.name) || pokemon.moves.length === 0
        ? baseSpeciesSlug(member.name)
        : undefined,
    [pokemon.moves, member.name],
  );

  // Fuente única para el autocompletado y la tabla completa: el movepool ya
  // incluye los movimientos huevo heredados de la preevolución.
  const movepoolSource: number | string | undefined =
    pokemon.moves.length > 0 ? member.pokemonId : baseSlug;
  const { data: movepool } = useMovepool(movepoolSource);
  // En Champions el autocompletado respeta su learnset (o SV si la especie
  // aún no tiene datos de Champions). En Estándar se mantienen todas las
  // versiones, como antes.
  const defaultGame = useMemo(
    () => (champions ? pickDefaultVersionGroup(movepool?.versionGroups ?? [], true) : undefined),
    [movepool, champions],
  );
  const availableMoves = useMemo(() => {
    if (!movepool) return [];
    return movepool.moves
      .filter((move) => isMoveAvailableInGame(move, defaultGame))
      .map((move) => move.slug)
      .sort();
  }, [movepool, defaultGame]);

  const patch = (p: TeamMemberPatch) => onChange(p);

  const handleLevel = (val: string) => {
    if (champions) return;
    const n = parseInt(val, 10);
    if (!isNaN(n)) patch({ level: Math.min(Math.max(n, 1), 100) });
  };

  const handleIV = (stat: StatKey, val: string) => {
    const n = parseInt(val, 10);
    if (isNaN(n)) return;
    const clamped = Math.min(Math.max(n, 0), 31);
    patch({ ivs: { ...member.ivs!, [stat]: clamped } });
  };

  /** Aplica un valor de EV con los topes por stat y por total. */
  const applyEv = (stat: StatKey, value: number) => {
    const current = member.evs?.[stat] ?? 0;
    const room = Math.max(0, maxEvTotal - (evTotal - current));
    const next = Math.min(Math.max(Math.round(value), 0), maxEvPerStat, room);
    patch({ evs: { ...member.evs!, [stat]: next } });
  };

  const clearEvDraft = (stat: StatKey) => {
    setEvDrafts((prev) => {
      if (!(stat in prev)) return prev;
      const next = { ...prev };
      delete next[stat];
      return next;
    });
  };

  /** Slider de EVs: se sincroniza con el input numérico. */
  const handleEvSlider = (stat: StatKey, val: string) => {
    clearEvDraft(stat);
    applyEv(stat, Number(val));
  };

  /** Input numérico de EVs: mantiene el borrador mientras se escribe. */
  const handleEvInput = (stat: StatKey, val: string) => {
    setEvDrafts((prev) => ({ ...prev, [stat]: val }));
    if (val.trim() === "") return;
    const n = Number(val);
    if (Number.isFinite(n)) applyEv(stat, n);
  };

  const handleEvBlur = (stat: StatKey) => {
    const draft = evDrafts[stat];
    if (draft !== undefined && draft.trim() === "") applyEv(stat, 0);
    clearEvDraft(stat);
  };

  const handleMove = (index: number, value: string) => {
    const moves = [...(member.moves ?? [])];
    moves[index] = value;
    patch({ moves });
  };

  const removeMove = (index: number) => {
    const moves = [...(member.moves ?? [])];
    moves.splice(index, 1);
    patch({ moves });
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      {/* ── Cabecera ── */}
      <div className="flex items-center gap-3">
        <Link
          href={`/pokemon/${member.pokemonId}`}
          className="group flex min-w-0 flex-1 items-center gap-3"
          title={localizedName}
        >
          <Image
            src={getPixelSpriteById(member.pokemonId)}
            alt=""
            width={48}
            height={48}
            className="size-12 shrink-0 object-contain"
            unoptimized
          />
          <span className="min-w-0">
            <span className="font-semibold group-hover:underline">{localizedName}</span>
            <span className="ml-2 font-mono text-xs text-muted-foreground">
              {formatPokedexId(member.pokemonId)}
            </span>
          </span>
        </Link>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onRemove}
          aria-label={tTeams("removeAria", { name: localizedName })}
        >
          <X className="mr-1 size-4" />
          {tTeams("removeMember")}
        </Button>
      </div>

      {/* ── Especie (cambia el Pokémon conservando el slot, como Showdown) ── */}
      {onSpeciesChange && (
        <div>
          <label className="mb-1 block text-xs font-medium">{t("species")}</label>
          <SearchBar
            showSprite
            onSelect={(id) => onSpeciesChange(id)}
            excludeIds={speciesExcludeIds ?? []}
            placeholderKey="forTeamPlaceholder"
            ariaKey="forTeamAria"
          />
        </div>
      )}

      {/* ── Nivel ── */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium">{t("level")}</label>
          <Input
            type="number"
            min={1}
            max={100}
            value={champions ? CHAMPIONS_LEVEL : (member.level ?? 100)}
            onChange={(e) => handleLevel(e.target.value)}
            aria-label={t("level")}
            disabled={champions}
          />
        </div>

        {/* ── Objeto equipado ── */}
        <div>
          <label className="mb-1 block text-xs font-medium">{t("heldItem")}</label>
          <ItemPicker
            value={member.heldItem ?? null}
            onChange={(item) => patch({ heldItem: item?.name ?? null })}
          />
          {selectedItem && (
            <p className="mt-1 flex items-start gap-1.5 text-[10px] text-muted-foreground">
              <ItemSprite slug={selectedItem.slug} alt="" className="mt-0.5 size-4" />
              <span>{heldItemDescription}</span>
            </p>
          )}
        </div>
      </div>

      {/* ── Habilidad ── */}
      <div>
        <label className="mb-1 block text-xs font-medium">{t("ability")}</label>
        <Select
          value={member.ability ?? ""}
          onValueChange={(val) => patch({ ability: val || null })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("abilityPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {abilities.map((a) => (
              <SelectItem key={a.name} value={a.name}>
                {abilityLabel(a.name)}
                {a.is_hidden && (
                  <Badge variant="secondary" className="ml-2 text-[10px]">
                    {t("hidden")}
                  </Badge>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Naturaleza ── */}
      <div>
        <label className="mb-1 block text-xs font-medium">{t("nature")}</label>
        <Select value={member.nature ?? "hardy"} onValueChange={(val) => patch({ nature: val })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NATURES.map((n, i) => (
              <SelectItem key={n.name} value={n.name}>
                {natureLabel(n, i)}
                {natureHint(n)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── IVs, EVs (slider) y total calculado por stat ── */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-xs font-medium">
            {champions ? t("statPoints") : `${t("ivs")} / ${t("evs")}`}
          </label>
          <span
            className={`text-xs ${evOver ? "font-bold text-destructive" : "text-muted-foreground"}`}
          >
            {evTotal}/{maxEvTotal}
          </span>
        </div>
        {champions && (
          <p className="mb-1 text-[10px] text-muted-foreground">{t("championsPointsHint")}</p>
        )}
        {evOver && <p className="mb-1 text-[10px] text-destructive">{evOverMessage}</p>}
        <div
          className={cn(
            "grid items-center gap-2",
            champions
              ? "grid-cols-[2.5rem_minmax(0,1fr)_2.75rem]"
              : "grid-cols-[2.5rem_3.25rem_minmax(0,1fr)_2.75rem]",
          )}
        >
          <span aria-hidden />
          {!champions && (
            <span className="text-center text-[10px] text-muted-foreground">{t("ivs")}</span>
          )}
          <span className="text-[10px] text-muted-foreground">{evLabel}</span>
          <span className="text-right text-[10px] text-muted-foreground">{t("statTotal")}</span>

          {STAT_KEYS.map((k) => {
            const relation = statRelation(k);
            const base = baseStats[k] ?? 0;
            const iv = member.ivs?.[k] ?? CHAMPIONS_FIXED_IV;
            const ev = member.evs?.[k] ?? 0;
            const natureMultiplier = relation === "up" ? 1.1 : relation === "down" ? 0.9 : 1;
            // Champions usa puntos (sin IVs, nivel 50); el resto, la fórmula clásica.
            const total = champions
              ? computeChampionsStat({
                  base,
                  points: ev,
                  isHp: k === "hp",
                  natureMultiplier,
                })
              : computeStat({
                  base,
                  iv,
                  ev,
                  level: member.level ?? 100,
                  isHp: k === "hp",
                  natureMultiplier,
                });
            return (
              <Fragment key={k}>
                <span className={cn("text-xs font-medium", natureClasses(relation))}>
                  {NATURE_STAT_LABELS[k]}
                </span>
                {!champions && (
                  <Input
                    type="number"
                    min={0}
                    max={31}
                    value={iv}
                    onChange={(e) => handleIV(k, e.target.value)}
                    className={cn("h-8 text-center text-xs", natureClasses(relation))}
                    aria-label={`IV ${k}`}
                  />
                )}
                <div className="flex min-w-0 items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={maxEvPerStat}
                    step={1}
                    value={Math.min(ev, maxEvPerStat)}
                    onChange={(e) => handleEvSlider(k, e.target.value)}
                    className="h-1.5 w-full cursor-pointer accent-primary"
                    aria-label={`${evLabel} ${k}`}
                  />
                  <Input
                    type="number"
                    min={0}
                    max={maxEvPerStat}
                    step={1}
                    inputMode="numeric"
                    value={evDrafts[k] ?? String(ev)}
                    onChange={(e) => handleEvInput(k, e.target.value)}
                    onBlur={() => handleEvBlur(k)}
                    onFocus={(e) => e.currentTarget.select()}
                    className="h-8 w-16 shrink-0 px-1 text-center font-mono text-xs"
                    aria-label={`${evLabel} ${k} valor`}
                  />
                </div>
                <span
                  className={cn(
                    "text-right font-mono text-sm font-semibold",
                    natureClasses(relation),
                  )}
                >
                  {total}
                </span>
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Movimientos ── */}
      <div>
        <label className="mb-1 block text-xs font-medium">{t("moves")}</label>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => {
            const moveVal = member.moves?.[i] ?? null;
            return (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1">
                  <MovePicker
                    value={moveVal}
                    pool={availableMoves}
                    onChange={(slug) => handleMove(i, slug ?? "")}
                    inputRef={(el) => {
                      moveInputRefs.current[i] = el;
                    }}
                    onTabCommit={i < 3 ? () => moveInputRefs.current[i + 1]?.focus() : undefined}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0"
                  onClick={() => setMovepoolSlot(i)}
                  aria-label={t("moveViewAllAria")}
                  title={t("moveViewAll")}
                >
                  <List className="size-3" />
                </Button>
                {moveVal && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0"
                    onClick={() => removeMove(i)}
                    aria-label={t("removeMove")}
                  >
                    <X className="size-3" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <MovepoolDialog
        open={movepoolSlot !== null}
        onOpenChange={(next) => {
          if (!next) setMovepoolSlot(null);
        }}
        sourceId={movepoolSource}
        speciesLabel={localizedName}
        selectedSlug={movepoolSlot !== null ? (member.moves?.[movepoolSlot] ?? null) : null}
        champions={champions}
        onSelect={(slug) => {
          if (movepoolSlot !== null) handleMove(movepoolSlot, slug);
        }}
      />
    </div>
  );
}
