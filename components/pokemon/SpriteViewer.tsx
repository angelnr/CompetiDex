"use client";

import { useState } from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { capitalize } from "@/lib/pokemon-utils";

export interface SpriteViewerProps {
  /** Nombre del Pokémon (para alt). */
  name: string;
  /** Sprite oficial artwork (front_default del official-artwork). */
  artwork: string | null;
  /** Sprite shiny (official-artwork.front_shiny). */
  artworkShiny: string | null;
  /** Sprite normal como fallback si no hay artwork. */
  defaultSprite: string | null;
}

/**
 * Visor de sprites con interruptor normal/shiny. Botón accesible (Sparkles)
 * desactivado si el sprite shiny no existe (p.ej. algunos Pokémon no tienen shiny).
 */
export function SpriteViewer({ name, artwork, artworkShiny, defaultSprite }: SpriteViewerProps) {
  const t = useTranslations("spriteViewer");
  const [shiny, setShiny] = useState(false);

  const src = (shiny ? artworkShiny : artwork) ?? defaultSprite;
  const alt = `${capitalize(name)} ${shiny ? t("shiny") : t("normal")}`;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex size-64 items-center justify-center">
        {src ? (
          <Image src={src} alt={alt} fill className="object-contain" priority sizes="256px" />
        ) : (
          <span className="text-sm text-muted-foreground">{t("noSprite")}</span>
        )}
      </div>

      <Button
        type="button"
        variant={shiny ? "default" : "outline"}
        size="sm"
        disabled={!artworkShiny}
        onClick={() => setShiny((v) => !v)}
        aria-pressed={shiny}
      >
        <Sparkles className={cn(shiny && "text-yellow-500")} />
        {shiny ? t("shiny") : t("normal")}
      </Button>
    </div>
  );
}
