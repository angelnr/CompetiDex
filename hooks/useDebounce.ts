"use client";

import { useEffect, useState } from "react";

/**
 * Devuelve el valor con `delay` ms de debounce.
 * Útil para inputs de búsqueda donde no queremos disparar fetch en cada tecla.
 *
 * @example
 * const [q, setQ] = useState("");
 * const debounced = useDebounce(q, 300);
 * // usar `debounced` como dependencia de usePokemonQuery
 */
export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}
