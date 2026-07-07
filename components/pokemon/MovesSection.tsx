"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TypeBadge } from "@/components/pokemon/TypeBadge";
import { useMove } from "@/lib/queries";
import type { PokemonMoveSlot } from "@/lib/pokeapi";
import { extractIdFromUrl, getNameEs } from "@/lib/pokemon-utils";
import {
  getVersionGroupLabel,
  getMoveLearnMethodLabel,
  isExcludedVersionGroup,
  versionGroupOrder,
} from "@/lib/version-names";
import type { Move } from "@/lib/pokeapi";

export interface MovesSectionProps {
  moveSlots: PokemonMoveSlot[];
}

const METHODS = ["level-up", "machine", "tutor", "egg"] as const;

export function MovesSection({ moveSlots }: MovesSectionProps) {
  const allVersionGroups = useMemo(() => {
    const set = new Set<string>();
    for (const slot of moveSlots) {
      for (const vgd of slot.version_group_details) {
        if (!isExcludedVersionGroup(vgd.version_group.name)) {
          set.add(vgd.version_group.name);
        }
      }
    }
    return Array.from(set).sort(versionGroupOrder);
  }, [moveSlots]);

  const [selectedGame, setSelectedGame] = useState<string | undefined>(
    allVersionGroups.includes("scarlet-violet") ? "scarlet-violet" : allVersionGroups.at(-1),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label htmlFor="move-game-select" className="text-sm font-medium">
          Juego:
        </label>
        <Select value={selectedGame ?? ""} onValueChange={(v) => setSelectedGame(v)}>
          <SelectTrigger id="move-game-select" className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {allVersionGroups.map((vg) => (
              <SelectItem key={vg} value={vg}>
                {getVersionGroupLabel(vg)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="level-up">
        <TabsList>
          {METHODS.map((m) => (
            <TabsTrigger key={m} value={m}>
              {getMoveLearnMethodLabel(m)}
            </TabsTrigger>
          ))}
        </TabsList>

        {METHODS.map((method) => {
          const filtered = filterMoves(moveSlots, selectedGame, method);
          return (
            <TabsContent key={method} value={method}>
              {filtered.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  No aprende movimientos por {getMoveLearnMethodLabel(method).toLowerCase()} en{" "}
                  {getVersionGroupLabel(selectedGame ?? "")}.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Nivel</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Efecto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="w-16 text-right">Poder</TableHead>
                      <TableHead className="w-14 text-right">PP</TableHead>
                      <TableHead className="w-16 text-right">Precisión</TableHead>
                      <TableHead className="w-16 text-right">Prioridad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((item) => (
                      <MoveRow
                        key={item.move.name}
                        moveSlot={item}
                        level={item.level}
                        game={selectedGame ?? ""}
                      />
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

interface FilteredMove extends PokemonMoveSlot {
  level: number;
}

function filterMoves(
  slots: PokemonMoveSlot[],
  game: string | undefined,
  method: string,
): FilteredMove[] {
  if (!game) return [];
  return slots
    .map((slot) => {
      const detail = slot.version_group_details.find(
        (vgd) => vgd.version_group.name === game && vgd.move_learn_method.name === method,
      );
      if (!detail) return null;
      return { ...slot, level: detail.level_learned_at };
    })
    .filter((x): x is FilteredMove => x !== null)
    .sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.move.name.localeCompare(b.move.name);
    });
}

function damageClassLabel(damageClass: { name: string } | undefined): string {
  if (!damageClass) return "—";
  const labels: Record<string, string> = {
    physical: "Físico",
    special: "Especial",
    status: "Estado",
  };
  return labels[damageClass.name] ?? damageClass.name;
}

function MoveRow({
  moveSlot,
  level,
  game,
}: {
  moveSlot: PokemonMoveSlot;
  level: number;
  game: string;
}) {
  const moveId = extractIdFromUrl(moveSlot.move.url);
  const { data: move, isLoading } = useMove(moveId);

  const nameEs = move ? getNameEs(move.names, move.name) : null;
  const typeName = move?.type?.name ?? null;
  const effect = move
    ? (move.flavor_text_entries
        .find((e) => e.language.name === "es" && e.version_group.name === game)
        ?.flavor_text?.replace(/\f|\n/g, " ")
        .trim() ??
      move.flavor_text_entries
        .find((e) => e.language.name === "es")
        ?.flavor_text?.replace(/\f|\n/g, " ")
        .trim() ??
      move.flavor_text_entries
        .find((e) => e.language.name === "en" && e.version_group.name === game)
        ?.flavor_text?.replace(/\f|\n/g, " ")
        .trim() ??
      move.effect_entries.find((e) => e.language.name === "en")?.short_effect ??
      null)
    : null;

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{level}</TableCell>
      <TableCell className="font-medium">
        {nameEs ?? (move ? move.name : moveSlot.move.name)}
      </TableCell>
      <TableCell>
        {isLoading ? (
          <Skeleton className="h-5 w-16" />
        ) : typeName ? (
          <TypeBadge type={typeName} size="sm" />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="max-w-xs">
        {isLoading ? (
          <Skeleton className="h-4 w-40" />
        ) : effect ? (
          <span className="text-xs leading-relaxed text-muted-foreground">{effect}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        {isLoading ? (
          <Skeleton className="h-5 w-14" />
        ) : (
          <span className="text-xs">{damageClassLabel(move?.damage_class)}</span>
        )}
      </TableCell>
      <TableCell className="text-right font-mono text-xs">
        {isLoading ? <Skeleton className="ml-auto h-4 w-8" /> : (move?.power ?? "—")}
      </TableCell>
      <TableCell className="text-right font-mono text-xs">
        {isLoading ? <Skeleton className="ml-auto h-4 w-8" /> : (move?.pp ?? "—")}
      </TableCell>
      <TableCell className="text-right font-mono text-xs">
        {isLoading ? (
          <Skeleton className="ml-auto h-4 w-8" />
        ) : move?.accuracy !== null && move?.accuracy !== undefined ? (
          `${move.accuracy}%`
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="text-right font-mono text-xs">
        {isLoading ? (
          <Skeleton className="ml-auto h-4 w-6" />
        ) : move?.priority !== undefined && move.priority !== 0 ? (
          move.priority > 0 ? (
            `+${move.priority}`
          ) : (
            String(move.priority)
          )
        ) : (
          "—"
        )}
      </TableCell>
    </TableRow>
  );
}
