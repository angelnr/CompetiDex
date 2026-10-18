"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { routing } from "@/i18n/routing";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("lang");
  const [isPending, startTransition] = useTransition();

  function onSelect(next: string) {
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <Select value={locale} onValueChange={onSelect}>
      <SelectTrigger className="w-[68px]" aria-label={t("switcherAria")}>
        <SelectValue placeholder={locale}>{locale}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {routing.locales.map((l) => (
          <SelectItem key={l} value={l} title={t(l)}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
