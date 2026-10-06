"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useMove, useMoves } from "@/lib/queries";
import { getName } from "@/lib/pokemon-utils";
import { cn } from "@/lib/utils";

export interface MovePickerProps {
  /** Slug del movimiento seleccionado (inglés), o null. */
  value: string | null;
  /** Movepool disponible del Pokémon (slugs, deduplicado). */
  pool: string[];
  onChange: (slug: string | null) => void;
  disabled?: boolean;
}

const MAX_RESULTS = 50;

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function titleCase(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Combobox de movimientos del Pokémon. Muestra el nombre localizado (UI) y
 * mantiene el slug en inglés como valor de estado, de modo que el export a
 * Poképaste/Showdown siga en inglés.
 * El movepool (nombres localizados) se descarga bajo demanda al abrir el
 * desplegable y queda cacheado en Redis + TanStack Query.
 */
export function MovePicker({ value, pool, onChange, disabled = false }: MovePickerProps) {
  const t = useTranslations("teams.member");
  const locale = useLocale();
  const [query, setQuery] = useState(value ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: selectedMove } = useMove(value ?? undefined);
  const poolQueries = useMoves(open ? pool : []);
  const poolLoading = open && poolQueries.some((q) => q.isLoading);

  const displayName = useMemo(() => {
    if (!value) return "";
    if (selectedMove) return getName(selectedMove.names, selectedMove.name, locale);
    return value;
  }, [value, selectedMove, locale]);

  // Sincroniza el input con el movimiento seleccionado cuando no se está editando.
  useEffect(() => {
    if (open) return;
    setQuery(displayName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const localizedPool = useMemo(
    () =>
      pool.map((slug, i) => ({
        slug,
        name: poolQueries[i]?.data
          ? getName(poolQueries[i]!.data!.names, poolQueries[i]!.data!.name, locale)
          : titleCase(slug),
      })),
    [pool, poolQueries, locale],
  );

  const results = useMemo(() => {
    const q = normalize(query.trim());
    const filtered = q
      ? localizedPool.filter(
          (m) => normalize(m.name).includes(q) || m.slug.includes(q.replace(/\s+/g, "-")),
        )
      : [...localizedPool];
    return filtered.slice(0, MAX_RESULTS);
  }, [query, localizedPool]);

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
          placeholder={t("moveSearch")}
          className="pl-9 pr-8"
          aria-label={t("moves")}
          role="combobox"
          aria-expanded={open}
          aria-controls="move-suggestions"
          aria-activedescendant={activeIndex >= 0 ? `move-option-${activeIndex}` : undefined}
          autoComplete="off"
          disabled={disabled}
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            aria-label={t("moveClear")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {open && (
        <ul
          id="move-suggestions"
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-popover py-1 shadow-md"
        >
          {poolLoading && results.length === 0 ? (
            <li className="space-y-1 px-3 py-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </li>
          ) : results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">{t("moveNoResults")}</li>
          ) : (
            results.map((m, i) => (
              <li
                key={m.slug}
                id={`move-option-${i}`}
                role="option"
                aria-selected={i === activeIndex}
              >
                <button
                  type="button"
                  onClick={() => select(m.slug)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                    i === activeIndex && "bg-accent text-accent-foreground",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{m.name}</span>
                  {value === m.slug && (
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
