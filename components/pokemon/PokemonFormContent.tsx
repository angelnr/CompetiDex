"use client";

import { useState, useMemo } from "react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

import { AbilitiesSection, type AbilityEntry } from "@/components/pokemon/AbilitiesSection";
import { SpriteViewer } from "@/components/pokemon/SpriteViewer";
import { StatBar } from "@/components/pokemon/StatBar";
import { TypeBadge } from "@/components/pokemon/TypeBadge";
import { TypeEffectiveness } from "@/components/pokemon/TypeEffectiveness";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePokemon } from "@/lib/queries";
import type { Pokemon, PokemonSpecies, Type, Ability } from "@/lib/pokeapi";
import type { MegaVarietyInfo } from "@/lib/pokemon-utils";
import {
  computeStatTotal,
  formatHeight,
  formatWeight,
  getDisplayName,
  getFlavorText,
  getGenus,
  getOfficialArtwork,
} from "@/lib/pokemon-utils";
import { categorizeEffectiveness, computeDefensiveEffectiveness } from "@/lib/type-effectiveness";
import { cn } from "@/lib/utils";

export interface PokemonFormContentProps {
  pokemon: Pokemon;
  species: PokemonSpecies;
  typeData: Type[];
  abilityData: (Ability | null)[];
  megaVarieties: MegaVarietyInfo[];
  locale: string;
}

export function PokemonFormContent({
  pokemon: basePokemon,
  species,
  typeData: baseTypeData,
  abilityData: baseAbilityData,
  megaVarieties,
  locale,
}: PokemonFormContentProps) {
  const t = useTranslations("pokemon");
  const [selectedMega, setSelectedMega] = useState<MegaVarietyInfo | null>(null);
  const { data: megaData, isLoading: megaLoading } = usePokemon(selectedMega?.id);

  const isMegaSelected = selectedMega !== null && megaData !== undefined;

  const pokemon = isMegaSelected && megaData ? megaData : basePokemon;
  const displayName = getDisplayName(species.names, pokemon.name, locale);
  const flavorText = getFlavorText(species.flavor_text_entries, locale);
  const genus = getGenus(species.genera, locale);
  const artwork = getOfficialArtwork(pokemon);
  const artworkShiny = pokemon.sprites.other?.["official-artwork"]?.front_shiny ?? null;
  const defaultSprite = pokemon.sprites.front_default;

  const typeData = useMemo(() => {
    if (isMegaSelected && megaData) {
      return megaData.types.map((t) => t.type.name);
    }
    return baseTypeData.map((t) => t.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMegaSelected, megaData?.types]);

  const effectiveness = useMemo(() => {
    const typeNames =
      isMegaSelected && megaData
        ? megaData.types.map((t) => t.type.name)
        : baseTypeData.map((t) => t.name);
    const eff = computeDefensiveEffectiveness(
      typeNames
        .map((name) => {
          const type = baseTypeData.find((t) => t.name === name);
          return type ? { name: type.name, relations: type.damage_relations } : null;
        })
        .filter((t): t is NonNullable<typeof t> => t !== null),
    );
    return categorizeEffectiveness(eff);
  }, [isMegaSelected, megaData, baseTypeData]);

  const abilityEntries: AbilityEntry[] = useMemo(() => {
    return pokemon.abilities.map((slot, i) => ({
      slot,
      data: baseAbilityData[i] ?? null,
    }));
  }, [pokemon.abilities, baseAbilityData]);

  const isLegendary = species.is_legendary;
  const isMythical = species.is_mythical;

  return (
    <div className="mb-8 grid items-start gap-6 lg:grid-cols-2">
      {/* Columna izquierda: header */}
      <header className="rounded-lg border bg-card p-6">
        <div className="flex flex-col items-center justify-center">
          {megaLoading && selectedMega ? (
            <Skeleton className="size-64 rounded-lg" />
          ) : (
            <SpriteViewer
              name={pokemon.name}
              artwork={artwork}
              artworkShiny={artworkShiny}
              defaultSprite={defaultSprite}
            />
          )}
        </div>

        <div className="flex flex-col justify-center gap-4">
          {/* Toggle de formas mega */}
          {megaVarieties.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedMega(null)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  !selectedMega
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent",
                )}
              >
                {t("mega.base")}
              </button>
              {megaVarieties.map((mv) => (
                <button
                  key={mv.name}
                  type="button"
                  onClick={() => setSelectedMega(mv)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    selectedMega?.name === mv.name
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent",
                  )}
                >
                  {mv.label}
                </button>
              ))}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">
                {selectedMega ? selectedMega.label : displayName}
              </h1>
              {selectedMega && (
                <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
                  {t("mega.badge")}
                </span>
              )}
              {(isLegendary || isMythical) && !selectedMega && (
                <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-semibold text-yellow-600 dark:text-yellow-400">
                  {isMythical ? t("mythical") : t("legendary")}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{genus}</p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {pokemon.types.map(({ type }) => (
              <TypeBadge key={type.name} type={type.name} size="md" />
            ))}
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">{t("height")}</dt>
              <dd className="font-medium">{formatHeight(pokemon.height)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("weight")}</dt>
              <dd className="font-medium">{formatWeight(pokemon.weight)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("baseExp")}</dt>
              <dd className="font-medium">{pokemon.base_experience ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("happiness")}</dt>
              <dd className="font-medium">{species.base_happiness}</dd>
            </div>
          </dl>

          {flavorText && (
            <p className="text-sm italic text-muted-foreground">&ldquo;{flavorText}&rdquo;</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/comparar?ids=${pokemon.id}`}>{t("compare")}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/efectividades?defender=${pokemon.id}`}>{t("calculate")}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Columna derecha: stats + habilidades + efectividades */}
      <div className="flex flex-col gap-6">
        <section>
          <h2 className="mb-4 text-xl font-semibold">{t("sections.baseStats")}</h2>
          <div className="flex flex-col gap-2">
            {pokemon.stats.map((s) => (
              <StatBar key={s.stat.name} statName={s.stat.name} value={s.base_stat} />
            ))}
            <div className="grid grid-cols-[5rem_2.5rem_1fr] items-center gap-2 border-t pt-2">
              <span className="text-xs font-semibold">{t("statsTotal")}</span>
              <span className="text-right font-mono text-xs font-bold tabular-nums">
                {computeStatTotal(pokemon.stats)}
              </span>
              <span />
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold">{t("sections.abilities")}</h2>
          <AbilitiesSection abilities={abilityEntries} />
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold">{t("sections.defensiveEffectiveness")}</h2>
          <TypeEffectiveness breakdown={effectiveness} />
        </section>
      </div>
    </div>
  );
}
