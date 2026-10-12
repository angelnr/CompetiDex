"use client";

import { Link } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Ability, PokemonAbilitySlot } from "@/lib/pokeapi";
import { extractIdFromUrl, getFlavorText, getName } from "@/lib/pokemon-utils";

export interface AbilityEntry {
  slot: PokemonAbilitySlot;
  data: Ability | null;
}

export interface AbilitiesSectionProps {
  abilities: AbilityEntry[];
}

/** "solar-power" → "Solar Power" (fallback cuando no hay dato localizado). */
function titleCase(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function AbilitiesSection({ abilities }: AbilitiesSectionProps) {
  const t = useTranslations("abilities");
  const locale = useLocale();
  return (
    <div className="flex flex-wrap gap-4">
      {abilities.map((entry) => {
        const ability = entry.data;
        const abilityId = ability ? ability.id : extractIdFromUrl(entry.slot.ability.url);
        const canonical = titleCase(ability?.name ?? entry.slot.ability.name);
        const display = ability ? getName(ability.names, ability.name, locale) : canonical;

        const description = ability
          ? (getFlavorText(ability.flavor_text_entries, locale) ??
            ability.effect_entries.find((e) => e.language.name === "en")?.short_effect ??
            null)
          : null;

        const tagLabel = entry.slot.is_hidden ? t("hidden") : t("slot", { slot: entry.slot.slot });

        return (
          <TooltipProvider key={entry.slot.ability.name} delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={`/habilidad/${abilityId}`}
                  className="group flex flex-col rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
                  aria-label={t("toolTipAria", { name: display })}
                >
                  <span className="flex items-center gap-2 font-medium">
                    {display}
                    {display !== canonical && (
                      <span className="text-xs text-muted-foreground">({canonical})</span>
                    )}
                  </span>
                  <Badge
                    variant={entry.slot.is_hidden ? "secondary" : "outline"}
                    className="mt-1 w-fit text-[10px]"
                  >
                    {tagLabel}
                  </Badge>
                </Link>
              </TooltipTrigger>
              {description && (
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs leading-relaxed">{description}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}
