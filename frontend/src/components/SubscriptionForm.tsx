import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { BILLING_CYCLE_OPTIONS, CATEGORY_OPTIONS, type Subscription } from "../types";
import { billingCycleLabel, categoryLabel } from "../lib/format";
import { parseSubscriptionForm } from "../lib/schemas";
import type { SubscriptionDraft } from "../store/useAppStore";

const REMINDER_DAY_OPTIONS = [1, 3, 7];

interface SubscriptionFormProps {
  mode: "create" | "edit";
  currency: string;
  initialValue?: Subscription;
  onSubmit: (draft: SubscriptionDraft) => Promise<void>;
  onCancelEdit: () => void;
}

interface FormState {
  name: string;
  amount: string;
  billingCycle: (typeof BILLING_CYCLE_OPTIONS)[number];
  customIntervalDays: string;
  nextBillingDate: string;
  category: (typeof CATEGORY_OPTIONS)[number];
  reminderDaysBefore: number[];
  isActive: boolean;
  notes: string;
}

const defaultFormState = (): FormState => {
  const date = new Date();
  const fallbackDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  return {
    name: "",
    amount: "",
    billingCycle: "monthly",
    customIntervalDays: "30",
    nextBillingDate: fallbackDate,
    category: "other",
    reminderDaysBefore: [1, 3, 7],
    isActive: true,
    notes: ""
  };
};

const fromSubscription = (subscription: Subscription): FormState => {
  return {
    name: subscription.name,
    amount: (subscription.amountMinor / 100).toString(),
    billingCycle: subscription.billingCycle,
    customIntervalDays: String(subscription.customIntervalDays ?? 30),
    nextBillingDate: subscription.nextBillingDate,
    category: subscription.category,
    reminderDaysBefore: subscription.reminderDaysBefore,
    isActive: subscription.isActive,
    notes: subscription.notes ?? ""
  };
};

export const SubscriptionForm = ({
  mode,
  currency,
  initialValue,
  onSubmit,
  onCancelEdit
}: SubscriptionFormProps) => {
  const [form, setForm] = useState<FormState>(
    initialValue ? fromSubscription(initialValue) : defaultFormState()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (initialValue) {
      setForm(fromSubscription(initialValue));
      return;
    }

    if (mode === "create") {
      setForm(defaultFormState());
    }
  }, [initialValue, mode]);

  const heading = useMemo(() => {
    return mode === "create" ? "Add Subscription" : "Edit Subscription";
  }, [mode]);

  const toggleReminderDay = (day: number) => {
    setForm((current) => {
      const exists = current.reminderDaysBefore.includes(day);
      const next = exists
        ? current.reminderDaysBefore.filter((value) => value !== day)
        : [...current.reminderDaysBefore, day];
      return {
        ...current,
        reminderDaysBefore: next.sort((first, second) => first - second)
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setFormError(null);
    setIsSubmitting(true);

    const parsed = parseSubscriptionForm({
      name: form.name,
      amount: form.amount,
      billingCycle: form.billingCycle,
      customIntervalDays: form.customIntervalDays,
      nextBillingDate: form.nextBillingDate,
      category: form.category,
      reminderDaysBefore: form.reminderDaysBefore,
      isActive: form.isActive,
      notes: form.notes.trim() || undefined
    });

    if (!parsed.success) {
      setIsSubmitting(false);
      const issue = parsed.error.issues[0];
      setFormError(issue?.message ?? "Invalid form input");
      return;
    }

    await onSubmit({
      name: parsed.data.name,
      amountMinor: parsed.data.amountMinor,
      billingCycle: parsed.data.billingCycle,
      customIntervalDays: parsed.data.customIntervalDays,
      nextBillingDate: parsed.data.nextBillingDate,
      category: parsed.data.category,
      reminderDaysBefore: parsed.data.reminderDaysBefore,
      isActive: parsed.data.isActive,
      notes: parsed.data.notes
    });

    if (mode === "create") {
      setForm(defaultFormState());
    }

    setIsSubmitting(false);
  };

  return (
    <Card variant="outlined" aria-labelledby="subscription-form-title">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.25}>
          <Typography id="subscription-form-title" variant="h5">
            {heading}
          </Typography>
          <Button variant="text" color="inherit" onClick={onCancelEdit}>
            {mode === "edit" ? "Cancel" : "Close"}
          </Button>
        </Stack>

        <Stack component="form" spacing={1.5} onSubmit={handleSubmit}>
          <TextField
            id="subscription-name"
            label="Name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Netflix, Figma, Notion..."
            required
          />

          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                id="subscription-amount"
                label={`Amount (${currency})`}
                type="number"
                value={form.amount}
                inputProps={{ min: 0, step: 0.01 }}
                onChange={(event) =>
                  setForm((current) => ({ ...current, amount: event.target.value }))
                }
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                id="subscription-category"
                select
                  label="Category"
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      category: event.target.value as FormState["category"]
                    }))
                  }
                  SelectProps={{ displayEmpty: false }}
                >
                  {CATEGORY_OPTIONS.map((category) => (
                    <MenuItem key={category} value={category}>
                      {categoryLabel(category)}
                    </MenuItem>
                  ))}
              </TextField>
            </Grid>
          </Grid>

          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                id="subscription-billing-cycle"
                select
                  label="Billing cycle"
                  value={form.billingCycle}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      billingCycle: event.target.value as FormState["billingCycle"]
                    }))
                  }
                  SelectProps={{ displayEmpty: false }}
                >
                  {BILLING_CYCLE_OPTIONS.map((cycle) => (
                    <MenuItem key={cycle} value={cycle}>
                      {billingCycleLabel(cycle)}
                    </MenuItem>
                  ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              {form.billingCycle === "custom_days" ? (
                <TextField
                  id="subscription-custom-days"
                  label="Every (days)"
                  type="number"
                  value={form.customIntervalDays}
                  inputProps={{ min: 1, step: 1 }}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, customIntervalDays: event.target.value }))
                  }
                  required
                />
              ) : null}

              <TextField
                id="subscription-next-billing-date"
                sx={form.billingCycle === "custom_days" ? { mt: 1.25 } : undefined}
                label="Next billing date"
                type="date"
                value={form.nextBillingDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, nextBillingDate: event.target.value }))
                }
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
          </Grid>

          <FormControl>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Reminder days before
            </Typography>
            <FormGroup row>
              {REMINDER_DAY_OPTIONS.map((day) => (
                <FormControlLabel
                  key={day}
                  control={
                    <Checkbox
                      checked={form.reminderDaysBefore.includes(day)}
                      onChange={() => toggleReminderDay(day)}
                    />
                  }
                  label={`${day} day${day === 1 ? "" : "s"}`}
                />
              ))}
            </FormGroup>
          </FormControl>

          <TextField
            id="subscription-notes"
            label="Notes"
            multiline
            rows={2}
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Cancellation URL, account email, discount expiry..."
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={form.isActive}
                onChange={(event) =>
                  setForm((current) => ({ ...current, isActive: event.target.checked }))
                }
              />
            }
            label="Active subscription"
          />

          {formError ? <Alert severity="error">{formError}</Alert> : null}

          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : mode === "create" ? "Add Subscription" : "Update Subscription"}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};
