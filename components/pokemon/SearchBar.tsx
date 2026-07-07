"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { usePokemonInfiniteList } from "@/lib/queries";
import { capitalize, extractIdFromUrl, fuzzyMatch } from "@/lib/pokemon-utils";

/**
 * Buscador con debounce y fuzzy finder.
 *
 * Estrategia: trae toda la lista de nombres (PokeAPI permite hasta 1025+ en
 * una sola petición; cacheada en Redis 1h) y filtra client-side con fuzzy
 * matching tras el debounce. Encaminamiento a `/pokemon/{id}` al pulsar
 * enter o clic en sugerencia, manteniendo ruta canónica.
 *
 * Navegación por teclado: flechas ↑/↓ + Enter + Escape.
 */
export function SearchBar() {
  const t = useTranslations("search");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounced = useDebounce(query.trim().toLowerCase(), 300);

  // Resetear índice activo al cambiar el query
  useEffect(() => {
    setActiveIndex(-1);
  }, [debounced]);

  // Listado cacheado — fetched solo una vez. Limite generoso.
  const { data } = usePokemonInfiniteList(1025);

  const suggestions = useMemo(() => {
    if (!debounced || !data) return [];
    const all = data.pages.flatMap((p) => p.results);
    return all
      .map((r) => {
        const name = r.name;
        const result = fuzzyMatch(debounced, name);
        if (!result) return null;
        return {
          name,
          url: r.url,
          id: extractIdFromUrl(r.url),
          score: result.score,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => a.score - b.score)
      .slice(0, 8);
  }, [debounced, data]);

  const submit = (id: number) => {
    router.push(`/pokemon/${id}`);
    setQuery("");
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!suggestions.length) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case "Enter": {
        const idx = activeIndex >= 0 ? activeIndex : 0;
        if (suggestions[idx]) {
          e.preventDefault();
          submit(suggestions[idx].id);
        }
        break;
      }
      case "Escape":
        setQuery("");
        inputRef.current?.blur();
        break;
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => setActiveIndex(-1)}
          placeholder={t("placeholder")}
          className="pl-9 pr-8"
          aria-label={t("aria")}
          aria-expanded={suggestions.length > 0}
          aria-controls="search-suggestions"
          aria-activedescendant={
            activeIndex >= 0 ? `suggestion-${suggestions[activeIndex]?.id}` : undefined
          }
          role="combobox"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label={t("clearAria")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {suggestions.length > 0 && (
        <ul
          id="search-suggestions"
          role="listbox"
          className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border bg-popover py-1 shadow-md"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.name}
              id={`suggestion-${s.id}`}
              role="option"
              aria-selected={i === activeIndex}
            >
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  submit(s.id);
                }}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                  i === activeIndex ? "bg-accent text-accent-foreground" : ""
                } hover:bg-accent hover:text-accent-foreground`}
              >
                <span className="font-mono text-xs text-muted-foreground">
                  #{String(s.id).padStart(4, "0")}
                </span>
                {capitalize(s.name)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
