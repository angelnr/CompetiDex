import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn (utils)", () => {
  it("mezcla clases condicionales", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });

  it("resuelve conflictos con tailwind-merge", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
