import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { ThemeProvider, useTheme } from "./theme-provider";
import { renderInto, act } from "@/test/render";

let lastSetTheme: ((t: "system" | "light" | "dark") => void) | null = null;
let lastTheme = "";
let lastResolved = "";

function TestConsumer() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  lastSetTheme = setTheme;
  lastTheme = theme;
  lastResolved = resolvedTheme;
  return React.createElement("div", { "data-testid": "info" }, `${theme}|${resolvedTheme}`);
}

let mockMediaDark = false;
const mediaListeners: Array<() => void> = [];

beforeEach(() => {
  const storage = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    writable: true,
    value: {
      clear: () => storage.clear(),
      getItem: (key: string) => storage.get(key) ?? null,
      key: (index: number) => Array.from(storage.keys())[index] ?? null,
      get length() {
        return storage.size;
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      setItem: (key: string, value: string) => {
        storage.set(key, String(value));
      },
    } satisfies Storage,
  });

  localStorage.clear();
  document.documentElement.classList.remove("dark");
  lastSetTheme = null;
  lastTheme = "";
  lastResolved = "";
  mockMediaDark = false;
  mediaListeners.length = 0;

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: () => ({
      matches: mockMediaDark,
      media: "(prefers-color-scheme: dark)",
      onchange: null,
      addEventListener: (_: string, handler: () => void) => {
        mediaListeners.push(handler);
      },
      removeEventListener: (_: string, handler: () => void) => {
        const idx = mediaListeners.indexOf(handler);
        if (idx >= 0) mediaListeners.splice(idx, 1);
      },
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
});

function renderProvider() {
  return renderInto(
    React.createElement(ThemeProvider, null, React.createElement(TestConsumer))
  );
}

describe("ThemeProvider", () => {
  it("defaults to system theme", () => {
    const { unmount } = renderProvider();
    expect(lastTheme).toBe("system");
    unmount();
  });

  it("resolves system to light when prefers-color-scheme is light", () => {
    mockMediaDark = false;
    const { unmount } = renderProvider();
    expect(lastResolved).toBe("light");
    unmount();
  });

  it("resolves system to dark when prefers-color-scheme is dark", () => {
    mockMediaDark = true;
    const { unmount } = renderProvider();
    expect(lastResolved).toBe("dark");
    unmount();
  });

  it("applies dark class to html when resolved to dark", () => {
    mockMediaDark = true;
    const { unmount } = renderProvider();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    unmount();
  });

  it("removes dark class when switching to light", () => {
    const { unmount } = renderProvider();

    act(() => {
      lastSetTheme!("dark");
    });
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    act(() => {
      lastSetTheme!("light");
    });
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    unmount();
  });

  it("persists theme to localStorage on setTheme", () => {
    const { unmount } = renderProvider();

    act(() => {
      lastSetTheme!("dark");
    });
    expect(localStorage.getItem("pulseboard-theme")).toBe("dark");
    unmount();
  });

  it("loads theme from localStorage on mount", () => {
    localStorage.setItem("pulseboard-theme", "dark");
    const { unmount } = renderProvider();
    expect(lastTheme).toBe("dark");
    expect(lastResolved).toBe("dark");
    unmount();
  });

  it("ignores stored theme on auth routes", () => {
    localStorage.setItem("pulseboard-theme", "dark");
    Object.defineProperty(window, "location", {
      writable: true,
      value: { pathname: "/login" },
    });

    const { unmount } = renderProvider();
    expect(lastTheme).toBe("system");
    expect(lastResolved).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    unmount();
  });

  it("updates resolved theme when setTheme is called", () => {
    const { unmount } = renderProvider();
    expect(lastResolved).toBe("light");

    act(() => {
      lastSetTheme!("dark");
    });
    expect(lastResolved).toBe("dark");
    expect(lastTheme).toBe("dark");
    unmount();
  });

  it("switches to system and back correctly", () => {
    const { unmount } = renderProvider();

    act(() => {
      lastSetTheme!("dark");
    });
    expect(lastResolved).toBe("dark");

    act(() => {
      lastSetTheme!("system");
    });
    // System = light since mockMediaDark = false
    expect(lastResolved).toBe("light");
    expect(lastTheme).toBe("system");
    unmount();
  });
});
