"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { PokemonCompare } from "@/components/pokemon/PokemonCompare";

export default function CompararPage() {
  const tc = useTranslations("common");
  return (
    <main className="container mx-auto py-10">
      <Suspense
        fallback={<p className="py-8 text-center text-sm text-muted-foreground">{tc("loading")}</p>}
      >
        <PokemonCompare />
      </Suspense>
    </main>
  );
}
