import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { PokemonDetail } from "@/components/pokemon/PokemonDetail";
import {
  getAbility,
  getEncounters,
  getEvolutionChain,
  getPokemon,
  getPokemonSpecies,
  getType,
  PokeAPIError,
} from "@/lib/pokeapi";
import {
  extractIdFromUrl,
  capitalize,
  getOfficialArtworkById,
  getMegaVarieties,
} from "@/lib/pokemon-utils";

const STATIC_RANGE = { min: 1, max: 151 };
export const revalidate = 86_400;

interface PageProps {
  params: { locale: string; id: string };
}

export async function generateStaticParams(): Promise<{ locale: string; id: string }[]> {
  const params: { locale: string; id: string }[] = [];
  for (const locale of routing.locales) {
    for (let id = STATIC_RANGE.min; id <= STATIC_RANGE.max; id++) {
      params.push({ locale, id: String(id) });
    }
  }
  return params;
}

async function loadPokemonData(id: number) {
  try {
    const pokemon = await getPokemon(id);
    const speciesId = extractIdFromUrl(pokemon.species.url);
    const species = await getPokemonSpecies(speciesId);
    const evolutionChainId = extractIdFromUrl(species.evolution_chain.url);
    const evolutionChain = await getEvolutionChain(evolutionChainId);
    const typeData = await Promise.all(pokemon.types.map((t) => getType(t.type.name)));
    const abilityData = await Promise.all(
      pokemon.abilities.map((a) => getAbility(extractIdFromUrl(a.ability.url)).catch(() => null)),
    );
    const encounters = await getEncounters(id).catch(() => null);
    return { pokemon, species, evolutionChain, typeData, abilityData, encounters };
  } catch (err) {
    if (err instanceof PokeAPIError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const id = Number(params.id);
  if (!Number.isFinite(id) || id < 1) return {};

  try {
    const pokemon = await getPokemon(id);
    const speciesId = extractIdFromUrl(pokemon.species.url);
    const species = await getPokemonSpecies(speciesId);
    const lang = params.locale;
    const name =
      species.names.find((n) => n.language.name === lang)?.name ??
      species.names.find((n) => n.language.name === "es")?.name ??
      capitalize(pokemon.name);

    const flavorEs = species.flavor_text_entries.find((e) => e.language.name === lang);
    const flavorEn = species.flavor_text_entries.find((e) => e.language.name === "en");
    const description =
      (flavorEs ?? flavorEn)?.flavor_text?.replace(/\f|\n/g, " ").trim() ?? `Ficha de ${name}`;

    const image = getOfficialArtworkById(id);

    const openGraph: Metadata["openGraph"] = {
      title: name,
      description,
    };
    if (image) {
      openGraph.images = [{ url: image, width: 475, height: 475 }];
    }

    return {
      title: `${name} (#${String(id).padStart(4, "0")}) — CompetiDex`,
      description,
      openGraph,
    };
  } catch {
    return { title: "Pokémon no encontrado — CompetiDex" };
  }
}

export default async function PokemonPage({ params }: PageProps) {
  setRequestLocale(params.locale);

  const id = Number(params.id);
  if (!Number.isFinite(id) || id < 1) {
    notFound();
  }

  const data = await loadPokemonData(id);
  if (!data) notFound();

  const { pokemon, species, evolutionChain, typeData, abilityData, encounters } = data;

  const prevId = id > 1 ? id - 1 : null;
  const nextId = id + 1;
  const megaVarieties = getMegaVarieties(species);

  return (
    <PokemonDetail
      pokemon={pokemon}
      species={species}
      evolutionChain={evolutionChain}
      typeData={typeData}
      abilityData={abilityData}
      encounters={encounters}
      prevId={prevId}
      nextId={nextId}
      locale={params.locale}
      megaVarieties={megaVarieties}
    />
  );
}
