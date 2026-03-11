import { describe, it, expect } from "vitest";
import { currencyForCountry } from "./countryCurrency.js";

describe("currencyForCountry", () => {
  it("returns INR for India", () => {
    expect(currencyForCountry("India")).toBe("INR");
  });

  it("is case-insensitive", () => {
    expect(currencyForCountry("INDIA")).toBe("INR");
    expect(currencyForCountry("india")).toBe("INR");
    expect(currencyForCountry("United Kingdom")).toBe("GBP");
  });

  it("trims whitespace", () => {
    expect(currencyForCountry("  Canada  ")).toBe("CAD");
  });

  it("returns EUR for eurozone countries", () => {
    expect(currencyForCountry("Germany")).toBe("EUR");
    expect(currencyForCountry("France")).toBe("EUR");
    expect(currencyForCountry("Spain")).toBe("EUR");
    expect(currencyForCountry("Italy")).toBe("EUR");
    expect(currencyForCountry("Netherlands")).toBe("EUR");
  });

  it("returns GBP for UK variants", () => {
    expect(currencyForCountry("United Kingdom")).toBe("GBP");
    expect(currencyForCountry("UK")).toBe("GBP");
    expect(currencyForCountry("England")).toBe("GBP");
  });

  it("returns CAD for Canada", () => {
    expect(currencyForCountry("Canada")).toBe("CAD");
  });

  it("returns USD for United States variants", () => {
    expect(currencyForCountry("United States")).toBe("USD");
    expect(currencyForCountry("USA")).toBe("USD");
    expect(currencyForCountry("United States of America")).toBe("USD");
  });

  it("falls back to USD for unknown countries", () => {
    expect(currencyForCountry("Narnia")).toBe("USD");
    expect(currencyForCountry("Unknown")).toBe("USD");
  });

  it("falls back to USD for null/undefined/empty", () => {
    expect(currencyForCountry(null)).toBe("USD");
    expect(currencyForCountry(undefined)).toBe("USD");
    expect(currencyForCountry("")).toBe("USD");
  });
});
