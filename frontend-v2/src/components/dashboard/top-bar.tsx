"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarClock, CreditCard, LayoutDashboard, BarChart3, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDashboard } from "@/lib/dashboard-context";
import { formatRelativeDue, formatShortDate } from "@/lib/format";
import { getUpcomingRenewals, nowIsoDate, daysUntil } from "@/lib/date";

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, label: "Overview" },
  { href: "/subscriptions", icon: CreditCard, label: "Subscriptions" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/profile", icon: User, label: "Profile" },
  { href: "/settings", icon: Settings, label: "Settings" },
] as const;

function useCurrentPageLabel() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return NAV_ITEMS.find((item) => isActive(item.href))?.label ?? "Dashboard";
}

export function RenewalAlertsBell() {
  const { subscriptions } = useDashboard();
  const today = nowIsoDate();
  const renewals = getUpcomingRenewals(subscriptions, today, 7);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="icon-sm" aria-label="Renewal alerts" className="relative" />}
      >
        <Bell className="size-4" />
        {renewals.length > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {renewals.length > 9 ? "9+" : renewals.length}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between px-2 py-1.5">
            <span>Renewal alerts</span>
            <Badge variant="secondary">{renewals.length} in 7d</Badge>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        {renewals.length === 0 ? (
          <div className="px-2 py-3 text-sm text-muted-foreground">
            No renewals coming up in the next 7 days.
          </div>
        ) : (
          <>
            {renewals.slice(0, 5).map((subscription) => {
              const dueInDays = daysUntil(subscription.nextBillingDate, today);
              return (
                <DropdownMenuItem
                  key={subscription.id}
                  render={<Link href="/subscriptions" />}
                  className="items-start gap-3 px-2 py-2"
                >
                  <div className="mt-0.5 rounded-lg bg-primary/10 p-1 text-primary">
                    <CalendarClock className="size-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{subscription.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatShortDate(subscription.nextBillingDate)} · {formatRelativeDue(dueInDays)}
                    </p>
                  </div>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuItem render={<Link href="/subscriptions" />} className="justify-center py-2 text-primary">
              View all subscriptions
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DesktopTopBar() {
  const currentPage = useCurrentPageLabel();

  return (
    <header className="sticky top-0 z-20 hidden h-14 items-center justify-between border-b border-border bg-background/80 px-8 backdrop-blur-sm md:flex">
      <h1 className="font-heading text-base font-semibold">{currentPage}</h1>
      <RenewalAlertsBell />
    </header>
  );
}
