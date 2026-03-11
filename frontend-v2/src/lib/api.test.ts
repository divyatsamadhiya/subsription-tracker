import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "./api";

function mockFetchResponse(body: unknown, status = 200, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  });
}

function mockFetchError(status: number, errorBody?: unknown) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: errorBody
      ? vi.fn().mockResolvedValue(errorBody)
      : vi.fn().mockRejectedValue(new Error("not json")),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("api.me", () => {
  it("fetches and extracts user from response", async () => {
    const user = { id: "u1", email: "test@test.com" };
    globalThis.fetch = mockFetchResponse({ user });

    const result = await api.me();
    expect(result).toEqual(user);
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/auth/me",
      expect.objectContaining({ credentials: "include" })
    );
  });

  it("does not send Content-Type for GET requests", async () => {
    globalThis.fetch = mockFetchResponse({ user: {} });
    await api.me();

    const call = vi.mocked(fetch).mock.calls[0];
    const headers = call[1]?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBeUndefined();
  });
});

describe("api.logout", () => {
  it("posts to logout endpoint", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: vi.fn(),
    });

    const result = await api.logout();
    expect(result).toBeUndefined();
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/auth/logout",
      expect.objectContaining({ method: "POST" })
    );
  });
});

describe("api.getSubscriptions", () => {
  it("extracts subscriptions array from response", async () => {
    const subscriptions = [{ id: "s1" }, { id: "s2" }];
    globalThis.fetch = mockFetchResponse({ subscriptions });

    const result = await api.getSubscriptions();
    expect(result).toEqual(subscriptions);
  });
});

describe("api.createSubscription", () => {
  it("posts with JSON body and extracts subscription", async () => {
    const subscription = { id: "s1", name: "Netflix" };
    globalThis.fetch = mockFetchResponse({ subscription });

    const result = await api.createSubscription({
      name: "Netflix",
    } as Parameters<typeof api.createSubscription>[0]);

    expect(result).toEqual(subscription);
    const call = vi.mocked(fetch).mock.calls[0];
    expect(call[1]?.method).toBe("POST");
    const headers = call[1]?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });
});

describe("api.updateSubscription", () => {
  it("sends PUT with correct URL and body", async () => {
    const subscription = { id: "s1", name: "Netflix Updated" };
    globalThis.fetch = mockFetchResponse({ subscription });

    await api.updateSubscription("s1", {
      name: "Netflix Updated",
      amountMinor: 999,
      billingCycle: "monthly",
      nextBillingDate: "2026-04-01",
      category: "entertainment",
      reminderDaysBefore: [1],
      isActive: true,
    } as Parameters<typeof api.updateSubscription>[1]);
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/subscriptions/s1",
      expect.objectContaining({ method: "PUT" })
    );
  });
});

describe("api.deleteSubscription", () => {
  it("sends DELETE to correct URL", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: vi.fn(),
    });

    await api.deleteSubscription("s1");
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/subscriptions/s1",
      expect.objectContaining({ method: "DELETE" })
    );
  });
});

describe("api.getSettings", () => {
  it("extracts settings from response", async () => {
    const settings = { defaultCurrency: "USD" };
    globalThis.fetch = mockFetchResponse({ settings });

    const result = await api.getSettings();
    expect(result).toEqual(settings);
  });
});

describe("api.updateSettings", () => {
  it("patches settings and extracts response", async () => {
    const settings = { defaultCurrency: "EUR" };
    globalThis.fetch = mockFetchResponse({ settings });

    const result = await api.updateSettings({ defaultCurrency: "EUR" });
    expect(result).toEqual(settings);
  });
});

describe("api.getProfile", () => {
  it("returns profile data", async () => {
    const profile = { fullName: "John" };
    globalThis.fetch = mockFetchResponse(profile);

    const result = await api.getProfile();
    expect(result).toEqual(profile);
  });
});

describe("api.updateProfile", () => {
  it("patches profile with body", async () => {
    const profile = { fullName: "Jane" };
    globalThis.fetch = mockFetchResponse(profile);

    const result = await api.updateProfile({ fullName: "Jane" });
    expect(result).toEqual(profile);
    const call = vi.mocked(fetch).mock.calls[0];
    expect(call[1]?.method).toBe("PATCH");
  });
});

describe("error handling", () => {
  it("extracts error message from JSON error response", async () => {
    globalThis.fetch = mockFetchError(400, { error: "Bad request" });

    await expect(api.me()).rejects.toThrow("Bad request");
  });

  it("falls back to status message when response is not JSON", async () => {
    globalThis.fetch = mockFetchError(500);

    await expect(api.me()).rejects.toThrow("Request failed (500)");
  });

  it("falls back to status message when JSON has no error field", async () => {
    globalThis.fetch = mockFetchError(403, { message: "forbidden" });

    await expect(api.me()).rejects.toThrow("Request failed (403)");
  });
});

describe("timeout", () => {
  it("aborts request after timeout", async () => {
    vi.useFakeTimers();

    globalThis.fetch = vi.fn().mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        })
    );

    const promise = api.me();
    vi.advanceTimersByTime(16_000);

    await expect(promise).rejects.toThrow();
    vi.useRealTimers();
  });
});
