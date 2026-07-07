import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/i18n/routing", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/queries", () => ({
  usePokemon: vi.fn(),
}));

import { usePokemon } from "@/lib/queries";
import { PokemonCard } from "@/components/pokemon/PokemonCard";
import { makePokemonFixture } from "@/tests/fixtures/pokemon";
import { WithIntl } from "@/tests/component/with-intl";

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

describe("PokemonCard", () => {
  it("muestra skeleton mientras carga", () => {
    vi.mocked(usePokemon).mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      isError: false,
    } as never);
    const { container } = render(
      <WithIntl>
        <PokemonCard resource={{ name: "pikachu", url: "https://pokeapi.co/api/v2/pokemon/25/" }} />
      </WithIntl>,
    );
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renderiza nombre, numero y tipos en estado cargado", () => {
    vi.mocked(usePokemon).mockReturnValueOnce({
      data: makePokemonFixture(),
      isLoading: false,
      isError: false,
    } as never);
    render(
      <WithIntl>
        <PokemonCard resource={{ name: "pikachu", url: "https://pokeapi.co/api/v2/pokemon/25/" }} />
      </WithIntl>,
    );
    expect(screen.getByText("Pikachu")).toBeInTheDocument();
    expect(screen.getByText("#0025")).toBeInTheDocument();
    expect(screen.getByText("Eléctrico")).toBeInTheDocument();
  });

  it("renderiza estado de error", () => {
    vi.mocked(usePokemon).mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      isError: true,
    } as never);
    render(
      <WithIntl>
        <PokemonCard
          resource={{ name: "missingno", url: "https://pokeapi.co/api/v2/pokemon/9999/" }}
        />
      </WithIntl>,
    );
    expect(screen.getByText(/Error/i)).toBeInTheDocument();
  });
});
