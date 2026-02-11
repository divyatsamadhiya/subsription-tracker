import { describe, expect, it } from "vitest";
import { HttpError } from "./http";

describe("HttpError", () => {
  it("stores status and message", () => {
    const error = new HttpError(422, "Validation failed");
    expect(error.status).toBe(422);
    expect(error.message).toBe("Validation failed");
  });
});
