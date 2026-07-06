"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { usePokemonInfiniteList } from "@/lib/queries";
import { capitalize, extractIdFromUrl } from "@/lib/pokemon-utils";

/**
 * Buscador con debounce.
 *
 * Estrategia: trae toda la lista de nombres (PokeAPI permite hasta 1025+ en
 * una sola petición; cacheada en Redis 1h) y filtra client-side tras el
 * debounce. Sincroniza el término en la URL (?q=) para que PokemonGrid
 * pueda filtrar la cuadrícula. Encaminamiento a `/pokemon/{id}` al pulsar
 * enter o clic en sugerencia, manteniendo ruta canónica.
 */
export function SearchBar() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const debounced = useDebounce(query.trim().toLowerCase(), 300);

  // Sincronizar búsqueda con URL para que PokemonGrid pueda filtrar
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debounced) {
      params.set("q", debounced);
    } else {
      params.delete("q");
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [debounced, pathname, router, searchParams]);

  // Listado cacheado — fetched solo una vez. Limite generoso.
  const { data } = usePokemonInfiniteList(1025);

  const suggestions = useMemo(() => {
    if (!debounced || !data) return [];
    const all = data.pages.flatMap((p) => p.results);
    return all
      .filter((r) => r.name.includes(debounced))
      .slice(0, 6)
      .map((r) => ({ name: r.name, url: r.url, id: extractIdFromUrl(r.url) }));
  }, [debounced, data]);

  const submit = (id: number) => {
    router.push(`/pokemon/${id}`);
    setQuery("");
  };

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && suggestions[0]) {
              e.preventDefault();
              submit(suggestions[0].id);
            }
          }}
          placeholder="Buscar Pokémon…"
          className="pl-9 pr-8"
          aria-label="Buscar Pokémon por nombre"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Limpiar búsqueda"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border bg-popover py-1 shadow-md"
        >
          {suggestions.map((s) => (
            <li key={s.name}>
              <button
                type="button"
                onClick={() => submit(s.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
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
