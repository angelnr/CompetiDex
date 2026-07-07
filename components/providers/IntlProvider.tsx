"use client";

import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";

export interface IntlProviderProps {
  locale: string;
  messages: Record<string, unknown>;
  children: ReactNode;
}

/**
 * Wrapper de NextIntlClientProvider con getMessageFallback para
 * silenciar warnings de claves i18n faltantes (encounterMethods, versions)
 * que vienen de slugs dinámicos de PokeAPI sin traducción explícita.
 */
export function IntlProvider({ locale, messages, children }: IntlProviderProps) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      getMessageFallback={({ namespace, key }) => {
        if (namespace === "encounterMethods" || namespace === "versions") {
          return key;
        }
        return key;
      }}
    >
      {children}
    </NextIntlClientProvider>
  );
}
