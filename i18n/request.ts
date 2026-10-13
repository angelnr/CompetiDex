import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

/**
 * Configuración i18n para SSR.
 *
 * - `timeZone` fijo evita el error `ENVIRONMENT_FALLBACK` de next-intl.
 * - `getMessageFallback` + `onError` silencian los `MISSING_MESSAGE` de slugs
 *   dinámicos de PokeAPI (versiones, métodos de encuentro, evoluciones) que no
 *   tienen traducción explícita, igual que hace el `IntlProvider` en cliente.
 *   Sin esto, cada página prerenderizada imprime un stack trace enorme y
 *   ralentiza/ensucia el build.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as never)) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: "UTC",
    getMessageFallback: ({ key }) => key,
    onError(error) {
      if (error.code === "MISSING_MESSAGE") return;
      console.error(error);
    },
  };
});
