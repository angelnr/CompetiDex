"use client";

import { Suspense } from "react";

import { EffectivenessCalculator } from "@/components/pokemon/EffectivenessCalculator";

export default function EfectividadesPage() {
  return (
    <main className="container mx-auto py-10">
      <h1 className="mb-8 text-3xl font-bold">Calculadora de efectividades</h1>
      <Suspense
        fallback={<div className="py-8 text-center text-sm text-muted-foreground">Cargando…</div>}
      >
        <EffectivenessCalculator />
      </Suspense>
    </main>
  );
}
