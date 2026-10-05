"use client";

import { useState } from "react";
import Image from "next/image";
import { Package } from "lucide-react";

import { getItemSpriteUrl } from "@/lib/items";
import { cn } from "@/lib/utils";

export interface ItemSpriteProps {
  slug: string;
  alt: string;
  className?: string;
}

/**
 * Sprite de un objeto de PokeAPI. Muchos objetos nuevos (piedras de Z-A /
 * Champions) aún no tienen sprite, así que cae a un icono genérico si falla.
 */
export function ItemSprite({ slug, alt, className }: ItemSpriteProps) {
  const [failed, setFailed] = useState(false);
  const cls = cn("shrink-0 object-contain", className ?? "size-8");

  if (failed) {
    return <Package className={cn(cls, "text-muted-foreground")} aria-hidden />;
  }

  return (
    <Image
      src={getItemSpriteUrl(slug)}
      alt={alt}
      width={64}
      height={64}
      onError={() => setFailed(true)}
      className={cls}
    />
  );
}
