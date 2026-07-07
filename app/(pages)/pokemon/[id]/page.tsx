import { notFound } from "next/navigation";
import type { Metadata } from "next";

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
import { extractIdFromUrl, capitalize, getOfficialArtworkById } from "@/lib/pokemon-utils";

/**
 * Pre-renderiza Gen 1 (ids 1-151) estáticamente. Gen 2+ se renderiza
 * on-demand en el primer request y se cachea vía ISR (`revalidate`).
 * Rango reducido desde el nominal "Gen 1-5" del AGENTS.md §4.7 para
 * mantener tiempos de build razonables (~151 páginas × 4 fetches).
 * Con Redis caliente se puede ampliar/el resto va por ISR.
 */
const STATIC_RANGE = { min: 1, max: 151 };

export async function generateStaticParams(): Promise<{ id: string }[]> {
  const params: { id: string }[] = [];
  for (let id = STATIC_RANGE.min; id <= STATIC_RANGE.max; id++) {
    params.push({ id: String(id) });
  }
  return params;
}

/** Revalidación ISR para fichas no pre-renderizadas (Gen 6+). */
export const revalidate = 86_400; // 24h

interface PageProps {
  params: { id: string };
}

async function loadPokemonData(id: number) {
  try {
    const pokemon = await getPokemon(id);
    const species = await getPokemonSpecies(id);
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
    const species = await getPokemonSpecies(id);
    const name =
      species.names.find((n) => n.language.name === "es")?.name ?? capitalize(pokemon.name);
    const description =
      species.flavor_text_entries
        .find((e) => e.language.name === "es")
        ?.flavor_text?.replace(/\f|\n/g, " ")
        .trim() ?? `Ficha de ${name}`;
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
  const id = Number(params.id);
  if (!Number.isFinite(id) || id < 1) {
    notFound();
  }

  const data = await loadPokemonData(id);
  if (!data) notFound();

  const { pokemon, species, evolutionChain, typeData, abilityData, encounters } = data;

  // Navegación prev/next.
  // PokeAPI lista Pokémon por orden de Pokédex nacional, ids secuenciales 1..N.
  // Evitamos 0; el límite superior se maneja con bounds + 1 y se ajusta
  // si la siguiente ficha no existe (raro, solo al final de la lista).
  const prevId = id > 1 ? id - 1 : null;
  const nextId = id + 1; // Si no existe, el usuario verá 404 — acceptable; el SSR no peta.

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
    />
  );
}
