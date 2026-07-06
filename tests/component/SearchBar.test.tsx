import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { usePokemonInfiniteList } from "@/lib/queries";

// Mock del router para no depender de next/navigation
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));
vi.mock("@/lib/queries", () => ({
  usePokemonInfiniteList: vi.fn(),
}));

import { SearchBar } from "@/components/pokemon/SearchBar";
import { makeResourceListFixture } from "@/tests/fixtures/pokemon";

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("SearchBar", () => {
  it("no muestra sugerencias sin query", () => {
    vi.mocked(usePokemonInfiniteList).mockReturnValue({
      data: { pages: [makeResourceListFixture()] },
    } as never);
    render(<SearchBar />);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("muestra sugerencias tras debounce", async () => {
    vi.mocked(usePokemonInfiniteList).mockReturnValue({
      data: {
        pages: [
          makeResourceListFixture({
            results: [
              { name: "pikachu", url: "https://pokeapi.co/api/v2/pokemon/25/" },
              { name: "pichu", url: "https://pokeapi.co/api/v2/pokemon/172/" },
              { name: "bulbasaur", url: "https://pokeapi.co/api/v2/pokemon/1/" },
            ],
          }),
        ],
      },
    } as never);
    vi.useRealTimers();

    render(<SearchBar />);
    const input = screen.getByLabelText(/buscar/i);
    fireEvent.change(input, { target: { value: "pi" } });

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeInTheDocument();
      expect(screen.getByText("Pikachu")).toBeInTheDocument();
      expect(screen.getByText("Pichu")).toBeInTheDocument();
      expect(screen.queryByText("Bulbasaur")).toBeNull();
    });
  });

  it("limpia el input al pulsar el boton X", async () => {
    vi.mocked(usePokemonInfiniteList).mockReturnValue({
      data: { pages: [makeResourceListFixture()] },
    } as never);
    render(<SearchBar />);
    const input = screen.getByLabelText(/buscar/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "pikachu" } });
    expect(input.value).toBe("pikachu");
    fireEvent.click(screen.getByLabelText(/limpiar/i));
    expect(input.value).toBe("");
  });
});
