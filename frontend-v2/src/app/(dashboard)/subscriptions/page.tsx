"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Download,
  SlidersHorizontal,
  Plus,
  Pause,
  Search,
  CreditCard,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDashboard } from "@/lib/dashboard-context";
import { categoryLabel, currencySymbol, formatCurrencyMinor } from "@/lib/format";
import { nowIsoDate } from "@/lib/date";
import { CATEGORY_OPTIONS } from "@/lib/types";
import type { Subscription, SubscriptionCategory, SubscriptionInput } from "@/lib/types";
import { api } from "@/lib/api";
import { SubscriptionFormSheet } from "@/components/dashboard/subscription-form-sheet";
import { DeleteDialog } from "@/components/dashboard/delete-dialog";
import { SubscriptionRow } from "@/components/dashboard/subscription-row";
import {
  getAmountFilterSummary,
  getBulkSelectAllLabel,
  getBulkSelectionSummary,
} from "@/components/dashboard/subscription-list-ui";
import {
  buildSubscriptionsCsv,
  filterSubscriptions,
  monthlyEquivalentMinor,
  normalizePinnedSubscriptionOrder,
  reorderPinnedSubscriptions,
  sortSubscriptions,
  summarizeSubscriptionTotals,
  togglePinnedSubscription,
  type SubscriptionSortOption,
} from "@/lib/subscriptions-list";

type StatusFilter = "all" | "active" | "paused";
const PINNED_ORDER_STORAGE_KEY = "subscription-tracker:pinned-order:v1";

const SORT_OPTIONS: Array<{
  value: SubscriptionSortOption;
  label: string;
}> = [
  { value: "renewal_asc", label: "Renewal date" },
  { value: "amount_desc", label: "Amount" },
  { value: "alpha_asc", label: "Alphabetical" },
];

export default function SubscriptionsPage() {
  const { subscriptions, settings, refresh } = useDashboard();
  const currency = settings.defaultCurrency;
  const today = nowIsoDate();
  const searchParams = useSearchParams();
  const router = useRouter();
  const createRequested = searchParams.get("action") === "create";

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<SubscriptionCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState<SubscriptionSortOption>("renewal_asc");
  const [minMonthlyAmountMinor, setMinMonthlyAmountMinor] = useState(0);
  const [rawSelectedIds, setRawSelectedIds] = useState<string[]>([]);
  const [storedPinnedIds, setStoredPinnedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];

    try {
      const rawPinnedIds = window.localStorage.getItem(PINNED_ORDER_STORAGE_KEY);
      if (!rawPinnedIds) return [];
      const parsed = JSON.parse(rawPinnedIds);
      return Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === "string")
        : [];
    } catch {
      return [];
    }
  });
  const [draggedPinnedId, setDraggedPinnedId] = useState<string | null>(null);
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(createRequested);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editTarget, setEditTarget] = useState<Subscription | undefined>();

  const [deleteRequest, setDeleteRequest] = useState<{
    ids: string[];
    label: string;
  } | null>(null);

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
  const pinnedIds = useMemo(
    () => normalizePinnedSubscriptionOrder(subscriptions, storedPinnedIds),
    [subscriptions, storedPinnedIds]
  );
  const selectedIds = useMemo(() => {
    const validIds = new Set(subscriptions.map((subscription) => subscription.id));
    return rawSelectedIds.filter((id) => validIds.has(id));
  }, [subscriptions, rawSelectedIds]);
  const maxMonthlyAmountMinor = useMemo(() => {
    return statusFiltered.reduce((max, subscription) => {
      return Math.max(max, monthlyEquivalentMinor(subscription));
    }, 0);
  }, [statusFiltered]);
  const sliderMaxMinor = Math.max(maxMonthlyAmountMinor, 1000_00);
  const effectiveMinMonthlyAmountMinor = Math.min(
    minMonthlyAmountMinor,
    sliderMaxMinor
  );
  const sliderStepMinor = 100_00;
  const currencyMark = currencySymbol(currency);
  const amountFilterLabel = getAmountFilterSummary(
    effectiveMinMonthlyAmountMinor,
    currencyMark
  );

  // Final visible list
  const visible = useMemo(() => {
    let list = statusFiltered;

    if (categoryFilter !== "all") {
      list = list.filter((s) => s.category === categoryFilter);
    }

    list = filterSubscriptions(list, {
      searchQuery: search,
      minMonthlyAmountMinor: effectiveMinMonthlyAmountMinor,
    });

    return sortSubscriptions(list, sortOption, today, pinnedIds);
  }, [
    statusFiltered,
    categoryFilter,
    search,
    effectiveMinMonthlyAmountMinor,
    sortOption,
    today,
    pinnedIds,
  ]);

  const totals = useMemo(
    () => summarizeSubscriptionTotals(subscriptions),
    [subscriptions]
  );
  const selectedSortLabel =
    SORT_OPTIONS.find((option) => option.value === sortOption)?.label ?? "Renewal date";
  const selectedSubscriptions = useMemo(
    () => subscriptions.filter((subscription) => selectedIds.includes(subscription.id)),
    [subscriptions, selectedIds]
  );
  const selectedVisibleCount = useMemo(
    () =>
      visible.filter((subscription) => selectedIds.includes(subscription.id)).length,
    [visible, selectedIds]
  );
  const activeSelectedCount = useMemo(
    () => selectedSubscriptions.filter((subscription) => subscription.isActive).length,
    [selectedSubscriptions]
  );
  const bulkSelectionSummary = getBulkSelectionSummary(selectedIds.length);
  const bulkSelectAllLabel = getBulkSelectAllLabel(selectedVisibleCount, visible.length);

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

  // Auto-open create form when navigated with ?action=create
  useEffect(() => {
    if (createRequested) {
      router.replace("/subscriptions", { scroll: false });
    }
  }, [createRequested, router]);

  useEffect(() => {
    window.localStorage.setItem(PINNED_ORDER_STORAGE_KEY, JSON.stringify(pinnedIds));
  }, [pinnedIds]);

  function toSubscriptionInput(subscription: Subscription, overrides?: Partial<SubscriptionInput>) {
    return {
      name: subscription.name,
      amountMinor: subscription.amountMinor,
      billingCycle: subscription.billingCycle,
      customIntervalDays: subscription.customIntervalDays,
      nextBillingDate: subscription.nextBillingDate,
      category: subscription.category,
      reminderDaysBefore: subscription.reminderDaysBefore,
      isActive: subscription.isActive,
      notes: subscription.notes,
      ...overrides,
    };
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
    await api.updateSubscription(sub.id, toSubscriptionInput(sub, { isActive: !sub.isActive }));
    await refresh();
  }

  async function handleDelete() {
    if (!deleteRequest) return;
    await Promise.all(deleteRequest.ids.map((id) => api.deleteSubscription(id)));
    setRawSelectedIds((current) => current.filter((id) => !deleteRequest.ids.includes(id)));
    await refresh();
  }

  async function handleBulkPause() {
    const activeSelectedSubscriptions = selectedSubscriptions.filter(
      (subscription) => subscription.isActive
    );
    if (activeSelectedSubscriptions.length === 0) return;

    await Promise.all(
      activeSelectedSubscriptions.map((subscription) =>
        api.updateSubscription(
          subscription.id,
          toSubscriptionInput(subscription, { isActive: false })
        )
      )
    );

    await refresh();
  }

  function handleToggleSelection(subscriptionId: string, checked: boolean) {
    setRawSelectedIds((current) => {
      if (checked) {
        return current.includes(subscriptionId) ? current : [...current, subscriptionId];
      }

      return current.filter((id) => id !== subscriptionId);
    });
  }

  function handleSelectAllVisible() {
    setRawSelectedIds((current) =>
      Array.from(new Set([...current, ...visible.map((subscription) => subscription.id)]))
    );
  }

  function handleTogglePin(subscriptionId: string) {
    setStoredPinnedIds((current) => togglePinnedSubscription(current, subscriptionId));
  }

  function handlePinnedDragStart(subscriptionId: string) {
    if (!pinnedIds.includes(subscriptionId)) return;
    setDraggedPinnedId(subscriptionId);
    setDragTargetId(subscriptionId);
  }

  function handlePinnedDragEnter(subscriptionId: string) {
    if (!draggedPinnedId || draggedPinnedId === subscriptionId) return;
    if (!pinnedIds.includes(subscriptionId)) return;
    setDragTargetId(subscriptionId);
  }

  function clearPinnedDragState() {
    setDraggedPinnedId(null);
    setDragTargetId(null);
  }

  function handlePinnedDrop(targetId: string) {
    if (!draggedPinnedId || !pinnedIds.includes(targetId)) {
      clearPinnedDragState();
      return;
    }

    setStoredPinnedIds((current) =>
      reorderPinnedSubscriptions(current, draggedPinnedId, targetId)
    );
    clearPinnedDragState();
  }

  function handleExportSelected() {
    if (selectedSubscriptions.length === 0) return;

    const ordered = sortSubscriptions(
      selectedSubscriptions,
      sortOption,
      today,
      pinnedIds
    );
    const csv = buildSubscriptionsCsv(ordered, today);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "subscriptions-export.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
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

      {/* Search + sort */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <div className="relative h-10 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search subscriptions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-full pl-9"
          />
        </div>
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                size="lg"
                className="h-10 w-full justify-between px-3 sm:w-[190px]"
                aria-label="Filter by monthly amount"
              />
            }
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="size-4" />
              <span className="truncate">{amountFilterLabel}</span>
            </span>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[280px] gap-3 p-3">
            <PopoverHeader>
              <PopoverTitle>Amount range</PopoverTitle>
              <PopoverDescription>
                Filter by monthly-equivalent spend.
              </PopoverDescription>
            </PopoverHeader>
            <div className="rounded-xl border border-border bg-muted/30 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Current threshold
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {amountFilterLabel}
              </p>
            </div>
            <input
              type="range"
              min={0}
              max={sliderMaxMinor}
              step={sliderStepMinor}
              value={effectiveMinMonthlyAmountMinor}
              onChange={(event) => setMinMonthlyAmountMinor(Number(event.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary"
              aria-label="Minimum monthly subscription amount"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{currencyMark}0</span>
              <span>{currencyMark}{Math.round(sliderMaxMinor / 100)}/mo</span>
            </div>
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMinMonthlyAmountMinor(0)}
                disabled={effectiveMinMonthlyAmountMinor === 0}
              >
                Reset
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        <div className="h-10 w-full sm:w-[220px]">
          <Select
            value={sortOption}
            onValueChange={(value) => setSortOption(value as SubscriptionSortOption)}
          >
            <SelectTrigger
              className="h-full w-full rounded-lg px-2.5 py-1 text-base data-[size=default]:h-full md:text-sm dark:bg-input/30"
              aria-label="Sort subscriptions"
            >
              <SelectValue>{selectedSortLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent align="end">
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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

      {bulkSelectionSummary && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border bg-muted/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              {bulkSelectionSummary}
            </p>
            <p className="text-xs text-muted-foreground">
              Bulk actions apply to the subscriptions you checked.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {bulkSelectAllLabel && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAllVisible}
              >
                {bulkSelectAllLabel}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleBulkPause}
              disabled={activeSelectedCount === 0}
            >
              <Pause className="size-3.5" />
              Pause selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExportSelected}
            >
              <Download className="size-3.5" />
              Export selected
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={() =>
                setDeleteRequest({
                  ids: selectedIds,
                  label: `${selectedIds.length} subscriptions`,
                })
              }
            >
              <Trash2 className="size-3.5" />
              Delete selected
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => setRawSelectedIds([])}
            >
              <X className="size-3.5" />
              Clear
            </Button>
          </div>
        </div>
      )}

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
                      <SubscriptionRow
                        subscription={sub}
                        todayIsoDate={today}
                        isPinned={pinnedIds.includes(sub.id)}
                        isSelected={selectedIds.includes(sub.id)}
                        isDragTarget={dragTargetId === sub.id && draggedPinnedId !== sub.id}
                        onEdit={openEdit}
                        onSelectChange={handleToggleSelection}
                        onTogglePin={handleTogglePin}
                        onToggleActive={handleToggleActive}
                        onDelete={(subscription) =>
                          setDeleteRequest({
                            ids: [subscription.id],
                            label: subscription.name,
                          })
                        }
                        onPinnedDragStart={handlePinnedDragStart}
                        onPinnedDragEnter={handlePinnedDragEnter}
                        onPinnedDrop={handlePinnedDrop}
                        onPinnedDragEnd={clearPinnedDragState}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
            <div className="border-t border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground sm:px-5">
              <span className="font-medium text-foreground">Total:</span>{" "}
              {formatCurrencyMinor(totals.activeMinor, currency)}/mo active &middot;{" "}
              {formatCurrencyMinor(totals.pausedMinor, currency)}/mo paused
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
        open={!!deleteRequest}
        onOpenChange={(open) => !open && setDeleteRequest(null)}
        name={deleteRequest?.label ?? ""}
        onConfirm={handleDelete}
      />
    </motion.div>
  );
}
