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
  {
    slug: "moonblast",
    names: { es: "Fuerza Lunar", en: "Moonblast" },
    type: "fairy",
    category: "special",
    power: 95,
    accuracy: 100,
    pp: 15,
    priority: 0,
    vgs: ["scarlet-violet"],
  },
  {
    slug: "play-rough",
    names: { es: "Carantoña", en: "Play Rough" },
    type: "fairy",
    category: "physical",
    power: 90,
    accuracy: 90,
    pp: 10,
    priority: 0,
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

describe("MovepoolDialog: ordenación", () => {
  const dataRows = () => screen.getAllByRole("row").slice(1);

  it("ordena por poder de mayor a menor y se invierte con un segundo clic", () => {
    setup();
    const header = screen.getByRole("button", { name: "Poder" });

    fireEvent.click(header);
    expect(screen.getByRole("columnheader", { name: "Poder" })).toHaveAttribute(
      "aria-sort",
      "descending",
    );
    expect(dataRows()[0]!.textContent).toContain("Fuerza Lunar");

    fireEvent.click(header);
    expect(screen.getByRole("columnheader", { name: "Poder" })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    expect(dataRows()[0]!.textContent).toContain("Llama Embrujada");
    // El movimiento sin poder (Señuelo) queda siempre al final.
    expect(dataRows().at(-1)!.textContent).toContain("Señuelo");
  });

  it("ordena por nombre de A a Z al pulsar la cabecera", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Nombre" }));
    expect(dataRows()[0]!.textContent).toContain("Carantoña");
  });
});

describe("MovepoolDialog: filtros por tipo y categoría", () => {
  it("filtra por un tipo escrito en el buscador", () => {
    setup();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Hada" } });

    expect(screen.getByText("Fuerza Lunar")).toBeInTheDocument();
    expect(screen.getByText("Carantoña")).toBeInTheDocument();
    expect(screen.queryByText("Llama Embrujada")).not.toBeInTheDocument();
    expect(screen.getByText("Filtros: Hada")).toBeInTheDocument();
  });

  it("acepta varios tipos separados por comas (OR)", () => {
    setup();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Hada, Fuego" } });

    expect(screen.getByText("Fuerza Lunar")).toBeInTheDocument();
    expect(screen.getByText("Llama Embrujada")).toBeInTheDocument();
    expect(screen.queryByText("Señuelo")).not.toBeInTheDocument();
  });

  it("filtra por categoría y la combina con el tipo", () => {
    setup();
    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "Físico" } });
    expect(screen.getByText("Carantoña")).toBeInTheDocument();
    expect(screen.queryByText("Fuerza Lunar")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "Hada, Especial" } });
    expect(screen.getByText("Fuerza Lunar")).toBeInTheDocument();
    expect(screen.queryByText("Carantoña")).not.toBeInTheDocument();
  });
});
