import type { ReactNode } from "react";

import { IntlProvider } from "@/components/providers/IntlProvider";
import esMessages from "@/messages/es.json";

interface WithIntlProps {
  children: ReactNode;
  locale?: string;
  messages?: Record<string, unknown>;
}

/**
 * Wrapper de test que provee el contexto de IntlProvider
 * con los messages en español por defecto.
 */
export function WithIntl({ children, locale = "es", messages = esMessages }: WithIntlProps) {
  return (
    <IntlProvider locale={locale} messages={messages}>
      {children}
    </IntlProvider>
  );
}
