"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { ItemSprite } from "@/components/pokemon/ItemSprite";
import { ITEMS, localizeItem, type Item } from "@/lib/items";
import { fuzzyMatch, getName } from "@/lib/pokemon-utils";
import { useItem, useItems, useLocalizedItemNames } from "@/lib/queries";
import { cn } from "@/lib/utils";

export interface ItemPickerProps {
  /** Nombre canónico del objeto seleccionado, o null. */
  value: string | null;
  onChange: (item: Item | null) => void;
  disabled?: boolean;
}

const MAX_RESULTS = 30;

/** Normaliza para búsqueda: minúsculas y sin acentos. */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Combobox de objetos equipables. Filtra el catálogo local en cliente
 * (fuzzy, como el buscador de Pokémon) y muestra sprite + descripción.
 * Sin input libre: solo se puede elegir un objeto del catálogo o ninguno.
 */
export function ItemPicker({ value, onChange, disabled = false }: ItemPickerProps) {
  const t = useTranslations("teams.member");
  const tCat = useTranslations("teams.itemCategories");
  const locale = useLocale();
  const [query, setQuery] = useState(value ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: selectedData } = useItem(value ?? undefined);
  const selectedLabel =
    value && selectedData ? getName(selectedData.names, value, locale) : (value ?? "");

  useEffect(() => {
    if (!open) setQuery(selectedLabel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedLabel]);

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

  // Nombres localizados de todo el catálogo para poder buscar en cualquier
  // idioma ("restos" también encuentra Leftovers). Se descarga al abrir.
  const { data: namesDict } = useLocalizedItemNames(open);

  const results = useMemo(() => {
    const qn = normalize(query.trim());
    if (!qn) return ITEMS.filter((i) => i.category === "popular");
    return ITEMS.map((item) => {
      const candidates = [item.name, item.slug];
      const dict = namesDict?.[item.slug];
      if (dict) for (const v of Object.values(dict)) if (v) candidates.push(v);

      let best = Infinity;
      for (const cand of candidates) {
        const m = fuzzyMatch(qn, normalize(cand));
        if (m && m.score < best) best = m.score;
      }
      return best !== Infinity ? { item, score: best } : null;
    })
      .filter((r): r is { item: Item; score: number } => r !== null)
      .sort((a, b) => a.score - b.score)
      .slice(0, MAX_RESULTS)
      .map((r) => r.item);
  }, [query, namesDict]);

  // Nombres/descripciones localizados de los objetos visibles (PokeAPI).
  // La descripción usa el texto del version-group más reciente para no mostrar
  // las descripciones mal atribuidas de la generación X/Y.
  const itemQueries = useItems(results.map((r) => r.slug));

  const localize = (item: Item, i: number) => localizeItem(item, itemQueries[i]?.data, locale);

  const select = (item: Item) => {
    onChange(item);
    setQuery(item.name);
    setOpen(false);
    setActiveIndex(-1);
  };

  const clear = () => {
    onChange(null);
    setQuery("");
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
        select(suggestion);
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
          placeholder={t("itemSearch")}
          className="pl-9 pr-8"
          aria-label={t("heldItem")}
          role="combobox"
          aria-expanded={open}
          aria-controls="item-suggestions"
          aria-activedescendant={activeIndex >= 0 ? `item-option-${activeIndex}` : undefined}
          autoComplete="off"
          disabled={disabled}
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            aria-label={t("itemClear")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {open && (
        <ul
          id="item-suggestions"
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-popover py-1 shadow-md"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">{t("itemNoResults")}</li>
          ) : (
            results.map((item, i) => {
              const { name, description } = localize(item, i);
              return (
                <li
                  key={item.slug}
                  id={`item-option-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                >
                  <button
                    type="button"
                    onClick={() => select(item)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={cn(
                      "flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                      i === activeIndex && "bg-accent text-accent-foreground",
                    )}
                  >
                    <ItemSprite slug={item.slug} alt="" className="mt-0.5 size-6" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium">{name}</span>
                        <span className="shrink-0 rounded bg-muted px-1 text-[10px] text-muted-foreground">
                          {tCat(item.category)}
                        </span>
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
