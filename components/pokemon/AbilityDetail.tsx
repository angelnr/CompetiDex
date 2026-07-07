import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import type { Ability } from "@/lib/pokeapi";
import {
  capitalize,
  extractIdFromUrl,
  formatPokedexId,
  getPixelSpriteById,
} from "@/lib/pokemon-utils";

export interface AbilityDetailProps {
  ability: Ability;
  locale?: string;
}

export function AbilityDetail({ ability, locale = "es" }: AbilityDetailProps) {
  const t = useTranslations("abilities");
  const lang = locale;
  const nameEs =
    ability.names.find((n) => n.language.name === lang)?.name ??
    ability.names.find((n) => n.language.name === "es")?.name ??
    ability.names.find((n) => n.language.name === "en")?.name ??
    ability.name;
  const nameEn = ability.names.find((n) => n.language.name === "en")?.name ?? ability.name;

  const flavorEs = ability.flavor_text_entries.find((e) => e.language.name === lang);
  const flavorEn = ability.flavor_text_entries.find((e) => e.language.name === "es");
  const descEs = (flavorEs ?? flavorEn)?.flavor_text?.replace(/\f|\n/g, " ").trim() ?? null;

  const pokemonList = ability.pokemon
    .filter((p) => {
      const id = extractIdFromUrl(p.pokemon.url);
      return id <= 1025;
    })
    .sort((a, b) => {
      const idA = extractIdFromUrl(a.pokemon.url);
      const idB = extractIdFromUrl(b.pokemon.url);
      return idA - idB;
    });

  return (
    <article className="container mx-auto max-w-3xl py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">{nameEs ?? nameEn}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {nameEs ? `${nameEn} (${capitalize(ability.name)})` : capitalize(ability.name)}
        </p>
      </header>

      {descEs && (
        <section className="mb-8">
          <h2 className="mb-2 text-lg font-semibold">{t("description")}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{descEs}</p>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold">
          {t("pokemonWithAbility", { count: pokemonList.length })}
        </h2>

        {pokemonList.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noPokemon")}</p>
        ) : (
          <ul className="space-y-2">
            {pokemonList.map((p) => {
              const id = extractIdFromUrl(p.pokemon.url);

              return (
                <li
                  key={p.pokemon.name}
                  className="flex items-center gap-3 rounded-md border px-4 py-2"
                >
                  <Image
                    src={getPixelSpriteById(id)}
                    alt=""
                    width={32}
                    height={32}
                    className="size-8 shrink-0 object-contain"
                  />
                  <Link
                    href={`/pokemon/${id}`}
                    className="flex items-center gap-2 text-sm font-medium hover:underline"
                  >
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatPokedexId(id)}
                    </span>
                    {capitalize(p.pokemon.name.replace(/-/g, " "))}
                  </Link>
                  <Badge variant={p.is_hidden ? "secondary" : "outline"} className="text-[10px]">
                    {p.is_hidden ? t("hidden") : t("slot", { slot: p.slot })}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </article>
  );
}
