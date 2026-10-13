"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";

import { DamageCalculator } from "@/components/calc/DamageCalculator";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalculadoraPage() {
  const t = useTranslations("calc");
  return (
    <main className="container mx-auto max-w-6xl py-10">
      <h1 className="mb-1 text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mb-6 text-muted-foreground">{t("subtitle")}</p>
      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        }
      >
        <DamageCalculator />
      </Suspense>
    </main>
  );
}
