import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { MoveDetail } from "@/components/pokemon/MoveDetail";
import { getMove, PokeAPIError } from "@/lib/pokeapi";
import { getMoveLearnerGames, getMoveLearners } from "@/lib/move-learners";
import { getMoveEffectText, getName } from "@/lib/pokemon-utils";

export const revalidate = 86_400;

interface PageProps {
  params: { locale: string; id: string };
  searchParams: { game?: string | string[] };
}

function parseMoveId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const id = parseMoveId(params.id);
  if (id === null) return {};

  try {
    const move = await getMove(id);
    const name = getName(move.names, move.name, params.locale);
    const effect = getMoveEffectText(move, params.locale);

    return {
      title: `${name} — Movimientos — CompetiDex`,
      description: effect,
    };
  } catch {
    return { title: "Movimiento no encontrado — CompetiDex" };
  }
}

export default async function MovePage({ params, searchParams }: PageProps) {
  setRequestLocale(params.locale);

  const id = parseMoveId(params.id);
  if (id === null) notFound();

  const move = await getMove(id).catch((err: unknown) => {
    if (err instanceof PokeAPIError && err.status === 404) notFound();
    throw err;
  });

  const games = await getMoveLearnerGames(id);
  const requested = typeof searchParams.game === "string" ? searchParams.game : undefined;
  const selectedGame = games.some((game) => game.name === requested)
    ? requested
    : (games.find((game) => game.name === "scarlet-violet")?.name ?? games.at(-1)?.name);
  const learners = selectedGame ? await getMoveLearners(id, selectedGame) : [];

  return (
    <MoveDetail
      move={move}
      learners={learners}
      games={games}
      selectedGame={selectedGame}
      locale={params.locale}
    />
  );
}
