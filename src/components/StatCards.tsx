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
      label: "Monthly burn",
      value: formatCurrencyMinor(monthlyTotalMinor, currency),
      tone: "teal"
    },
    {
      label: "Yearly projection",
      value: formatCurrencyMinor(yearlyTotalMinor, currency),
      tone: "blue"
    },
    {
      label: "Active subscriptions",
      value: String(activeCount),
      tone: "amber"
    }
  ] as const;

  return (
    <section className="stats-grid" aria-label="Spending summary">
      {cards.map((card, index) => (
        <article
          key={card.label}
          className={`stat-card tone-${card.tone}`}
          style={{ animationDelay: `${80 + index * 70}ms` }}
        >
          <p>{card.label}</p>
          <strong>{card.value}</strong>
        </article>
      ))}
    </section>
  );
};
