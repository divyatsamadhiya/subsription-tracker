import { useEffect, useMemo, useState } from "react";
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
    <section className="panel panel-form" aria-labelledby="subscription-form-title">
      <div className="panel-head">
        <h2 id="subscription-form-title">{heading}</h2>
        {mode === "edit" ? (
          <button type="button" className="ghost-btn" onClick={onCancelEdit}>
            Cancel
          </button>
        ) : null}
      </div>

      <form className="subscription-form" onSubmit={handleSubmit}>
        <label>
          Name
          <input
            type="text"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Netflix, Figma, Notion..."
            required
          />
        </label>

        <div className="split">
          <label>
            Amount ({currency})
            <input
              type="number"
              value={form.amount}
              min="0"
              step="0.01"
              onChange={(event) =>
                setForm((current) => ({ ...current, amount: event.target.value }))
              }
              required
            />
          </label>

          <label>
            Category
            <select
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  category: event.target.value as FormState["category"]
                }))
              }
            >
              {CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {categoryLabel(category)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="split">
          <label>
            Billing cycle
            <select
              value={form.billingCycle}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  billingCycle: event.target.value as FormState["billingCycle"]
                }))
              }
            >
              {BILLING_CYCLE_OPTIONS.map((cycle) => (
                <option key={cycle} value={cycle}>
                  {billingCycleLabel(cycle)}
                </option>
              ))}
            </select>
          </label>

          {form.billingCycle === "custom_days" ? (
            <label>
              Every (days)
              <input
                type="number"
                min="1"
                step="1"
                value={form.customIntervalDays}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    customIntervalDays: event.target.value
                  }))
                }
                required
              />
            </label>
          ) : (
            <label>
              Next billing date
              <input
                type="date"
                value={form.nextBillingDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, nextBillingDate: event.target.value }))
                }
                required
              />
            </label>
          )}
        </div>

        {form.billingCycle === "custom_days" ? (
          <label>
            Next billing date
            <input
              type="date"
              value={form.nextBillingDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, nextBillingDate: event.target.value }))
              }
              required
            />
          </label>
        ) : null}

        <fieldset className="reminder-group">
          <legend>Reminder days before</legend>
          <div className="chips">
            {REMINDER_DAY_OPTIONS.map((day) => (
              <label key={day} className="chip-toggle">
                <input
                  type="checkbox"
                  checked={form.reminderDaysBefore.includes(day)}
                  onChange={() => toggleReminderDay(day)}
                />
                <span>{day} day{day === 1 ? "" : "s"}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label>
          Notes
          <textarea
            rows={3}
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Cancellation URL, account email, discount expiry..."
          />
        </label>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) =>
              setForm((current) => ({ ...current, isActive: event.target.checked }))
            }
          />
          Active subscription
        </label>

        {formError ? <p className="form-error">{formError}</p> : null}

        <button type="submit" className="primary-btn" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : mode === "create" ? "Add Subscription" : "Update Subscription"}
        </button>
      </form>
    </section>
  );
};
