"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LabelList,
  ComposedChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  CalendarClock,
  BarChart3,
  ChevronDown,
  Layers3,
  Plus,
  Star,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SubscriptionAvatar } from "@/components/dashboard/subscription-avatar";
import { useDashboard } from "@/lib/dashboard-context";
import {
  formatCurrencyMinor,
  categoryLabel,
  currencySymbol,
  formatShortDate,
} from "@/lib/format";
import { nowIsoDate } from "@/lib/date";
import {
  buildSpendComparisonTrend,
  buildCategorySpend,
  buildCategoryTrend,
  buildRenewalBuckets,
  buildAnalyticsSummary,
  buildLifetimeCategorySpend,
  buildRoiData,
  getCategoryChangeMeta,
  getAnalyticsRangeMonths,
  getSubscriptionsForCategoryPoint,
  monthlyEquivalent,
  type AnalyticsRange,
  type RoiItem,
} from "@/lib/analytics";
import type { SubscriptionCategory } from "@/lib/types";
import { CATEGORY_HEX } from "@/lib/category-colors";
import {
  getRoiRatings,
  setRoiRating,
  USAGE_LABELS,
  type UsageRating,
  type RoiVerdict,
} from "@/lib/roi-ratings";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const RANGE_OPTIONS: Array<{ value: AnalyticsRange; label: string }> = [
  { value: "3m", label: "3M" },
  { value: "6m", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "all", label: "All" },
];

export default function AnalyticsPage() {
  const { subscriptions, settings } = useDashboard();
  const router = useRouter();
  const currency = settings.defaultCurrency;
  const today = nowIsoDate();
  const [showComparison, setShowComparison] = useState(false);
  const [range, setRange] = useState<AnalyticsRange>("1y");
  const [categoryTrendRange, setCategoryTrendRange] = useState<AnalyticsRange>("1y");
  const [selectedCategory, setSelectedCategory] = useState<SubscriptionCategory | null>(null);
  const [selectedRenewalBucketKey, setSelectedRenewalBucketKey] = useState<
    "0-7" | "8-14" | "15-21" | "22-30" | null
  >(null);
  const [roiRatings, setRoiRatings] = useState(getRoiRatings);
  const [expandedLifetimeCategory, setExpandedLifetimeCategory] = useState<SubscriptionCategory | null>(null);

  const handleRoiRate = useCallback(
    (subscriptionId: string, rating: UsageRating) => {
      setRoiRating(subscriptionId, rating);
      setRoiRatings(getRoiRatings());
    },
    []
  );

  const rangeMonths = useMemo(
    () => getAnalyticsRangeMonths(subscriptions, today, range),
    [subscriptions, today, range]
  );
  const summary = useMemo(
    () => buildAnalyticsSummary(subscriptions, today),
    [subscriptions, today]
  );
  const spendTrend = useMemo(
    () => buildSpendComparisonTrend(subscriptions, today, rangeMonths),
    [subscriptions, today, rangeMonths]
  );
  const categorySpend = useMemo(
    () => buildCategorySpend(subscriptions, today),
    [subscriptions, today]
  );
  const categoryTrendMonths = useMemo(
    () => getAnalyticsRangeMonths(subscriptions, today, categoryTrendRange),
    [subscriptions, today, categoryTrendRange]
  );
  const categoryTrend = useMemo(
    () => buildCategoryTrend(subscriptions, today, categoryTrendMonths),
    [subscriptions, today, categoryTrendMonths]
  );
  const renewalBuckets = useMemo(
    () => buildRenewalBuckets(subscriptions, today),
    [subscriptions, today]
  );
  const roiData = useMemo(
    () => buildRoiData(subscriptions, roiRatings, today),
    [subscriptions, roiRatings, today]
  );
  const lifetimeCategorySpend = useMemo(
    () => buildLifetimeCategorySpend(subscriptions, today),
    [subscriptions, today]
  );

  const hasData = subscriptions.some((s) => s.isActive);

  if (!hasData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20"
      >
        <motion.div
          initial={{ scale: 0, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <BarChart3 className="size-12 text-muted-foreground/30" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mt-4 font-heading text-lg font-semibold text-muted-foreground"
        >
          No analytics yet
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mt-1 text-sm text-muted-foreground"
        >
          Add some active subscriptions to see spending insights
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <Button
            size="sm"
            className="mt-4 gap-1.5"
            onClick={() => router.push("/subscriptions?action=create")}
          >
            <Plus className="size-3.5" />
            Add subscription
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  const sym = currencySymbol(currency);

  const trendData = spendTrend.map((p) => ({
    name: p.monthLabel,
    amount: p.amountMinor / 100,
    cumulative: p.cumulativeAmountMinor / 100,
    previousAmount: p.previousAmountMinor / 100,
    previousMonthLabel: p.previousMonthLabel,
    contributors: p.contributors,
  }));

  const pieData = categorySpend.map((p) => ({
    name: categoryLabel(p.category),
    value: p.amountMinor / 100,
    color: CATEGORY_HEX[p.category],
    category: p.category,
    momChangePercent: p.momChangePercent,
    sourceCategories: p.sourceCategories,
  }));
  const selectedCategoryPoint = categorySpend.find(
    (entry) => entry.category === selectedCategory
  ) ?? null;
  const categorySubscriptions = getSubscriptionsForCategoryPoint(
    subscriptions,
    selectedCategoryPoint
  );

  const totalMonthly = summary.monthlyBaselineMinor / 100;
  const visibleRenewalBuckets = renewalBuckets.filter((bucket) => bucket.count > 0);
  const hiddenRenewalBuckets = renewalBuckets.filter((bucket) => bucket.count === 0);
  const selectedRenewalBucket =
    renewalBuckets.find((bucket) => bucket.bucketKey === selectedRenewalBucketKey) ?? null;
  const renewalChartData = visibleRenewalBuckets.map((bucket) => ({
    ...bucket,
    amountLabel: formatRenewalAmountLabel(bucket.amountMinor, currency),
  }));

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={item} className="mb-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Analytics
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Spending insights and renewal forecasts
        </p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        variants={item}
        className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5"
      >
        <KpiCard
          icon={DollarSign}
          label="Avg monthly spend"
          value={formatCurrencyMinor(summary.averageMonthlySpendMinor, currency)}
          subtitle="Across the next 12 months"
        />
        <KpiCard
          icon={CalendarClock}
          label="Highest spend month"
          value={summary.highestSpendMonth?.monthLabel ?? "No data"}
          subtitle={
            summary.highestSpendMonth
              ? formatCurrencyMinor(summary.highestSpendMonth.amountMinor, currency)
              : "No upcoming charges yet"
          }
        />
        <KpiCard
          icon={CreditCard}
          label="Most cancelled category"
          value={
            summary.mostCancelledCategory
              ? categoryLabel(summary.mostCancelledCategory.category)
              : "No cancellations"
          }
          subtitle={
            summary.mostCancelledCategory
              ? `${summary.mostCancelledCategory.count} inactive subscription${
                  summary.mostCancelledCategory.count === 1 ? "" : "s"
                }`
              : "Nothing inactive to analyze"
          }
        />
        <KpiCard
          icon={TrendingUp}
          label="YoY growth"
          value={
            summary.yoyGrowthPercent === null
              ? "N/A"
              : `${summary.yoyGrowthPercent >= 0 ? "+" : ""}${summary.yoyGrowthPercent.toFixed(0)}%`
          }
          subtitle="Vs previous 12 months"
        />
        <KpiCard
          icon={Wallet}
          label="Lifetime spending"
          value={formatCurrencyMinor(summary.lifetimeTotalMinor, currency)}
          subtitle="Total spent across all subscriptions"
        />
      </motion.div>

      {/* Spend Trend - 12 month combo chart */}
      <motion.div variants={item} className="mb-6">
        <Card>
          <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Monthly spend trend</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Hover a month to inspect the exact amount and the subscriptions behind it.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {RANGE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={range === option.value ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setRange(option.value)}
                >
                  {option.label}
                </Button>
              ))}
              <Button
                variant={showComparison ? "secondary" : "outline"}
                size="sm"
                className="gap-2"
                onClick={() => setShowComparison((current) => !current)}
              >
                <Layers3 className="size-3.5" />
                {showComparison ? "Hide previous period" : "Vs previous period"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    interval={1}
                    tickFormatter={(value) => value.slice(0, 3)}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${sym}${v}`}
                    width={60}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--color-accent)", fillOpacity: 0.22 }}
                    content={<MonthlySpendTooltip currencySymbol={sym} />}
                  />
                  <Bar
                    dataKey="amount"
                    fill="var(--color-primary)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
                  />
                  {showComparison && (
                    <Line
                      type="monotone"
                      dataKey="previousAmount"
                      stroke="var(--color-muted-foreground)"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      dot={false}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Category Trend - Stacked Area Chart */}
      <motion.div variants={item} className="mb-6">
        <Card>
          <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Category trend over time</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                How spending per category has shifted month by month
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {RANGE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={categoryTrendRange === option.value ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setCategoryTrendRange(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={categoryTrend}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="monthLabel"
                    tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    interval={1}
                    tickFormatter={(value) => value.slice(0, 3)}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${sym}${v}`}
                    width={60}
                  />
                  <Tooltip content={<CategoryTrendTooltip sym={sym} />} />
                  <Area
                    type="monotone"
                    dataKey="entertainment"
                    stackId="1"
                    stroke={CATEGORY_HEX.entertainment}
                    fill={CATEGORY_HEX.entertainment}
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="productivity"
                    stackId="1"
                    stroke={CATEGORY_HEX.productivity}
                    fill={CATEGORY_HEX.productivity}
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="utilities"
                    stackId="1"
                    stroke={CATEGORY_HEX.utilities}
                    fill={CATEGORY_HEX.utilities}
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="health"
                    stackId="1"
                    stroke={CATEGORY_HEX.health}
                    fill={CATEGORY_HEX.health}
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="other"
                    stackId="1"
                    stroke={CATEGORY_HEX.other}
                    fill={CATEGORY_HEX.other}
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
              {(["entertainment", "productivity", "utilities", "health", "other"] as const).map(
                (cat) => (
                  <span key={cat} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      className="inline-block size-2.5 rounded-sm"
                      style={{ backgroundColor: CATEGORY_HEX[cat] }}
                    />
                    {categoryLabel(cat)}
                  </span>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Breakdown - Donut Chart */}
        <motion.div variants={item} className="h-full">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Spending by category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-6 sm:flex-row">
                <div className="h-[180px] w-[180px] shrink-0 sm:h-[200px] sm:w-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {pieData.map((entry, i) => {
                          const isSelected = selectedCategory === entry.category;
                          return (
                            <Cell
                              key={i}
                              fill={entry.color}
                              onClick={() =>
                                setSelectedCategory((current) =>
                                  current === entry.category ? null : entry.category
                                )
                              }
                              fillOpacity={
                                selectedCategory === null || isSelected
                                  ? 1
                                  : 0.28
                              }
                              stroke={isSelected ? "var(--color-foreground)" : "none"}
                              strokeWidth={isSelected ? 1.5 : 0}
                            />
                          );
                        })}
                      </Pie>
                      <Tooltip
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
                        y="48%"
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="fill-foreground font-heading text-lg font-semibold"
                      >
                        {sym}{Math.round(totalMonthly).toLocaleString()}
                      </text>
                      <text
                        x="50%"
                        y="60%"
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="fill-muted-foreground text-[10px]"
                      >
                        /month
                      </text>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-3">
                  {categorySpend.map((entry) => {
                    const isSelected = selectedCategory === entry.category;
                    const subs = isSelected ? categorySubscriptions : [];
                    return (
                      <Popover
                        key={entry.category}
                        open={isSelected}
                        onOpenChange={(open) => {
                          if (!open) setSelectedCategory(null);
                        }}
                      >
                        <PopoverTrigger
                          render={<div />}
                          nativeButton={false}
                          onClick={() =>
                            setSelectedCategory((current) =>
                              current === entry.category ? null : entry.category
                            )
                          }
                        >
                          <CategoryLegendRow
                            category={entry.category}
                            amountMinor={entry.amountMinor}
                            share={entry.share}
                            currency={currency}
                            momChangePercent={entry.momChangePercent}
                            color={CATEGORY_HEX[entry.category]}
                            isSelected={isSelected}
                          />
                        </PopoverTrigger>
                        <PopoverContent
                          side="bottom"
                          align="start"
                          sideOffset={6}
                          className="w-80 p-0"
                        >
                          <div className="p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {categoryLabel(entry.category)} subscriptions
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {subs.length} active subscription
                                  {subs.length === 1 ? "" : "s"}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 space-y-1.5">
                              {subs.map((subscription) => (
                                <div
                                  key={subscription.id}
                                  className="flex items-center gap-2.5 rounded-lg bg-accent/50 px-2.5 py-1.5 text-sm"
                                >
                                  <SubscriptionAvatar name={subscription.name} category={subscription.category} size="xs" />
                                  <span className="min-w-0 truncate font-medium text-foreground">
                                    {subscription.name}
                                  </span>
                                  <span className="ml-auto shrink-0 text-xs font-medium text-foreground">
                                    {formatCurrencyMinor(Math.round(monthlyEquivalent(subscription, today)), currency)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Renewal Distribution - Bar Chart */}
        <motion.div variants={item} className="h-full">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Renewal distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {visibleRenewalBuckets.length > 0 ? (
                <>
                  <Popover
                    open={selectedRenewalBucket !== null}
                    onOpenChange={(open) => {
                      if (!open) setSelectedRenewalBucketKey(null);
                    }}
                  >
                    <PopoverTrigger render={<div />} nativeButton={false}>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={renewalChartData} barCategoryGap={24}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="var(--color-border)"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="bucketLabel"
                              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                              axisLine={false}
                              tickLine={false}
                              allowDecimals={false}
                              width={30}
                            />
                            <Tooltip
                              content={<RenewalBucketTooltip currency={currency} />}
                              cursor={false}
                            />
                            <Bar
                              dataKey="count"
                              fill="var(--color-primary)"
                              radius={[6, 6, 0, 0]}
                              maxBarSize={56}
                            >
                              {renewalChartData.map((bucket) => {
                                const isSelected = selectedRenewalBucketKey === bucket.bucketKey;
                                return (
                                  <Cell
                                    key={bucket.bucketKey}
                                    fill="var(--color-primary)"
                                    fillOpacity={
                                      selectedRenewalBucketKey === null || isSelected
                                        ? 1
                                        : 0.35
                                    }
                                    stroke={isSelected ? "var(--color-foreground)" : "none"}
                                    strokeWidth={isSelected ? 1.5 : 0}
                                    onClick={() =>
                                      setSelectedRenewalBucketKey((current) =>
                                        current === bucket.bucketKey ? null : bucket.bucketKey
                                      )
                                    }
                                  />
                                );
                              })}
                              <LabelList
                                dataKey="amountLabel"
                                position="top"
                                offset={10}
                                className="fill-muted-foreground text-[11px]"
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </PopoverTrigger>
                    {selectedRenewalBucket && (
                      <PopoverContent
                        side="bottom"
                        align="center"
                        sideOffset={6}
                        className="w-80 p-0"
                      >
                        <div className="p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {selectedRenewalBucket.bucketLabel} renewals
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {selectedRenewalBucket.count} subscription
                                {selectedRenewalBucket.count === 1 ? "" : "s"} totaling{" "}
                                {formatCurrencyMinor(selectedRenewalBucket.amountMinor, currency)}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 space-y-1.5">
                            {selectedRenewalBucket.subscriptions.map((subscription) => (
                              <div
                                key={subscription.subscriptionId}
                                className="flex items-center gap-2.5 rounded-lg bg-accent/50 px-2.5 py-1.5 text-sm"
                              >
                                <SubscriptionAvatar name={subscription.name} category={subscription.category} size="xs" />
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-foreground">{subscription.name}</p>
                                  <p className="text-[11px] text-muted-foreground">
                                    Renews {formatShortDate(subscription.nextBillingDate)}
                                  </p>
                                </div>
                                <span className="ml-auto shrink-0 text-xs font-medium text-foreground">
                                  {formatCurrencyMinor(subscription.amountMinor, currency)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </PopoverContent>
                    )}
                  </Popover>
                  {hiddenRenewalBuckets.length > 0 && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      No renewals in {hiddenRenewalBuckets.map((bucket) => bucket.bucketLabel).join(", ")}.
                    </p>
                  )}
                </>
              ) : (
                <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border/70 bg-background/30 px-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No renewals in this window.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Lifetime Spending by Category */}
      {lifetimeCategorySpend.length > 0 && (
        <motion.div variants={item} className="mt-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-baseline justify-between">
                <div>
                  <CardTitle className="text-base">Lifetime spending</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    All-time spend by category and subscription
                  </p>
                </div>
                <p className="font-heading text-xl font-semibold tracking-tight text-foreground">
                  {formatCurrencyMinor(summary.lifetimeTotalMinor, currency)}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lifetimeCategorySpend.map((entry) => {
                  const isExpanded = expandedLifetimeCategory === entry.category;
                  return (
                    <div key={entry.category}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/60"
                        onClick={() =>
                          setExpandedLifetimeCategory((current) =>
                            current === entry.category ? null : entry.category
                          )
                        }
                      >
                        <div
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: CATEGORY_HEX[entry.category] }}
                        />
                        <span className="font-medium text-foreground">
                          {categoryLabel(entry.category)}
                        </span>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {Math.round(entry.share * 100)}%
                        </span>
                        <div className="mx-2 h-2 flex-1 overflow-hidden rounded-full bg-accent">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.round(entry.share * 100)}%`,
                              backgroundColor: CATEGORY_HEX[entry.category],
                            }}
                          />
                        </div>
                        <span className="shrink-0 text-xs font-medium tabular-nums text-foreground">
                          {formatCurrencyMinor(entry.amountMinor, currency)}
                        </span>
                        <ChevronDown
                          className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {isExpanded && (
                        <div className="ml-8 mt-1 space-y-1 pb-1">
                          {entry.subscriptions.map((sub) => (
                            <div
                              key={sub.id}
                              className="flex items-center gap-2.5 rounded-lg bg-accent/50 px-2.5 py-1.5 text-sm"
                            >
                              <SubscriptionAvatar name={sub.name} category={entry.category} size="xs" />
                              <span className="min-w-0 truncate font-medium text-foreground">
                                {sub.name}
                              </span>
                              {!sub.isActive && (
                                <Badge variant="outline" className="px-1.5 py-0 text-[10px] text-muted-foreground">
                                  Inactive
                                </Badge>
                              )}
                              <span className="ml-auto shrink-0 text-xs font-medium tabular-nums text-foreground">
                                {formatCurrencyMinor(sub.amountMinor, currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Subscription ROI Tracker */}
      <motion.div variants={item} className="mt-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Subscription ROI</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Are you using what you pay for? Rate each subscription to find savings.
            </p>
          </CardHeader>
          <CardContent>
            {roiData.ratedCount > 0 && roiData.underusedMonthlyMinor > 0 && (
              <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
                <p className="text-sm font-medium text-foreground">
                  {formatCurrencyMinor(roiData.underusedMonthlyMinor, currency)}/mo on
                  underused subscriptions
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Consider cancelling or downgrading subscriptions rated Poor or Fair
                </p>
              </div>
            )}
            <div className="flex items-center justify-between gap-3 pb-3 text-xs text-muted-foreground">
              <span>
                {roiData.ratedCount} of {roiData.totalCount} rated
              </span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="inline-block size-2 rounded-full bg-emerald-500" /> Good
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block size-2 rounded-full bg-amber-500" /> Fair
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block size-2 rounded-full bg-rose-500" /> Poor
                </span>
              </div>
            </div>
            <div className="space-y-1">
              {roiData.items.map((roiItem) => (
                <RoiRow
                  key={roiItem.subscriptionId}
                  item={roiItem}
                  currency={currency}
                  onRate={handleRoiRate}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="size-3.5" />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p className="mt-1.5 font-heading text-xl font-semibold tracking-tight">
          {value}
        </p>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CategoryLegendRow({
  category,
  amountMinor,
  share,
  currency,
  momChangePercent,
  color,
  isSelected,
}: {
  category: SubscriptionCategory;
  amountMinor: number;
  share: number;
  currency: string;
  momChangePercent: number | null;
  color: string;
  isSelected: boolean;
}) {
  const change = getCategoryChangeMeta(momChangePercent);

  return (
    <div
      className={`w-full cursor-pointer rounded-xl px-3 py-2 text-left text-sm transition-colors ${
        isSelected ? "bg-accent" : "hover:bg-accent/60"
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className="h-2.5 w-2.5 shrink-0 rounded-sm"
          style={{ backgroundColor: color }}
        />
        <span className="font-medium text-foreground">
          {categoryLabel(category)}
        </span>
        <span
          className={`text-[11px] uppercase tracking-[0.12em] ${
            change.tone === "positive"
              ? "text-emerald-400"
              : change.tone === "negative"
                ? "text-rose-400"
                : "text-muted-foreground"
          }`}
        >
          {change.label}
        </span>
      </div>
      <div className="mt-0.5 flex items-center gap-2 pl-[18px] text-xs">
        <span className="font-medium tabular-nums text-foreground">
          {formatCurrencyMinor(amountMinor, currency)}
        </span>
        <span className="tabular-nums text-muted-foreground">
          {Math.round(share * 100)}%
        </span>
      </div>
    </div>
  );
}

function MonthlySpendTooltip({
  active,
  payload,
  currencySymbol,
}: {
  active?: boolean;
  payload?: Array<{
    payload: {
      name: string;
      amount: number;
      cumulative: number;
      previousAmount: number;
      previousMonthLabel: string;
      contributors: Array<{
        subscriptionId: string;
        name: string;
        category: SubscriptionCategory;
        amountMinor: number;
      }>;
    };
  }>;
  currencySymbol: string;
}) {
  if (!active || !payload?.[0]) return null;

  const point = payload[0].payload;

  return (
    <div className="w-64 rounded-xl border border-border bg-card p-3 text-sm shadow-lg">
      <p className="font-medium text-foreground">{point.name}</p>
      <p className="mt-1 font-heading text-lg font-semibold text-foreground">
        {currencySymbol}{Number(point.amount).toFixed(2)}
      </p>
      <p className="text-xs text-muted-foreground">
        Exact monthly spend
      </p>
      {point.contributors.length > 0 && (
        <div className="mt-3 border-t border-border pt-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Contributed by
          </p>
          <div className="mt-2 space-y-1.5">
            {point.contributors.map((contributor) => (
              <div
                key={contributor.subscriptionId}
                className="flex items-center gap-2 text-xs"
              >
                <SubscriptionAvatar name={contributor.name} category={contributor.category} size="xs" />
                <span className="min-w-0 truncate text-foreground">{contributor.name}</span>
                <span className="ml-auto shrink-0 text-muted-foreground">
                  {currencySymbol}{(contributor.amountMinor / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RenewalBucketTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: Array<{
    payload: {
      bucketLabel: string;
      count: number;
      amountMinor: number;
    };
  }>;
  currency: string;
}) {
  if (!active || !payload?.[0]) return null;

  const point = payload[0].payload;

  return (
    <div className="rounded-xl border border-border bg-card p-3 text-sm shadow-lg">
      <p className="font-medium text-foreground">{point.bucketLabel}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {point.count} renewal{point.count === 1 ? "" : "s"}
      </p>
      <p className="mt-1 font-medium text-foreground">
        {formatCurrencyMinor(point.amountMinor, currency)}
      </p>
    </div>
  );
}

const CATEGORY_TREND_KEYS = [
  "entertainment",
  "productivity",
  "utilities",
  "health",
  "other",
] as const;

function CategoryTrendTooltip({
  active,
  payload,
  sym,
}: {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    color: string;
  }>;
  sym: string;
}) {
  if (!active || !payload?.length) return null;

  const label = (payload[0] as unknown as { payload: { monthLabel: string } }).payload.monthLabel;
  const total = payload.reduce((sum, entry) => sum + entry.value, 0);
  const sorted = [...payload]
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <div className="w-56 rounded-xl border border-border bg-card p-3 text-sm shadow-lg">
      <p className="font-medium text-foreground">{label}</p>
      <p className="mt-1 font-heading text-lg font-semibold text-foreground">
        {sym}{total.toFixed(2)}
      </p>
      {sorted.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {sorted.map((entry) => (
            <div
              key={entry.dataKey}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span className="flex items-center gap-1.5 text-foreground">
                <span
                  className="inline-block size-2 rounded-sm"
                  style={{ backgroundColor: entry.color }}
                />
                {categoryLabel(entry.dataKey as SubscriptionCategory)}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {sym}{entry.value.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const VERDICT_COLORS: Record<RoiVerdict, string> = {
  poor: "bg-rose-500",
  fair: "bg-amber-500",
  good: "bg-emerald-500",
};

const CATEGORY_PILL_CLASSES = {
  entertainment: "border-chart-1/25 bg-chart-1/12 text-chart-1",
  productivity: "border-chart-2/25 bg-chart-2/12 text-chart-2",
  utilities: "border-chart-3/25 bg-chart-3/12 text-chart-3",
  health: "border-chart-4/25 bg-chart-4/12 text-chart-4",
  other: "border-chart-5/25 bg-chart-5/12 text-chart-5",
} as const;

function RoiRow({
  item,
  currency,
  onRate,
}: {
  item: RoiItem;
  currency: string;
  onRate: (id: string, rating: UsageRating) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/40 px-3 py-2.5">
      {item.verdict ? (
        <span
          className={`size-2 shrink-0 rounded-full ${VERDICT_COLORS[item.verdict]}`}
          title={item.verdict}
        />
      ) : (
        <span className="size-2 shrink-0 rounded-full bg-border" />
      )}
      <SubscriptionAvatar name={item.name} category={item.category} size="xs" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {item.name}
          </p>
          <Badge
            variant="outline"
            className={`px-2 py-0 text-[10px] font-medium ${CATEGORY_PILL_CLASSES[item.category]}`}
          >
            {categoryLabel(item.category)}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatCurrencyMinor(item.monthlyMinor, currency)}/mo
          {item.rating !== null && (
            <> &middot; {USAGE_LABELS[item.rating]}</>
          )}
        </p>
      </div>
      <div className="flex items-center gap-0.5">
        {([1, 2, 3, 4, 5] as UsageRating[]).map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRate(item.subscriptionId, star)}
            className="rounded p-0.5 transition-colors hover:bg-accent"
            title={USAGE_LABELS[star]}
          >
            <Star
              className={`size-3.5 ${
                item.rating !== null && star <= item.rating
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/40"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function formatRenewalAmountLabel(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amountMinor / 100);
}
