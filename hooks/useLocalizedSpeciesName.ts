"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";

import { usePokemonSpecies } from "@/lib/queries";
import {
  baseSpeciesSlug,
  formatSpeciesLabel,
  getName,
  speciesLabelWithGender,
} from "@/lib/pokemon-utils";

/**
 * Devuelve el nombre de especie localizado para cualquier slug de Pokémon,
 * resolviéndolo contra `/pokemon-species/{especie base}` (cacheado en Redis y
 * TanStack Query). Conserva el marcador de género: "basculegion-female" →
 * "Basculegion (F)".
 *
 * Mientras el nombre localizado carga (o si falla), cae al slug formateado en
 * inglés, de modo que la UI nunca queda vacía.
 */
export function useLocalizedSpeciesName(slug: string | null | undefined): string {
  const locale = useLocale();
  const base = slug ? baseSpeciesSlug(slug) : undefined;
  const { data } = usePokemonSpecies(base);

  return useMemo(() => {
    if (!slug) return "";
    if (!data) return formatSpeciesLabel(slug);
    const localized = getName(data.names, base ?? slug, locale);
    return speciesLabelWithGender(localized, slug);
  }, [slug, data, base, locale]);
}
