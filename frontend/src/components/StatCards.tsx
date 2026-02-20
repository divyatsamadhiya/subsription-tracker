import { Card, CardContent, Grid, Stack, Typography } from "@mui/material";
import { formatCurrencyMinor } from "../lib/format";

interface StatCardsProps {
  monthlyTotalMinor: number;
  yearlyTotalMinor: number;
  activeCount: number;
  currency: string;
}

export const StatCards = ({
  monthlyTotalMinor,
  yearlyTotalMinor,
  activeCount,
  currency
}: StatCardsProps) => {
  const cards = [
    {
      label: "Monthly baseline",
      value: formatCurrencyMinor(monthlyTotalMinor, currency),
      hint: "Current recurring spend"
    },
    {
      label: "Yearly forecast",
      value: formatCurrencyMinor(yearlyTotalMinor, currency),
      hint: "Projected annual outflow"
    },
    {
      label: "Active subscriptions",
      value: String(activeCount),
      hint: "Services currently enabled"
    }
  ] as const;

  return (
    <Grid container spacing={1.25} aria-label="Spending summary">
      {cards.map((card) => (
        <Grid key={card.label} size={{ xs: 12, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="overline" color="text.secondary">
                  {card.label}
                </Typography>
                <Typography variant="h5">{card.value}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {card.hint}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};
