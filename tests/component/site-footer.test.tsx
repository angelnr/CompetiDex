import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => {
    const texts: Record<string, string> = {
      disclaimer:
        "Pokémon y los nombres de personajes de Pokémon son marcas registradas de Nintendo, Creatures Inc. y GAME FREAK inc.",
      poweredBy: "Datos de",
    };
    return (key: string) => texts[key] ?? key;
  },
}));

import { SiteFooter } from "@/components/site-footer";

describe("SiteFooter", () => {
  it("renderiza disclaimer legal y enlace externo a PokeAPI", async () => {
    render(await SiteFooter({ locale: "es" }));

    const pokeapiLink = screen.getByRole("link", { name: "PokeAPI" });
    expect(pokeapiLink).toHaveAttribute("href", "https://pokeapi.co");
    expect(pokeapiLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText(/Nintendo, Creatures Inc\./)).toBeInTheDocument();
    expect(screen.getByText(/© \d{4} CompetiDex/)).toBeInTheDocument();
  });
});
