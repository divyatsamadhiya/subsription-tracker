"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboard } from "@/lib/dashboard-context";
import { formatCurrencyMinor, categoryLabel } from "@/lib/format";
import { nowIsoDate } from "@/lib/date";
import {
  buildSpendTrend,
  buildCategorySpend,
  buildRenewalBuckets,
  buildAnalyticsSummary,
} from "@/lib/analytics";
import type { SubscriptionCategory } from "@/lib/types";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const CATEGORY_HEX: Record<SubscriptionCategory, string> = {
  entertainment: "#7C3AED",
  productivity: "#10B981",
  utilities: "#F59E0B",
  health: "#EC4899",
  other: "#3B82F6",
};

export default function AnalyticsPage() {
  const { subscriptions, settings } = useDashboard();
  const currency = settings.defaultCurrency;
  const today = nowIsoDate();

  const summary = useMemo(
    () => buildAnalyticsSummary(subscriptions, today),
    [subscriptions, today]
  );
  const spendTrend = useMemo(
    () => buildSpendTrend(subscriptions, today, 6),
    [subscriptions, today]
  );
  const categorySpend = useMemo(
    () => buildCategorySpend(subscriptions),
    [subscriptions]
  );
  const renewalBuckets = useMemo(
    () => buildRenewalBuckets(subscriptions, today),
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
      </motion.div>
    );
  }

  const trendData = spendTrend.map((p) => ({
    name: p.monthLabel,
    amount: p.amountMinor / 100,
  }));

  const pieData = categorySpend.map((p) => ({
    name: categoryLabel(p.category),
    value: p.amountMinor / 100,
    color: CATEGORY_HEX[p.category],
  }));

  const totalMonthly = summary.monthlyBaselineMinor / 100;

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
        className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <KpiCard
          icon={DollarSign}
          label="Monthly baseline"
          value={formatCurrencyMinor(summary.monthlyBaselineMinor, currency)}
        />
        <KpiCard
          icon={TrendingUp}
          label="6-month projection"
          value={formatCurrencyMinor(summary.projectedSixMonthMinor, currency)}
        />
        <KpiCard
          icon={CreditCard}
          label="Active subs"
          value={String(summary.activeCount)}
        />
        <KpiCard
          icon={CalendarClock}
          label="Due in 30 days"
          value={String(summary.renewalCount30Days)}
        />
      </motion.div>

      {/* Spend Trend - Area Chart */}
      <motion.div variants={item} className="mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly spend trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
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
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v}`}
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                    formatter={(value) => [`$${Number(value).toFixed(2)}`, "Spend"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    fill="url(#spendGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Breakdown - Donut Chart */}
        <motion.div variants={item}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Spending by category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="h-[200px] w-[200px] shrink-0">
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
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--color-card)",
                          border: "1px solid var(--color-border)",
                          borderRadius: 8,
                          fontSize: 13,
                        }}
                        formatter={(value) => [`$${Number(value).toFixed(2)}`, ""]}
                      />
                      <text
                        x="50%"
                        y="48%"
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="fill-foreground font-heading text-lg font-semibold"
                      >
                        ${totalMonthly.toFixed(0)}
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
                <div className="space-y-3 flex-1">
                  {categorySpend.map((entry) => (
                    <div key={entry.category} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-sm"
                          style={{ backgroundColor: CATEGORY_HEX[entry.category] }}
                        />
                        <span>{categoryLabel(entry.category)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {Math.round(entry.share * 100)}%
                        </span>
                        <span className="font-medium">
                          {formatCurrencyMinor(entry.amountMinor, currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Renewal Distribution - Bar Chart */}
        <motion.div variants={item}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Renewal distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={renewalBuckets}>
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
                      contentStyle={{
                        backgroundColor: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 13,
                      }}
                      formatter={(value) => [String(value), "Renewals"]}
                    />
                    <Bar
                      dataKey="count"
                      fill="var(--color-primary)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
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
      </CardContent>
    </Card>
  );
}
