import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { FieldPanel } from "@/components/calc/FieldPanel";
import { ResultsPanel } from "@/components/calc/ResultsPanel";
import { EMPTY_CALC_FIELD, type CalcFieldInput, type CalcResult } from "@/lib/calc/types";
import { useMoveNames } from "@/lib/queries";
import { WithIntl } from "@/tests/component/with-intl";

vi.mock("@/lib/queries", () => ({
  useMoveNames: vi.fn(),
}));

describe("FieldPanel", () => {
  it("cambia de nivel 50/100 y de clima", () => {
    const onChange = vi.fn();
    const field: CalcFieldInput = { ...EMPTY_CALC_FIELD };
    render(
      <WithIntl>
        <FieldPanel field={field} onChange={onChange} />
      </WithIntl>,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Lv 50" }));
    expect(onChange).toHaveBeenCalledWith({ level: 50 });
  });

  it("alterna tramparrocas y pantallas", () => {
    const onChange = vi.fn();
    render(
      <WithIntl>
        <FieldPanel field={{ ...EMPTY_CALC_FIELD }} onChange={onChange} />
      </WithIntl>,
    );

    fireEvent.click(screen.getByRole("switch", { name: "Tramparrocas" }));
    expect(onChange).toHaveBeenCalledWith({ isSR: true });

    fireEvent.click(screen.getByRole("switch", { name: "Reflect" }));
    expect(onChange).toHaveBeenCalledWith({ isReflect: true });
  });
});

describe("ResultsPanel", () => {
  beforeEach(() => {
    vi.mocked(useMoveNames).mockReturnValue({ data: undefined } as never);
  });

  it("muestra la notación Smogon y la etiqueta OHKO", () => {
    const results: CalcResult[] = [
      {
        move: "blizzard",
        desc: "252 SpA Abomasnow Blizzard vs. 0 HP / 0 SpD Abomasnow: 650-766 (209.7 - 247%) -- guaranteed OHKO",
        damageMin: 650,
        damageMax: 766,
        pctMin: 209.7,
        pctMax: 247,
        koText: null,
      },
    ];
    render(
      <WithIntl>
        <ResultsPanel results={results} />
      </WithIntl>,
    );

    expect(screen.getByText(/252 SpA Abomasnow Blizzard/)).toBeInTheDocument();
    expect(screen.getByText("OHKO")).toBeInTheDocument();
  });

  it("muestra mensaje vacío sin resultados", () => {
    render(
      <WithIntl>
        <ResultsPanel results={[]} />
      </WithIntl>,
    );
    expect(screen.getByText(/elige un atacante/i)).toBeInTheDocument();
  });
});
