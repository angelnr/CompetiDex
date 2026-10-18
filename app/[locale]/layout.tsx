import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import localFont from "next/font/local";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ReactNode } from "react";

import { IntlProvider } from "@/components/providers/IntlProvider";
import { routing } from "@/i18n/routing";
import "../globals.css";
import { Providers } from "./providers";
import { NavBar } from "@/components/nav-bar";
import { SiteFooter } from "@/components/site-footer";

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

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${manrope.variable} ${geistMono.variable} antialiased`}>
        <IntlProvider locale={locale} messages={messages}>
          <Providers>
            <div className="flex min-h-svh flex-col">
              <NavBar />
              <div className="flex-1">{children}</div>
              <SiteFooter locale={locale} />
            </div>
          </Providers>
        </IntlProvider>
      </body>
    </html>
  );
}
