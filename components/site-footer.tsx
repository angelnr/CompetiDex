import { CircleDot } from "lucide-react";
import { getTranslations } from "next-intl/server";

export interface SiteFooterProps {
  /** Locale actual (mismo patrón que el resto de server components). */
  locale: string;
}

/**
 * Footer legal: atribución a PokeAPI y disclaimer de marca de Pokémon.
 * Server component: no necesita interactividad.
 * Propiedad de Pokémon (verificado): marcas de Nintendo, Creatures Inc. y
 * GAME FREAK inc., gestionadas por The Pokémon Company (joint venture).
 */
export async function SiteFooter({ locale }: SiteFooterProps) {
  const t = await getTranslations({ locale, namespace: "footer" });
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-card/50">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-1.5 text-sm font-bold tracking-tight">
            <CircleDot className="size-4 text-primary" aria-hidden />
            CompetiDex
          </div>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            {t("disclaimer")}
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-2 border-t pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} CompetiDex</p>
          <p>
            {t("poweredBy")}{" "}
            <a
              href="https://pokeapi.co"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-2 transition-colors hover:text-foreground"
            >
              PokeAPI
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
