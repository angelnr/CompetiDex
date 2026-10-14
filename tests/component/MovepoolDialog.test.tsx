import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { useMovepool } from "@/lib/queries";

vi.mock("@/lib/queries", () => ({
  useMovepool: vi.fn(),
}));

import { MovepoolDialog } from "@/components/pokemon/MovepoolDialog";
import { WithIntl } from "@/tests/component/with-intl";

const MOVES = [
  {
    slug: "mystical-fire",
    names: { es: "Llama Embrujada", en: "Mystical Fire" },
    type: "fire",
    category: "special",
    power: 75,
    accuracy: 100,
    pp: 10,
    priority: 0,
    vgs: ["scarlet-violet"],
  },
  {
    slug: "follow-me",
    names: { es: "Señuelo", en: "Follow Me" },
    type: "normal",
    category: "status",
    power: null,
    accuracy: null,
    pp: 20,
    priority: 2,
    vgs: ["scarlet-violet"],
  },
];

beforeEach(() => {
  vi.mocked(useMovepool).mockReturnValue({
    data: { id: 10186, versionGroups: [], moves: MOVES },
    isLoading: false,
    isError: false,
  } as never);
});

function setup(onSelect = vi.fn()) {
  render(
    <WithIntl>
      <MovepoolDialog
        open
        onOpenChange={vi.fn()}
        sourceId={10186}
        speciesLabel="Indeedee-F"
        selectedSlug={null}
        onSelect={onSelect}
      />
    </WithIntl>,
  );
  return { onSelect };
}

describe("MovepoolDialog", () => {
  it("lista los movimientos con el nombre en inglés como apoyo", () => {
    setup();
    expect(screen.getByText("Llama Embrujada")).toBeInTheDocument();
    expect(screen.getByText("Mystical Fire")).toBeInTheDocument();
    expect(screen.getByText("Señuelo")).toBeInTheDocument();
    expect(screen.getByText("Follow Me")).toBeInTheDocument();
  });

  it("encuentra un movimiento escribiendo su nombre en inglés", () => {
    setup();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "mystical" } });
    expect(screen.getByText("Mystical Fire")).toBeInTheDocument();
    expect(screen.queryByText("Señuelo")).not.toBeInTheDocument();
  });

  it("encuentra un movimiento escribiendo el nombre localizado", () => {
    setup();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "señuelo" } });
    expect(screen.getByText("Señuelo")).toBeInTheDocument();
    expect(screen.queryByText("Mystical Fire")).not.toBeInTheDocument();
  });

  it("asigna el movimiento al hacer clic en la fila", () => {
    const { onSelect } = setup();
    fireEvent.click(screen.getByText("Llama Embrujada"));
    expect(onSelect).toHaveBeenCalledWith("mystical-fire");
  });
});
