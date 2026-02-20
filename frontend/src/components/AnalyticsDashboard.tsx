import { motion, useReducedMotion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { categoryLabel, formatCurrencyMinor } from "../lib/format";
import type {
  AnalyticsSummary,
  CategorySpendPoint,
  RenewalBucketPoint,
  SpendTrendPoint
} from "../lib/analytics";

interface AnalyticsDashboardProps {
  spendTrend: SpendTrendPoint[];
  categorySpend: CategorySpendPoint[];
  renewalBuckets: RenewalBucketPoint[];
  summary: AnalyticsSummary;
  currency: string;
  onAddSubscription: () => void;
}

const CATEGORY_COLORS = ["#246bff", "#109d82", "#a37016", "#b656f5", "#ff5c7c"];

const compactCurrency = (amountMinor: number, currency: string): string => {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1
  }).format(amountMinor / 100);
};

export const AnalyticsDashboard = ({
  spendTrend,
  categorySpend,
  renewalBuckets,
  summary,
  currency,
  onAddSubscription
}: AnalyticsDashboardProps) => {
  const reduceMotion = useReducedMotion();
  const cardTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.32, ease: "easeOut" as const };

  if (summary.activeCount === 0) {
    return (
      <section className="panel analytics-empty" aria-labelledby="analytics-empty-title">
        <h2 id="analytics-empty-title">Subscription analytics</h2>
        <p className="empty-note">No active subscriptions yet. Add one to unlock charts and metrics.</p>
        <button type="button" className="primary-btn" onClick={onAddSubscription}>
          Add subscription
        </button>
      </section>
    );
  }

  const kpis = [
    {
      label: "Monthly baseline",
      value: formatCurrencyMinor(summary.monthlyBaselineMinor, currency),
      hint: "Current recurring spend",
      tone: "blue"
    },
    {
      label: "6-month projection",
      value: formatCurrencyMinor(summary.projectedSixMonthMinor, currency),
      hint: "Forecasted charges in next 6 months",
      tone: "teal"
    },
    {
      label: "Active subscriptions",
      value: String(summary.activeCount),
      hint: "Currently billing",
      tone: "amber"
    },
    {
      label: "Renewals in 30 days",
      value: String(summary.renewalCount30Days),
      hint: "Near-term billing events",
      tone: "blue"
    }
  ] as const;

  return (
    <motion.div
      className="analytics-grid"
      initial={reduceMotion ? false : "hidden"}
      animate={reduceMotion ? undefined : "visible"}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.07,
            delayChildren: 0.04
          }
        }
      }}
    >
      <motion.section
        className="panel analytics-kpi-panel"
        variants={{
          hidden: { opacity: 0, y: 8 },
          visible: { opacity: 1, y: 0 }
        }}
        transition={cardTransition}
        aria-labelledby="analytics-title"
      >
        <div className="panel-head">
          <div>
            <h2 id="analytics-title">Subscription analytics</h2>
            <p className="panel-subtitle">Visual summary of spending and upcoming billing activity</p>
          </div>
        </div>

        <div className="analytics-kpis" aria-label="Analytics summary">
          {kpis.map((kpi) => (
            <article key={kpi.label} className={`analytics-kpi tone-${kpi.tone}`}>
              <p className="stat-kicker">{kpi.label}</p>
              <strong>{kpi.value}</strong>
              <p className="stat-hint">{kpi.hint}</p>
            </article>
          ))}
        </div>
      </motion.section>

      <motion.section
        className="panel chart-panel"
        variants={{
          hidden: { opacity: 0, y: 8 },
          visible: { opacity: 1, y: 0 }
        }}
        transition={cardTransition}
        aria-labelledby="spend-trend-title"
      >
        <div className="panel-head">
          <h2 id="spend-trend-title">Spend trend (6 months)</h2>
        </div>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={spendTrend} margin={{ top: 8, right: 10, left: 4, bottom: 6 }}>
              <defs>
                <linearGradient id="spendTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#246bff" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#246bff" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} />
              <YAxis
                width={84}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => compactCurrency(Number(value), currency)}
              />
              <Tooltip
                formatter={(value) => formatCurrencyMinor(Number(value), currency)}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--line)",
                  background: "var(--surface)"
                }}
              />
              <Area
                type="monotone"
                dataKey="amountMinor"
                stroke="#246bff"
                strokeWidth={2}
                fill="url(#spendTrendFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.section>

      <motion.section
        className="panel chart-panel"
        variants={{
          hidden: { opacity: 0, y: 8 },
          visible: { opacity: 1, y: 0 }
        }}
        transition={cardTransition}
        aria-labelledby="category-split-title"
      >
        <div className="panel-head">
          <h2 id="category-split-title">Category split</h2>
        </div>
        {categorySpend.length === 0 ? (
          <p className="empty-note">No category spend data available.</p>
        ) : (
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categorySpend}
                  dataKey="amountMinor"
                  nameKey="category"
                  innerRadius={62}
                  outerRadius={98}
                  paddingAngle={2}
                  label={false}
                  labelLine={false}
                >
                  {categorySpend.map((entry, index) => (
                    <Cell key={entry.category} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, _name, payload) => {
                    const row = payload?.payload as CategorySpendPoint | undefined;
                    const label = row ? categoryLabel(row.category) : "Category";
                    return [`${formatCurrencyMinor(Number(value), currency)}`, label];
                  }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--line)",
                    background: "var(--surface)"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {categorySpend.length > 0 ? (
          <ul className="chart-legend">
            {categorySpend.map((entry, index) => (
              <li key={entry.category}>
                <span
                  className="legend-swatch"
                  style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                />
                <span>{categoryLabel(entry.category)}</span>
                <strong>{Math.round(entry.share * 100)}%</strong>
              </li>
            ))}
          </ul>
        ) : null}
      </motion.section>

      <motion.section
        className="panel chart-panel full-width"
        variants={{
          hidden: { opacity: 0, y: 8 },
          visible: { opacity: 1, y: 0 }
        }}
        transition={cardTransition}
        aria-labelledby="renewal-buckets-title"
      >
        <div className="panel-head">
          <h2 id="renewal-buckets-title">Renewals next 30 days</h2>
        </div>
        <div className="chart-wrap chart-wrap-short">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={renewalBuckets} margin={{ top: 8, right: 10, left: 4, bottom: 6 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="bucketLabel" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(value) => [`${String(value)} renewals`, "Count"]}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--line)",
                  background: "var(--surface)"
                }}
              />
              <Bar dataKey="count" fill="#109d82" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.section>
    </motion.div>
  );
};
