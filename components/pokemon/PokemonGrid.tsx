"use client";

import { useCallback, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

import { PokemonCard, PokemonCardSkeleton } from "@/components/pokemon/PokemonCard";
import { usePokemonInfiniteList } from "@/lib/queries";
import { extractIdFromUrl } from "@/lib/pokemon-utils";

export interface PokemonGridProps {
  /** Tamaño de página para el scroll infinito. */
  pageSize?: number;
}

/**
 * Grid de Pokémon con scroll infinito vía TanStack Query.
 *
 * Usa IntersectionObserver para disparar `fetchNextPage` cuando el sentinel
 * entra en viewport. Renderiza skeletons mientras carga (AGENTS.md §4.5).
 */
export function PokemonGrid({ pageSize = 24 }: PokemonGridProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isError } =
    usePokemonInfiniteList(pageSize);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const entry = entries[0];
      if (entry && entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: "200px",
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [handleIntersect]);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <p className="text-muted-foreground">No se pudo cargar la lista de Pokémon.</p>
        <p className="text-xs text-muted-foreground">
          Comprueba que Redis y la conexión a internet estén activos.
        </p>
      </div>
    );
  }

  // Primera carga
  if (!data) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: pageSize }).map((_, i) => (
          <PokemonCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const all = data.pages.flatMap((p) => p.results);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {all.map((resource) => (
          <PokemonCard
            key={resource.name}
            resource={resource}
            eagerId={extractIdFromUrl(resource.url)}
          />
        ))}

        {isFetchingNextPage
          ? Array.from({ length: pageSize }).map((_, i) => (
              <PokemonCardSkeleton key={`loading-${i}`} />
            ))
          : null}
      </div>

      <div ref={sentinelRef} className="h-1 w-full" aria-hidden />

      {!hasNextPage && all.length > 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Has llegado al final de la Pokédex.
        </p>
      )}

      {isFetchingNextPage && (
        <div className="flex items-center justify-center py-4 text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          Cargando más…
        </div>
      )}
    </>
  );
}
