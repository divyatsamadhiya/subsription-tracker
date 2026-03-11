import { describe, expect, it } from "vitest";
import {
  getBulkSelectAllLabel,
  getBulkSelectionSummary,
  getSubscriptionRowControlsClass,
} from "./subscription-list-ui";

describe("subscription list UI helpers", () => {
  it("only returns a bulk selection summary when something is selected", () => {
    expect(getBulkSelectionSummary(0)).toBeNull();
    expect(getBulkSelectionSummary(3)).toBe("3 selected");
  });

  it("keeps row controls hidden until hover or focus when not selected", () => {
    const hiddenClass = getSubscriptionRowControlsClass(false);

    expect(hiddenClass).toContain("w-0");
    expect(hiddenClass).toContain("opacity-0");
    expect(hiddenClass).toContain("group-hover:w-[76px]");
    expect(hiddenClass).toContain("group-focus-within:w-[76px]");
  });

  it("keeps row controls visible once a row is selected", () => {
    const visibleClass = getSubscriptionRowControlsClass(true);

    expect(visibleClass).toContain("w-[76px]");
    expect(visibleClass).toContain("opacity-100");
    expect(visibleClass).toContain("pointer-events-auto");
  });

  it("only shows select-all copy when there is an active multi-select flow", () => {
    expect(getBulkSelectAllLabel(0, 7)).toBeNull();
    expect(getBulkSelectAllLabel(2, 7)).toBe("Select all (7)");
    expect(getBulkSelectAllLabel(7, 7)).toBeNull();
    expect(getBulkSelectAllLabel(8, 7)).toBeNull();
  });
});
