import { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Popover,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { createFilterOptions } from "@mui/material/Autocomplete";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { BILLING_CYCLE_OPTIONS, CATEGORY_OPTIONS, type Subscription } from "../types";
import { billingCycleLabel, categoryLabel } from "../lib/format";
import { parseSubscriptionForm } from "../lib/schemas";
import {
  SUBSCRIPTION_SUGGESTIONS,
  type SubscriptionSuggestion
} from "../lib/subscriptionSuggestions";
import type { SubscriptionDraft } from "../store/useAppStore";

const REMINDER_DAY_OPTIONS = [1, 3, 7];
const suggestionFilter = createFilterOptions<SubscriptionSuggestionOption>();
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
] as const;
const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

interface SubscriptionSuggestionOption extends SubscriptionSuggestion {
  isCustom?: boolean;
}

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

const toIsoDate = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const fromIsoDate = (isoDate: string): Date | null => {
  const [yearText, monthText, dayText] = isoDate.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!year || !month || !day) {
    return null;
  }

  const candidate = new Date(year, month - 1, day);
  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return null;
  }

  return candidate;
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [calendarAnchorEl, setCalendarAnchorEl] = useState<HTMLElement | null>(null);
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => {
    return fromIsoDate(defaultFormState().nextBillingDate) ?? new Date();
  });

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
  const isCalendarOpen = Boolean(calendarAnchorEl);
  const selectedDate = useMemo(() => fromIsoDate(form.nextBillingDate), [form.nextBillingDate]);
  const todayIsoDate = useMemo(() => toIsoDate(new Date()), []);

  const selectedSuggestion = useMemo(() => {
    const normalizedName = form.name.trim().toLowerCase();
    if (!normalizedName) {
      return null;
    }

    return (
      SUBSCRIPTION_SUGGESTIONS.find(
        (suggestion) => suggestion.name.toLowerCase() === normalizedName
      ) ?? null
    );
  }, [form.name]);

  const suggestionOptions = useMemo<SubscriptionSuggestionOption[]>(() => {
    return SUBSCRIPTION_SUGGESTIONS;
  }, []);

  const calendarCells = useMemo(() => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<Date | null> = [];

    for (let index = 0; index < firstWeekday; index += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(year, month, day));
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [calendarViewDate]);

  const yearOptions = useMemo(() => {
    const centerYear = calendarViewDate.getFullYear();
    const startYear = centerYear - 15;
    return Array.from({ length: 31 }, (_, index) => startYear + index);
  }, [calendarViewDate]);

  const openCalendar = (event: React.MouseEvent<HTMLElement>) => {
    const baseDate = selectedDate ?? new Date();
    setCalendarViewDate(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));
    setCalendarAnchorEl(event.currentTarget);
  };

  const closeCalendar = () => {
    setCalendarAnchorEl(null);
  };

  const changeCalendarMonth = (offset: number) => {
    setCalendarViewDate(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1)
    );
  };

  const selectCalendarDate = (date: Date) => {
    setForm((current) => ({ ...current, nextBillingDate: toIsoDate(date) }));
    closeCalendar();
  };

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

    setFieldErrors({});
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
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && !errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
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
          <Autocomplete<SubscriptionSuggestionOption, false, false, true>
            freeSolo
            selectOnFocus
            handleHomeEndKeys
            disablePortal
            value={selectedSuggestion ?? form.name}
            inputValue={form.name}
            options={suggestionOptions}
            noOptionsText="No matching apps. Type to add your own."
            onInputChange={(_event, inputValue) =>
              setForm((current) => ({ ...current, name: inputValue }))
            }
            onChange={(_event, value) => {
              if (typeof value === "string") {
                setForm((current) => ({ ...current, name: value }));
                return;
              }

              if (!value) {
                setForm((current) => ({ ...current, name: "" }));
                return;
              }

              setForm((current) => ({
                ...current,
                name: value.name,
                category: value.isCustom ? current.category : value.category
              }));
            }}
            getOptionLabel={(option) => (typeof option === "string" ? option : option.name)}
            isOptionEqualToValue={(option, value) =>
              typeof value !== "string" && option.name === value.name
            }
            filterOptions={(options, params) => {
              const filtered = suggestionFilter(options, params);
              const inputValue = params.inputValue.trim();

              if (!inputValue) {
                return filtered;
              }

              const exists = options.some(
                (option) => option.name.toLowerCase() === inputValue.toLowerCase()
              );

              if (!exists) {
                filtered.unshift({
                  name: inputValue,
                  logoUrl: "",
                  category: "other",
                  isCustom: true
                });
              }

              return filtered;
            }}
            renderOption={(props, option) => {
              const { key, ...optionProps } = props;
              return (
                <Box component="li" key={key} {...optionProps}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar
                      variant="rounded"
                      src={option.isCustom ? undefined : option.logoUrl}
                      sx={{
                        width: 24,
                        height: 24,
                        fontSize: "0.75rem",
                        bgcolor: option.isCustom ? "action.selected" : undefined
                      }}
                      imgProps={{
                        loading: "lazy",
                        referrerPolicy: "no-referrer"
                      }}
                    >
                      {option.name.slice(0, 1).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body2">
                        {option.isCustom ? `Add "${option.name}"` : option.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.isCustom ? "Custom subscription" : categoryLabel(option.category)}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                id="subscription-name"
                label="Company name"
                placeholder="Netflix, Figma, Notion..."
                error={Boolean(fieldErrors.name)}
                helperText={fieldErrors.name ?? "Pick from suggestions (with icons) or type your own."}
                required
              />
            )}
          />

          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                id="subscription-amount"
                label={`Amount (${currency})`}
                type="number"
                value={form.amount}
                inputProps={{ min: 0, step: 0.01 }}
                error={Boolean(fieldErrors.amount)}
                helperText={fieldErrors.amount}
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
                  error={Boolean(fieldErrors.customIntervalDays)}
                  helperText={fieldErrors.customIntervalDays}
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
                placeholder="YYYY-MM-DD"
                value={form.nextBillingDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, nextBillingDate: event.target.value }))
                }
                error={Boolean(fieldErrors.nextBillingDate)}
                helperText={fieldErrors.nextBillingDate ?? "Use calendar to pick year, month, and date."}
                required
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="Open billing date calendar"
                        edge="end"
                        onClick={openCalendar}
                      >
                        <CalendarMonthRoundedIcon />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />

              <Popover
                open={isCalendarOpen}
                anchorEl={calendarAnchorEl}
                onClose={closeCalendar}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                transformOrigin={{ vertical: "top", horizontal: "left" }}
              >
                <Box sx={{ p: 1.25, width: 296 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <IconButton
                      size="small"
                      aria-label="Previous month"
                      onClick={() => changeCalendarMonth(-1)}
                    >
                      <ChevronLeftRoundedIcon fontSize="small" />
                    </IconButton>

                    <Stack direction="row" spacing={0.75}>
                      <TextField
                        select
                        size="small"
                        value={calendarViewDate.getMonth()}
                        onChange={(event) =>
                          setCalendarViewDate(
                            (current) =>
                              new Date(current.getFullYear(), Number(event.target.value), 1)
                          )
                        }
                        sx={{ minWidth: 128 }}
                      >
                        {MONTH_NAMES.map((monthName, index) => (
                          <MenuItem key={monthName} value={index}>
                            {monthName}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        select
                        size="small"
                        value={calendarViewDate.getFullYear()}
                        onChange={(event) =>
                          setCalendarViewDate(
                            (current) =>
                              new Date(Number(event.target.value), current.getMonth(), 1)
                          )
                        }
                        sx={{ minWidth: 92 }}
                      >
                        {yearOptions.map((year) => (
                          <MenuItem key={year} value={year}>
                            {year}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Stack>

                    <IconButton
                      size="small"
                      aria-label="Next month"
                      onClick={() => changeCalendarMonth(1)}
                    >
                      <ChevronRightRoundedIcon fontSize="small" />
                    </IconButton>
                  </Stack>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                      gap: 0.45
                    }}
                  >
                    {WEEKDAY_NAMES.map((weekday) => (
                      <Typography
                        key={weekday}
                        variant="caption"
                        color="text.secondary"
                        sx={{ textAlign: "center", py: 0.35 }}
                      >
                        {weekday}
                      </Typography>
                    ))}

                    {calendarCells.map((cellDate, index) => {
                      if (!cellDate) {
                        return <Box key={`empty-${index}`} />;
                      }

                      const isoDate = toIsoDate(cellDate);
                      const isSelected = form.nextBillingDate === isoDate;
                      const isToday = isoDate === todayIsoDate;

                      return (
                        <Button
                          key={isoDate}
                          size="small"
                          variant={isSelected ? "contained" : "text"}
                          onClick={() => selectCalendarDate(cellDate)}
                          sx={{
                            minWidth: 0,
                            px: 0,
                            py: 0.45,
                            borderRadius: 1.5,
                            border: isToday && !isSelected ? "1px solid" : undefined,
                            borderColor: isToday && !isSelected ? "primary.main" : undefined
                          }}
                        >
                          {cellDate.getDate()}
                        </Button>
                      );
                    })}
                  </Box>
                </Box>
              </Popover>
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

          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : mode === "create" ? "Add Subscription" : "Update Subscription"}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};
