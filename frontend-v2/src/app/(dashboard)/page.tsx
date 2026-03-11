"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  CalendarClock,
  Plus,
  List,
  CalendarDays,
  Pencil,
  Pause,
  Play,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { useDashboard } from "@/lib/dashboard-context";
import { formatCurrencyMinor, categoryLabel, formatShortDate, formatRelativeDue, currencySymbol } from "@/lib/format";
import {
  calculateMonthlyTotalMinor,
  calculateYearlyTotalMinor,
  getUpcomingRenewals,
  nowIsoDate,
  daysUntil,
} from "@/lib/date";
import type { Subscription, SubscriptionCategory } from "@/lib/types";
import { CATEGORY_OPTIONS } from "@/lib/types";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import { Sparkline } from "@/components/dashboard/sparkline";
import { RenewalCalendar } from "@/components/dashboard/renewal-calendar";
import { getBrandColor } from "@/lib/brand-colors";
import { buildSpendSparkline, buildCountSparkline, estimateTrend } from "@/lib/overview-helpers";
import { api } from "@/lib/api";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const CATEGORY_COLORS: Record<SubscriptionCategory, string> = {
  entertainment: "bg-chart-1",
  productivity: "bg-chart-2",
  utilities: "bg-chart-3",
  health: "bg-chart-4",
  other: "bg-chart-5",
};

const CATEGORY_HEX: Record<SubscriptionCategory, string> = {
  entertainment: "#7C3AED",
  productivity: "#10B981",
  utilities: "#F59E0B",
  health: "#EC4899",
  other: "#3B82F6",
};

function urgencyClass(days: number) {
  if (days <= 3) {
    return "border-destructive/60 bg-destructive text-white";
  }
  return "bg-muted text-muted-foreground border-border";
}

/** Brand-colored initial circle for a subscription */
function SubIcon({ name, category }: { name: string; category: SubscriptionCategory }) {
  const brandColor = getBrandColor(name);
  const bgColor = brandColor ?? CATEGORY_HEX[category];
  const initial = name[0]?.toUpperCase() ?? "?";

  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
      style={{ backgroundColor: bgColor }}
    >
      {initial}
    </div>
  );
}

export default function OverviewPage() {
  const { user, subscriptions, settings, refresh } = useDashboard();
  const router = useRouter();
  const [renewalWindow, setRenewalWindow] = useState<"7" | "30">("7");
  const [renewalView, setRenewalView] = useState<"list" | "calendar">("list");
  const [expandedCategory, setExpandedCategory] = useState<SubscriptionCategory | null>(null);
  const currency = settings.defaultCurrency;
  const today = nowIsoDate();
  const sym = currencySymbol(currency);

  const monthlyTotal = useMemo(
    () => calculateMonthlyTotalMinor(subscriptions),
    [subscriptions]
  );
  const yearlyTotal = useMemo(
    () => calculateYearlyTotalMinor(subscriptions),
    [subscriptions]
  );
  const activeCount = useMemo(
    () => subscriptions.filter((s) => s.isActive).length,
    [subscriptions]
  );
  const renewals = useMemo(
    () => getUpcomingRenewals(subscriptions, today, Number(renewalWindow)),
    [subscriptions, today, renewalWindow]
  );
  // For calendar view, always show full month
  const monthRenewals = useMemo(
    () => getUpcomingRenewals(subscriptions, today, 31),
    [subscriptions, today]
  );

  const spendSparkline = useMemo(() => buildSpendSparkline(subscriptions), [subscriptions]);
  const countSparkline = useMemo(() => buildCountSparkline(subscriptions), [subscriptions]);
  const trend = useMemo(() => estimateTrend(subscriptions), [subscriptions]);

  const categorySpend = useMemo(() => {
    const totals = new Map<SubscriptionCategory, number>();
    for (const sub of subscriptions.filter((s) => s.isActive)) {
      const prev = totals.get(sub.category) ?? 0;
      totals.set(sub.category, prev + sub.amountMinor);
    }
    const total = Array.from(totals.values()).reduce((a, b) => a + b, 0) || 1;
    return CATEGORY_OPTIONS
      .map((cat) => ({
        category: cat,
        amount: totals.get(cat) ?? 0,
        percent: Math.round(((totals.get(cat) ?? 0) / total) * 100),
      }))
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [subscriptions]);

  // Pie chart data
  const pieData = useMemo(
    () =>
      categorySpend.map((c) => ({
        name: categoryLabel(c.category),
        category: c.category,
        value: c.amount / 100,
        color: CATEGORY_HEX[c.category],
      })),
    [categorySpend]
  );

  // Subs for drilldown
  const drilldownSubs = useMemo(() => {
    if (!expandedCategory) return [];
    return subscriptions
      .filter((s) => s.isActive && s.category === expandedCategory)
      .sort((a, b) => b.amountMinor - a.amountMinor);
  }, [subscriptions, expandedCategory]);

  const firstName = user?.profile?.fullName?.split(" ")[0] ?? "there";
  const dueNames = renewals.slice(0, 3).map((s) => s.name);
  const dueExtra = renewals.length > 3 ? renewals.length - 3 : 0;

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

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      {/* Greeting */}
      <motion.div variants={item} className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Good {getGreeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s your spending overview
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={() => router.push("/subscriptions?action=create")}
        >
          <Plus className="size-3.5" />
          Add subscription
        </Button>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        variants={item}
        className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <KpiCard
          icon={DollarSign}
          label="Monthly spend"
          numericValue={monthlyTotal / 100}
          formatFn={(n) => formatCurrencyMinor(Math.round(n * 100), currency)}
          trend={trend}
          sparklineData={spendSparkline}
          sparklineColor="var(--color-primary)"
        />
        <KpiCard
          icon={TrendingUp}
          label="Yearly projection"
          numericValue={yearlyTotal / 100}
          formatFn={(n) => formatCurrencyMinor(Math.round(n * 100), currency)}
          sparklineData={spendSparkline}
          sparklineColor="var(--color-chart-2)"
        />
        <KpiCard
          icon={CreditCard}
          label="Active subs"
          numericValue={activeCount}
          formatFn={(n) => String(Math.round(n))}
          sparklineData={countSparkline}
          sparklineColor="var(--color-chart-4)"
        />
        <DueCard
          renewalWindow={renewalWindow}
          renewals={renewals}
          dueNames={dueNames}
          dueExtra={dueExtra}
        />
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Upcoming Renewals */}
        <motion.div variants={item} className="lg:col-span-3">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Upcoming renewals</CardTitle>
              <div className="flex items-center gap-2">
                {/* List / Calendar toggle */}
                <div className="flex h-8 rounded-lg border border-border p-0.5">
                  <button
                    onClick={() => setRenewalView("list")}
                    className={`flex items-center justify-center rounded-md px-2 text-xs transition-colors ${
                      renewalView === "list"
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    aria-label="List view"
                  >
                    <List className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setRenewalView("calendar")}
                    className={`flex items-center justify-center rounded-md px-2 text-xs transition-colors ${
                      renewalView === "calendar"
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    aria-label="Calendar view"
                  >
                    <CalendarDays className="size-3.5" />
                  </button>
                </div>
                {renewalView === "list" && (
                  <Tabs
                    value={renewalWindow}
                    onValueChange={(v) => setRenewalWindow(v as "7" | "30")}
                  >
                    <TabsList className="h-8">
                      <TabsTrigger value="7" className="text-xs px-2.5">
                        7 days
                      </TabsTrigger>
                      <TabsTrigger value="30" className="text-xs px-2.5">
                        30 days
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <AnimatePresence mode="wait">
                {renewalView === "calendar" ? (
                  <motion.div
                    key="calendar"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="px-6 pb-5"
                  >
                    <RenewalCalendar renewals={monthRenewals} today={today} />
                  </motion.div>
                ) : renewals.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="flex flex-col items-center gap-3 px-6 pb-6 pt-2">
                      <p className="text-sm text-muted-foreground">
                        No renewals in the next {renewalWindow} days
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => router.push("/subscriptions?action=create")}
                      >
                        <Plus className="size-3.5" />
                        Track a new service
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="divide-y divide-border"
                  >
                    {renewals.map((sub, i) => {
                      const days = daysUntil(sub.nextBillingDate, today);
                      return (
                        <motion.div
                          key={sub.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03, duration: 0.25 }}
                          className="group flex items-center justify-between px-6 py-3 transition-colors hover:bg-accent/50"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <SubIcon name={sub.name} category={sub.category} />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {sub.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatShortDate(sub.nextBillingDate)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Quick actions — visible on hover */}
                            <div className="hidden items-center gap-0.5 opacity-0 transition-opacity group-hover:flex group-hover:opacity-100">
                              <button
                                onClick={() => router.push(`/subscriptions?action=create`)}
                                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                aria-label="Edit"
                              >
                                <Pencil className="size-3" />
                              </button>
                              <button
                                onClick={() => handleToggleActive(sub)}
                                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                aria-label={sub.isActive ? "Pause" : "Activate"}
                              >
                                {sub.isActive ? (
                                  <Pause className="size-3" />
                                ) : (
                                  <Play className="size-3" />
                                )}
                              </button>
                            </div>
                            <span className="text-sm font-medium">
                              {formatCurrencyMinor(sub.amountMinor, sub.currency)}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[11px] ${urgencyClass(days)} ${
                                days <= 1 ? "animate-pulse" : ""
                              }`}
                            >
                              {formatRelativeDue(days)}
                            </Badge>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Breakdown — Donut Chart */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Spending by category</CardTitle>
              <Link
                href="/analytics"
                className="flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
              >
                View all
                <ChevronRight className="size-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {categorySpend.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <p className="text-sm text-muted-foreground">
                    No active subscriptions yet
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => router.push("/subscriptions?action=create")}
                  >
                    <Plus className="size-3.5" />
                    Add your first
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  {/* Donut */}
                  <div className="h-[160px] w-[160px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                          strokeWidth={0}
                          onClick={(_, index) => {
                            const cat = pieData[index]?.category;
                            if (cat) {
                              setExpandedCategory((prev) =>
                                prev === cat ? null : cat
                              );
                            }
                          }}
                          className="cursor-pointer"
                        >
                          {pieData.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={entry.color}
                              opacity={
                                expandedCategory && expandedCategory !== entry.category
                                  ? 0.3
                                  : 1
                              }
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: "var(--color-card)",
                            border: "1px solid var(--color-border)",
                            borderRadius: 8,
                            fontSize: 13,
                          }}
                          formatter={(value) => [`${sym}${Number(value).toFixed(2)}`, ""]}
                        />
                        <text
                          x="50%"
                          y="46%"
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="fill-foreground font-heading text-base font-semibold"
                        >
                          {sym}{(monthlyTotal / 100).toFixed(0)}
                        </text>
                        <text
                          x="50%"
                          y="58%"
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="fill-muted-foreground text-[9px]"
                        >
                          /month
                        </text>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Category legend with click-to-drilldown */}
                  <div className="w-full space-y-2">
                    {categorySpend.map((entry) => (
                      <div key={entry.category}>
                        <button
                          onClick={() =>
                            setExpandedCategory((prev) =>
                              prev === entry.category ? null : entry.category
                            )
                          }
                          className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent ${
                            expandedCategory === entry.category ? "bg-accent" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 rounded-sm"
                              style={{ backgroundColor: CATEGORY_HEX[entry.category] }}
                            />
                            <span className="font-medium">
                              {categoryLabel(entry.category)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {entry.percent}%
                            </span>
                            <span className="text-xs font-medium">
                              {formatCurrencyMinor(entry.amount, currency)}
                            </span>
                            <ChevronRight
                              className={`size-3 text-muted-foreground transition-transform ${
                                expandedCategory === entry.category ? "rotate-90" : ""
                              }`}
                            />
                          </div>
                        </button>

                        {/* Drilldown: individual subs within category */}
                        <AnimatePresence>
                          {expandedCategory === entry.category && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="ml-5 mt-1 space-y-1 border-l border-border pl-3">
                                {drilldownSubs.map((sub) => (
                                  <div
                                    key={sub.id}
                                    className="flex items-center justify-between py-0.5 text-xs"
                                  >
                                    <span className="truncate text-muted-foreground">
                                      {sub.name}
                                    </span>
                                    <span className="shrink-0 font-medium">
                                      {formatCurrencyMinor(sub.amountMinor, sub.currency)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

function TrendBadge({ trend }: { trend: number }) {
  const isUp = trend >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${
        isUp ? "text-destructive" : "text-success"
      }`}
    >
      {isUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {isUp ? "+" : ""}{trend}%
    </span>
  );
}

function KpiCard({
  icon: Icon,
  label,
  numericValue,
  formatFn,
  trend,
  sparklineData,
  sparklineColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  numericValue: number;
  formatFn: (n: number) => string;
  trend?: number | null;
  sparklineData?: number[];
  sparklineColor?: string;
}) {
  return (
    <Card className="group relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon className="size-3.5" />
            <span className="text-xs font-medium">{label}</span>
          </div>
          {trend != null && <TrendBadge trend={trend} />}
        </div>
        <div className="mt-1.5 flex items-end justify-between gap-2">
          <p className="font-heading text-xl font-semibold tracking-tight">
            <AnimatedNumber value={numericValue} formatFn={formatFn} />
          </p>
          {sparklineData && sparklineColor && (
            <Sparkline
              data={sparklineData}
              color={sparklineColor}
              width={56}
              height={20}
              className="shrink-0 opacity-60 transition-opacity group-hover:opacity-100"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DueCard({
  renewalWindow,
  renewals,
  dueNames,
  dueExtra,
}: {
  renewalWindow: string;
  renewals: Subscription[];
  dueNames: string[];
  dueExtra: number;
}) {
  return (
    <Card className="group relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarClock className="size-3.5" />
          <span className="text-xs font-medium">Due in {renewalWindow}d</span>
        </div>
        <p className="mt-1.5 font-heading text-xl font-semibold tracking-tight">
          <AnimatedNumber
            value={renewals.length}
            formatFn={(n) => String(Math.round(n))}
          />
        </p>
        {dueNames.length > 0 && (
          <p className="mt-1 truncate text-[11px] text-muted-foreground">
            {dueNames.join(", ")}
            {dueExtra > 0 && ` +${dueExtra} more`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
