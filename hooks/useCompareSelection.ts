"use client";

import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/routing";
import { useCallback, useMemo } from "react";

/**
 * Hook que gestiona la selección de hasta 2 Pokémon para el comparador.
 * El estado se persiste en la URL query (`?ids=25,6`) permitiendo:
 *  - SSR inicial de los datos
 *  - Links compartibles
 *  - Navegación back/forward nativa
 */
export function useCompareSelection() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const ids = useMemo(() => {
    const raw = searchParams.get("ids") ?? "";
    if (!raw) return [];
    return raw
      .split(",")
      .map(Number)
      .filter((n) => Number.isFinite(n) && n > 0)
      .slice(0, 2);
  }, [searchParams]);

  const setIds = useCallback(
    (next: number[]) => {
      const params = new URLSearchParams(searchParams);
      if (next.length === 0) {
        params.delete("ids");
      } else {
        params.set("ids", next.slice(0, 2).join(","));
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const add = useCallback(
    (id: number) => {
      if (ids.includes(id) || ids.length >= 2) return;
      setIds([...ids, id]);
    },
    [ids, setIds],
  );

  const remove = useCallback(
    (slot: number) => {
      setIds(ids.filter((_, i) => i !== slot));
    },
    [ids, setIds],
  );

  const clear = useCallback(() => setIds([]), [setIds]);

  return { ids, add, remove, clear, isFull: ids.length >= 2 };
}
