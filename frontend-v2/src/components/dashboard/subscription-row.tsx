"use client";

import { useState } from "react";
import {
  CalendarPlus,
  CalendarClock,
  MoreHorizontal,
  NotepadText,
  Pencil,
  Pause,
  Pin,
  PinOff,
  Play,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SubscriptionAvatar } from "@/components/dashboard/subscription-avatar";
import { getSubscriptionRowControlsClass } from "@/components/dashboard/subscription-list-ui";
import { categoryLabel, billingCycleLabel, formatCurrencyMinor, formatShortDate, formatIsoDate } from "@/lib/format";
import { daysUntil } from "@/lib/date";
import {
  formatRenewalDistance,
  getEffectiveRenewalDate,
  monthlyEquivalentMinor,
} from "@/lib/subscriptions-list";
import type { Subscription } from "@/lib/types";

const CATEGORY_PILL_CLASSES = {
  entertainment: "border-chart-1/25 bg-chart-1/12 text-chart-1",
  productivity: "border-chart-2/25 bg-chart-2/12 text-chart-2",
  utilities: "border-chart-3/25 bg-chart-3/12 text-chart-3",
  health: "border-chart-4/25 bg-chart-4/12 text-chart-4",
  other: "border-chart-5/25 bg-chart-5/12 text-chart-5",
} as const;

export function SubscriptionRow({
  subscription,
  todayIsoDate,
  isPinned,
  isSelected,
  isDragTarget,
  onEdit,
  onSelectChange,
  onTogglePin,
  onToggleActive,
  onDelete,
  onPinnedDragStart,
  onPinnedDragEnter,
  onPinnedDrop,
  onPinnedDragEnd,
}: {
  subscription: Subscription;
  todayIsoDate: string;
  isPinned: boolean;
  isSelected: boolean;
  isDragTarget: boolean;
  onEdit: (subscription: Subscription) => void;
  onSelectChange: (subscriptionId: string, checked: boolean) => void;
  onTogglePin: (subscriptionId: string) => void;
  onToggleActive: (subscription: Subscription) => void;
  onDelete: (subscription: Subscription) => void;
  onPinnedDragStart: (subscriptionId: string) => void;
  onPinnedDragEnter: (subscriptionId: string) => void;
  onPinnedDrop: (subscriptionId: string) => void;
  onPinnedDragEnd: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const effectiveRenewalDate = getEffectiveRenewalDate(subscription, todayIsoDate);
  const days = daysUntil(effectiveRenewalDate, todayIsoDate);
  const renewalLabel = formatRenewalDistance(days);
  const normalizedMonthlyMinor = monthlyEquivalentMinor(subscription);
  const showsNormalizedMonthly = subscription.billingCycle !== "monthly";
  const isPaused = !subscription.isActive;

  const createdDate = formatIsoDate(subscription.createdAt.slice(0, 10));
  const updatedDate = formatIsoDate(subscription.updatedAt.slice(0, 10));
  const wasUpdated = subscription.updatedAt.slice(0, 10) !== subscription.createdAt.slice(0, 10);

  return (
    <div
      className={`group transition-colors ${
        isPaused ? "opacity-60 grayscale-[0.2]" : ""
      } ${
        isSelected ? "bg-primary/6" : ""
      } ${
        isDragTarget ? "ring-1 ring-primary/35 ring-inset" : ""
      }`}
      onDragOver={(event) => {
        if (!isPinned) return;
        event.preventDefault();
      }}
      onDragEnter={() => {
        if (!isPinned) return;
        onPinnedDragEnter(subscription.id);
      }}
      onDrop={() => {
        if (!isPinned) return;
        onPinnedDrop(subscription.id);
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
        <div
          data-testid="subscription-row-controls"
          className={getSubscriptionRowControlsClass(isSelected)}
        >
          <input
            type="checkbox"
            className="size-4 rounded border border-input bg-transparent accent-primary"
            checked={isSelected}
            onChange={(event) => onSelectChange(subscription.id, event.target.checked)}
            aria-label={`Select ${subscription.name}`}
          />

          <button
            type="button"
            draggable={isPinned}
            onDragStart={() => onPinnedDragStart(subscription.id)}
            onDragEnd={onPinnedDragEnd}
            onClick={() => onTogglePin(subscription.id)}
            className={`inline-flex size-8 items-center justify-center rounded-lg border transition-colors ${
              isPinned
                ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
                : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
            aria-label={isPinned ? `Unpin ${subscription.name}` : `Pin ${subscription.name}`}
            title={isPinned ? "Pinned at the top. Drag to reorder." : "Pin to top"}
          >
            <Pin className="size-4" />
          </button>
        </div>

        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          onClick={() => setExpanded((prev) => !prev)}
        >
          <SubscriptionAvatar
            name={subscription.name}
            category={subscription.category}
            size="sm"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-medium">{subscription.name}</p>
              {isPinned && <Pin className="size-3.5 text-primary" aria-label="Pinned" />}
              <Badge
                variant="outline"
                className={`px-2 py-0 text-[10px] font-medium ${CATEGORY_PILL_CLASSES[subscription.category]}`}
              >
                {categoryLabel(subscription.category)}
              </Badge>
              {!subscription.isActive && (
                <Badge
                  variant="outline"
                  className="border-destructive/60 bg-destructive px-1.5 py-0 text-[10px] text-white"
                >
                  Paused
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatShortDate(effectiveRenewalDate)}
              {renewalLabel && (
                <>
                  {" "}&middot;{" "}
                  <span className={days <= 1 ? "font-medium text-destructive" : ""}>
                    {renewalLabel}
                  </span>
                </>
              )}
            </p>
          </div>
        </button>

        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold">
            {formatCurrencyMinor(subscription.amountMinor, subscription.currency)}
          </p>
          <p className="text-xs text-muted-foreground">
            {billingCycleLabel(subscription.billingCycle)}
            {showsNormalizedMonthly && (
              <>
                {" "}· ≈ {formatCurrencyMinor(normalizedMonthlyMinor, subscription.currency)}/mo
              </>
            )}
          </p>
        </div>

        <div className="text-right sm:hidden">
          <p className="text-sm font-semibold">
            {formatCurrencyMinor(subscription.amountMinor, subscription.currency)}
          </p>
          {showsNormalizedMonthly && (
            <p className="text-[11px] text-muted-foreground">
              ≈ {formatCurrencyMinor(normalizedMonthlyMinor, subscription.currency)}/mo
            </p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Actions"
              />
            }
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onTogglePin(subscription.id)}>
              {isPinned ? (
                <>
                  <PinOff className="size-3.5 mr-2" />
                  Unpin
                </>
              ) : (
                <>
                  <Pin className="size-3.5 mr-2" />
                  Pin to top
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(subscription)}>
              <Pencil className="size-3.5 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleActive(subscription)}>
              {subscription.isActive ? (
                <>
                  <Pause className="size-3.5 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="size-3.5 mr-2" />
                  Activate
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(subscription)}
            >
              <Trash2 className="size-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {expanded && (
        <div className="border-t border-border/50 bg-accent/20 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap gap-x-6 gap-y-2 pl-0 text-xs sm:pl-[88px]">
            {subscription.notes && (
              <div className="w-full">
                <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                  <NotepadText className="size-3" />
                  Notes
                </span>
                <p className="mt-0.5 text-foreground">{subscription.notes}</p>
              </div>
            )}
            <div>
              <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                <CalendarPlus className="size-3" />
                Created
              </span>
              <p className="mt-0.5 text-foreground">{createdDate}</p>
            </div>
            {wasUpdated && (
              <div>
                <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                  <CalendarClock className="size-3" />
                  Last updated
                </span>
                <p className="mt-0.5 text-foreground">{updatedDate}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
