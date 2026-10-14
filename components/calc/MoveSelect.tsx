"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useMovepool } from "@/lib/queries";
import type { MovepoolLocale, MovepoolMove } from "@/lib/moveset";
import { baseSpeciesSlug } from "@/lib/pokemon-utils";
import { titleCase } from "@/lib/calc/convert";
import { cn } from "@/lib/utils";

export interface MoveSelectProps {
  value: string | null;
  onChange: (slug: string | null) => void;
  label: string;
  /** Especie cuyo movepool se ofrece. `null` = sin sugerencias. */
  species: string | null;
}

const MAX_RESULTS = 60;

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Combobox de movimiento para la calculadora. Solo ofrece los movimientos que
 * la especie seleccionada puede aprender (misma fuente que el constructor de
 * equipos: `/api/pokemon?moveset=`). Sin especie, no hay sugerencias.
 */
export function MoveSelect({ value, onChange, label, species }: MoveSelectProps) {
  const t = useTranslations("calc");
  const locale = useLocale();
  const [query, setQuery] = useState(value ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: directPool, isLoading: loadingDirect } = useMovepool(species ?? undefined);
  // Formas sin learnset en PokeAPI (p. ej. megas) caen a la especie base.
  const needsBase = !!species && !!directPool && directPool.moves.length === 0;
  const { data: basePool, isLoading: loadingBase } = useMovepool(
    needsBase && species ? baseSpeciesSlug(species) : undefined,
  );

  const moves = useMemo<MovepoolMove[]>(() => {
    if (directPool && directPool.moves.length > 0) return directPool.moves;
    return basePool?.moves ?? [];
  }, [directPool, basePool]);

  const loading = !!species && (loadingDirect || (needsBase && loadingBase));

  const localize = useCallback(
    (move: MovepoolMove): string =>
      move.names[locale as MovepoolLocale] ?? move.names.en ?? titleCase(move.slug),
    [locale],
  );

  const displayName = useMemo(() => {
    if (!value) return "";
    const hit = moves.find((m) => m.slug === value);
    return hit ? localize(hit) : titleCase(value);
  }, [value, moves, localize]);

  useEffect(() => {
    if (!open) setQuery(displayName);
  }, [open, displayName]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    const list = q
      ? moves.filter(
          (m) => normalize(localize(m)).includes(q) || m.slug.includes(q.replace(/\s+/g, "-")),
        )
      : moves;
    return list.slice(0, MAX_RESULTS);
  }, [moves, query, localize]);

  const select = (slug: string) => {
    onChange(slug);
    setOpen(false);
    setActiveIndex(-1);
  };

  const clear = () => {
    onChange(null);
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((p) => (p < results.length - 1 ? p + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((p) => (p > 0 ? p - 1 : results.length - 1));
    } else if (e.key === "Enter") {
      const suggestion = results[activeIndex >= 0 ? activeIndex : 0];
      if (suggestion) {
        e.preventDefault();
        select(suggestion.slug);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t("movePlaceholder")}
          className="pl-9 pr-8"
          aria-label={label}
          role="combobox"
          aria-expanded={open}
          aria-controls="calc-move-suggestions"
          aria-activedescendant={activeIndex >= 0 ? `calc-move-option-${activeIndex}` : undefined}
          autoComplete="off"
        />
        {(query || value) && (
          <button
            type="button"
            onClick={clear}
            aria-label={t("clear")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {open && (
        <ul
          id="calc-move-suggestions"
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover py-1 shadow-md"
        >
          {!species ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">{t("selectSpeciesFirst")}</li>
          ) : loading ? (
            <li className="space-y-1 px-3 py-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </li>
          ) : results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">{t("noResults")}</li>
          ) : (
            results.map((entry, i) => (
              <li
                key={entry.slug}
                id={`calc-move-option-${i}`}
                role="option"
                aria-selected={i === activeIndex}
              >
                <button
                  type="button"
                  onClick={() => select(entry.slug)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                    i === activeIndex && "bg-accent text-accent-foreground",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{localize(entry)}</span>
                  {value === entry.slug && (
                    <span className="shrink-0 rounded bg-muted px-1 text-[10px] text-muted-foreground">
                      ✓
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
