import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { ChainLink } from "@/lib/pokeapi";
import { extractIdFromUrl, formatPokedexId, getOfficialArtworkById } from "@/lib/pokemon-utils";

export interface EvolutionChainProps {
  /** Cadena evolutiva ya resuelta (fetch server-side). */
  chain: ChainLink;
}

/**
 * Cadena evolutiva visual (server component).
 * Renderiza recursivamente cada stage con un sprite + flecha + condiciones.
 *
 * Diseño: columna única (mobile) / fila con wrap (desktop); cada evolución
 * muestra el método (level, item, trade...) extraído de `evolution_details`.
 */
export function EvolutionChain({ chain }: EvolutionChainProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <StageNode species={chain.species} />
      {chain.evolves_to.map((next) => (
        <EvolutionBranch key={next.species.name} parent={chain} child={next} />
      ))}
    </div>
  );
}

function EvolutionBranch({ parent, child }: { parent: ChainLink; child: ChainLink }) {
  return (
    <div className="contents">
      <div className="flex flex-col items-center gap-1 px-1">
        <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
        {child.evolution_details.map((d, i) => (
          <span key={i} className="text-xs text-muted-foreground">
            {summarizeEvolution(d)}
          </span>
        ))}
      </div>
      <StageNode species={child.species} />
      {child.evolves_to.map((grandchild) => (
        <EvolutionBranch key={grandchild.species.name} parent={child} child={grandchild} />
      ))}
    </div>
  );
}

function StageNode({ species }: { species: { name: string; url: string } }) {
  const id = extractIdFromUrl(species.url);
  const sprite = getOfficialArtworkById(id);
  return (
    <Link href={`/pokemon/${id}`} className="group flex flex-col items-center gap-1">
      <div className="relative size-24">
        {sprite && (
          <Image
            src={sprite}
            alt={species.name}
            fill
            className="object-contain transition-transform group-hover:scale-110"
            sizes="96px"
            loading="lazy"
          />
        )}
      </div>
      <span className="text-xs font-medium">{formatPokedexId(id)}</span>
      <span className="text-xs text-muted-foreground">{species.name}</span>
    </Link>
  );
}

function summarizeEvolution(d: {
  item: { name: string } | null;
  trigger: { name: string } | null;
  min_level: number | null;
  time_of_day: string;
  known_move: { name: string } | null;
  location: { name: string } | null;
  held_item: { name: string } | null;
  trade_species: { name: string } | null;
  gender: number | null;
  min_happiness: number | null;
  min_affection: number | null;
  needs_overworld_rain: boolean;
}): string {
  if (d.min_level) return `Nv. ${d.min_level}`;
  if (d.item) return `Usar ${d.item.name.replace(/-/g, " ")}`;
  if (d.held_item) return `Lleva ${d.held_item.name.replace(/-/g, " ")}`;
  if (d.known_move) return `Conoce ${d.known_move.name.replace(/-/g, " ")}`;
  if (d.trigger?.name === "trade" || d.trade_species) return "Intercambio";
  if (d.min_happiness) return "Felicidad";
  if (d.min_affection) return "Amistad";
  if (d.location) return `En ${d.location.name.replace(/-/g, " ")}`;
  if (d.time_of_day && d.time_of_day !== "day") return d.time_of_day === "night" ? "Noche" : "Día";
  if (d.needs_overworld_rain) return "Con lluvia";
  if (d.gender !== null) return d.gender === 1 ? "Hembra" : "Macho";
  return "Especial";
}
