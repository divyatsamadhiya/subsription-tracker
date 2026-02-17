import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { useAppStore } from "./store/useAppStore";

vi.mock("./store/useAppStore", () => ({
  useAppStore: vi.fn()
}));

const mockedUseAppStore = vi.mocked(useAppStore);

const makeStoreState = (overrides?: Partial<Record<string, unknown>>) => ({
  hydrated: true,
  loading: false,
  error: null,
  user: null,
  profile: {},
  subscriptions: [],
  settings: {
    defaultCurrency: "USD",
    weekStartsOn: 0,
    notificationsEnabled: false,
    themePreference: "system"
  },
  upcomingWindow: 7,
  setUpcomingWindow: vi.fn(),
  hydrate: vi.fn().mockResolvedValue(undefined),
  register: vi.fn().mockResolvedValue(undefined),
  login: vi.fn().mockResolvedValue(undefined),
  forgotPassword: vi.fn().mockResolvedValue({ message: "ok" }),
  resetPassword: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn().mockResolvedValue(undefined),
  updateProfile: vi.fn().mockResolvedValue(undefined),
  addSubscription: vi.fn().mockResolvedValue(undefined),
  updateSubscription: vi.fn().mockResolvedValue(undefined),
  deleteSubscription: vi.fn().mockResolvedValue(undefined),
  updateSettings: vi.fn().mockResolvedValue(undefined),
  exportBackup: vi.fn().mockResolvedValue({}),
  importBackup: vi.fn().mockResolvedValue(undefined),
  ...overrides
});

describe("App auth and profile flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows required profile fields in register mode and submits them", async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    mockedUseAppStore.mockReturnValue(makeStoreState({ register }) as never);

    render(<App />);

    expect(screen.queryByLabelText("Full name")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Create account" }));

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "john@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Password123" } });
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "John Doe" } });
    fireEvent.change(screen.getByLabelText("Country"), { target: { value: "India" } });

    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith({
        email: "john@example.com",
        password: "Password123",
        fullName: "John Doe",
        country: "India"
      });
    });
  });

  it("shows soft prompt for legacy user and opens profile tab", async () => {
    mockedUseAppStore.mockReturnValue(
      makeStoreState({
        user: {
          id: "user_1",
          email: "john@example.com",
          profile: {},
          profileComplete: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z"
        },
        profile: {},
        subscriptions: []
      }) as never
    );

    render(<App />);

    expect(
      screen.getByText(/Complete your profile details \(full name and country\)/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Complete now" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Profile details" })).toBeInTheDocument();
    });
  });
});
