import { describe, it, expect } from "vitest";
import { cn, formatOperationalDateTime, formatTimeWIB } from "@/lib/utils";

describe("Utility functions", () => {
  it("merges classes with tailwind-merge correctly", () => {
    const result = cn("p-4 bg-white", "p-6", { "text-primary": true, "text-red-500": false });
    expect(result).toBe("bg-white p-6 text-primary");
  });

  it("formats operational date time in Indonesian WIB format", () => {
    const testDate = new Date(2026, 10, 18, 7, 42, 0); // Month is 0-indexed: 10 = Nov
    const formatted = formatOperationalDateTime(testDate);
    expect(formatted).toContain("Nov 2026");
    expect(formatted).toContain("07:42 WIB");
  });

  it("formats time in WIB format", () => {
    const testDate = new Date(2026, 10, 18, 8, 15, 0);
    const formatted = formatTimeWIB(testDate);
    expect(formatted).toBe("08:15 WIB");
  });
});

