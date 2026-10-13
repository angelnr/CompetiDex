"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePokemonCatalog } from "@/lib/queries";
import { getPixelSpriteById } from "@/lib/pokemon-utils";
import { titleCase } from "@/lib/calc/convert";
import { cn } from "@/lib/utils";

export interface SpeciesPickerProps {
  value: string | null;
  onChange: (slug: string | null) => void;
}

const MAX_RESULTS = 60;

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Combobox de especie para la calculadora. Busca en el catálogo completo de
 * PokeAPI (~1300 formas) y muestra sprite + nombre.
 */
export function SpeciesPicker({ value, onChange }: SpeciesPickerProps) {
  const t = useTranslations("calc");
  const { data: catalog, isLoading } = usePokemonCatalog();
  const [query, setQuery] = useState(value ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => (value ? (catalog?.find((e) => e.name === value) ?? null) : null),
    [value, catalog],
  );

  useEffect(() => {
    if (!open) setQuery(selected ? titleCase(selected.name) : (value ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selected]);

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
    if (!catalog) return [];
    const q = normalize(query.trim());
    if (!q) return catalog.slice(0, MAX_RESULTS);
    return catalog
      .filter((e) => normalize(titleCase(e.name)).includes(q) || normalize(e.name).includes(q))
      .slice(0, MAX_RESULTS);
  }, [catalog, query]);

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
        select(suggestion.name);
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
          placeholder={t("speciesPlaceholder")}
          className="pl-9 pr-8"
          aria-label={t("species")}
          role="combobox"
          aria-expanded={open}
          aria-controls="species-suggestions"
          aria-activedescendant={activeIndex >= 0 ? `species-option-${activeIndex}` : undefined}
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
          id="species-suggestions"
          role="listbox"
          className="absolute z-30 mt-1 max-h-[19rem] w-full overflow-auto rounded-md border bg-popover py-1 shadow-md"
        >
          {isLoading || !catalog ? (
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
                key={entry.name}
                id={`species-option-${i}`}
                role="option"
                aria-selected={i === activeIndex}
              >
                <button
                  type="button"
                  onClick={() => select(entry.name)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                    i === activeIndex && "bg-accent text-accent-foreground",
                  )}
                >
                  {entry.id > 0 && (
                    <Image
                      src={getPixelSpriteById(entry.id)}
                      alt=""
                      width={24}
                      height={24}
                      className="size-6 shrink-0 object-contain"
                      unoptimized
                    />
                  )}
                  <span className="min-w-0 flex-1 truncate">{titleCase(entry.name)}</span>
                  {value === entry.name && (
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
