"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  CalendarClock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboard } from "@/lib/dashboard-context";
import { formatCurrencyMinor, categoryLabel, formatShortDate, formatRelativeDue } from "@/lib/format";
import {
  calculateMonthlyTotalMinor,
  calculateYearlyTotalMinor,
  getUpcomingRenewals,
  nowIsoDate,
  daysUntil,
} from "@/lib/date";
import type { SubscriptionCategory } from "@/lib/types";
import { CATEGORY_OPTIONS } from "@/lib/types";
import { AnimatedNumber } from "@/components/dashboard/animated-number";

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

function urgencyClass(days: number) {
  if (days <= 0) {
    return "border-destructive/60 bg-destructive text-white";
  }
  if (days <= 3) {
    return "border-destructive/60 bg-destructive text-white";
  }
  return "bg-muted text-muted-foreground border-border";
}

export default function OverviewPage() {
  const { user, subscriptions, settings } = useDashboard();
  const [renewalWindow, setRenewalWindow] = useState<"7" | "30">("7");
  const currency = settings.defaultCurrency;
  const today = nowIsoDate();

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

  const firstName = user?.profile?.fullName?.split(" ")[0] ?? "there";

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      {/* Greeting */}
      <motion.div variants={item} className="mb-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Good {getGreeting()}, {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s your spending overview
        </p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        variants={item}
        className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <KpiCard
          icon={DollarSign}
          label="Monthly spend"
          value={formatCurrencyMinor(monthlyTotal, currency)}
          numericValue={monthlyTotal / 100}
          formatFn={(n) => formatCurrencyMinor(Math.round(n * 100), currency)}
        />
        <KpiCard
          icon={TrendingUp}
          label="Yearly projection"
          value={formatCurrencyMinor(yearlyTotal, currency)}
          numericValue={yearlyTotal / 100}
          formatFn={(n) => formatCurrencyMinor(Math.round(n * 100), currency)}
        />
        <KpiCard
          icon={CreditCard}
          label="Active subs"
          value={String(activeCount)}
          numericValue={activeCount}
          formatFn={(n) => String(Math.round(n))}
        />
        <KpiCard
          icon={CalendarClock}
          label={`Due in ${renewalWindow}d`}
          value={String(renewals.length)}
          numericValue={renewals.length}
          formatFn={(n) => String(Math.round(n))}
        />
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Upcoming Renewals */}
        <motion.div variants={item} className="lg:col-span-3">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Upcoming renewals</CardTitle>
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
            </CardHeader>
            <CardContent className="p-0">
              {renewals.length === 0 ? (
                <p className="px-6 pb-6 text-sm text-muted-foreground">
                  No renewals in the next {renewalWindow} days
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {renewals.map((sub, i) => {
                    const days = daysUntil(sub.nextBillingDate, today);
                    return (
                      <motion.div
                        key={sub.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03, duration: 0.25 }}
                        className="flex items-center justify-between px-6 py-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`h-2 w-2 shrink-0 rounded-full ${CATEGORY_COLORS[sub.category]}`}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {sub.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatShortDate(sub.nextBillingDate)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">
                            {formatCurrencyMinor(sub.amountMinor, sub.currency)}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[11px] ${urgencyClass(days)}`}
                          >
                            {formatRelativeDue(days)}
                          </Badge>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Breakdown */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Spending by category</CardTitle>
            </CardHeader>
            <CardContent>
              {categorySpend.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active subscriptions yet
                </p>
              ) : (
                <div className="space-y-4">
                  {categorySpend.map((entry) => (
                    <div key={entry.category}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2.5 w-2.5 rounded-sm ${CATEGORY_COLORS[entry.category]}`}
                          />
                          <span className="font-medium">
                            {categoryLabel(entry.category)}
                          </span>
                        </div>
                        <span className="text-muted-foreground">
                          {formatCurrencyMinor(entry.amount, currency)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          className={`h-full rounded-full ${CATEGORY_COLORS[entry.category]}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${entry.percent}%` }}
                          transition={{
                            duration: 0.6,
                            ease: "easeOut",
                            delay: 0.2,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
  numericValue,
  formatFn,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  numericValue?: number;
  formatFn?: (n: number) => string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="size-3.5" />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <p className="mt-1.5 font-heading text-xl font-semibold tracking-tight">
          {numericValue !== undefined && formatFn ? (
            <AnimatedNumber value={numericValue} formatFn={formatFn} />
          ) : (
            value
          )}
        </p>
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
