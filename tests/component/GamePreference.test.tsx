import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

vi.mock("@/i18n/routing", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const useMoveMock = vi.fn(() => ({ data: undefined, isLoading: true, isError: false }));

vi.mock("@/lib/queries", () => ({
  useMove: () => useMoveMock(),
  useLocationAreaNames: () => ({ data: {} }),
}));

import { EncounterInfo } from "@/components/pokemon/EncounterInfo";
import { MovesSection } from "@/components/pokemon/MovesSection";
import { saveVersion, saveVersionGroup } from "@/lib/game-preference";
import type { LocationAreaEncounter, PokemonMoveSlot } from "@/lib/pokeapi";
import { WithIntl } from "@/tests/component/with-intl";

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

function moveSlot(
  name: string,
  id: number,
  versionGroup: string,
  method: string,
  level = 0,
): PokemonMoveSlot {
  return {
    move: { name, url: `https://pokeapi.co/api/v2/move/${id}/` },
    version_group_details: [
      {
        level_learned_at: level,
        version_group: {
          name: versionGroup,
          url: `https://pokeapi.co/api/v2/version-group/${versionGroup}/`,
        },
        move_learn_method: {
          name: method,
          url: `https://pokeapi.co/api/v2/move-learn-method/${method}/`,
        },
      },
    ],
  };
}

const MOVE_SLOTS: PokemonMoveSlot[] = [
  moveSlot("tackle", 33, "scarlet-violet", "level-up", 1),
  moveSlot("snap-trap", 779, "sword-shield", "level-up", 45),
  moveSlot("fake-out", 252, "champions", "train"),
];

const ENCOUNTERS: LocationAreaEncounter[] = [
  {
    location_area: {
      name: "route-1",
      url: "https://pokeapi.co/api/v2/location-area/1/",
    },
    version_details: [
      {
        version: { name: "sword", url: "https://pokeapi.co/api/v2/version/28/" },
        max_chance: 10,
        encounter_details: [
          {
            chance: 10,
            condition_values: [],
            max_level: 5,
            min_level: 2,
            method: { name: "walk", url: "" },
          },
        ],
      },
    ],
  },
  {
    location_area: {
      name: "route-2",
      url: "https://pokeapi.co/api/v2/location-area/2/",
    },
    version_details: [
      {
        version: { name: "shield", url: "https://pokeapi.co/api/v2/version/29/" },
        max_chance: 10,
        encounter_details: [
          {
            chance: 10,
            condition_values: [],
            max_level: 5,
            min_level: 2,
            method: { name: "walk", url: "" },
          },
        ],
      },
    ],
  },
];

describe("Movimientos · persistencia de juego", () => {
  it("restaura el último version-group guardado", () => {
    saveVersionGroup("champions");

    render(
      <WithIntl>
        <MovesSection moveSlots={MOVE_SLOTS} />
      </WithIntl>,
    );

    expect(screen.getByRole("tab", { name: "Entrenamiento" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("fake-out")).toBeInTheDocument();
  });
});

describe("Encuentros · persistencia de juego", () => {
  it("restaura la última versión guardada", () => {
    saveVersion("shield");

    render(
      <WithIntl>
        <EncounterInfo encounters={ENCOUNTERS} />
      </WithIntl>,
    );

    expect(screen.getByText("Ruta 2")).toBeInTheDocument();
    expect(screen.queryByText("Ruta 1")).not.toBeInTheDocument();
  });

  it("sincroniza Movimientos y Encuentros en la misma ficha", () => {
    render(
      <WithIntl>
        <>
          <MovesSection moveSlots={MOVE_SLOTS} />
          <EncounterInfo encounters={ENCOUNTERS} />
        </>
      </WithIntl>,
    );

    // Por defecto: Movimientos en Escarlata/Púrpura y encuentros en Espada.
    expect(screen.getByText("tackle")).toBeInTheDocument();
    expect(screen.getByText("Ruta 1")).toBeInTheDocument();

    act(() => saveVersion("shield"));

    // Cambiar a Escudo actualiza ambos selectores.
    expect(screen.getByText("snap-trap")).toBeInTheDocument();
    expect(screen.queryByText("tackle")).not.toBeInTheDocument();
    expect(screen.getByText("Ruta 2")).toBeInTheDocument();
    expect(screen.queryByText("Ruta 1")).not.toBeInTheDocument();
  });
});
