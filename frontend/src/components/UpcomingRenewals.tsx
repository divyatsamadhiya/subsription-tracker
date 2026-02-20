import {
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from "@mui/material";
import { daysUntil } from "../lib/date";
import { formatCurrencyMinor, formatRelativeDue } from "../lib/format";
import type { Subscription } from "../types";

interface UpcomingRenewalsProps {
  renewals: Subscription[];
  currency: string;
  windowDays: 7 | 30;
  onWindowChange: (window: 7 | 30) => void;
}

const urgencyColor = (days: number): "error" | "warning" | "default" => {
  if (days === 0) {
    return "error";
  }

  if (days <= 3) {
    return "warning";
  }

  return "default";
};

export const UpcomingRenewals = ({
  renewals,
  currency,
  windowDays,
  onWindowChange
}: UpcomingRenewalsProps) => {
  return (
    <Card variant="outlined" aria-labelledby="upcoming-renewals-title">
      <CardContent>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.25}>
          <Stack spacing={0.5}>
            <Typography id="upcoming-renewals-title" variant="h5">
              Upcoming renewals
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Prioritized by next billing date
            </Typography>
          </Stack>

          <ToggleButtonGroup
            color="primary"
            value={windowDays}
            exclusive
            size="small"
            onChange={(_event, value: 7 | 30 | null) => {
              if (value) {
                onWindowChange(value);
              }
            }}
            aria-label="Renewal time window"
          >
            <ToggleButton value={7}>Next 7 days</ToggleButton>
            <ToggleButton value={30}>Next 30 days</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {renewals.length === 0 ? (
          <Typography sx={{ mt: 1 }} color="text.secondary">
            No renewals in this window.
          </Typography>
        ) : (
          <List sx={{ mt: 0.5 }}>
            {renewals.map((subscription) => {
              const dueInDays = Math.max(0, daysUntil(subscription.nextBillingDate));
              return (
                <ListItem
                  key={`${subscription.id}-${subscription.nextBillingDate}`}
                  divider
                  disableGutters
                  secondaryAction={
                    <Stack alignItems="flex-end" spacing={0.5}>
                      <Typography variant="subtitle2">
                        {formatCurrencyMinor(subscription.amountMinor, currency)}
                      </Typography>
                      <Chip
                        size="small"
                        color={urgencyColor(dueInDays)}
                        label={formatRelativeDue(dueInDays)}
                      />
                    </Stack>
                  }
                >
                  <ListItemText
                    primary={subscription.name}
                    secondary={`Next charge: ${subscription.nextBillingDate}`}
                    sx={{ pr: { xs: 11, sm: 13 } }}
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
};
