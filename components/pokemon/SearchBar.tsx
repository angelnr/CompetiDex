"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";

import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { usePokemonInfiniteList } from "@/lib/queries";
import {
  capitalize,
  extractIdFromUrl,
  fuzzyMatch,
  getMegaFormLabel,
  getMegaFormSuggestions,
  getPixelSpriteById,
  getRegionalFormSuggestions,
  parseRegionalForm,
} from "@/lib/pokemon-utils";

export interface SearchBarProps {
  /** Muestra el sprite pixel-art junto a cada sugerencia. */
  showSprite?: boolean;
  /** Callback alternativo: en lugar de navegar a /pokemon/{id}, llama a esta función. */
  onSelect?: (id: number, name: string) => void | Promise<void>;
  /** IDs a excluir de las sugerencias (para equipos). */
  excludeIds?: number[];
  /** Clave i18n personalizada para el placeholder (namespace "search"). */
  placeholderKey?: string;
  /** Clave i18n personalizada para el aria-label (namespace "search"). */
  ariaKey?: string;
  /** Deshabilita el input. */
  disabled?: boolean;
}

/**
 * Buscador universal con debounce y fuzzy finder.
 *
 * Props opcionales:
 * - `showSprite`: pinta el thumbnail pixel-art en cada sugerencia.
 * - `onSelect`: cuando se selecciona una sugerencia, llama a esta función
 *   en lugar de navegar a /pokemon/{id}.
 * - `excludeIds`: array de ids a filtrar de las sugerencias.
 * - `placeholderKey` / `ariaKey`: sobrescriben las claves i18n por defecto.
 *
 * Estrategia: trae toda la lista de nombres (PokeAPI permite hasta 1025+ en
 * una sola petición; cacheada en Redis 1h) y filtra client-side con fuzzy
 * matching tras el debounce. Encaminamiento a `/pokemon/{id}` al pulsar
 * enter o clic en sugerencia, manteniendo ruta canónica.
 *
 * Navegación por teclado: flechas ↑/↓ + Enter + Escape.
 */
export function SearchBar({
  showSprite = false,
  onSelect,
  excludeIds,
  placeholderKey = "placeholder",
  ariaKey = "aria",
  disabled = false,
}: SearchBarProps = {}) {
  const t = useTranslations("search");
  const tReg = useTranslations("pokemon.regional");
  const locale = useLocale();
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
    const matched = all
      .map((r) => {
        const name = r.name;
        const result = fuzzyMatch(debounced, name);
        if (!result) return null;
        return {
          name,
          id: extractIdFromUrl(r.url),
          score: result.score,
          kind: "default" as const,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .filter((r) => !excludeIds?.includes(r.id))
      .sort((a, b) => a.score - b.score)
      .slice(0, 8);
    // Añadir formas alternativas de especies coincidentes (mega + regional)
    const altForms = matched.flatMap((m) => {
      const mega = getMegaFormSuggestions(m.name).map((mf) => ({
        name: mf.name,
        id: mf.id,
        score: -1, // aparecen antes que los match fuzzy
        kind: "mega" as const,
      }));
      const regional = getRegionalFormSuggestions(m.name).map((rf) => ({
        name: rf.name,
        id: rf.id,
        score: -1,
        kind: "regional" as const,
      }));
      return [...mega, ...regional];
    });
    return [...altForms, ...matched].slice(0, 12);
  }, [debounced, data, excludeIds]);

  const formatRegionalLabel = (name: string): string => {
    const info = parseRegionalForm(name, 0);
    if (!info) return capitalize(name);
    const base = capitalize(info.baseSpecies);
    if (locale === "ja") {
      return `${base} ${tReg(info.region)}`;
    }
    const regionLabel = tReg(info.region, { base });
    const breedKey = info.breed?.replace(/-breed$/, "");
    if (breedKey) {
      return tReg("withBreed", {
        name: regionLabel,
        breed: tReg(`breeds.${breedKey}`),
      });
    }
    return regionLabel;
  };

  const submit = (id: number, name: string) => {
    if (onSelect) {
      onSelect(id, name);
    } else {
      router.push(`/pokemon/${id}`);
    }
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
        const suggestion = suggestions[idx];
        if (suggestion) {
          e.preventDefault();
          submit(suggestion.id, suggestion.name);
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
          placeholder={t(placeholderKey)}
          className="pl-9 pr-8"
          aria-label={t(ariaKey)}
          aria-expanded={suggestions.length > 0}
          aria-controls="search-suggestions"
          aria-activedescendant={
            activeIndex >= 0 ? `suggestion-${suggestions[activeIndex]?.id}` : undefined
          }
          role="combobox"
          autoComplete="off"
          disabled={disabled}
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
          {suggestions.map((s, i) => {
            const displayName =
              s.kind === "mega"
                ? getMegaFormLabel(s.name)
                : s.kind === "regional"
                  ? formatRegionalLabel(s.name)
                  : capitalize(s.name);
            return (
              <li
                key={s.name}
                id={`suggestion-${s.id}`}
                role="option"
                aria-selected={i === activeIndex}
              >
                <button
                  type="button"
                  onClick={() => submit(s.id, s.name)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                    i === activeIndex ? "bg-accent text-accent-foreground" : ""
                  } hover:bg-accent hover:text-accent-foreground`}
                >
                  {showSprite && (
                    <Image
                      src={getPixelSpriteById(s.id)}
                      alt=""
                      width={32}
                      height={32}
                      className="size-8 shrink-0 object-contain"
                    />
                  )}
                  <span className="font-mono text-xs text-muted-foreground">
                    {s.kind === "default" ? `#${String(s.id).padStart(4, "0")}` : ""}
                  </span>
                  {s.kind === "mega" ? (
                    <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                      {displayName}
                    </span>
                  ) : s.kind === "regional" ? (
                    <span className="text-xs font-medium text-sky-600 dark:text-sky-400">
                      {displayName}
                    </span>
                  ) : (
                    displayName
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
