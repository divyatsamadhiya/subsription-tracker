"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { Subscription, SubscriptionInput, BillingCycle, SubscriptionCategory } from "@/lib/types";
import { CATEGORY_OPTIONS } from "@/lib/types";
import { categoryLabel, billingCycleLabel } from "@/lib/format";
import { nowIsoDate } from "@/lib/date";
import { SUBSCRIPTION_SUGGESTIONS } from "@/lib/suggestions";

const BILLING_CYCLES: BillingCycle[] = ["weekly", "monthly", "yearly", "custom_days"];
const REMINDER_OPTIONS = [1, 3, 7];

interface SubscriptionFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  currency: string;
  initial?: Subscription;
  onSubmit: (data: SubscriptionInput) => Promise<void>;
}

export function SubscriptionFormSheet({
  open,
  onOpenChange,
  mode,
  currency,
  initial,
  onSubmit,
}: SubscriptionFormSheetProps) {
  const [name, setName] = useState("");
  const [amountDisplay, setAmountDisplay] = useState("");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [customDays, setCustomDays] = useState("");
  const [nextBillingDate, setNextBillingDate] = useState(nowIsoDate());
  const [category, setCategory] = useState<SubscriptionCategory>("other");
  const [reminders, setReminders] = useState<number[]>([1, 3, 7]);
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameFocused, setNameFocused] = useState(false);

  // Reset form when opening
  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setName(initial.name);
      setAmountDisplay(String(initial.amountMinor / 100));
      setBillingCycle(initial.billingCycle);
      setCustomDays(initial.customIntervalDays ? String(initial.customIntervalDays) : "");
      setNextBillingDate(initial.nextBillingDate);
      setCategory(initial.category);
      setReminders(initial.reminderDaysBefore);
      setIsActive(initial.isActive);
      setNotes(initial.notes ?? "");
    } else {
      setName("");
      setAmountDisplay("");
      setBillingCycle("monthly");
      setCustomDays("");
      setNextBillingDate(nowIsoDate());
      setCategory("other");
      setReminders([1, 3, 7]);
      setIsActive(true);
      setNotes("");
    }
    setError(null);
  }, [open, mode, initial]);

  // Autocomplete suggestions
  const filteredSuggestions = useMemo(() => {
    if (!nameFocused || name.length < 1) return [];
    const q = name.toLowerCase();
    return SUBSCRIPTION_SUGGESTIONS.filter(
      (s) => s.name.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [name, nameFocused]);

  function toggleReminder(day: number) {
    setReminders((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amountMinor = Math.round(parseFloat(amountDisplay) * 100);
    if (isNaN(amountMinor) || amountMinor <= 0) {
      setError("Enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        amountMinor,
        billingCycle,
        customIntervalDays: billingCycle === "custom_days" ? Number(customDays) || 30 : undefined,
        nextBillingDate,
        category,
        reminderDaysBefore: reminders,
        isActive,
        notes: notes.trim() || undefined,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  const currencySymbol = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  })
    .formatToParts(0)
    .find((p) => p.type === "currency")?.value ?? "$";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto" showCloseButton={false}>
        <SheetHeader className="px-6 pt-6">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-heading text-lg">
              {mode === "create" ? "Add subscription" : "Edit subscription"}
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
          <SheetDescription className="text-xs">
            {mode === "create"
              ? "Track a new recurring subscription"
              : "Update subscription details"}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-5">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
            >
              {error}
            </motion.div>
          )}

          {/* Name with autocomplete */}
          <div className="relative space-y-2">
            <Label htmlFor="sub-name">Name</Label>
            <Input
              id="sub-name"
              placeholder="e.g. Netflix, Spotify"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setTimeout(() => setNameFocused(false), 150)}
              required
              className="h-10"
              autoComplete="off"
            />
            <AnimatePresence>
              {filteredSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg"
                >
                  {filteredSuggestions.map((s, i) => (
                    <motion.button
                      key={s.name}
                      type="button"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.15 }}
                      className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent transition-colors first:rounded-t-lg last:rounded-b-lg"
                      onMouseDown={() => {
                        setName(s.name);
                        setCategory(s.category);
                        setNameFocused(false);
                      }}
                    >
                      <span>{s.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {categoryLabel(s.category)}
                      </span>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Amount + Billing Cycle */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sub-amount">Amount ({currencySymbol})</Label>
              <Input
                id="sub-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="9.99"
                value={amountDisplay}
                onChange={(e) => setAmountDisplay(e.target.value)}
                required
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label>Billing cycle</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {BILLING_CYCLES.map((cycle) => (
                  <button
                    key={cycle}
                    type="button"
                    onClick={() => setBillingCycle(cycle)}
                    className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                      billingCycle === cycle
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {billingCycleLabel(cycle)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {billingCycle === "custom_days" && (
            <div className="space-y-2">
              <Label htmlFor="sub-custom-days">Interval (days)</Label>
              <Input
                id="sub-custom-days"
                type="number"
                min="1"
                placeholder="30"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                className="h-10"
              />
            </div>
          )}

          {/* Next billing date */}
          <div className="space-y-2">
            <Label htmlFor="sub-date">Next billing date</Label>
            <Input
              id="sub-date"
              type="date"
              value={nextBillingDate}
              onChange={(e) => setNextBillingDate(e.target.value)}
              required
              className="h-10"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_OPTIONS.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    category === cat
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {categoryLabel(cat)}
                </button>
              ))}
            </div>
          </div>

          {/* Reminders */}
          <div className="space-y-2">
            <Label>Remind me before</Label>
            <div className="flex gap-2">
              {REMINDER_OPTIONS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleReminder(day)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    reminders.includes(day)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {day} day{day > 1 ? "s" : ""}
                </button>
              ))}
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">
                Paused subscriptions won&apos;t count toward spending
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="sub-notes">Notes (optional)</Label>
            <textarea
              id="sub-notes"
              placeholder="Shared family plan, annual renewal..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={280}
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1 h-10"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="lg" className="flex-1 h-10" disabled={loading}>
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : mode === "create" ? (
                "Add subscription"
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
