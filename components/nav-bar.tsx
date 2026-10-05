"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/routing";
import { LanguageSwitcher } from "@/components/language-switcher";

const NAV_LINKS = [
  { href: "/equipos", key: "teams" },
  { href: "/comparar", key: "compare" },
  { href: "/efectividades", key: "effectiveness" },
] as const;

export function NavBar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <nav className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="shrink-0 text-sm font-semibold tracking-tight">
          {t("brand")}
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t(l.key)}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <LanguageSwitcher />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? t("closeMenu") : t("openMenu")}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-nav" className="border-t bg-background md:hidden">
          <div className="mx-auto flex w-full max-w-6xl flex-col px-4 py-2">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-2 py-3 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {t(l.key)}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
