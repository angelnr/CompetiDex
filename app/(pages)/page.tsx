import { Suspense } from "react";
import { SearchBar } from "@/components/pokemon/SearchBar";
import { PokemonGrid } from "@/components/pokemon/PokemonGrid";

export default function HomePage() {
  return (
    <main className="container mx-auto py-10">
      <header className="mb-8 space-y-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight">CompetiDex</h1>
        <p className="mx-auto max-w-prose text-muted-foreground">
          Pokédex all-in-one con stats, tipos, evoluciones, habilidades, movimientos y debilidades.
        </p>
        <Suspense fallback={null}>
          <SearchBar />
        </Suspense>
      </header>

      <section aria-labelledby="pokemon-list-heading">
        <h2 id="pokemon-list-heading" className="sr-only">
          Lista de Pokémon
        </h2>
        <Suspense
          fallback={
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          }
        >
          <PokemonGrid pageSize={24} />
        </Suspense>
      </section>
    </main>
  );
}
