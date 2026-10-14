import { Suspense } from "react";
import { Search, Sparkles } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SearchBar } from "@/components/pokemon/SearchBar";

interface HomePageProps {
  params: { locale: string };
}

export default async function HomePage({ params: { locale } }: HomePageProps) {
  setRequestLocale(locale);

  const tHome = await getTranslations({ locale, namespace: "home" });
  const tSearch = await getTranslations({ locale, namespace: "search" });

  return (
    <main className="container mx-auto flex flex-col items-center py-20">
      <header className="mb-12 space-y-4 text-center">
        <h1 className="bg-gradient-to-r from-primary to-[hsl(var(--brand-2))] bg-clip-text text-5xl font-extrabold tracking-tight text-transparent md:text-6xl">
          {tHome("title")}
        </h1>
        <p className="mx-auto max-w-prose text-muted-foreground">{tHome("subtitle")}</p>
      </header>

      <div className="w-full max-w-2xl rounded-2xl border bg-card/70 p-3 shadow-sm backdrop-blur">
        <Suspense fallback={null}>
          <SearchBar showSprite />
        </Suspense>
      </div>

      <section className="mt-16 flex flex-col items-center gap-4 text-center text-muted-foreground">
        <Search className="size-12 opacity-20" aria-hidden />
        <p className="max-w-sm text-sm">{tHome("searchHelp")}</p>
        <div className="flex items-center gap-2 text-xs">
          <Sparkles className="size-3" aria-hidden />
          <span>{tHome("pokemonCount")}</span>
        </div>
      </section>
    </main>
  );
}
