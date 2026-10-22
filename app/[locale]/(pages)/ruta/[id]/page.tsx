import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { LocationAreaDetail } from "@/components/pokemon/LocationAreaDetail";
import { getLocationArea, PokeAPIError } from "@/lib/pokeapi";
import { getLocalizedLocationNames } from "@/lib/location-area-names";
import { resolveLocationName } from "@/lib/location-names";
import { getLocationAreaEncounterRows, getLocationAreaVersions } from "@/lib/location-encounters";

export const revalidate = 86_400;

interface PageProps {
  params: { locale: string; id: string };
  searchParams: { game?: string | string[] };
}

function parseAreaId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function loadAreaName(id: number, locale: string): Promise<string> {
  const area = await getLocationArea(id);
  const localized = await getLocalizedLocationNames([id]);
  const tSuffixes = await getTranslations({ locale, namespace: "locationSuffixes" });
  const suffixLabel = (suffix: string) => {
    const label = tSuffixes(suffix);
    return label === `locationSuffixes.${suffix}` ? null : label;
  };

  return resolveLocationName({
    areaName: area.name,
    locale,
    localized: localized[String(id)],
    suffixLabel,
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const id = parseAreaId(params.id);
  if (id === null) return {};

  try {
    const name = await loadAreaName(id, params.locale);
    return {
      title: `${name} — Rutas — CompetiDex`,
      description: `Pokémon que aparecen en ${name}.`,
    };
  } catch {
    return { title: "Ruta no encontrada — CompetiDex" };
  }
}

export default async function LocationAreaPage({ params, searchParams }: PageProps) {
  setRequestLocale(params.locale);

  const id = parseAreaId(params.id);
  if (id === null) notFound();

  const area = await getLocationArea(id).catch((err: unknown) => {
    if (err instanceof PokeAPIError && err.status === 404) notFound();
    throw err;
  });

  const games = getLocationAreaVersions(area);
  const requested = typeof searchParams.game === "string" ? searchParams.game : undefined;
  const selectedGame = games.includes(requested ?? "") ? requested : games[0];
  const rows = selectedGame ? getLocationAreaEncounterRows(area, selectedGame) : [];
  const areaName = await loadAreaName(id, params.locale);

  return (
    <LocationAreaDetail areaName={areaName} rows={rows} games={games} selectedGame={selectedGame} />
  );
}
