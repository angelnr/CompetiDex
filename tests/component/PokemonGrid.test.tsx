import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/queries", () => ({
  usePokemonInfiniteList: vi.fn(),
  usePokemon: vi.fn(() => ({ data: undefined, isLoading: true })),
}));
// Mock intersection observer para evitar errores en jsdom
class MockObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", MockObserver);

import { usePokemonInfiniteList } from "@/lib/queries";
import { PokemonGrid } from "@/components/pokemon/PokemonGrid";
import { makeResourceListFixture } from "@/tests/fixtures/pokemon";

beforeEach(() => vi.clearAllMocks());

describe("PokemonGrid", () => {
  it("renderiza skeletons en primera carga", () => {
    vi.mocked(usePokemonInfiniteList).mockReturnValue({
      data: undefined,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isError: false,
    } as never);
    const { container } = render(<PokemonGrid pageSize={4} />);
    // Cada PokemonCardSkeleton tiene varios .animate-pulse internos;
    // verificamos que existan al menos 4 (uno por card esperado)
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThanOrEqual(4);
  });

  it("renderiza items del grid cuando hay data (con cards en loading)", () => {
    vi.mocked(usePokemonInfiniteList).mockReturnValue({
      data: { pages: [makeResourceListFixture()] },
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isError: false,
    } as never);

    const { container } = render(<PokemonGrid pageSize={4} />);
    // 3 resources + 0 skeletons de next page = 3 hijos skeleton (debajo de cada card en loading)
    // Las cards en loading state producen skeletons internos
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("muestra mensaje de error si falla la carga", () => {
    vi.mocked(usePokemonInfiniteList).mockReturnValue({
      data: undefined,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isError: true,
    } as never);
    render(<PokemonGrid />);
    expect(screen.getByText(/No se pudo cargar/i)).toBeInTheDocument();
  });
});
