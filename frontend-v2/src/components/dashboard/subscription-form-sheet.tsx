"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { format, parse } from "date-fns";
import { Loader2, X, CalendarIcon, Search, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { Subscription, SubscriptionInput, BillingCycle, SubscriptionCategory } from "@/lib/types";
import { CATEGORY_OPTIONS } from "@/lib/types";
import { categoryLabel, billingCycleLabel, currencySymbol } from "@/lib/format";
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
  const [priorSpendingDisplay, setPriorSpendingDisplay] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameFocused, setNameFocused] = useState(false);
  const [nameSearch, setNameSearch] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const nameDropdownRef = useRef<HTMLDivElement>(null);

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
      setPriorSpendingDisplay(initial.priorSpendingMinor ? String(initial.priorSpendingMinor / 100) : "");
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
      setPriorSpendingDisplay("");
    }
    setError(null);
  }, [open, mode, initial]);

  // Dropdown suggestions — show all when open, filter when searching
  const filteredSuggestions = useMemo(() => {
    if (!nameFocused) return [];
    const q = nameSearch.toLowerCase();
    if (!q) return SUBSCRIPTION_SUGGESTIONS;
    return SUBSCRIPTION_SUGGESTIONS.filter(
      (s) => s.name.toLowerCase().includes(q)
    );
  }, [nameSearch, nameFocused]);

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
      const priorMinor = priorSpendingDisplay ? Math.round(parseFloat(priorSpendingDisplay) * 100) : undefined;
      await onSubmit({
        name: name.trim(),
        amountMinor,
        billingCycle,
        customIntervalDays: billingCycle === "custom_days" ? Number(customDays) || 30 : undefined,
        nextBillingDate,
        category,
        reminderDaysBefore: reminders,
        isActive,
        notes: notes.trim() || null,
        priorSpendingMinor: priorMinor && priorMinor > 0 ? priorMinor : undefined,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  const sym = currencySymbol(currency);

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

          {/* Name with dropdown */}
          <div className="relative space-y-2" ref={nameDropdownRef}>
            <Label htmlFor="sub-name">Name</Label>
            <button
              type="button"
              onClick={() => {
                setNameFocused(true);
                setNameSearch("");
              }}
              className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm transition-colors hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 ${
                name ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <span className="truncate">{name || "Select a subscription..."}</span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            </button>
            <AnimatePresence>
              {nameFocused && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg"
                >
                  {/* Search input */}
                  <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                    <Search className="size-4 text-muted-foreground shrink-0" />
                    <input
                      autoFocus
                      placeholder="Search..."
                      value={nameSearch}
                      onChange={(e) => setNameSearch(e.target.value)}
                      onBlur={() => setTimeout(() => setNameFocused(false), 150)}
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                  {/* Option to type custom name */}
                  {nameSearch.trim() && !filteredSuggestions.some(
                    (s) => s.name.toLowerCase() === nameSearch.trim().toLowerCase()
                  ) && (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-accent transition-colors"
                      onMouseDown={() => {
                        setName(nameSearch.trim());
                        setNameFocused(false);
                        setNameSearch("");
                      }}
                    >
                      Use &ldquo;{nameSearch.trim()}&rdquo;
                    </button>
                  )}
                  {/* Scrollable suggestions list */}
                  <div className="max-h-56 overflow-y-auto">
                    {filteredSuggestions.length === 0 ? (
                      <p className="px-3 py-3 text-center text-xs text-muted-foreground">
                        No matches found
                      </p>
                    ) : (
                      filteredSuggestions.map((s) => (
                        <button
                          key={s.name}
                          type="button"
                          className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-accent ${
                            s.name === name ? "bg-accent/50 font-medium" : ""
                          }`}
                          onMouseDown={() => {
                            setName(s.name);
                            setCategory(s.category);
                            setNameFocused(false);
                            setNameSearch("");
                          }}
                        >
                          <span>{s.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {categoryLabel(s.category)}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Amount + Billing Cycle */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sub-amount">Amount ({sym})</Label>
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
            <Label>Next billing date</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger
                className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm transition-colors hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 ${
                  nextBillingDate ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <span>
                  {nextBillingDate
                    ? format(parse(nextBillingDate, "yyyy-MM-dd", new Date()), "PPP")
                    : "Pick a date"}
                </span>
                <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={
                    nextBillingDate
                      ? parse(nextBillingDate, "yyyy-MM-dd", new Date())
                      : undefined
                  }
                  onSelect={(date) => {
                    if (date) {
                      setNextBillingDate(format(date, "yyyy-MM-dd"));
                    }
                    setCalendarOpen(false);
                  }}
                  defaultMonth={
                    nextBillingDate
                      ? parse(nextBillingDate, "yyyy-MM-dd", new Date())
                      : undefined
                  }
                />
              </PopoverContent>
            </Popover>
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

          {/* Prior spending */}
          <div className="space-y-2">
            <Label htmlFor="sub-prior-spending">Prior spending (optional)</Label>
            <p className="text-xs text-muted-foreground">
              Total amount spent on this subscription before adding it here
            </p>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {sym}
              </span>
              <Input
                id="sub-prior-spending"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={priorSpendingDisplay}
                onChange={(e) => setPriorSpendingDisplay(e.target.value)}
                className="pl-7"
              />
            </div>
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
