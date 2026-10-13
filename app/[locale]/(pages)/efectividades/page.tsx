import { redirect } from "@/i18n/routing";

/**
 * La calculadora de daño sustituye a la página de efectividades.
 * Redirige de forma permanente a /calculadora conservando el locale.
 */
export default function EfectividadesPage({ params }: { params: { locale: string } }) {
  redirect({ href: "/calculadora", locale: params.locale });
}
