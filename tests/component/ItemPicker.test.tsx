import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useItem, useItems, useLocalizedItemNames } from "@/lib/queries";

vi.mock("@/lib/queries", () => ({
  useItem: vi.fn(),
  useItems: vi.fn(),
  useLocalizedItemNames: vi.fn(),
}));

import { ItemPicker } from "@/components/pokemon/ItemPicker";
import { WithIntl } from "@/tests/component/with-intl";

function setup() {
  render(
    <WithIntl>
      <ItemPicker value={null} onChange={vi.fn()} />
    </WithIntl>,
  );
}

beforeEach(() => {
  vi.mocked(useItem).mockReturnValue({ data: undefined } as never);
  vi.mocked(useItems).mockReturnValue([] as never);
  vi.mocked(useLocalizedItemNames).mockReturnValue({
    data: {
      leftovers: {
        es: "Restos",
        en: "Leftovers",
        fr: "Restes",
        de: "Überreste",
        ja: "たべのこし",
      },
      "life-orb": { es: "Vidasfera", en: "Life Orb", fr: "Orbe Vie", de: "Leben-Orb", ja: "" },
    },
  } as never);
});

describe("ItemPicker búsqueda localizada", () => {
  it("encuentra Leftovers escribiendo su nombre en español (Restos)", () => {
    setup();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "Restos" } });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByText("Leftovers")).toBeInTheDocument();
  });

  it("encuentra Leftovers sin acentos (restos)", () => {
    setup();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "restos" } });
    expect(screen.getByText("Leftovers")).toBeInTheDocument();
  });

  it("también encuentra objetos por nombres localizados no canónicos (Vidasfera)", () => {
    setup();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "vidasfera" } });
    expect(screen.getByText("Life Orb")).toBeInTheDocument();
  });
});
