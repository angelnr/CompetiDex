"use client";

import { useMemo, useState } from "react";
import { FolderPlus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { TeamCard } from "@/components/pokemon/TeamCard";
import { TeamImportPrompt } from "@/components/teams/TeamImportPrompt";
import { ALL_FOLDERS, FolderTree } from "@/components/teams/FolderTree";
import { FolderFormDialog } from "@/components/teams/FolderFormDialog";
import { MoveTeamDialog } from "@/components/teams/MoveTeamDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTeams } from "@/hooks/useTeams";
import { folderBreadcrumb, type Folder } from "@/lib/folders";
import { cn } from "@/lib/utils";

export default function EquiposPage() {
  const t = useTranslations("teams");
  const {
    teams,
    folders,
    loaded,
    reload,
    createTeam,
    deleteTeam,
    renameTeam,
    moveTeam,
    createFolder,
    renameFolder,
    deleteFolder,
  } = useTeams();

  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  // `null` = sin carpeta (raíz); `ALL_FOLDERS` = todos; string = id de carpeta.
  const [current, setCurrent] = useState<string | null>(ALL_FOLDERS);

  const [createParent, setCreateParent] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [renaming, setRenaming] = useState<Folder | null>(null);
  const [movingTeamId, setMovingTeamId] = useState<string | null>(null);

  const targetFolder = current && current !== ALL_FOLDERS ? current : null;

  const handleCreate = () => {
    setError(null);
    const result = createTeam(newName, targetFolder);
    if (result.ok) {
      setNewName("");
    } else {
      setError(result.error);
    }
  };

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const team of teams) {
      const key = team.folderId ?? "";
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [teams]);

  const visibleTeams = useMemo(() => {
    if (current === ALL_FOLDERS) return teams;
    if (current === null) return teams.filter((team) => !team.folderId);
    return teams.filter((team) => team.folderId === current);
  }, [teams, current]);

  const breadcrumb = current && current !== ALL_FOLDERS ? folderBreadcrumb(folders, current) : [];

  const movingTeam = movingTeamId ? teams.find((team) => team.id === movingTeamId) : undefined;

  const handleDeleteFolder = (folder: Folder) => {
    if (!window.confirm(t("deleteFolderConfirm", { name: folder.name }))) return;
    if (current === folder.id) setCurrent(ALL_FOLDERS);
    void deleteFolder(folder.id);
  };

  return (
    <main className="container mx-auto px-4 py-10">
      <div className="mb-8 space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>

        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder={t("teamNamePlaceholder")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            maxLength={30}
            className="max-w-xs"
            aria-label={t("teamNameAria")}
          />
          <Button type="button" disabled={!newName.trim()} onClick={handleCreate}>
            <Plus className="size-4" />
            {t("create")}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <TeamImportPrompt onImported={() => void reload()} />

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* ── Sidebar de carpetas ── */}
        <aside className="w-full shrink-0 rounded-lg border bg-card p-3 lg:w-64">
          <div className="mb-2 flex items-center justify-between">
            <span className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("foldersTitle")}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => {
                setCreateParent(null);
                setCreateOpen(true);
              }}
              aria-label={t("newFolder")}
              title={t("newFolder")}
            >
              <FolderPlus className="size-3.5" />
            </Button>
          </div>
          <FolderTree
            folders={folders}
            current={current}
            counts={counts}
            onSelect={setCurrent}
            onCreateChild={(parentId) => {
              setCreateParent(parentId);
              setCreateOpen(true);
            }}
            onRename={(folder) => setRenaming(folder)}
            onDelete={handleDeleteFolder}
          />
        </aside>

        {/* ── Contenido ── */}
        <div className="min-w-0 flex-1">
          <nav
            aria-label={t("foldersTitle")}
            className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
          >
            <button
              type="button"
              onClick={() => setCurrent(ALL_FOLDERS)}
              className={cn(
                "rounded px-1 hover:text-foreground",
                current === ALL_FOLDERS && "font-medium text-foreground",
              )}
            >
              {t("allTeams")}
            </button>
            {current === null && (
              <>
                <span aria-hidden>/</span>
                <span className="font-medium text-foreground">{t("noFolder")}</span>
              </>
            )}
            {breadcrumb.map((folder, i) => (
              <span key={folder.id} className="flex items-center gap-1">
                <span aria-hidden>/</span>
                <button
                  type="button"
                  onClick={() => setCurrent(folder.id)}
                  className={cn(
                    "rounded px-1 hover:text-foreground",
                    i === breadcrumb.length - 1 && "font-medium text-foreground",
                  )}
                >
                  {folder.name}
                </button>
              </span>
            ))}
          </nav>

          {!loaded ? (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          ) : visibleTeams.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("emptyFolder")}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleTeams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  onDelete={(id) => void deleteTeam(id)}
                  onRename={async (id, name) => {
                    const result = await renameTeam(id, name);
                    return result.ok ? { ok: true } : { ok: false, error: result.error };
                  }}
                  onMove={(id) => setMovingTeamId(id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Diálogos ── */}
      <FolderFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={createParent ? t("newSubfolder") : t("newFolder")}
        onSubmit={async (name) => {
          const result = await createFolder(name, createParent);
          return result.ok ? { ok: true } : { ok: false, error: result.error };
        }}
      />

      <FolderFormDialog
        open={renaming !== null}
        onOpenChange={(open) => {
          if (!open) setRenaming(null);
        }}
        title={t("renameFolder")}
        initialName={renaming?.name ?? ""}
        onSubmit={async (name) => {
          if (!renaming) return { ok: true };
          const result = await renameFolder(renaming.id, name);
          return result.ok ? { ok: true } : { ok: false, error: result.error };
        }}
      />

      <MoveTeamDialog
        open={movingTeamId !== null}
        onOpenChange={(open) => {
          if (!open) setMovingTeamId(null);
        }}
        folders={folders}
        currentFolderId={movingTeam?.folderId ?? null}
        teamName={movingTeam?.name ?? ""}
        onSelect={(folderId) => {
          if (movingTeamId) void moveTeam(movingTeamId, folderId);
        }}
      />
    </main>
  );
}
