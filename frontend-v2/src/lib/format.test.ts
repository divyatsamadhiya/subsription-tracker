import { describe, it, expect } from "vitest";
import {
  formatCurrencyMinor,
  currencySymbol,
  categoryLabel,
  billingCycleLabel,
  formatIsoDate,
  formatRelativeDue,
  formatShortDate,
} from "./format";

describe("formatCurrencyMinor", () => {
  it("formats USD cents to dollars", () => {
    const result = formatCurrencyMinor(1599, "USD");
    expect(result).toContain("15.99");
  });

  it("formats zero correctly", () => {
    const result = formatCurrencyMinor(0, "USD");
    expect(result).toContain("0.00");
  });

  it("formats large amounts", () => {
    const result = formatCurrencyMinor(999999, "USD");
    expect(result).toContain("9,999.99");
  });

  it("works with EUR", () => {
    const result = formatCurrencyMinor(2500, "EUR");
    // Should contain 25.00 in some format
    expect(result).toContain("25.00");
  });

  it("works with GBP", () => {
    const result = formatCurrencyMinor(1000, "GBP");
    expect(result).toContain("10.00");
  });

  it("works with INR", () => {
    const result = formatCurrencyMinor(50000, "INR");
    expect(result).toContain("500.00");
  });

  it("handles single digit cents", () => {
    const result = formatCurrencyMinor(1, "USD");
    expect(result).toContain("0.01");
  });
});

describe("currencySymbol", () => {
  it("returns $ for USD", () => {
    const sym = currencySymbol("USD");
    expect(sym).toBe("$");
  });

  it("returns a symbol for EUR", () => {
    const sym = currencySymbol("EUR");
    expect(sym).toBe("€");
  });

  it("returns a symbol for GBP", () => {
    const sym = currencySymbol("GBP");
    expect(sym).toBe("£");
  });

  it("returns a symbol for INR", () => {
    const sym = currencySymbol("INR");
    expect(sym).toBe("₹");
  });

  it("returns a symbol for JPY", () => {
    const sym = currencySymbol("JPY");
    // Narrow symbol for JPY is ¥
    expect(sym).toBe("¥");
  });
});

describe("categoryLabel", () => {
  it("capitalizes entertainment", () => {
    expect(categoryLabel("entertainment")).toBe("Entertainment");
  });

  it("capitalizes productivity", () => {
    expect(categoryLabel("productivity")).toBe("Productivity");
  });

  it("capitalizes utilities", () => {
    expect(categoryLabel("utilities")).toBe("Utilities");
  });

  it("capitalizes health", () => {
    expect(categoryLabel("health")).toBe("Health");
  });

  it("capitalizes other", () => {
    expect(categoryLabel("other")).toBe("Other");
  });
});

describe("billingCycleLabel", () => {
  it("returns Weekly for weekly", () => {
    expect(billingCycleLabel("weekly")).toBe("Weekly");
  });

  it("returns Monthly for monthly", () => {
    expect(billingCycleLabel("monthly")).toBe("Monthly");
  });

  it("returns Yearly for yearly", () => {
    expect(billingCycleLabel("yearly")).toBe("Yearly");
  });

  it("returns Custom (days) for custom_days", () => {
    expect(billingCycleLabel("custom_days")).toBe("Custom (days)");
  });
});

describe("formatIsoDate", () => {
  it("formats a date in long format", () => {
    const result = formatIsoDate("2026-03-11");
    expect(result).toContain("March");
    expect(result).toContain("11");
    expect(result).toContain("2026");
  });

  it("formats January dates", () => {
    const result = formatIsoDate("2026-01-01");
    expect(result).toContain("January");
    expect(result).toContain("1");
    expect(result).toContain("2026");
  });

  it("formats December dates", () => {
    const result = formatIsoDate("2026-12-25");
    expect(result).toContain("December");
    expect(result).toContain("25");
    expect(result).toContain("2026");
  });

  it("uses UTC (no timezone shift)", () => {
    // Midnight UTC on Jan 1 should never show Dec 31
    const result = formatIsoDate("2026-01-01");
    expect(result).not.toContain("December");
    expect(result).not.toContain("31");
  });
});

describe("formatShortDate", () => {
  it("formats to short month + day", () => {
    const result = formatShortDate("2026-03-11");
    expect(result).toContain("Mar");
    expect(result).toContain("11");
  });

  it("uses UTC (no timezone shift)", () => {
    const result = formatShortDate("2026-01-01");
    expect(result).not.toContain("Dec");
  });
});

describe("formatRelativeDue", () => {
  it("returns 'Due today' for 0 days", () => {
    expect(formatRelativeDue(0)).toBe("Due today");
  });

  it("returns 'Due tomorrow' for 1 day", () => {
    expect(formatRelativeDue(1)).toBe("Due tomorrow");
  });

  it("returns 'Due in N days' for N > 1", () => {
    expect(formatRelativeDue(5)).toBe("Due in 5 days");
  });

  it("returns 'Due in 30 days' for 30", () => {
    expect(formatRelativeDue(30)).toBe("Due in 30 days");
  });

  it("returns 'Due in 2 days' for 2", () => {
    expect(formatRelativeDue(2)).toBe("Due in 2 days");
  });
});
