"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";

import { useSession } from "@/lib/auth-client";
import { localStorageTeamStorage, remoteTeamStorage } from "@/lib/storage";
import { folderDepth } from "@/lib/folders";
import { Button } from "@/components/ui/button";

export interface TeamImportPromptProps {
  onImported?: (() => void) | undefined;
}

/**
 * Ofrece importar los equipos del localStorage (modo invitado) a la cuenta
 * al iniciar sesión. La decisión se recuerda por usuario para no repetir el
 * prompt en cada visita.
 */
export function TeamImportPrompt({ onImported }: TeamImportPromptProps) {
  const t = useTranslations("teams");
  const { data } = useSession();
  const userId = data?.user?.id;

  const [localCount, setLocalCount] = useState<number>(0);
  const [importing, setImporting] = useState(false);
  const [shouldAsk, setShouldAsk] = useState(false);

  useEffect(() => {
    if (!userId) {
      setShouldAsk(false);
      return;
    }
    if (localStorage.getItem(`competidex:teams-imported-${userId}`) === "1") {
      setShouldAsk(false);
      return;
    }
    let cancelled = false;
    localStorageTeamStorage
      .list()
      .then((teams) => {
        if (cancelled) return;
        setLocalCount(teams.length);
        setShouldAsk(teams.length > 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!userId || !shouldAsk) return null;

  async function handleImport() {
    setImporting(true);
    try {
      const localTeams = await localStorageTeamStorage.list();
      const localFolders = await localStorageTeamStorage.listFolders();
      // Carpetas primero, de raíz a hojas, para respetar las FK padre→hijo.
      const orderedFolders = [...localFolders].sort(
        (a, b) => folderDepth(localFolders, a.id) - folderDepth(localFolders, b.id),
      );
      for (const folder of orderedFolders) {
        await remoteTeamStorage.saveFolder(folder);
      }
      for (const team of localTeams) {
        await remoteTeamStorage.save(team);
      }
      localStorage.setItem(`competidex:teams-imported-${userId}`, "1");
      setShouldAsk(false);
      onImported?.();
    } catch (err) {
      console.error("[teams] error al importar equipos locales:", err);
    } finally {
      setImporting(false);
    }
  }

  async function handleSkip() {
    localStorage.setItem(`competidex:teams-imported-${userId}`, "1");
    setShouldAsk(false);
  }

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">{t("localImportTitle")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("localImportBody", { count: localCount })}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => void handleSkip()}>
          {t("localImportSkip")}
        </Button>
        <Button type="button" size="sm" disabled={importing} onClick={() => void handleImport()}>
          <Download className="size-4" />
          {importing ? t("localImporting") : t("localImportAction")}
        </Button>
      </div>
    </div>
  );
}
