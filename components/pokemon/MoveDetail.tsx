"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoveGameSelect } from "@/components/pokemon/MoveGameSelect";
import { TypeBadge } from "@/components/pokemon/TypeBadge";
import type { Move } from "@/lib/pokeapi";
import type { MoveLearner, MoveLearnerGame, MoveLearnerMethod } from "@/lib/move-learners";
import {
  capitalize,
  formatPokedexId,
  formatSpeciesLabel,
  getMoveEffectText,
  getName,
  getPixelSpriteById,
} from "@/lib/pokemon-utils";

export interface MoveDetailProps {
  move: Move;
  learners: MoveLearner[];
  games: MoveLearnerGame[];
  selectedGame: string | undefined;
  locale: string;
}

export function MoveDetail({ move, learners, games, selectedGame, locale }: MoveDetailProps) {
  const t = useTranslations("moveDetail");
  const tMoves = useTranslations("moves");
  const tMethods = useTranslations("learnMethods");
  const tVersionGroups = useTranslations("versionGroups");

  const displayName = getName(move.names, move.name, locale);
  const canonical = move.names.find((n) => n.language.name === "en")?.name ?? move.name;
  const category = tMoves(`damageClass.${move.damage_class.name}`);
  const effect = getMoveEffectText(move, locale);

  const vgLabel = (name: string): string => {
    const label = tVersionGroups(name);
    return label === `versionGroups.${name}` || label === name
      ? capitalize(name.replace(/-/g, " "))
      : label;
  };

  const methodLabel = (method: MoveLearnerMethod): string => {
    if (method.name === "level-up") return t("levelMethod", { level: method.level });
    const label = tMethods(method.name);
    return label === `learnMethods.${method.name}` || label === method.name
      ? capitalize(method.name.replace(/-/g, " "))
      : label;
  };

  const selectedGameLabel = selectedGame ? vgLabel(selectedGame) : "";
  const options = games.map((game) => ({ value: game.name, label: vgLabel(game.name) }));

  return (
    <article className="container mx-auto max-w-5xl py-8">
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold">{displayName}</h1>
          <TypeBadge type={move.type.name} size="md" />
          <Badge variant="outline">{category}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {displayName !== canonical ? `${canonical} · ` : ""}
          <span className="font-mono">{move.name}</span>
        </p>
      </header>

      {effect && (
        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">{tMoves("table.effect")}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{effect}</p>
        </section>
      )}

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={tMoves("table.power")} value={move.power ?? tMoves("emptyFallback")} />
        <StatCard
          label={tMoves("table.accuracy")}
          value={move.accuracy !== null ? `${move.accuracy}%` : tMoves("emptyFallback")}
        />
        <StatCard label={tMoves("table.pp")} value={move.pp ?? tMoves("emptyFallback")} />
        <StatCard
          label={tMoves("table.priority")}
          value={move.priority > 0 ? `+${move.priority}` : String(move.priority)}
        />
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("learnedBy", { count: learners.length })}</h2>
          <MoveGameSelect value={selectedGame} options={options} label={t("gameLabel")} />
        </div>

        {games.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("loadError")}</p>
        ) : learners.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("noLearners", { game: selectedGameLabel })}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("pokemon")}</TableHead>
                <TableHead>{t("method")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {learners.map((learner) => (
                <TableRow key={learner.pokemonId}>
                  <TableCell>
                    <Link
                      href={`/pokemon/${learner.pokemonId}`}
                      className="flex items-center gap-3 text-sm font-medium hover:underline"
                    >
                      <Image
                        src={getPixelSpriteById(learner.pokemonId)}
                        alt=""
                        width={32}
                        height={32}
                        className="size-8 shrink-0 object-contain"
                        unoptimized
                      />
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatPokedexId(learner.pokemonId)}
                      </span>
                      {formatSpeciesLabel(learner.pokemonName)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {learner.methods.map(methodLabel).join(" · ")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </article>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <span className="block text-[10px] uppercase text-muted-foreground">{label}</span>
      <span className="block font-mono text-sm font-semibold">{value}</span>
    </div>
  );
}
