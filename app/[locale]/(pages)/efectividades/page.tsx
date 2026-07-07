"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";

import { EffectivenessCalculator } from "@/components/pokemon/EffectivenessCalculator";

export default function EfectividadesPage() {
  const t = useTranslations("effectiveness");
  const tc = useTranslations("common");
  return (
    <main className="container mx-auto py-10">
      <h1 className="mb-8 text-3xl font-bold">{t("title")}</h1>
      <Suspense
        fallback={
          <div className="py-8 text-center text-sm text-muted-foreground">{tc("loading")}</div>
        }
      >
        <EffectivenessCalculator />
      </Suspense>
    </main>
  );
}
