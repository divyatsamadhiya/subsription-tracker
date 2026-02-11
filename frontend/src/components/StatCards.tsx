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
      hint: "Recurring spend each month",
      tone: "teal"
    },
    {
      label: "Yearly forecast",
      value: formatCurrencyMinor(yearlyTotalMinor, currency),
      hint: "Projected 12-month total",
      tone: "blue"
    },
    {
      label: "Active subscriptions",
      value: String(activeCount),
      hint: "Currently enabled services",
      tone: "amber"
    }
  ] as const;

  return (
    <div className="stats-grid" aria-label="Spending summary">
      {cards.map((card) => (
        <article key={card.label} className={`stat-card tone-${card.tone}`}>
          <p className="stat-kicker">{card.label}</p>
          <strong>{card.value}</strong>
          <p className="stat-hint">{card.hint}</p>
        </article>
      ))}
    </div>
  );
};
