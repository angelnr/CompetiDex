import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";

import esMessages from "@/messages/es.json";

interface WithIntlProps {
  children: ReactNode;
  locale?: string;
  messages?: Record<string, unknown>;
}

/**
 * Wrapper de test que provee el contexto de NextIntlClientProvider
 * con los messages en español por defecto.
 */
export function WithIntl({ children, locale = "es", messages = esMessages }: WithIntlProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
