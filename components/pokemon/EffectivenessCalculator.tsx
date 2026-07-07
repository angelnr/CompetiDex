"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";

import { SearchBar } from "@/components/pokemon/SearchBar";
import { TypeBadge } from "@/components/pokemon/TypeBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { usePokemon } from "@/lib/queries";
import { POKEMON_TYPES_ES } from "@/lib/pokemon-types";
import { capitalize, getOfficialArtwork } from "@/lib/pokemon-utils";
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

  const t = useTranslations("effectiveness");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  useEffect(() => {
    const defenderParam = searchParams.get("defender");
    if (defenderParam) {
      const id = Number(defenderParam);
      if (Number.isFinite(id) && id > 0) {
        addDefender({ id, name: "", types: [] });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-8">
      {/* Selector de tipo de movimiento */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("step1")}</h2>
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
        <h2 className="mb-3 text-lg font-semibold">{t("step2")}</h2>
        <SearchBar
          showSprite
          onSelect={(id, name) => addDefender({ id, name, types: [] })}
          placeholderKey="forDefenderPlaceholder"
          ariaKey="forDefenderAria"
        />
      </section>

      {/* Lista de defensores */}
      {defenders.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">{t("defenders")}</h2>
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
          <h2 className="mb-3 text-lg font-semibold">{t("step3")}</h2>
          <ResultDisplay result={result} />
        </section>
      )}

      {(moveType || defenders.length > 0) && (
        <Button variant="ghost" size="sm" onClick={clear}>
          <X className="mr-1 size-3" />
          {tc("clear")}
        </Button>
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
  const tc = useTranslations("common");
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
              {isLoading ? tc("loading") : capitalize(pokemon?.name ?? info.name)}
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
  const t = useTranslations("effectiveness");
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
          <TypeBadge type={result.moveType} size="md" />{" "}
          {t("result", { count: result.perDefender.length })}
        </p>
        <p className={`text-6xl font-bold ${colorClass}`}>{formatMultiplier(result.worst)}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {result.worst === 0
            ? t("noEffect")
            : result.worst >= 4
              ? t("super4")
              : result.worst === 2
                ? t("super2")
                : result.worst < 1
                  ? t("half")
                  : t("neutral")}
        </p>
      </Card>

      {result.perDefender.length > 1 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{t("breakdown")}</h3>
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
