"use client";

import Image from "next/image";
import Link from "next/link";

import { TypeBadge } from "@/components/pokemon/TypeBadge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePokemon } from "@/lib/queries";
import {
  capitalize,
  extractIdFromUrl,
  formatPokedexId,
  getOfficialArtwork,
} from "@/lib/pokemon-utils";

export interface PokemonCardProps {
  /** Recurso de la lista: { name, url } */
  resource: { name: string; url: string };
  /** ID ya conocido (evita parseo en cada render). */
  eagerId?: number;
}

/**
 * Card de Pokémon con lazy-load de su detalle vía TanStack Query.
 *
 * La lista de PokeAPI solo incluye `{name, url}` — el sprite y tipos están
 * en el detalle. Para no meterlo todo en el SSR del listado, cada card hace
 * fetch del detalle bajo demanda usando `usePokemon` con `staleTime: Infinity`
 * (ya cacheado en Redis server-side; el primer render del grid dispara N
 * fetches paralelos hacia /api/pokemon?id=X que pegan caché).
 *
 * Patrones usados:
 *  - Server-friendly: cuando se reutilice en una ficha SSR, el detalle ya
 *    estará en el cliente porque usePokemon tiene staleTime Infinity.
 *  - Skeleton mientras carga (AGENTS.md §4.5).
 */
export function PokemonCard({ resource, eagerId }: PokemonCardProps) {
  const id = eagerId ?? extractIdFromUrl(resource.url);
  const { data, isLoading, isError } = usePokemon(id);

  if (isError) {
    return (
      <Card className="flex h-full flex-col items-center justify-center p-6 text-muted-foreground">
        <p className="text-sm">No se pudo cargar #{id}</p>
      </Card>
    );
  }

  if (isLoading || !data) {
    return <PokemonCardSkeleton />;
  }

  const artwork = getOfficialArtwork(data) ?? data.sprites.front_default;
  const href = `/pokemon/${data.id}`;

  return (
    <Link href={href} className="group block h-full">
      <Card className="flex h-full flex-col transition-all group-hover:shadow-md group-hover:ring-1 group-hover:ring-ring">
        <CardHeader className="flex flex-row items-start justify-between gap-2 pb-0">
          <span className="font-mono text-xs text-muted-foreground">
            {formatPokedexId(data.id)}
          </span>
          <span className="text-xs font-medium text-muted-foreground">{capitalize(data.name)}</span>
        </CardHeader>

        <CardContent className="flex flex-1 items-center justify-center p-4">
          {artwork && (
            <Image
              src={artwork}
              alt={`Sprite oficial de ${capitalize(data.name)}`}
              width={120}
              height={120}
              className="size-28 object-contain transition-transform group-hover:scale-105"
              loading="lazy"
            />
          )}
        </CardContent>

        <CardFooter className="flex flex-wrap gap-1 p-4 pt-0">
          {data.types.map(({ type }) => (
            <TypeBadge key={type.name} type={type.name} />
          ))}
        </CardFooter>
      </Card>
    </Link>
  );
}

/** Skeleton del PokemonCard, usado en grids en estado de carga. */
export function PokemonCardSkeleton() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row justify-between pb-0">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-16" />
      </CardHeader>
      <CardContent className="flex flex-1 items-center justify-center p-4">
        <Skeleton className="size-28 rounded-full" />
      </CardContent>
      <CardFooter className="flex gap-1 p-4 pt-0">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </CardFooter>
    </Card>
  );
}
