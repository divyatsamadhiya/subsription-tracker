import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const mockFetch = vi.fn();

describe("Admin App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  it("shows login screen when unauthenticated", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      })
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Admin login" })).toBeInTheDocument();
    });
  });

  it("shows access denied view for non-admin account", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      })
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Admin access denied" })).toBeInTheDocument();
    });
  });

  it("loads users and analytics for admin account", async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            user: {
              id: "admin_1",
              email: "admin@example.com",
              role: "admin",
              profile: {},
              profileComplete: false,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z"
            }
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ users: [], total: 0, page: 1, pageSize: 20 }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            analytics: {
              users: { active: 10, deleted: 2, newLast30Days: 4 },
              subscriptions: {
                activeTotal: 3,
                totalByCategory: {
                  entertainment: 1,
                  productivity: 1,
                  utilities: 1,
                  health: 0,
                  other: 0
                }
              },
              monthlySpendByCurrency: [{ currency: "USD", amountMinor: 2500 }],
              signupTrend: Array.from({ length: 30 }, (_, index) => ({
                date: `2026-02-${String(index + 1).padStart(2, "0")}`,
                count: index % 2
              }))
            }
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ users: [], total: 0, page: 1, pageSize: 20 }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Admin Dashboard" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("tab", { name: "Analytics" }));

    await waitFor(() => {
      expect(screen.getByText("Active users")).toBeInTheDocument();
      expect(screen.getByText("Deleted users")).toBeInTheDocument();
      expect(screen.getByText("New users (30d)")).toBeInTheDocument();
    });
  });

  it("submits soft-delete action with reason", async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            user: {
              id: "admin_1",
              email: "admin@example.com",
              role: "admin",
              profile: {},
              profileComplete: false,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z"
            }
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            users: [
              {
                id: "user_1",
                email: "john@example.com",
                role: "user",
                status: "active",
                fullName: "John Doe",
                country: "India",
                createdAt: "2026-01-01T00:00:00.000Z",
                subscriptionCount: 2,
                activeSubscriptionCount: 1
              }
            ],
            total: 1,
            page: 1,
            pageSize: 20
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            analytics: {
              users: { active: 1, deleted: 0, newLast30Days: 1 },
              subscriptions: {
                activeTotal: 1,
                totalByCategory: {
                  entertainment: 1,
                  productivity: 0,
                  utilities: 0,
                  health: 0,
                  other: 0
                }
              },
              monthlySpendByCurrency: [{ currency: "USD", amountMinor: 1000 }],
              signupTrend: Array.from({ length: 30 }, (_, index) => ({
                date: `2026-02-${String(index + 1).padStart(2, "0")}`,
                count: 1
              }))
            }
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        )
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ users: [], total: 0, page: 1, pageSize: 20 }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Admin Dashboard" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Fraud signal" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/admin/users/user_1/delete",
        expect.objectContaining({ method: "POST" })
      );
    });
  });
});
