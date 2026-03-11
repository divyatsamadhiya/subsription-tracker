"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Pause,
  Play,
  Trash2,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDashboard } from "@/lib/dashboard-context";
import { formatCurrencyMinor, categoryLabel, billingCycleLabel, formatShortDate } from "@/lib/format";
import { daysUntil, nowIsoDate } from "@/lib/date";
import { CATEGORY_OPTIONS } from "@/lib/types";
import type { Subscription, SubscriptionCategory, SubscriptionInput } from "@/lib/types";
import { api } from "@/lib/api";
import { SubscriptionFormSheet } from "@/components/dashboard/subscription-form-sheet";
import { DeleteDialog } from "@/components/dashboard/delete-dialog";

type StatusFilter = "all" | "active" | "paused";

const CATEGORY_COLORS: Record<SubscriptionCategory, string> = {
  entertainment: "bg-chart-1",
  productivity: "bg-chart-2",
  utilities: "bg-chart-3",
  health: "bg-chart-4",
  other: "bg-chart-5",
};

export default function SubscriptionsPage() {
  const { subscriptions, settings, refresh } = useDashboard();
  const currency = settings.defaultCurrency;
  const today = nowIsoDate();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<SubscriptionCategory | "all">("all");
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editTarget, setEditTarget] = useState<Subscription | undefined>();

  const [deleteTarget, setDeleteTarget] = useState<Subscription | null>(null);

  // Counts for status filter (unaffected by category/search)
  const activeCount = useMemo(
    () => subscriptions.filter((s) => s.isActive).length,
    [subscriptions]
  );
  const pausedCount = subscriptions.length - activeCount;

  // Counts for category chips (filtered by status only)
  const statusFiltered = useMemo(
    () =>
      subscriptions.filter((s) => {
        if (statusFilter === "active") return s.isActive;
        if (statusFilter === "paused") return !s.isActive;
        return true;
      }),
    [subscriptions, statusFilter]
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of statusFiltered) {
      counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
    }
    return counts;
  }, [statusFiltered]);

  // Final visible list
  const visible = useMemo(() => {
    let list = statusFiltered;

    if (categoryFilter !== "all") {
      list = list.filter((s) => s.category === categoryFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.category.includes(q)
      );
    }

    return list.sort((a, b) =>
      a.nextBillingDate.localeCompare(b.nextBillingDate) ||
      a.name.localeCompare(b.name)
    );
  }, [statusFiltered, categoryFilter, search]);

  function openCreate() {
    setFormMode("create");
    setEditTarget(undefined);
    setFormOpen(true);
  }

  function openEdit(sub: Subscription) {
    setFormMode("edit");
    setEditTarget(sub);
    setFormOpen(true);
  }

  async function handleFormSubmit(data: SubscriptionInput) {
    if (formMode === "create") {
      await api.createSubscription(data);
    } else if (editTarget) {
      await api.updateSubscription(editTarget.id, data);
    }
    await refresh();
  }

  async function handleToggleActive(sub: Subscription) {
    await api.updateSubscription(sub.id, {
      name: sub.name,
      amountMinor: sub.amountMinor,
      billingCycle: sub.billingCycle,
      customIntervalDays: sub.customIntervalDays,
      nextBillingDate: sub.nextBillingDate,
      category: sub.category,
      reminderDaysBefore: sub.reminderDaysBefore,
      isActive: !sub.isActive,
      notes: sub.notes,
    });
    await refresh();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await api.deleteSubscription(deleteTarget.id);
    await refresh();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Subscriptions
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {subscriptions.length} total &middot; {activeCount} active &middot;{" "}
            {pausedCount} paused
          </p>
        </div>
        <Button size="lg" className="h-9 gap-2" onClick={openCreate}>
          <Plus className="size-4" />
          Add new
        </Button>
      </div>

      {/* Search */}
      <div className="relative mt-5">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search subscriptions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 pl-9"
        />
      </div>

      {/* Status filter */}
      <Tabs
        value={statusFilter}
        onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        className="mt-4"
      >
        <TabsList>
          <TabsTrigger value="all">All ({subscriptions.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({activeCount})</TabsTrigger>
          <TabsTrigger value="paused">Paused ({pausedCount})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Category filter */}
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-x-visible sm:pb-0">
        {CATEGORY_OPTIONS.filter((cat) => (categoryCounts.get(cat) ?? 0) > 0).map(
          (cat) => (
            <button
              key={cat}
              onClick={() =>
                setCategoryFilter((current) => (current === cat ? "all" : cat))
              }
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                categoryFilter === cat
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {categoryLabel(cat)} ({categoryCounts.get(cat)})
            </button>
          )
        )}
      </div>

      {/* Subscription list */}
      <div className="mt-5">
        {visible.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <motion.div
                initial={{ scale: 0, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <CreditCard className="size-10 text-muted-foreground/40" />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.3 }}
                className="mt-3 text-sm font-medium text-muted-foreground"
              >
                No subscriptions found
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.3 }}
              >
                <Button size="sm" className="mt-4 gap-2" onClick={openCreate}>
                  <Plus className="size-3.5" />
                  Add your first
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="divide-y divide-border">
              <AnimatePresence initial={false}>
                {visible.map((sub) => {
                  const days = daysUntil(sub.nextBillingDate, today);
                  return (
                    <motion.div
                      key={sub.id}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-4 px-4 py-3 sm:px-5">
                        {/* Category dot */}
                        <div
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${CATEGORY_COLORS[sub.category]}`}
                        />

                        {/* Name + meta */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">
                              {sub.name}
                            </p>
                            {!sub.isActive && (
                              <Badge
                                variant="outline"
                                className="border-destructive/60 bg-destructive px-1.5 py-0 text-[10px] text-white"
                              >
                                Paused
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {categoryLabel(sub.category)} &middot;{" "}
                            {formatShortDate(sub.nextBillingDate)}
                            {days >= 0 && days <= 7 && (
                              <span className={days <= 1 ? " text-destructive font-medium" : ""}>
                                {" "}&middot; {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`}
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Amount + cycle */}
                        <div className="hidden sm:block text-right">
                          <p className="text-sm font-semibold">
                            {formatCurrencyMinor(sub.amountMinor, sub.currency)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {billingCycleLabel(sub.billingCycle)}
                          </p>
                        </div>

                        {/* Mobile amount */}
                        <p className="text-sm font-semibold sm:hidden">
                          {formatCurrencyMinor(sub.amountMinor, sub.currency)}
                        </p>

                        {/* Actions */}
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
                            <DropdownMenuItem onClick={() => openEdit(sub)}>
                              <Pencil className="size-3.5 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(sub)}
                            >
                              {sub.isActive ? (
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
                              onClick={() => setDeleteTarget(sub)}
                            >
                              <Trash2 className="size-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </Card>
        )}
      </div>

      {/* Form sheet */}
      <SubscriptionFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        currency={currency}
        initial={editTarget}
        onSubmit={handleFormSubmit}
      />

      {/* Delete dialog */}
      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        name={deleteTarget?.name ?? ""}
        onConfirm={handleDelete}
      />
    </motion.div>
  );
}
