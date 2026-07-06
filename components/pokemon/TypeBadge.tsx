import { getTypeMeta } from "@/lib/pokemon-types";
import { cn } from "@/lib/utils";

export interface TypeBadgeProps {
  /** Nombre del tipo en PokeAPI: "fire", "water"... */
  type: string;
  /** Tamaño visual. */
  size?: "sm" | "md";
  /** Clase extra (alineación, márgenes). */
  className?: string;
}

/**
 * Badge de tipo de Pokémon con color oficial del ámbito competitivo.
 *
 * Es un Server Component (sin estado) — puede usarse en layouts estáticos.
 * El fondo se inyecta con `style` porque las clases Tailwind dinámicas con
 * interpolación de strings están prohibidas (AGENTS.md §4.4): los colores
 * de tipos viven en `lib/pokemon-types.ts` como fuente única de verdad.
 */
export function TypeBadge({ type, size = "sm", className }: TypeBadgeProps) {
  const meta = getTypeMeta(type);

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold uppercase tracking-wide",
        size === "sm" ? "px-2 py-0.5 text-[0.65rem]" : "px-3 py-1 text-xs",
        className,
      )}
      style={{
        backgroundColor: meta.color,
        color: meta.text,
      }}
      title={meta.label}
    >
      {meta.label}
    </span>
  );
}
