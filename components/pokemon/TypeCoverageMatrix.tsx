import { TypeBadge } from "@/components/pokemon/TypeBadge";
import { getDefensiveMultiplier } from "@/lib/type-chart";
import { REAL_TYPES } from "@/lib/type-chart";

export interface TypeCoverageMatrixProps {
  columns: { name: string; types: string[] }[];
}

/**
 * Matriz 18×N (tipos atacantes × Pokémon defensores).
 * Cada celda muestra el multiplicador coloreado semánticamente.
 * Server component — no usa hook.
 */
export function TypeCoverageMatrix({ columns }: TypeCoverageMatrixProps) {
  if (columns.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Sin datos para mostrar la matriz de cobertura.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm" aria-label="Matriz de cobertura de tipos">
        <caption className="sr-only">
          Cobertura defensiva: multiplicadores por tipo atacante para cada Pokémon.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="pr-3 font-medium text-muted-foreground">
              Atacante
            </th>
            {columns.map((col) => (
              <th key={col.name} scope="col" className="px-2 font-medium">
                {col.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {REAL_TYPES.map((atk) => (
            <tr key={atk} className="border-b border-muted/30 last:border-0">
              <td className="py-1 pr-3">
                <TypeBadge type={atk} size="sm" />
              </td>
              {columns.map((col) => {
                const mult = getDefensiveMultiplier(atk, col.types);
                return (
                  <td key={col.name} className="px-2 py-1">
                    <span className={cellClass(mult)}>{formatCell(mult)}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(mult: number): string {
  if (mult === 0) return "x0";
  if (mult === 0.25) return "x¼";
  if (mult === 0.5) return "x½";
  if (mult === 1) return "x1";
  if (mult === 2) return "x2";
  if (mult === 4) return "x4";
  return `x${mult}`;
}

function cellClass(mult: number): string {
  if (mult === 0) return "text-muted-foreground line-through";
  if (mult === 0.25) return "text-green-600 font-semibold";
  if (mult === 0.5) return "text-green-500 font-medium";
  if (mult === 1) return "text-muted-foreground/60";
  if (mult >= 4) return "text-red-600 font-bold";
  if (mult >= 2) return "text-red-500 font-semibold";
  return "text-muted-foreground";
}
