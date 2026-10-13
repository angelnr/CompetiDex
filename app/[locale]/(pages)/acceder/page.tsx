"use client";

import { useTranslations } from "next-intl";

import { AuthForm } from "@/components/auth/AuthForm";

export default function AccederPage() {
  const t = useTranslations("auth");
  return (
    <main className="container mx-auto flex min-h-[70vh] max-w-md flex-col items-center py-10">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">{t("title")}</h1>
      <AuthForm className="mt-4" />
    </main>
  );
}
