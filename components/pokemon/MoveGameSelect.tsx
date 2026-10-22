"use client";

import { usePathname, useRouter } from "@/i18n/routing";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface MoveGameOption {
  value: string;
  label: string;
}

export interface MoveGameSelectProps {
  value: string | undefined;
  options: MoveGameOption[];
  label: string;
}

/** Selector de juego que navega a `?game=` para que la página se renderice en servidor. */
export function MoveGameSelect({ value, options, label }: MoveGameSelectProps) {
  const router = useRouter();
  const pathname = usePathname();

  if (options.length === 0) return null;

  return (
    <Select
      value={value ?? ""}
      onValueChange={(game) => {
        router.push(`${pathname}?game=${encodeURIComponent(game)}`);
      }}
    >
      <SelectTrigger className="w-full sm:w-64" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
