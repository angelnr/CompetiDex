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
        <SearchBar />
      </header>

      <section aria-labelledby="pokemon-list-heading">
        <h2 id="pokemon-list-heading" className="sr-only">
          Lista de Pokémon
        </h2>
        <PokemonGrid pageSize={24} />
      </section>
    </main>
  );
}
