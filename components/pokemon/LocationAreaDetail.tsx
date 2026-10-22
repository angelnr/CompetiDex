"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/routing";
import { MoveGameSelect } from "@/components/pokemon/MoveGameSelect";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  groupLocationEncounters,
  type LocationEncounterRow,
  type LocationSpeciesRow,
} from "@/lib/location-encounters";
import {
  capitalize,
  formatPokedexId,
  formatSpeciesLabel,
  getPixelSpriteById,
} from "@/lib/pokemon-utils";

export interface LocationAreaDetailProps {
  areaName: string;
  rows: LocationEncounterRow[];
  games: string[];
  selectedGame: string | undefined;
}

export function LocationAreaDetail({
  areaName,
  rows,
  games,
  selectedGame,
}: LocationAreaDetailProps) {
  const t = useTranslations("locationArea");
  const tEncounters = useTranslations("encounters");
  const tMethods = useTranslations("encounterMethods");
  const tConditions = useTranslations("encounterConditions");
  const tVersions = useTranslations("versions");
  const [detailed, setDetailed] = useState(false);
  const grouped = useMemo(() => groupLocationEncounters(rows), [rows]);

  const versionLabel = (version: string) => {
    const label = tVersions(version);
    return label === `versions.${version}` || label === version
      ? capitalize(version.replace(/-/g, " "))
      : label;
  };

  const options = games.map((game) => ({ value: game, label: versionLabel(game) }));

  return (
    <article className="container mx-auto max-w-5xl py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">{areaName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("pokemonCount", { count: grouped.length })}
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{tEncounters("gameLabel")}</span>
          <MoveGameSelect value={selectedGame} options={options} label={tEncounters("gameLabel")} />
        </div>
        {rows.length > 0 && (
          <Button
            type="button"
            variant={detailed ? "default" : "outline"}
            size="sm"
            onClick={() => setDetailed((value) => !value)}
            aria-pressed={detailed}
          >
            {detailed ? t("groupedView") : t("detailView")}
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noEncounters")}</p>
      ) : detailed ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("pokemon")}</TableHead>
              <TableHead>{tEncounters("table.method")}</TableHead>
              <TableHead>{tEncounters("table.time")}</TableHead>
              <TableHead>{tEncounters("table.minLevel")}</TableHead>
              <TableHead>{tEncounters("table.maxLevel")}</TableHead>
              <TableHead>{tEncounters("table.chance")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={`${row.pokemonId}-${row.method}-${row.minLevel}-${row.maxLevel}-${row.chance}-${row.time.join(",")}`}
              >
                <TableCell>
                  <PokemonCell pokemonId={row.pokemonId} pokemonName={row.pokemonName} />
                </TableCell>
                <TableCell>{formatMethodName(row.method, tMethods)}</TableCell>
                <TableCell>
                  {row.time.length > 0
                    ? row.time.map((name) => formatCondition(name, tConditions)).join(" · ")
                    : tEncounters("anyTime")}
                </TableCell>
                <TableCell>{row.minLevel}</TableCell>
                <TableCell>{row.maxLevel}</TableCell>
                <TableCell>{row.chance}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("pokemon")}</TableHead>
              <TableHead>{tEncounters("table.method")}</TableHead>
              <TableHead>{tEncounters("table.time")}</TableHead>
              <TableHead>{tEncounters("table.minLevel")}</TableHead>
              <TableHead>{tEncounters("table.maxLevel")}</TableHead>
              <TableHead>{tEncounters("table.chance")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grouped.map((row) => (
              <TableRow key={row.pokemonId}>
                <TableCell>
                  <PokemonCell pokemonId={row.pokemonId} pokemonName={row.pokemonName} />
                </TableCell>
                <TableCell>
                  {row.methods.map((method) => formatMethodName(method, tMethods)).join(", ")}
                </TableCell>
                <TableCell>
                  {formatSpeciesTimes(row, tConditions, tEncounters("anyTime"))}
                </TableCell>
                <TableCell>{row.minLevel}</TableCell>
                <TableCell>{row.maxLevel}</TableCell>
                <TableCell>{row.chances.map((chance) => `${chance}%`).join(", ")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </article>
  );
}

function PokemonCell({ pokemonId, pokemonName }: { pokemonId: number; pokemonName: string }) {
  return (
    <Link
      href={`/pokemon/${pokemonId}`}
      className="flex items-center gap-3 text-sm font-medium hover:underline"
    >
      <Image
        src={getPixelSpriteById(pokemonId)}
        alt=""
        width={32}
        height={32}
        className="size-8 shrink-0 object-contain"
        unoptimized
      />
      <span className="font-mono text-xs text-muted-foreground">{formatPokedexId(pokemonId)}</span>
      {formatSpeciesLabel(pokemonName)}
    </Link>
  );
}

function formatSpeciesTimes(
  row: LocationSpeciesRow,
  tConditions: (key: string) => string,
  anyTime: string,
): string {
  const parts = row.hasAnyTime ? [anyTime] : [];
  for (const time of row.times) parts.push(formatCondition(time, tConditions));
  return parts.join(" · ");
}

function formatMethodName(name: string, t: (key: string) => string): string {
  const label = t(name);
  return label === `encounterMethods.${name}` || label === name
    ? capitalize(name.replace(/-/g, " "))
    : label;
}

function formatCondition(name: string, t: (key: string) => string): string {
  const label = t(name);
  return label === `encounterConditions.${name}` ? capitalize(name.replace("time-", "")) : label;
}
