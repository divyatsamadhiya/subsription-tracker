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
      hint: "Current recurring spend",
      meta: "Live",
      tone: "teal"
    },
    {
      label: "Yearly forecast",
      value: formatCurrencyMinor(yearlyTotalMinor, currency),
      hint: "Projected annual outflow",
      meta: "12 months",
      tone: "blue"
    },
    {
      label: "Active subscriptions",
      value: String(activeCount),
      hint: "Services currently enabled",
      meta: "Now",
      tone: "amber"
    }
  ] as const;

  return (
    <div className="stats-grid" aria-label="Spending summary">
      {cards.map((card) => (
        <article key={card.label} className={`stat-card tone-${card.tone}`}>
          <div className="stat-top">
            <p className="stat-kicker">{card.label}</p>
            <span className="stat-meta">{card.meta}</span>
          </div>
          <strong>{card.value}</strong>
          <p className="stat-hint">{card.hint}</p>
        </article>
      ))}
    </div>
  );
};
