"use client";

import Link from "next/link";
import { Bell, CalendarClock } from "lucide-react";
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
