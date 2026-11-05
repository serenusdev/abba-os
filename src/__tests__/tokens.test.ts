import { describe, it, expect } from "vitest";
import tailwindConfig from "../../tailwind.config";

describe("Design Tokens confirmation against design.md", () => {
  it("defines Forest, Sand, and Electric Purple design tokens", () => {
    const colors = tailwindConfig.theme?.extend?.colors as Record<string, Record<string, string> | string>;
    expect(colors).toBeDefined();
    expect((colors.primary as Record<string, string>).DEFAULT).toBe("#185c45");
    expect((colors.primary as Record<string, string>).container).toBe("#2d7357");
    expect((colors.surface as Record<string, string>).DEFAULT).toBe("#fffdf8");
    expect(colors.background).toBe("#f3ebdd");
    expect((colors.accent as Record<string, string>).DEFAULT).toBe("#ede5ff");
    expect((colors.electric as Record<string, string>).DEFAULT).toBe("#7c3aed");
  });

  it("configures typography with Hanken Grotesk and IBM Plex Mono", () => {
    const fonts = tailwindConfig.theme?.extend?.fontFamily as Record<string, string[]>;
    expect(fonts).toBeDefined();
    expect(fonts.sans).toContain("Hanken Grotesk");
    expect(fonts.mono).toContain("IBM Plex Mono");
  });
});
