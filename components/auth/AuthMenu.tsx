"use client";

import { LogIn, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link, useRouter } from "@/i18n/routing";
import { signOut, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function AuthMenu() {
  const t = useTranslations("auth");
  const router = useRouter();
  const { data, isPending } = useSession();

  async function handleSignOut() {
    await signOut({ disableRedirect: true });
    router.push("/");
    router.refresh();
  }

  if (isPending) {
    return <Skeleton className="h-9 w-24 rounded-md" />;
  }

  const user = data?.user;

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="hidden max-w-32 truncate text-sm text-muted-foreground sm:inline"
          title={user.name}
        >
          {user.name}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void handleSignOut()}
          aria-label={t("signOut")}
        >
          <LogOut className="size-4" />
          <span className="hidden sm:inline">{t("signOut")}</span>
        </Button>
      </div>
    );
  }

  return (
    <Button asChild variant="outline" size="sm">
      <Link href="/acceder" className="text-sm">
        <LogIn className="size-4" />
        {t("signIn")}
      </Link>
    </Button>
  );
}
