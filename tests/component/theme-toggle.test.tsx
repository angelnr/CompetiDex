import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const setTheme = vi.fn();
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light", setTheme }),
}));

import { ThemeToggle } from "@/components/theme-toggle";
import { WithIntl } from "@/tests/component/with-intl";

beforeEach(() => setTheme.mockClear());
afterEach(() => vi.restoreAllMocks());

describe("ThemeToggle", () => {
  it("muestra aria-label accesible y llama a setTheme al pulsar", async () => {
    render(
      <WithIntl>
        <ThemeToggle />
      </WithIntl>,
    );
    // findByRole espera al post-mount (el guard `mounted` renderiza el botón tras el efecto).
    const button = await screen.findByRole("button", { name: "Cambiar a modo oscuro" });
    await userEvent.click(button);
    expect(setTheme).toHaveBeenCalledWith("dark");
  });
});
