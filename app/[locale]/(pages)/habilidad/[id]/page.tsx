import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { AbilityDetail } from "@/components/pokemon/AbilityDetail";
import { getAbility, PokeAPIError } from "@/lib/pokeapi";

export const revalidate = 86_400;

interface PageProps {
  params: { locale: string; id: string };
}

export async function generateStaticParams(): Promise<{ locale: string; id: string }[]> {
  const params: { locale: string; id: string }[] = [];
  for (const locale of routing.locales) {
    for (let id = 1; id <= 300; id++) {
      params.push({ locale, id: String(id) });
    }
  }
  return params;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const id = Number(params.id);
  if (!Number.isFinite(id) || id < 1) return {};

  try {
    const ability = await getAbility(id);
    const lang = params.locale;
    const nameEs =
      ability.names.find((n) => n.language.name === lang)?.name ??
      ability.names.find((n) => n.language.name === "es")?.name ??
      ability.names.find((n) => n.language.name === "en")?.name ??
      ability.name;

    const flavorEs = ability.flavor_text_entries.find((e) => e.language.name === lang);
    const flavorEn = ability.flavor_text_entries.find((e) => e.language.name === "es");
    const flavor = flavorEs ?? flavorEn;

    return {
      title: `${nameEs} — Habilidades — CompetiDex`,
      description: flavor?.flavor_text?.replace(/\f|\n/g, " ").trim() ?? null,
    };
  } catch {
    return { title: "Habilidad no encontrada — CompetiDex" };
  }
}

export default async function AbilityPage({ params }: PageProps) {
  setRequestLocale(params.locale);

  const id = Number(params.id);
  if (!Number.isFinite(id) || id < 1) notFound();

  try {
    const ability = await getAbility(id);
    return <AbilityDetail ability={ability} locale={params.locale} />;
  } catch (err) {
    if (err instanceof PokeAPIError && err.status === 404) notFound();
    throw err;
  }
}
