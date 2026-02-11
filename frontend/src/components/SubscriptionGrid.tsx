import { formatCurrencyMinor } from "../lib/format";
import type { Subscription } from "../types";

interface SubscriptionGridProps {
  subscriptions: Subscription[];
  currency: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  onExportIcs: (subscription: Subscription) => void;
}

export const SubscriptionGrid = ({
  subscriptions,
  currency,
  onEdit,
  onDelete,
  onExportIcs
}: SubscriptionGridProps) => {
  return (
    <section className="panel" aria-labelledby="subscriptions-title">
      <div className="panel-head">
        <h2 id="subscriptions-title">Subscriptions</h2>
        <span className="badge">{subscriptions.length} items</span>
      </div>

      {subscriptions.length === 0 ? (
        <p className="empty-note">No subscriptions yet. Add your first one to start tracking.</p>
      ) : (
        <div className="subscription-grid">
          {subscriptions.map((subscription) => (
            <article
              key={subscription.id}
              className={subscription.isActive ? "subscription-card" : "subscription-card is-paused"}
            >
              <header>
                <h3>{subscription.name}</h3>
                <span className={subscription.isActive ? "status active" : "status paused"}>
                  {subscription.isActive ? "Active" : "Paused"}
                </span>
              </header>

              <p className="price">{formatCurrencyMinor(subscription.amountMinor, currency)}</p>

              <div className="meta-row">
                <span className="meta-pill">Next {subscription.nextBillingDate}</span>
                <span className="meta-pill">{subscription.billingCycle.replace("_", " ")}</span>
              </div>

              {subscription.notes ? <p className="notes">{subscription.notes}</p> : null}

              <div className="actions">
                <button type="button" className="ghost-btn" onClick={() => onEdit(subscription.id)}>
                  Edit
                </button>
                <button type="button" className="ghost-btn" onClick={() => onExportIcs(subscription)}>
                  Export .ics
                </button>
                <button type="button" className="danger-btn" onClick={() => onDelete(subscription.id)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
