"use client";

import { useState } from "react";

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
import { capitalize } from "@/lib/pokemon-utils";
import { getLocationNameEs } from "@/lib/location-names";
import { getVersionGroupLabel, isExcludedVersion, versionOrder } from "@/lib/version-names";

export interface EncounterInfoProps {
  encounters?: LocationAreaEncounter[] | null;
}

export function EncounterInfo({ encounters }: EncounterInfoProps) {
  const [selectedVersion, setSelectedVersion] = useState<string | undefined>();

  if (!encounters || encounters.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No se encontraron datos de encuentro para este Pokémon.
      </p>
    );
  }

  const versionNames = getUniqueVersions(encounters);
  const currentVersion = selectedVersion ?? versionNames[0];

  const rows = encounters.flatMap((area) =>
    area.version_details
      .filter((vd) => vd.version.name === currentVersion)
      .flatMap((vd) =>
        vd.encounter_details.map((ed) => ({
          location: area.location_area.name,
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
          Juego:
        </label>
        <Select value={currentVersion ?? ""} onValueChange={setSelectedVersion}>
          <SelectTrigger id="version-select" className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {versionNames.map((v) => (
              <SelectItem key={v} value={v}>
                {getVersionGroupLabel(v)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No se encuentra en estado salvaje en este juego.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ruta</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Nivel mín.</TableHead>
              <TableHead>Nivel máx.</TableHead>
              <TableHead>Probabilidad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{getLocationNameEs(r.location)}</TableCell>
                <TableCell>{formatMethodName(r.method)}</TableCell>
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

function formatMethodName(name: string): string {
  const labels: Record<string, string> = {
    gift: "Regalo",
    walk: "Caminando",
    surf: "Surfeando",
    headbutt: "Golpe cabeza",
    "dark-grass": "Hierba (oscuridad)",
    "tall-grass": "Hierba alta",
    "bug-catching-contest": "Concurso caza-bichos",
    fishing: "Pescar",
    "super-rod": "Caña súper",
    "good-rod": "Buena caña",
    "old-rod": "Caña vieja",
    "rock-smash": "Golpe roca",
    "only-one": "Solo uno",
    "safari-zone": "Zona Safari",
    "game-corner": "Casino",
    interaction: "Interacción",
    "overworld-special": "Especial (escenario)",
    "island-scan": "I.Escaner",
    "max-raid": "Incursión Dinamax",
    "raid-den": "Cueva incursión",
    wandering: "Errante",
    "distortion-world": "Mundo Distorsión",
    "trophy-garden": "Jardín Trofeo",
    "pal-park": "Parque Amigo",
    "poke-radar": "Pokéradar",
  };
  return labels[name] ?? capitalize(name.replace(/-/g, " "));
}
