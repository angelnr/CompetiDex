import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/i18n/routing", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { AbilityDetail } from "@/components/pokemon/AbilityDetail";
import type { Ability } from "@/lib/pokeapi";
import { WithIntl } from "@/tests/component/with-intl";

const mimicry: Ability = {
  id: 250,
  name: "mimicry",
  names: [{ name: "Mimetismo", language: { name: "es", url: "" } }],
  effect_entries: [],
  flavor_text_entries: [
    {
      flavor_text: "Cambia de tipo según el terreno.",
      language: { name: "es", url: "" },
      version_group: { name: "sword-shield", url: "" },
    },
  ],
  pokemon: [
    {
      is_hidden: false,
      slot: 1,
      pokemon: {
        name: "stunfisk-galar",
        url: "https://pokeapi.co/api/v2/pokemon/10180/",
      },
    },
  ],
  generation: { name: "generation-viii", url: "" },
};

describe("AbilityDetail", () => {
  it("muestra las formas regionales que tienen la habilidad", () => {
    render(
      <WithIntl>
        <AbilityDetail ability={mimicry} locale="es" />
      </WithIntl>,
    );

    expect(screen.getByText("Stunfisk Galar")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Stunfisk Galar/ })).toHaveAttribute(
      "href",
      "/pokemon/10180",
    );
  });
});
