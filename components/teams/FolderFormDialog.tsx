"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export interface FolderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialName?: string;
  onSubmit: (name: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}

/** Diálogo simple para crear o renombrar una carpeta. */
export function FolderFormDialog({
  open,
  onOpenChange,
  title,
  initialName = "",
  onSubmit,
}: FolderFormDialogProps) {
  const t = useTranslations("teams");
  const tc = useTranslations("common");
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setError(null);
    }
  }, [open, initialName]);

  const submit = async () => {
    const result = await onSubmit(name);
    if (result.ok) {
      onOpenChange(false);
    } else {
      setError(result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
          maxLength={30}
          autoFocus
          placeholder={t("folderNamePlaceholder")}
          aria-label={t("folderNamePlaceholder")}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={!name.trim()}>
            {tc("save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
