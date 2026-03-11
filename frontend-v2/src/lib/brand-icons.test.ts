import { describe, expect, it } from "vitest";
import { getBrandIcon } from "./brand-icons";

describe("getBrandIcon", () => {
  it("maps well-known services to their brand icons", () => {
    expect(getBrandIcon("Claude Pro")?.title).toBe("Claude");
    expect(getBrandIcon("YouTube Premium")?.title).toBe("YouTube");
    expect(getBrandIcon("Cloudflare")?.title).toBe("Cloudflare");
  });

  it("returns undefined for unknown services", () => {
    expect(getBrandIcon("My Custom Tool")).toBeUndefined();
  });
});
