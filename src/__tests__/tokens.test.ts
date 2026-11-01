import { describe, it, expect } from "vitest";
import tailwindConfig from "../../tailwind.config";

describe("Design Tokens confirmation against design.md", () => {
  it("defines Pearl & Teal primary and surface colors", () => {
    const colors = tailwindConfig.theme?.extend?.colors as Record<string, Record<string, string> | string>;
    expect(colors).toBeDefined();
    expect((colors.primary as Record<string, string>).DEFAULT).toBe("#005451");
    expect((colors.primary as Record<string, string>).container).toBe("#0b6e6a");
    expect((colors.surface as Record<string, string>).DEFAULT).toBe("#f2fbff");
    expect(colors.background).toBe("#f6f9fa");
  });

  it("configures typography with Hanken Grotesk and IBM Plex Mono", () => {
    const fonts = tailwindConfig.theme?.extend?.fontFamily as Record<string, string[]>;
    expect(fonts).toBeDefined();
    expect(fonts.sans).toContain("Hanken Grotesk");
    expect(fonts.mono).toContain("IBM Plex Mono");
  });
});
