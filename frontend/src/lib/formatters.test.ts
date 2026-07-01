import { describe, it, expect } from "vitest";
import { formatCurrency, formatPercent } from "./formatters";

describe("formatters", () => {
  it("formats PEN currency", () => {
    expect(formatCurrency(95000, "PEN")).toContain("95");
  });

  it("formats percent", () => {
    expect(formatPercent(0.12)).toBe("12.00%");
  });
});
