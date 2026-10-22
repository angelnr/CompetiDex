import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/i18n/routing", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/ruta/185",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/ruta/185",
}));

import { LocationAreaDetail } from "@/components/pokemon/LocationAreaDetail";
import type { LocationEncounterRow } from "@/lib/location-encounters";
import { WithIntl } from "@/tests/component/with-intl";

const ROWS: LocationEncounterRow[] = [
  {
    pokemonId: 16,
    pokemonName: "pidgey",
    method: "walk",
    minLevel: 2,
    maxLevel: 2,
    chance: 30,
    time: [],
  },
  {
    pokemonId: 16,
    pokemonName: "pidgey",
    method: "headbutt",
    minLevel: 2,
    maxLevel: 3,
    chance: 20,
    time: ["time-morning"],
  },
  {
    pokemonId: 19,
    pokemonName: "rattata",
    method: "walk",
    minLevel: 2,
    maxLevel: 3,
    chance: 10,
    time: [],
  },
];

describe("LocationAreaDetail", () => {
  it("muestra la vista agrupada por especie y permite abrir el detalle", () => {
    render(
      <WithIntl>
        <LocationAreaDetail areaName="Ruta 29" rows={ROWS} games={["gold"]} selectedGame="gold" />
      </WithIntl>,
    );

    expect(screen.getByText("Pokémon en esta ruta (2)")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: "Vista de detalle" }));

    expect(screen.getByRole("button", { name: "Vista agrupada" })).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(4);
  });
});
