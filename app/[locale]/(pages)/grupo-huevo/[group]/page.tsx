import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { EggGroupDetail } from "@/components/pokemon/EggGroupDetail";
import { getEggGroup, PokeAPIError } from "@/lib/pokeapi";
import { extractIdFromUrl, getName } from "@/lib/pokemon-utils";

export const revalidate = 86_400;

interface PageProps {
  params: { locale: string; group: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  if (!params.group) return {};

  try {
    const group = await getEggGroup(params.group);
    const name = getName(group.names, group.name, params.locale);
    return {
      title: `${name} — Grupos huevo — CompetiDex`,
      description: `Especies en el grupo huevo ${name}.`,
    };
  } catch {
    return { title: "Grupo huevo no encontrado — CompetiDex" };
  }
}

export default async function EggGroupPage({ params }: PageProps) {
  setRequestLocale(params.locale);

  if (!params.group) notFound();

  const group = await getEggGroup(params.group).catch((err: unknown) => {
    if (err instanceof PokeAPIError && err.status === 404) notFound();
    throw err;
  });

  const groupName = getName(group.names, group.name, params.locale);
  const species = group.pokemon_species
    .map((entry) => ({
      id: extractIdFromUrl(entry.url),
      name: entry.name,
    }))
    .sort((a, b) => a.id - b.id);

  return <EggGroupDetail groupName={groupName} species={species} />;
}
