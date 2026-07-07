"use client";

import { Link } from "@/i18n/routing";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Ability, PokemonAbilitySlot } from "@/lib/pokeapi";
import { extractIdFromUrl } from "@/lib/pokemon-utils";
import { useTranslations } from "next-intl";

export interface AbilityEntry {
  slot: PokemonAbilitySlot;
  data: Ability | null;
}

export interface AbilitiesSectionProps {
  abilities: AbilityEntry[];
}

export function AbilitiesSection({ abilities }: AbilitiesSectionProps) {
  const t = useTranslations("abilities");
  return (
    <div className="flex flex-wrap gap-4">
      {abilities.map((entry) => {
        const ability = entry.data;
        const abilityId = ability ? ability.id : extractIdFromUrl(entry.slot.ability.url);
        const nameEs = ability ? ability.names.find((n) => n.language.name === "es")?.name : null;
        const nameEn = ability
          ? (ability.names.find((n) => n.language.name === "en")?.name ?? entry.slot.ability.name)
          : entry.slot.ability.name;

        const descEs = ability
          ? (ability.flavor_text_entries
              .find((e) => e.language.name === "es")
              ?.flavor_text?.replace(/\f|\n/g, " ")
              .trim() ??
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
                  aria-label={t("toolTipAria", { name: nameEs ?? "" })}
                >
                  <span className="flex items-center gap-2 font-medium">
                    {nameEs ?? nameEn}
                    <span className="text-xs text-muted-foreground">
                      ({capitalizeName(nameEn)})
                    </span>
                  </span>
                  <Badge
                    variant={entry.slot.is_hidden ? "secondary" : "outline"}
                    className="mt-1 w-fit text-[10px]"
                  >
                    {tagLabel}
                  </Badge>
                </Link>
              </TooltipTrigger>
              {descEs && (
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs leading-relaxed">{descEs}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}

function capitalizeName(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}
