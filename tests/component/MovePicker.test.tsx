import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { useMove, useMoves } from "@/lib/queries";

vi.mock("@/lib/queries", () => ({
  useMove: vi.fn(),
  useMoves: vi.fn(),
}));

import { MovePicker } from "@/components/pokemon/MovePicker";
import { WithIntl } from "@/tests/component/with-intl";

function moveFixture(slug: string, es: string, en: string) {
  return {
    id: 1,
    name: slug,
    names: [
      { name: es, language: { name: "es", url: "" } },
      { name: en, language: { name: "en", url: "" } },
    ],
    flavor_text_entries: [
      {
        flavor_text: `${en} description`,
        language: { name: "en", url: "" },
        version_group: { name: "scarlet-violet", url: "" },
      },
    ],
    effect_entries: [],
  };
}

const POOL = ["ice-shard", "ice-beam"];
const MOVES: Record<string, ReturnType<typeof moveFixture>> = {
  "ice-shard": moveFixture("ice-shard", "Canto Helado", "Ice Shard"),
  "ice-beam": moveFixture("ice-beam", "Rayo Hielo", "Ice Beam"),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useMove).mockReturnValue({ data: undefined } as never);
  vi.mocked(useMoves).mockReturnValue(POOL.map((slug) => ({ data: MOVES[slug] })) as never);
});

function setup(props: { value?: string | null } = {}) {
  const onChange = vi.fn();
  const onTabCommit = vi.fn();
  render(
    <WithIntl>
      <MovePicker
        value={props.value ?? null}
        pool={POOL}
        onChange={onChange}
        inputRef={undefined}
        onTabCommit={onTabCommit}
      />
    </WithIntl>,
  );
  return { onChange, onTabCommit, input: screen.getByRole("combobox") };
}

describe("MovePicker", () => {
  it("Tab con texto selecciona la primera sugerencia y avisa al padre", () => {
    const { onChange, onTabCommit, input } = setup();

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "ice" } });
    fireEvent.keyDown(input, { key: "Tab" });

    expect(onChange).toHaveBeenCalledWith("ice-shard");
    expect(onTabCommit).toHaveBeenCalledTimes(1);
  });

  it("Tab sin texto no selecciona nada", () => {
    const { onChange, onTabCommit, input } = setup();

    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "Tab" });

    expect(onChange).not.toHaveBeenCalled();
    expect(onTabCommit).not.toHaveBeenCalled();
  });

  it("Enter sigue seleccionando la sugerencia activa", () => {
    const { onChange, input } = setup();

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "ice" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("ice-shard");
  });
});
