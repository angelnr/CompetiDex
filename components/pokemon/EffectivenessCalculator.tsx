"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, Search } from "lucide-react";

import { TypeBadge } from "@/components/pokemon/TypeBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/useDebounce";
import { usePokemon, usePokemonInfiniteList } from "@/lib/queries";
import { POKEMON_TYPES_ES } from "@/lib/pokemon-types";
import { capitalize, extractIdFromUrl, getOfficialArtwork } from "@/lib/pokemon-utils";
import { formatMultiplier } from "@/lib/type-effectiveness";
import { getDefensiveMultiplier } from "@/lib/type-chart";
import type { DefendersInfo } from "@/hooks/useEffectivenessCalculator";
import {
  useEffectivenessCalculator,
  type CalculatorResult,
} from "@/hooks/useEffectivenessCalculator";

export function EffectivenessCalculator() {
  const {
    moveType,
    setMoveType,
    defenders,
    addDefender,
    setDefenderTypes,
    removeDefender,
    clear,
    result,
  } = useEffectivenessCalculator();

  return (
    <div className="space-y-8">
      {/* Selector de tipo de movimiento */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">1. Selecciona el tipo del movimiento</h2>
        <div className="flex flex-wrap gap-2">
          {POKEMON_TYPES_ES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setMoveType(moveType === t ? null : t)}
              className={`transition-opacity ${moveType === t ? "ring-2 ring-ring ring-offset-2" : "opacity-60 hover:opacity-100"}`}
              aria-pressed={moveType === t}
            >
              <TypeBadge type={t} size="md" />
            </button>
          ))}
        </div>
      </section>

      {/* Selector de defensores */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">2. Añade Pokémon defensores</h2>
        <DefenderSearch onAdd={addDefender} />
      </section>

      {/* Lista de defensores */}
      {defenders.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Defensores</h2>
          <div className="flex flex-wrap gap-3">
            {defenders.map((d) => (
              <DefenderCard
                key={d.id}
                info={d}
                onRemove={removeDefender}
                onTypesLoaded={setDefenderTypes}
              />
            ))}
          </div>
        </section>
      )}

      {/* Resultado */}
      {result && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">3. Resultado</h2>
          <ResultDisplay result={result} />
        </section>
      )}

      {(moveType || defenders.length > 0) && (
        <Button variant="ghost" size="sm" onClick={clear}>
          <X className="mr-1 size-3" />
          Limpiar
        </Button>
      )}
    </div>
  );
}

function DefenderSearch({ onAdd }: { onAdd: (info: DefendersInfo) => void }) {
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query.trim().toLowerCase(), 300);
  const { data } = usePokemonInfiniteList(1025);

  const suggestions = (() => {
    if (!debounced || !data) return [];
    const all = data.pages.flatMap((p) => p.results);
    return all
      .filter((r) => r.name.includes(debounced))
      .slice(0, 6)
      .map((r) => ({ name: r.name, url: r.url, id: extractIdFromUrl(r.url) }));
  })();

  const handleSelect = async (id: number, name: string) => {
    setQuery("");
    onAdd({ id, name, types: [] });
  };

  return (
    <div className="relative max-w-xs">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar Pokémon defensor…"
          className="pl-9"
          aria-label="Buscar Pokémon defensor"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Limpiar búsqueda"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      {suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border bg-popover py-1 shadow-md"
        >
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => handleSelect(s.id, s.name)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  #{String(s.id).padStart(4, "0")}
                </span>
                {capitalize(s.name)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DefenderCard({
  info,
  onRemove,
  onTypesLoaded,
}: {
  info: DefendersInfo;
  onRemove: (id: number) => void;
  onTypesLoaded: (id: number, types: string[]) => void;
}) {
  const { data: pokemon, isLoading } = usePokemon(info.id);
  const types = pokemon?.types.map((t) => t.type.name) ?? info.types;

  useEffect(() => {
    if (pokemon && info.types.length === 0) {
      onTypesLoaded(
        info.id,
        pokemon.types.map((t) => t.type.name),
      );
    }
  }, [pokemon, info.id, info.types.length, onTypesLoaded]);
  const artwork = pokemon ? getOfficialArtwork(pokemon) : null;

  return (
    <Card className="w-48">
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {isLoading ? "Cargando…" : capitalize(pokemon?.name ?? info.name)}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {types.map((t) => (
                <TypeBadge key={t} type={t} size="sm" />
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onRemove(info.id)}
            aria-label={`Quitar ${info.name}`}
            className="rounded-sm p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="size-3" />
          </button>
        </div>
        {artwork && (
          <div className="mt-2 flex justify-center">
            <Image
              src={artwork}
              alt={capitalize(pokemon?.name ?? info.name)}
              width={64}
              height={64}
              className="size-16 object-contain"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResultDisplay({ result }: { result: CalculatorResult }) {
  const colorClass =
    result.worst === 0
      ? "text-muted-foreground line-through"
      : result.worst >= 4
        ? "text-red-600"
        : result.worst === 2
          ? "text-orange-500"
          : result.worst < 1
            ? "text-green-600"
            : "text-muted-foreground";

  return (
    <div className="space-y-4">
      <Card className="p-8 text-center">
        <p className="mb-2 text-sm text-muted-foreground">
          <TypeBadge type={result.moveType} size="md" /> vs {result.perDefender.length} defensor
          {result.perDefender.length !== 1 ? "es" : ""}
        </p>
        <p className={`text-6xl font-bold ${colorClass}`}>{formatMultiplier(result.worst)}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {result.worst === 0
            ? "No afecta"
            : result.worst >= 4
              ? "Súper eficaz (x4)"
              : result.worst === 2
                ? "Súper eficaz (x2)"
                : result.worst < 1
                  ? "Poco eficaz"
                  : "Neutral"}
        </p>
      </Card>

      {result.perDefender.length > 1 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Desglose por defensor</h3>
          {result.perDefender.map((p) => (
            <div key={p.name} className="flex items-center gap-3 rounded-md border p-2">
              <span className="text-sm font-medium">{capitalize(p.name)}</span>
              <span
                className={`font-mono text-sm font-bold ${
                  p.multiplier === 0
                    ? "text-muted-foreground line-through"
                    : p.multiplier > 1
                      ? "text-orange-500"
                      : p.multiplier < 1
                        ? "text-green-600"
                        : "text-muted-foreground"
                }`}
              >
                {formatMultiplier(p.multiplier)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
