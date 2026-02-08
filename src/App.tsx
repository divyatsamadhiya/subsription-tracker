import { useEffect, useMemo, useRef, useState } from "react";
import { SubscriptionForm } from "./components/SubscriptionForm";
import { StatCards } from "./components/StatCards";
import { SubscriptionGrid } from "./components/SubscriptionGrid";
import { UpcomingRenewals } from "./components/UpcomingRenewals";
import { createBackup, backupFilename, parseBackupJson, serializeBackup } from "./lib/backup";
import {
  calculateMonthlyTotalMinor,
  calculateYearlyTotalMinor,
  daysUntil,
  getUpcomingRenewals,
  nowIsoDate
} from "./lib/date";
import { formatRelativeDue } from "./lib/format";
import { downloadTextFile, generateSubscriptionIcs } from "./lib/ics";
import {
  collectReminderHits,
  dispatchBrowserReminder,
  notificationPermission,
  requestNotificationPermission,
  shouldDispatchReminder,
  supportsNotifications
} from "./lib/notifications";
import { useAppStore } from "./store/useAppStore";
import type { Subscription } from "./types";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type AppView = "overview" | "subscriptions" | "settings";

const viewTabs: Array<{ id: AppView; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "settings", label: "Settings & Backup" }
];

const App = () => {
  const {
    hydrated,
    loading,
    error,
    subscriptions,
    settings,
    upcomingWindow,
    setUpcomingWindow,
    hydrate,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    updateSettings,
    importBackup
  } = useAppStore();

  const [activeView, setActiveView] = useState<AppView>("overview");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>("");
  const [todayIsoDate, setTodayIsoDate] = useState(nowIsoDate());
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTodayIsoDate(nowIsoDate());
    }, 60_000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  const editingSubscription = useMemo(() => {
    if (!editingId) {
      return undefined;
    }
    return subscriptions.find((subscription) => subscription.id === editingId);
  }, [editingId, subscriptions]);

  const activeSubscriptions = useMemo(() => {
    return subscriptions.filter((subscription) => subscription.isActive);
  }, [subscriptions]);

  const monthlyTotalMinor = useMemo(() => {
    return calculateMonthlyTotalMinor(subscriptions);
  }, [subscriptions]);

  const yearlyTotalMinor = useMemo(() => {
    return calculateYearlyTotalMinor(subscriptions);
  }, [subscriptions]);

  const renewals = useMemo(() => {
    return getUpcomingRenewals(subscriptions, todayIsoDate, upcomingWindow);
  }, [subscriptions, todayIsoDate, upcomingWindow]);

  const reminderHits = useMemo(() => {
    return collectReminderHits(subscriptions, todayIsoDate);
  }, [subscriptions, todayIsoDate]);

  useEffect(() => {
    if (!settings.notificationsEnabled || notificationPermission() !== "granted") {
      return;
    }

    reminderHits.forEach((hit) => {
      if (shouldDispatchReminder(hit, todayIsoDate)) {
        dispatchBrowserReminder(hit);
      }
    });
  }, [settings.notificationsEnabled, reminderHits, todayIsoDate]);

  const handleFormSubmit = async (
    draft: Parameters<typeof addSubscription>[0]
  ): Promise<void> => {
    if (editingSubscription) {
      await updateSubscription(editingSubscription.id, draft);
      setEditingId(null);
      setNotice("Subscription updated.");
      return;
    }

    await addSubscription(draft);
    setNotice("Subscription added.");
  };

  const handleDelete = async (id: string): Promise<void> => {
    const target = subscriptions.find((subscription) => subscription.id === id);
    if (!target) {
      return;
    }

    const confirmed = window.confirm(`Delete ${target.name}?`);
    if (!confirmed) {
      return;
    }

    await deleteSubscription(id);
    if (editingId === id) {
      setEditingId(null);
    }

    setNotice("Subscription deleted.");
  };

  const handleEnableNotifications = async (enabled: boolean): Promise<void> => {
    if (enabled) {
      const permission = await requestNotificationPermission();
      if (permission !== "granted") {
        setNotice("Browser notification permission was not granted.");
        await updateSettings({ notificationsEnabled: false });
        return;
      }
    }

    await updateSettings({ notificationsEnabled: enabled });
    setNotice(enabled ? "Browser notifications enabled." : "Browser notifications disabled.");
  };

  const handleExportBackup = () => {
    const backup = createBackup(settings, subscriptions);
    const text = serializeBackup(backup);
    downloadTextFile(backupFilename(), text, "application/json;charset=utf-8");
    setNotice("Backup exported.");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const backup = parseBackupJson(text);
      await importBackup(backup);
      setEditingId(null);
      setNotice("Backup imported and applied.");
    } catch (importError) {
      const message = importError instanceof Error ? importError.message : "Import failed.";
      setNotice(`Import failed: ${message}`);
    }
  };

  const handleExportIcs = (subscription: Subscription) => {
    const ics = generateSubscriptionIcs(subscription);
    const safeName = subscription.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    downloadTextFile(`${safeName || "subscription"}.ics`, ics, "text/calendar;charset=utf-8");
    setNotice(`Exported ${subscription.name} reminder.`);
  };

  const handleInstallApp = async () => {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === "accepted") {
      setNotice("App install started.");
      setInstallPrompt(null);
    }
  };

  if (loading && !hydrated) {
    return (
      <main className="loading-state">
        <p>Preparing your local workspace...</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar panel">
        <div className="topbar-copy">
          <p className="eyebrow">Local-first finance toolkit</p>
          <h1>Pulseboard Subscription Tracker</h1>
          <p className="topbar-subtitle">
            One clear section at a time: monitor, manage, and backup without clutter.
          </p>
        </div>

        <nav className="view-nav" aria-label="Primary sections">
          {viewTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeView === tab.id ? "view-btn active" : "view-btn"}
              onClick={() => setActiveView(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {error ? <p className="banner error">Error: {error}</p> : null}
      {notice ? <p className="banner">{notice}</p> : null}

      {activeView === "overview" ? (
        <div className="overview-stack">
          <StatCards
            monthlyTotalMinor={monthlyTotalMinor}
            yearlyTotalMinor={yearlyTotalMinor}
            activeCount={activeSubscriptions.length}
            currency={settings.defaultCurrency}
          />

          {reminderHits.length > 0 ? (
            <section className="panel reminder-panel" aria-label="Today reminders">
              <h2>Reminder center</h2>
              <ul className="reminder-list">
                {reminderHits.map((hit) => {
                  const normalizedDays = Math.max(
                    0,
                    daysUntil(hit.subscription.nextBillingDate, todayIsoDate)
                  );

                  return (
                    <li key={`${hit.subscription.id}-${hit.subscription.nextBillingDate}-${hit.daysBefore}`}>
                      <strong>{hit.subscription.name}</strong> {formatRelativeDue(normalizedDays)}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <UpcomingRenewals
            renewals={renewals}
            currency={settings.defaultCurrency}
            windowDays={upcomingWindow}
            onWindowChange={setUpcomingWindow}
          />

          <section className="panel" aria-labelledby="quick-actions-title">
            <div className="panel-head">
              <h2 id="quick-actions-title">Quick actions</h2>
            </div>
            <div className="data-actions">
              <button
                type="button"
                className="primary-btn"
                onClick={() => {
                  setEditingId(null);
                  setActiveView("subscriptions");
                }}
              >
                Add subscription
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setActiveView("settings")}
              >
                Open settings
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {activeView === "subscriptions" ? (
        <div className="manage-layout">
          <div className="manage-left">
            <SubscriptionForm
              mode={editingSubscription ? "edit" : "create"}
              currency={settings.defaultCurrency}
              initialValue={editingSubscription}
              onSubmit={handleFormSubmit}
              onCancelEdit={() => setEditingId(null)}
            />
          </div>

          <div className="manage-right">
            <SubscriptionGrid
              subscriptions={subscriptions}
              currency={settings.defaultCurrency}
              onEdit={(id) => setEditingId(id)}
              onDelete={handleDelete}
              onExportIcs={handleExportIcs}
            />
          </div>
        </div>
      ) : null}

      {activeView === "settings" ? (
        <div className="settings-stack">
          <section className="panel" aria-labelledby="app-settings-title">
            <div className="panel-head">
              <h2 id="app-settings-title">App settings</h2>
            </div>

            <div className="control-grid">
              <label>
                Currency
                <select
                  value={settings.defaultCurrency}
                  onChange={(event) =>
                    void updateSettings({ defaultCurrency: event.target.value.toUpperCase() })
                  }
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="INR">INR</option>
                  <option value="CAD">CAD</option>
                </select>
              </label>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={settings.notificationsEnabled}
                  disabled={!supportsNotifications()}
                  onChange={(event) => void handleEnableNotifications(event.target.checked)}
                />
                Browser reminders
              </label>
            </div>

            {installPrompt ? (
              <button type="button" className="ghost-btn" onClick={() => void handleInstallApp()}>
                Install app
              </button>
            ) : null}
          </section>

          <section className="panel" aria-labelledby="data-controls-title">
            <div className="panel-head">
              <h2 id="data-controls-title">Data controls</h2>
            </div>

            <div className="data-actions">
              <button type="button" className="ghost-btn" onClick={handleExportBackup}>
                Export backup (JSON)
              </button>
              <button type="button" className="ghost-btn" onClick={handleImportClick}>
                Import backup (JSON)
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                onChange={(event) => void handleImportFile(event)}
                hidden
              />
            </div>

            <p className="tiny-note">
              Import replaces local data with the selected backup file. Keep periodic exports.
            </p>
          </section>
        </div>
      ) : null}
    </main>
  );
};

export default App;
