import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { useAppStore } from "./store/useAppStore";
import type { Subscription } from "./types";

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

const authUser = {
  id: "user_1",
  email: "john@example.com",
  profile: {
    fullName: "John Doe",
    country: "India"
  },
  profileComplete: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

const makeSubscription = (overrides?: Partial<Subscription>): Subscription => ({
  id: "sub_1",
  name: "Spotify",
  amountMinor: 1199,
  currency: "USD",
  billingCycle: "monthly",
  nextBillingDate: "2026-03-01",
  category: "entertainment",
  reminderDaysBefore: [1, 3, 7],
  isActive: true,
  notes: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
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

  it("renders analytics dashboard from the analytics tab for signed-in users", async () => {
    mockedUseAppStore.mockReturnValue(
      makeStoreState({
        user: authUser,
        profile: authUser.profile,
        subscriptions: [
          makeSubscription({ id: "sub_1", category: "entertainment", amountMinor: 1299 }),
          makeSubscription({
            id: "sub_2",
            name: "Cloud storage",
            category: "utilities",
            billingCycle: "yearly",
            amountMinor: 12000,
            nextBillingDate: "2026-04-01"
          })
        ]
      }) as never
    );

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Analytics" }));

    expect(screen.getByRole("heading", { name: "Subscription analytics" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Spend trend (6 months)" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Category split" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Renewals next 30 days" })).toBeInTheDocument();
    expect(screen.getByText("Monthly baseline")).toBeInTheDocument();
    expect(screen.getByText("Renewals in 30 days")).toBeInTheDocument();
  });

  it("shows analytics empty state and routes to subscriptions on CTA", async () => {
    mockedUseAppStore.mockReturnValue(
      makeStoreState({
        user: authUser,
        profile: authUser.profile,
        subscriptions: [makeSubscription({ id: "sub_paused", isActive: false })]
      }) as never
    );

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Analytics" }));

    expect(screen.getByText("No active subscriptions yet. Add one to unlock charts and metrics.")).toBeInTheDocument();

    const analyticsEmptyPanel = screen.getByRole("heading", { name: "Subscription analytics" })
      .parentElement as HTMLElement;
    fireEvent.click(within(analyticsEmptyPanel).getByRole("button", { name: "Add subscription" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Add Subscription" })).toBeInTheDocument();
    });
  });
});
