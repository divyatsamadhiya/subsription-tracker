import { motion, useReducedMotion } from "framer-motion";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography
} from "@mui/material";
import { BarChart, LineChart, PieChart } from "@mui/x-charts";
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

const CATEGORY_COLORS = ["#6750A4", "#625B71", "#7D5260", "#5A7A96", "#6F7972"];

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
      <Card variant="outlined" aria-labelledby="analytics-empty-title">
        <CardContent>
          <Stack spacing={1.25}>
            <Typography id="analytics-empty-title" variant="h5">
              Subscription analytics
            </Typography>
            <Alert severity="info">
              No active subscriptions yet. Add one to unlock charts and metrics.
            </Alert>
            <Button type="button" variant="contained" onClick={onAddSubscription}>
              Add subscription
            </Button>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  const kpis = [
    {
      label: "Monthly baseline",
      value: formatCurrencyMinor(summary.monthlyBaselineMinor, currency),
      hint: "Current recurring spend"
    },
    {
      label: "6-month projection",
      value: formatCurrencyMinor(summary.projectedSixMonthMinor, currency),
      hint: "Forecasted charges in next 6 months"
    },
    {
      label: "Active subscriptions",
      value: String(summary.activeCount),
      hint: "Currently billing"
    },
    {
      label: "Renewals in 30 days",
      value: String(summary.renewalCount30Days),
      hint: "Near-term billing events"
    }
  ] as const;

  return (
    <motion.div
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
      <Grid container spacing={1.25}>
        <Grid size={12}>
          <motion.div
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
            transition={cardTransition}
          >
            <Card variant="outlined" aria-labelledby="analytics-title">
              <CardContent>
                <Stack spacing={1.25}>
                  <Stack>
                    <Typography id="analytics-title" variant="h5">
                      Subscription analytics
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Visual summary of spending and upcoming billing activity
                    </Typography>
                  </Stack>

                  <Grid container spacing={1.25} aria-label="Analytics summary">
                    {kpis.map((kpi) => (
                      <Grid key={kpi.label} size={{ xs: 12, sm: 6, lg: 3 }}>
                        <Card variant="outlined">
                          <CardContent>
                            <Stack spacing={0.5}>
                              <Typography variant="overline" color="text.secondary">
                                {kpi.label}
                              </Typography>
                              <Typography variant="h5">{kpi.value}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {kpi.hint}
                              </Typography>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Stack>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <motion.div
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
            transition={cardTransition}
          >
            <Card variant="outlined" aria-labelledby="spend-trend-title">
              <CardContent>
                <Stack spacing={1.25}>
                  <Typography id="spend-trend-title" variant="h5">
                    Spend trend (6 months)
                  </Typography>
                  <LineChart
                    height={240}
                    xAxis={[{ scaleType: "point", data: spendTrend.map((row) => row.monthLabel) }]}
                    series={[
                      {
                        data: spendTrend.map((row) => row.amountMinor / 100),
                        label: `Amount (${currency})`
                      }
                    ]}
                    margin={{ left: 60, right: 20, top: 20, bottom: 30 }}
                  />
                </Stack>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <motion.div
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
            transition={cardTransition}
          >
            <Card variant="outlined" aria-labelledby="category-split-title">
              <CardContent>
                <Stack spacing={1.25}>
                  <Typography id="category-split-title" variant="h5">
                    Category split
                  </Typography>

                  {categorySpend.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No category spend data available.
                    </Typography>
                  ) : (
                    <>
                      <PieChart
                        height={240}
                        colors={CATEGORY_COLORS}
                        series={[
                          {
                            data: categorySpend.map((entry) => ({
                              id: entry.category,
                              value: entry.amountMinor,
                              label: categoryLabel(entry.category)
                            })),
                            innerRadius: 64,
                            outerRadius: 100,
                            paddingAngle: 2
                          }
                        ]}
                      />
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {categorySpend.map((entry, index) => (
                          <Chip
                            key={entry.category}
                            label={`${categoryLabel(entry.category)} ${Math.round(entry.share * 100)}%`}
                            sx={{ borderColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                            variant="outlined"
                          />
                        ))}
                      </Stack>
                    </>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid size={12}>
          <motion.div
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
            transition={cardTransition}
          >
            <Card variant="outlined" aria-labelledby="renewal-buckets-title">
              <CardContent>
                <Stack spacing={1.25}>
                  <Typography id="renewal-buckets-title" variant="h5">
                    Renewals next 30 days
                  </Typography>
                  <BarChart
                    height={220}
                    xAxis={[
                      {
                        scaleType: "band",
                        data: renewalBuckets.map((row) => row.bucketLabel)
                      }
                    ]}
                    series={[{ data: renewalBuckets.map((row) => row.count), label: "Renewals" }]}
                    margin={{ left: 40, right: 20, top: 20, bottom: 30 }}
                  />
                </Stack>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>
    </motion.div>
  );
};
