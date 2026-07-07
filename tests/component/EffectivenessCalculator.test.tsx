import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/i18n/routing", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

const mockHook = vi.fn();

vi.mock("@/hooks/useEffectivenessCalculator", () => ({
  useEffectivenessCalculator: (...args: unknown[]) => mockHook(...args),
}));

vi.mock("@/lib/queries", () => ({
  usePokemon: vi.fn(() => ({ data: undefined, isLoading: true })),
  usePokemonInfiniteList: vi.fn(() => ({ data: undefined })),
}));

import { EffectivenessCalculator } from "@/components/pokemon/EffectivenessCalculator";
import { WithIntl } from "@/tests/component/with-intl";

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

function defaultHook() {
  return {
    moveType: null,
    setMoveType: vi.fn(),
    defenders: [],
    setDefenderTypes: vi.fn(),
    addDefender: vi.fn(),
    removeDefender: vi.fn(),
    clear: vi.fn(),
    result: null,
  };
}

describe("EffectivenessCalculator", () => {
  it("renderiza los 18 tipos como botones seleccionables", () => {
    mockHook.mockReturnValue(defaultHook());
    render(
      <WithIntl>
        <EffectivenessCalculator />
      </WithIntl>,
    );
    expect(screen.getByText("Fuego")).toBeInTheDocument();
    expect(screen.getByText("Agua")).toBeInTheDocument();
    expect(screen.getByText("Planta")).toBeInTheDocument();
  });

  it("llama a setMoveType al hacer click en un tipo", () => {
    const setMoveType = vi.fn();
    mockHook.mockReturnValue({ ...defaultHook(), setMoveType });

    render(
      <WithIntl>
        <EffectivenessCalculator />
      </WithIntl>,
    );
    fireEvent.click(screen.getByText("Fuego"));
    expect(setMoveType).toHaveBeenCalledWith("fire");
  });

  it("renderiza el campo de búsqueda de defensores", () => {
    mockHook.mockReturnValue(defaultHook());
    render(
      <WithIntl>
        <EffectivenessCalculator />
      </WithIntl>,
    );
    expect(screen.getByLabelText(/buscar.*defensor/i)).toBeInTheDocument();
  });

  it("muestra resultado cuando el hook devuelve un result", () => {
    mockHook.mockReturnValue({
      ...defaultHook(),
      moveType: "fire",
      result: {
        moveType: "fire",
        worst: 2,
        perDefender: [{ id: 1, name: "bulbasaur", multiplier: 2 }],
      },
    });

    render(
      <WithIntl>
        <EffectivenessCalculator />
      </WithIntl>,
    );
    expect(screen.getByText("x2")).toBeInTheDocument();
    expect(screen.getByText(/súper eficaz \(x2\)/i)).toBeInTheDocument();
  });

  it("muestra x0 cuando es inmune", () => {
    mockHook.mockReturnValue({
      ...defaultHook(),
      moveType: "ghost",
      result: {
        moveType: "ghost",
        worst: 0,
        perDefender: [{ id: 1, name: "gengar", multiplier: 0 }],
      },
    });

    render(
      <WithIntl>
        <EffectivenessCalculator />
      </WithIntl>,
    );
    expect(screen.getByText("x0")).toBeInTheDocument();
    expect(screen.getByText(/no afecta/i)).toBeInTheDocument();
  });

  it("boton limpiar visible cuando hay estado", () => {
    const clear = vi.fn();
    mockHook.mockReturnValue({
      ...defaultHook(),
      moveType: "fire",
      clear,
    });

    render(
      <WithIntl>
        <EffectivenessCalculator />
      </WithIntl>,
    );
    const clearBtn = screen.getByText(/limpiar/i);
    fireEvent.click(clearBtn);
    expect(clear).toHaveBeenCalled();
  });
});
