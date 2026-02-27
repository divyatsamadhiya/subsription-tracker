import { useMemo, useState } from "react";
import {
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from "@mui/material";
import InboxRoundedIcon from "@mui/icons-material/InboxRounded";
import { billingCycleLabel, categoryLabel, formatCurrencyMinor, formatIsoDate } from "../lib/format";
import { CATEGORY_OPTIONS, type Subscription } from "../types";

interface SubscriptionGridProps {
  subscriptions: Subscription[];
  currency: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  onToggleActive: (id: string, nextActive: boolean) => Promise<void>;
}

type StatusFilter = "active" | "paused" | "all";
type CategoryFilter = (typeof CATEGORY_OPTIONS)[number] | "all";

const filterChipSx = {
  minWidth: { xs: 172, sm: 204 },
  height: 34,
  justifyContent: "center",
  "& .MuiChip-label": { px: 2 }
} as const;

export const SubscriptionGrid = ({
  subscriptions,
  currency,
  onEdit,
  onDelete,
  onToggleActive
}: SubscriptionGridProps) => {
  const [pendingDelete, setPendingDelete] = useState<Subscription | null>(null);
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const activeCount = useMemo(
    () => subscriptions.filter((subscription) => subscription.isActive).length,
    [subscriptions]
  );
  const pausedCount = subscriptions.length - activeCount;

  const matchesStatus = (subscription: Subscription): boolean => {
    if (statusFilter === "all") {
      return true;
    }

    return statusFilter === "active" ? subscription.isActive : !subscription.isActive;
  };

  const categoryCounts = useMemo(
    () =>
      CATEGORY_OPTIONS.map((category) => ({
        category,
        count: subscriptions.filter(
          (subscription) => subscription.category === category && matchesStatus(subscription)
        ).length
      })),
    [statusFilter, subscriptions]
  );

  const visibleSubscriptions = useMemo(() => {
    return subscriptions
      .filter((subscription) => matchesStatus(subscription))
      .filter((subscription) => {
        if (categoryFilter === "all") {
          return true;
        }

        return subscription.category === categoryFilter;
      })
      .sort((first, second) => {
        if (first.nextBillingDate !== second.nextBillingDate) {
          return first.nextBillingDate.localeCompare(second.nextBillingDate);
        }

        return first.name.localeCompare(second.name);
      });
  }, [categoryFilter, statusFilter, subscriptions]);

  return (
    <Stack spacing={1.25}>
      <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" spacing={1}>
        <Stack>
          <Typography variant="h5" id="subscriptions-title">
            Subscription library
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage, filter, and track all your subscriptions in one place.
          </Typography>
        </Stack>

        <Stack direction="row" spacing={0.75}>
          <Chip label={`${subscriptions.length} total`} />
          <Chip color="success" variant="outlined" label={`${activeCount} active`} />
          <Chip color="warning" variant="outlined" label={`${pausedCount} paused`} />
        </Stack>
      </Stack>

      <ToggleButtonGroup
        size="small"
        color="primary"
        exclusive
        value={statusFilter}
        sx={{
          alignSelf: "flex-start",
          "& .MuiToggleButton-root": {
            minWidth: 98
          }
        }}
        onChange={(_event, next: StatusFilter | null) => {
          if (!next) {
            return;
          }

          setStatusFilter(next);
        }}
        aria-label="Subscription status"
      >
        <ToggleButton value="active">Active</ToggleButton>
        <ToggleButton value="paused">Paused</ToggleButton>
        <ToggleButton value="all">All</ToggleButton>
      </ToggleButtonGroup>

      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
        <Chip
          size="small"
          clickable
          color={categoryFilter === "all" ? "primary" : "default"}
          variant={categoryFilter === "all" ? "filled" : "outlined"}
          label={`All categories (${visibleSubscriptions.length})`}
          sx={filterChipSx}
          onClick={() => setCategoryFilter("all")}
        />
        {categoryCounts
          .filter((entry) => entry.count > 0)
          .map((entry) => (
            <Chip
              key={entry.category}
              size="small"
              clickable
              color={categoryFilter === entry.category ? "primary" : "default"}
              variant={categoryFilter === entry.category ? "filled" : "outlined"}
              label={`${categoryLabel(entry.category)} (${entry.count})`}
              sx={filterChipSx}
              onClick={() => setCategoryFilter(entry.category)}
            />
          ))}
      </Stack>

      {visibleSubscriptions.length === 0 ? (
        <Stack spacing={1.5} alignItems="center" sx={{ py: 6 }}>
          <InboxRoundedIcon sx={{ fontSize: 48, color: "text.disabled" }} />
          <Stack alignItems="center" spacing={0.5}>
            <Typography variant="h6" color="text.secondary">
              No subscriptions found
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Try a different status filter or category.
            </Typography>
          </Stack>
        </Stack>
      ) : (
        <Grid container spacing={1.25}>
          {visibleSubscriptions.map((subscription) => (
            <Grid size={{ xs: 12, md: 6, xl: 4 }} key={subscription.id}>
              <Card
                variant="outlined"
                sx={{
                  height: "100%",
                  borderLeftColor: subscription.isActive ? "success.main" : "warning.main",
                  borderLeftWidth: 3
                }}
              >
                <CardContent>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Stack spacing={0.5}>
                        <Typography variant="h5">{subscription.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {categoryLabel(subscription.category)}
                        </Typography>
                      </Stack>
                      <Chip
                        size="small"
                        label={subscription.isActive ? "Active" : "Paused"}
                        color={subscription.isActive ? "success" : "warning"}
                      />
                    </Stack>

                    <Typography variant="h4">
                      {formatCurrencyMinor(subscription.amountMinor, currency)}
                    </Typography>

                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                      <Chip size="small" label={`Renews ${formatIsoDate(subscription.nextBillingDate)}`} />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={billingCycleLabel(subscription.billingCycle)}
                      />
                    </Stack>

                    {subscription.notes ? (
                      <Typography variant="body2" color="text.secondary">
                        {subscription.notes}
                      </Typography>
                    ) : null}
                  </Stack>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 1.5, pt: 0 }}>
                  <Button size="small" onClick={() => onEdit(subscription.id)}>
                    Edit
                  </Button>
                  <Button
                    size="small"
                    color={subscription.isActive ? "inherit" : "success"}
                    disabled={pendingToggleId === subscription.id}
                    onClick={async () => {
                      setPendingToggleId(subscription.id);
                      try {
                        await onToggleActive(subscription.id, !subscription.isActive);
                      } finally {
                        setPendingToggleId((current) =>
                          current === subscription.id ? null : current
                        );
                      }
                    }}
                  >
                    {subscription.isActive ? "Pause" : "Activate"}
                  </Button>
                  <Button size="small" color="error" onClick={() => setPendingDelete(subscription)}>
                    Delete
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)}>
        <DialogTitle>Delete subscription</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {pendingDelete
              ? `Permanently delete "${pendingDelete.name}"? This cannot be undone.`
              : "Delete this subscription?"}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disableElevation
            onClick={async () => {
              if (!pendingDelete) {
                return;
              }
              await onDelete(pendingDelete.id);
              setPendingDelete(null);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};
