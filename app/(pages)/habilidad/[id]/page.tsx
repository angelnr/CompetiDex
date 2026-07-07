import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { AbilityDetail } from "@/components/pokemon/AbilityDetail";
import { getAbility, PokeAPIError } from "@/lib/pokeapi";

export const revalidate = 86_400;

interface PageProps {
  params: { id: string };
}

export async function generateStaticParams(): Promise<{ id: string }[]> {
  const params: { id: string }[] = [];
  for (let id = 1; id <= 300; id++) {
    params.push({ id: String(id) });
  }
  return params;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const id = Number(params.id);
  if (!Number.isFinite(id) || id < 1) return {};

  try {
    const ability = await getAbility(id);
    const nameEs = ability.names.find((n) => n.language.name === "es")?.name ?? null;
    const nameEn = ability.names.find((n) => n.language.name === "en")?.name ?? ability.name;

    return {
      title: `${nameEs ?? nameEn} — Habilidades — CompetiDex`,
      description:
        ability.flavor_text_entries
          .find((e) => e.language.name === "es")
          ?.flavor_text?.replace(/\f|\n/g, " ")
          .trim() ?? null,
    };
  } catch {
    return { title: "Habilidad no encontrada — CompetiDex" };
  }
}

export default async function AbilityPage({ params }: PageProps) {
  const id = Number(params.id);
  if (!Number.isFinite(id) || id < 1) notFound();

  try {
    const ability = await getAbility(id);
    return <AbilityDetail ability={ability} />;
  } catch (err) {
    if (err instanceof PokeAPIError && err.status === 404) notFound();
    throw err;
  }
}
