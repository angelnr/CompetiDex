import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ReactNode } from "react";

import { routing } from "@/i18n/routing";
import "../globals.css";
import { Providers } from "./providers";
import { Link } from "@/i18n/routing";
import { LanguageSwitcher } from "@/components/language-switcher";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});
const geistMono = localFont({
  src: "../fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "CompetiDex",
  description:
    "Pokédex all-in-one con stats, evoluciones, habilidades, movimientos y debilidades, construida sobre PokeAPI.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

interface LocaleLayoutProps {
  children: ReactNode;
  params: { locale: string };
}

export default async function LocaleLayout({ children, params: { locale } }: LocaleLayoutProps) {
  if (!routing.locales.includes(locale as never)) {
    notFound();
  }
  setRequestLocale(locale);

  const messages = await getMessages();
  const tNav = await getTranslations({ locale, namespace: "nav" });

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${manrope.variable} ${geistMono.variable} antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <NavBar tNav={tNav} />
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

function NavBar({ tNav }: { tNav: (key: string) => string }) {
  return (
    <nav className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-12 items-center gap-6 px-4">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          {tNav("brand")}
        </Link>
        <Link
          href="/equipos"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {tNav("teams")}
        </Link>
        <Link
          href="/comparar"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {tNav("compare")}
        </Link>
        <Link
          href="/efectividades"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {tNav("effectiveness")}
        </Link>
        <div className="ml-auto">
          <LanguageSwitcher />
        </div>
      </div>
    </nav>
  );
}
