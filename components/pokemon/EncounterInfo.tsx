"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LocationAreaEncounter } from "@/lib/pokeapi";
import { capitalize, extractIdFromUrl } from "@/lib/pokemon-utils";
import { resolveLocationName } from "@/lib/location-names";
import { useLocationAreaNames } from "@/lib/queries";
import { isExcludedVersion, versionOrder } from "@/lib/version-names";

export interface EncounterInfoProps {
  encounters?: LocationAreaEncounter[] | null;
}

export function EncounterInfo({ encounters }: EncounterInfoProps) {
  const [selectedVersion, setSelectedVersion] = useState<string | undefined>();
  const locale = useLocale();
  const t = useTranslations("encounters");
  const tMethods = useTranslations("encounterMethods");
  const tVersions = useTranslations("versions");
  const tSuffixes = useTranslations("locationSuffixes");

  const versionLabel = (v: string) => {
    const label = tVersions(v);
    return label === `versions.${v}` || label === v ? capitalize(v.replace(/-/g, " ")) : label;
  };

  const versionNames = useMemo(
    () => (encounters && encounters.length > 0 ? getUniqueVersions(encounters) : []),
    [encounters],
  );
  const currentVersion = selectedVersion ?? versionNames[0];

  // Solo se piden los nombres de las áreas de la versión visible. El español
  // resuelve primero con el diccionario curado; PokeAPI cubre el resto.
  const locationAreaIds = useMemo(
    () =>
      encounters && currentVersion ? getVersionLocationAreaIds(encounters, currentVersion) : [],
    [encounters, currentVersion],
  );
  const { data: localizedNames } = useLocationAreaNames(locationAreaIds);

  const suffixLabel = (suffix: string) => {
    const label = tSuffixes(suffix);
    return label === `locationSuffixes.${suffix}` ? null : label;
  };

  if (!encounters || encounters.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noEncounters")}</p>;
  }

  const rows = encounters.flatMap((area) =>
    area.version_details
      .filter((vd) => vd.version.name === currentVersion)
      .flatMap((vd) =>
        vd.encounter_details.map((ed) => ({
          location: area.location_area.name,
          locationAreaId: extractIdFromUrl(area.location_area.url),
          method: ed.method.name,
          minLevel: ed.min_level,
          maxLevel: ed.max_level,
          chance: ed.chance,
        })),
      ),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label htmlFor="version-select" className="text-sm font-medium">
          {t("gameLabel")}
        </label>
        <Select value={currentVersion ?? ""} onValueChange={setSelectedVersion}>
          <SelectTrigger id="version-select" className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {versionNames.map((v) => (
              <SelectItem key={v} value={v}>
                {versionLabel(v)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noWildInGame")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("table.route")}</TableHead>
              <TableHead>{t("table.method")}</TableHead>
              <TableHead>{t("table.minLevel")}</TableHead>
              <TableHead>{t("table.maxLevel")}</TableHead>
              <TableHead>{t("table.chance")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">
                  {resolveLocationName({
                    areaName: r.location,
                    locale,
                    localized: localizedNames?.[String(r.locationAreaId)],
                    suffixLabel,
                  })}
                </TableCell>
                <TableCell>{formatMethodName(r.method, tMethods)}</TableCell>
                <TableCell>{r.minLevel}</TableCell>
                <TableCell>{r.maxLevel}</TableCell>
                <TableCell>{r.chance}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function getUniqueVersions(encounters: LocationAreaEncounter[]): string[] {
  const seen = new Set<string>();
  for (const area of encounters) {
    for (const vd of area.version_details) {
      if (!isExcludedVersion(vd.version.name)) {
        seen.add(vd.version.name);
      }
    }
  }
  return Array.from(seen).sort(versionOrder);
}

/** Ids de las áreas de localización con encuentros en la versión indicada. */
function getVersionLocationAreaIds(encounters: LocationAreaEncounter[], version: string): number[] {
  const ids = new Set<number>();
  for (const area of encounters) {
    if (area.version_details.some((vd) => vd.version.name === version)) {
      ids.add(extractIdFromUrl(area.location_area.url));
    }
  }
  return Array.from(ids).sort((a, b) => a - b);
}

function formatMethodName(name: string, t: (key: string) => string): string {
  const label = t(name);
  return label === `encounterMethods.${name}` || label === name
    ? capitalize(name.replace(/-/g, " "))
    : label;
}
