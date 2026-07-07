import Image from "next/image";
import { Link } from "@/i18n/routing";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { AbilitiesSection, type AbilityEntry } from "@/components/pokemon/AbilitiesSection";
import { EncounterInfo } from "@/components/pokemon/EncounterInfo";
import { EvolutionChain } from "@/components/pokemon/EvolutionChain";
import { MovesSection } from "@/components/pokemon/MovesSection";
import { SearchBar } from "@/components/pokemon/SearchBar";
import { SpriteViewer } from "@/components/pokemon/SpriteViewer";
import { StatBar } from "@/components/pokemon/StatBar";
import { TypeBadge } from "@/components/pokemon/TypeBadge";
import { TypeEffectiveness } from "@/components/pokemon/TypeEffectiveness";
import { Button } from "@/components/ui/button";
import type {
  Pokemon,
  PokemonSpecies,
  EvolutionChain as EvolutionChainType,
  Type,
  LocationAreaEncounter,
  Ability,
} from "@/lib/pokeapi";
import {
  capitalize,
  computeStatTotal,
  formatHeight,
  formatWeight,
  formatPokedexId,
  getDisplayName,
  getFlavorText,
  getGenus,
  getOfficialArtwork,
} from "@/lib/pokemon-utils";
import { categorizeEffectiveness, computeDefensiveEffectiveness } from "@/lib/type-effectiveness";

export interface PokemonDetailProps {
  pokemon: Pokemon;
  species: PokemonSpecies;
  evolutionChain: EvolutionChainType;
  typeData: Type[];
  abilityData: (Ability | null)[];
  encounters: LocationAreaEncounter[] | null;
  prevId: number | null;
  nextId: number | null;
  locale: string;
}

/**
 * Ficha detallada del Pokémon (server component).
 * Orquesta todas las secciones: header con sprite, tipos, stats, habilidades,
 * físicas info, flavor text, cadena evolutiva, efectividades, encuentros y movimientos.
 * La navegación prev/next son Links a fichas vecinas.
 */
export async function PokemonDetail({
  pokemon,
  species,
  evolutionChain,
  typeData,
  abilityData,
  encounters,
  prevId,
  nextId,
  locale,
}: PokemonDetailProps) {
  const t = await getTranslations({ locale, namespace: "pokemon" });
  const tc = await getTranslations({ locale, namespace: "common" });

  const displayName = getDisplayName(species.names, pokemon.name, locale);
  const flavorText = getFlavorText(species.flavor_text_entries, locale);
  const genus = getGenus(species.genera, locale);
  const artwork = getOfficialArtwork(pokemon);
  const artworkShiny = pokemon.sprites.other?.["official-artwork"]?.front_shiny ?? null;
  const defaultSprite = pokemon.sprites.front_default;

  const effectiveness = categorizeEffectiveness(
    computeDefensiveEffectiveness(
      typeData.map((t) => ({ name: t.name, relations: t.damage_relations })),
    ),
  );

  const isLegendary = species.is_legendary;
  const isMythical = species.is_mythical;

  return (
    <article className="container mx-auto max-w-5xl py-8">
      {/* Buscador */}
      <div className="mb-6">
        <SearchBar />
      </div>

      {/* Navegación prev/next */}
      <nav className="mb-6 flex items-center justify-between" aria-label={t("navAria")}>
        {prevId !== null ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/pokemon/${prevId}`}>
              <ArrowLeft className="size-4" />
              {tc("previous")}
            </Link>
          </Button>
        ) : (
          <span />
        )}
        <span className="font-mono text-sm text-muted-foreground">
          {formatPokedexId(pokemon.id)}
        </span>
        {nextId !== null ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/pokemon/${nextId}`}>
              {tc("next")}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        ) : (
          <span />
        )}
      </nav>

      {/* Header */}
      <header className="mb-8 grid gap-6 rounded-lg border bg-card p-6 md:grid-cols-2">
        <div className="flex flex-col items-center justify-center">
          <SpriteViewer
            name={pokemon.name}
            artwork={artwork}
            artworkShiny={artworkShiny}
            defaultSprite={defaultSprite}
          />
        </div>

        <div className="flex flex-col justify-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{displayName}</h1>
              {(isLegendary || isMythical) && (
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

          {flavorText && <p className="text-sm italic text-muted-foreground">“{flavorText}”</p>}

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

      {/* Stats */}
      <Section title={t("sections.baseStats")}>
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
      </Section>

      {/* Habilidades */}
      <Section title={t("sections.abilities")}>
        <AbilitiesSection
          abilities={abilityData.map((data, i) => ({
            slot: pokemon.abilities[i]!,
            data,
          }))}
        />
      </Section>

      {/* Efectividades */}
      <Section title={t("sections.defensiveEffectiveness")}>
        <TypeEffectiveness breakdown={effectiveness} />
      </Section>

      {/* Cadena evolutiva */}
      {evolutionChain.chain && (
        <Section title={t("sections.evolutionChain")}>
          <EvolutionChain chain={evolutionChain.chain} />
        </Section>
      )}

      {/* Información de encuentro */}
      <Section title={t("sections.encounterInfo")}>
        <EncounterInfo encounters={encounters} />
      </Section>

      {/* Movimientos */}
      {pokemon.moves.length > 0 && (
        <Section title={t("sections.moves")}>
          <MovesSection moveSlots={pokemon.moves} />
        </Section>
      )}
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}
