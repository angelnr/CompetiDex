import Image from "next/image";
import { Link } from "@/i18n/routing";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { EncounterInfo } from "@/components/pokemon/EncounterInfo";
import { EvolutionChain } from "@/components/pokemon/EvolutionChain";
import { MovesSection } from "@/components/pokemon/MovesSection";
import { PokemonFormContent } from "@/components/pokemon/PokemonFormContent";
import { SearchBar } from "@/components/pokemon/SearchBar";
import { StatsCalculator } from "@/components/pokemon/StatsCalculator";
import { Button } from "@/components/ui/button";
import type {
  Pokemon,
  PokemonSpecies,
  EvolutionChain as EvolutionChainType,
  Type,
  LocationAreaEncounter,
  Ability,
} from "@/lib/pokeapi";
import type { MegaVarietyInfo } from "@/lib/pokemon-utils";
import { formatPokedexId } from "@/lib/pokemon-utils";

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
  megaVarieties: MegaVarietyInfo[];
}

/**
 * Ficha detallada del Pokémon (server component).
 * Orquesta todas las secciones: navegación, ficha (con toggle mega), cadena
 * evolutiva, encuentros y movimientos.
 * El contenido principal sensible al cambio de forma (sprite, stats, tipos,
 * habilidades, efectividades) vive en <PokemonFormContent /> (client).
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
  megaVarieties,
}: PokemonDetailProps) {
  const t = await getTranslations({ locale, namespace: "pokemon" });
  const tc = await getTranslations({ locale, namespace: "common" });

  return (
    <article className="container mx-auto max-w-6xl py-8">
      {/* Buscador */}
      <div className="mb-6">
        <SearchBar showSprite />
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

      {/* Ficha principal (client component con toggle mega) */}
      <PokemonFormContent
        pokemon={pokemon}
        species={species}
        typeData={typeData}
        abilityData={abilityData}
        megaVarieties={megaVarieties}
        locale={locale}
      />

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

      {/* Calculadora de estadísticas */}
      <Section title={t("sections.statsCalculator")}>
        <StatsCalculator stats={pokemon.stats} />
      </Section>
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
