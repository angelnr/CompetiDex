import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/i18n/routing", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/comparar",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: vi.fn(() => new URLSearchParams("ids=25,26")),
  usePathname: () => "/comparar",
}));

vi.mock("@/lib/queries", () => ({
  usePokemon: vi.fn(),
  usePokemonInfiniteList: vi.fn(() => ({ data: undefined })),
}));

import { usePokemon } from "@/lib/queries";
import { PokemonCompare } from "@/components/pokemon/PokemonCompare";
import { makePokemonFixture } from "@/tests/fixtures/pokemon";
import { WithIntl } from "@/tests/component/with-intl";

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

function makeRaichuFixture() {
  return makePokemonFixture({
    id: 26,
    name: "raichu",
    types: [{ slot: 1, type: { name: "electric", url: "" } }],
    stats: [
      { base_stat: 60, effort: 0, stat: { name: "hp", url: "" } },
      { base_stat: 90, effort: 0, stat: { name: "attack", url: "" } },
      { base_stat: 55, effort: 0, stat: { name: "defense", url: "" } },
    ],
  });
}

describe("PokemonCompare", () => {
  it("renderiza dos columnas con datos mockeados", () => {
    vi.mocked(usePokemon).mockImplementation((id?: number | string) => {
      if (id === 25) {
        return { data: makePokemonFixture(), isLoading: false, isError: false } as never;
      }
      if (id === 26) {
        return { data: makeRaichuFixture(), isLoading: false, isError: false } as never;
      }
      return { data: undefined, isLoading: true } as never;
    });

    render(
      <WithIntl>
        <PokemonCompare />
      </WithIntl>,
    );
    expect(screen.getAllByText("Pikachu").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Raichu").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Stats base").length).toBe(2);
  });

  it("renderiza boton limpiar", () => {
    vi.mocked(usePokemon).mockImplementation((id?: number | string) => {
      if (id === 25) {
        return { data: makePokemonFixture(), isLoading: false, isError: false } as never;
      }
      if (id === 26) {
        return { data: makeRaichuFixture(), isLoading: false, isError: false } as never;
      }
      return { data: undefined, isLoading: true } as never;
    });

    render(
      <WithIntl>
        <PokemonCompare />
      </WithIntl>,
    );
    expect(screen.getByText("Limpiar")).toBeInTheDocument();
  });

  it("muestra estado de error si falla carga", () => {
    vi.mocked(usePokemon).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as never);

    render(
      <WithIntl>
        <PokemonCompare />
      </WithIntl>,
    );
    expect(screen.getAllByText(/Error al cargar/i).length).toBe(2);
  });
});
