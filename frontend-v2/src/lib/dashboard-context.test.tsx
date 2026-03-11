import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { DashboardProvider, useDashboard } from "./dashboard-context";
import { ThemeProvider } from "./theme-provider";
import { renderInto, act } from "@/test/render";
import { buildUser, buildSubscription, buildSettings } from "@/test/factories";

// Mock the api module
vi.mock("./api", () => ({
  api: {
    me: vi.fn(),
    getSubscriptions: vi.fn(),
    getSettings: vi.fn(),
    logout: vi.fn(),
  },
}));

import { api } from "./api";

const mockedApi = vi.mocked(api);

let captured: {
  user: ReturnType<typeof useDashboard>["user"];
  subscriptions: ReturnType<typeof useDashboard>["subscriptions"];
  settings: ReturnType<typeof useDashboard>["settings"];
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
} | null = null;

function TestConsumer() {
  const ctx = useDashboard();
  captured = ctx;
  return React.createElement(
    "div",
    null,
    React.createElement("span", { "data-testid": "loading" }, String(ctx.loading)),
    React.createElement("span", { "data-testid": "error" }, ctx.error ?? "none"),
    React.createElement("span", { "data-testid": "user" }, ctx.user?.email ?? "none"),
    React.createElement("span", { "data-testid": "subs" }, String(ctx.subscriptions.length)),
    React.createElement("span", { "data-testid": "currency" }, ctx.settings.defaultCurrency)
  );
}

function renderDashboard() {
  return renderInto(
    React.createElement(
      ThemeProvider,
      null,
      React.createElement(DashboardProvider, null, React.createElement(TestConsumer))
    )
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  captured = null;

  mockedApi.me.mockResolvedValue(buildUser({ email: "user@test.com" }));
  mockedApi.getSubscriptions.mockResolvedValue([
    buildSubscription({ name: "Netflix", nextBillingDate: "2026-03-15" }),
    buildSubscription({ name: "Spotify", nextBillingDate: "2026-03-10" }),
  ]);
  mockedApi.getSettings.mockResolvedValue(
    buildSettings({ defaultCurrency: "EUR" })
  );
  mockedApi.logout.mockResolvedValue(undefined);

  Object.defineProperty(window, "location", {
    writable: true,
    value: { href: "/" },
  });
});

async function waitForLoad(unmount: () => void) {
  // Let promises resolve
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe("DashboardProvider", () => {
  it("starts in loading state", () => {
    // Use a never-resolving promise so it stays loading
    mockedApi.me.mockReturnValue(new Promise(() => {}));
    const { unmount } = renderDashboard();
    expect(captured!.loading).toBe(true);
    unmount();
  });

  it("loads user data after mount", async () => {
    const { unmount } = renderDashboard();
    await waitForLoad(unmount);

    expect(captured!.loading).toBe(false);
    expect(captured!.user?.email).toBe("user@test.com");
    unmount();
  });

  it("loads subscriptions sorted by nextBillingDate", async () => {
    const { unmount } = renderDashboard();
    await waitForLoad(unmount);

    expect(captured!.subscriptions).toHaveLength(2);
    // Spotify (2026-03-10) should come before Netflix (2026-03-15)
    expect(captured!.subscriptions[0].name).toBe("Spotify");
    expect(captured!.subscriptions[1].name).toBe("Netflix");
    unmount();
  });

  it("loads settings", async () => {
    const { unmount } = renderDashboard();
    await waitForLoad(unmount);

    expect(captured!.settings.defaultCurrency).toBe("EUR");
    unmount();
  });

  it("shows error when API fails", async () => {
    mockedApi.me.mockRejectedValue(new Error("Network error"));
    const { unmount } = renderDashboard();
    await waitForLoad(unmount);

    expect(captured!.loading).toBe(false);
    expect(captured!.error).toBe("Network error");
    unmount();
  });

  it("shows fallback error for non-Error exceptions", async () => {
    mockedApi.me.mockRejectedValue("something");
    const { unmount } = renderDashboard();
    await waitForLoad(unmount);

    expect(captured!.error).toBe("Failed to load data");
    unmount();
  });

  it("calls all three API endpoints on mount", async () => {
    const { unmount } = renderDashboard();
    await waitForLoad(unmount);

    expect(mockedApi.me).toHaveBeenCalled();
    expect(mockedApi.getSubscriptions).toHaveBeenCalled();
    expect(mockedApi.getSettings).toHaveBeenCalled();
    unmount();
  });

  it("redirects to /login on logout", async () => {
    const { unmount } = renderDashboard();
    await waitForLoad(unmount);

    await act(async () => {
      await captured!.logout();
    });

    expect(window.location.href).toBe("/login");
    unmount();
  });

  it("redirects even if logout API fails", async () => {
    mockedApi.logout.mockRejectedValue(new Error("fail"));
    const { unmount } = renderDashboard();
    await waitForLoad(unmount);

    await act(async () => {
      await captured!.logout();
    });

    expect(window.location.href).toBe("/login");
    unmount();
  });

  it("refresh reloads data", async () => {
    const { unmount } = renderDashboard();
    await waitForLoad(unmount);

    mockedApi.me.mockResolvedValue(buildUser({ email: "new@test.com" }));
    mockedApi.getSubscriptions.mockResolvedValue([]);
    mockedApi.getSettings.mockResolvedValue(buildSettings({ defaultCurrency: "GBP" }));

    await act(async () => {
      await captured!.refresh();
    });

    expect(captured!.user?.email).toBe("new@test.com");
    expect(captured!.subscriptions).toHaveLength(0);
    expect(captured!.settings.defaultCurrency).toBe("GBP");
    unmount();
  });
});

describe("useDashboard", () => {
  it("throws when used outside DashboardProvider", () => {
    function BadConsumer() {
      useDashboard();
      return null;
    }

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      renderInto(React.createElement(BadConsumer))
    ).toThrow("useDashboard must be used within DashboardProvider");
    spy.mockRestore();
  });
});
