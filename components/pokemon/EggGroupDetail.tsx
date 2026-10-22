"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/routing";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPokedexId, formatSpeciesLabel, getPixelSpriteById } from "@/lib/pokemon-utils";

export interface EggGroupSpecies {
  id: number;
  name: string;
}

export interface EggGroupDetailProps {
  groupName: string;
  species: EggGroupSpecies[];
}

export function EggGroupDetail({ groupName, species }: EggGroupDetailProps) {
  const t = useTranslations("eggGroupPage");

  return (
    <article className="container mx-auto max-w-4xl py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">{t("title", { group: groupName })}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("count", { count: species.length })}
        </p>
      </header>

      {species.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noSpecies")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("species")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {species.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <Link
                    href={`/pokemon/${entry.id}`}
                    className="flex items-center gap-3 text-sm font-medium hover:underline"
                  >
                    <Image
                      src={getPixelSpriteById(entry.id)}
                      alt=""
                      width={32}
                      height={32}
                      className="size-8 shrink-0 object-contain"
                      unoptimized
                    />
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatPokedexId(entry.id)}
                    </span>
                    {formatSpeciesLabel(entry.name)}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </article>
  );
}
