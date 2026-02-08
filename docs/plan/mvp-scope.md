# MVP Scope

## In Scope (V1)

1. Add, edit, and delete subscriptions.
2. Track amount, billing cycle, next billing date, category, and notes.
3. Dashboard with monthly and yearly spending totals.
4. Upcoming renewals view (next 7 and 30 days).
5. Optional local reminders:
   - In-app due alerts.
   - Browser notifications when app is active and permission is granted.
   - `.ics` export for reliable external calendar reminders.
6. Single app-wide default currency.
7. Manual JSON export/import backup.
8. PWA install support and offline-first behavior.

## Out of Scope (V1)

1. Login/authentication.
2. Cloud sync/account sync.
3. Payment or bank integrations.
4. Ads, premium tiers, or paid feature gates.
5. Multi-currency conversion.

## V1 Feature Checklist

- [ ] Subscription CRUD
- [ ] Spending totals (monthly/yearly)
- [ ] Upcoming renewal tracking
- [ ] Reminder flows (in-app + browser active-state + `.ics`)
- [ ] Backup import/export (JSON)
- [ ] PWA install + offline support
