"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { z } from "zod";

import { useRouter } from "@/i18n/routing";
import { authClient } from "@/lib/auth-client";
import { readAuthErrorKey } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type Mode = "login" | "register";

export function AuthForm({ className }: { className?: string }) {
  const t = useTranslations("auth");
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const schema =
    mode === "login"
      ? z.object({
          email: z.string().trim().email(),
          password: z.string().min(1),
        })
      : z.object({
          name: z.string().trim().min(2),
          email: z.string().trim().email(),
          password: z.string().min(6),
        });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorKey(null);

    const parsed = schema.safeParse({ name, email, password });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      if (issue) {
        if (issue.path[0] === "email") setFieldError("email");
        else if (issue.path[0] === "name") setFieldError("name");
        else setFieldError("password");
      }
      return;
    }
    setFieldError(null);
    setSubmitting(true);

    try {
      const result =
        mode === "login"
          ? await authClient.signIn.email({ email: email.trim(), password })
          : await authClient.signUp.email({ name: name.trim(), email: email.trim(), password });

      if (result.error) {
        setErrorKey(readAuthErrorKey(result.error));
        return;
      }

      router.push("/equipos");
    } catch (err) {
      setErrorKey(readAuthErrorKey(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={cn("w-full", className)}>
      <Tabs
        value={mode}
        onValueChange={(v) => {
          setMode(v as Mode);
          setErrorKey(null);
          setFieldError(null);
        }}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">{t("loginTab")}</TabsTrigger>
          <TabsTrigger value="register">{t("registerTab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="login" className="mt-4">
          <h2 className="text-lg font-semibold">{t("loginHeading")}</h2>
          <p className="text-sm text-muted-foreground">{t("loginSubtitle")}</p>
        </TabsContent>
        <TabsContent value="register" className="mt-4">
          <h2 className="text-lg font-semibold">{t("registerHeading")}</h2>
          <p className="text-sm text-muted-foreground">{t("registerSubtitle")}</p>
        </TabsContent>
      </Tabs>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
        {mode === "register" && (
          <div className="space-y-2">
            <label htmlFor="auth-name" className="text-sm font-medium">
              {t("name")}
            </label>
            <Input
              id="auth-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              aria-invalid={fieldError === "name"}
            />
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="auth-email" className="text-sm font-medium">
            {t("email")}
          </label>
          <Input
            id="auth-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            aria-invalid={fieldError === "email"}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="auth-password" className="text-sm font-medium">
            {t("password")}
          </label>
          <Input
            id="auth-password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("passwordPlaceholder")}
            aria-invalid={fieldError === "password"}
          />
        </div>

        {errorKey && <p className="text-sm text-destructive">{t(errorKey)}</p>}
        {fieldError && <p className="text-sm text-destructive">{t(`errorField.${fieldError}`)}</p>}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? t("loading") : mode === "login" ? t("submitLogin") : t("submitRegister")}
        </Button>
      </form>
    </div>
  );
}
