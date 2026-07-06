import { Suspense } from "react";
import { Search, Sparkles } from "lucide-react";
import { SearchBar } from "@/components/pokemon/SearchBar";

export default function HomePage() {
  return (
    <main className="container mx-auto flex flex-col items-center py-20">
      <header className="mb-12 space-y-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight">CompetiDex</h1>
        <p className="mx-auto max-w-prose text-muted-foreground">
          Pokédex all-in-one con stats, tipos, evoluciones, habilidades, movimientos y debilidades.
        </p>
      </header>

      <Suspense fallback={null}>
        <SearchBar />
      </Suspense>

      <section className="mt-16 flex flex-col items-center gap-4 text-center text-muted-foreground">
        <Search className="size-12 opacity-20" aria-hidden />
        <p className="max-w-sm text-sm">
          Busca cualquier Pokémon por nombre para ver su ficha completa.
        </p>
        <div className="flex items-center gap-2 text-xs">
          <Sparkles className="size-3" aria-hidden />
          <span>Más de 1000 Pokémon disponibles</span>
        </div>
      </section>
    </main>
  );
}
