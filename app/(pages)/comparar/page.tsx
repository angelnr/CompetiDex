"use client";

import { Suspense } from "react";
import { PokemonCompare } from "@/components/pokemon/PokemonCompare";

export default function CompararPage() {
  return (
    <main className="container mx-auto py-10">
      <Suspense fallback={null}>
        <PokemonCompare />
      </Suspense>
    </main>
  );
}
