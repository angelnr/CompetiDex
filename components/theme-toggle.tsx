"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

/**
 * Botón para alternar entre modo claro y oscuro.
 *
 * `resolvedTheme` devuelve el tema efectivo (resuelve "system"), así que el
 * toggle siempre parte del tema visible. El guard `mounted` evita mismatch
 * de hidratación: el tema solo se conoce en cliente.
 */
export function ThemeToggle() {
  const t = useTranslations("theme");
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Placeholder del mismo tamaño para que el nav no salte al hidratar.
    return <span className="inline-block size-9 shrink-0" aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? t("toLight") : t("toDark")}
      title={isDark ? t("toLight") : t("toDark")}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}
