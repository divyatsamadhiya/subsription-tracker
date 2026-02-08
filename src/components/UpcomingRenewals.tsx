import { daysUntil } from "../lib/date";
import { formatCurrencyMinor, formatRelativeDue } from "../lib/format";
import type { Subscription } from "../types";

interface UpcomingRenewalsProps {
  renewals: Subscription[];
  currency: string;
  windowDays: 7 | 30;
  onWindowChange: (window: 7 | 30) => void;
}

export const UpcomingRenewals = ({
  renewals,
  currency,
  windowDays,
  onWindowChange
}: UpcomingRenewalsProps) => {
  return (
    <section className="panel" aria-labelledby="upcoming-renewals-title">
      <div className="panel-head">
        <h2 id="upcoming-renewals-title">Upcoming renewals</h2>
        <div className="tab-row" role="tablist" aria-label="Renewal time window">
          <button
            type="button"
            className={windowDays === 7 ? "tab-btn active" : "tab-btn"}
            onClick={() => onWindowChange(7)}
            role="tab"
            aria-selected={windowDays === 7}
          >
            Next 7 days
          </button>
          <button
            type="button"
            className={windowDays === 30 ? "tab-btn active" : "tab-btn"}
            onClick={() => onWindowChange(30)}
            role="tab"
            aria-selected={windowDays === 30}
          >
            Next 30 days
          </button>
        </div>
      </div>

      {renewals.length === 0 ? (
        <p className="empty-note">No renewals in this window.</p>
      ) : (
        <ul className="renewal-list">
          {renewals.map((subscription) => {
            const dueInDays = Math.max(0, daysUntil(subscription.nextBillingDate));
            const urgencyClass =
              dueInDays === 0 ? "due-now" : dueInDays <= 3 ? "due-soon" : "due-later";

            return (
              <li
                key={`${subscription.id}-${subscription.nextBillingDate}`}
                className={`renewal-item ${urgencyClass}`}
              >
                <div className="renewal-main">
                  <h3>{subscription.name}</h3>
                  <p>{subscription.nextBillingDate}</p>
                </div>

                <div className="renewal-side">
                  <strong>{formatCurrencyMinor(subscription.amountMinor, currency)}</strong>
                  <span className={`due-pill ${urgencyClass}`}>{formatRelativeDue(dueInDays)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
