import { useEffect, useMemo, useRef, useState } from "react";
import { SubscriptionForm } from "./components/SubscriptionForm";
import { StatCards } from "./components/StatCards";
import { SubscriptionGrid } from "./components/SubscriptionGrid";
import { UpcomingRenewals } from "./components/UpcomingRenewals";
import { backupFilename, parseBackupJson, serializeBackup } from "./lib/backup";
import {
  calculateMonthlyTotalMinor,
  calculateYearlyTotalMinor,
  daysUntil,
  getUpcomingRenewals,
  nowIsoDate
} from "./lib/date";
import { formatCurrencyMinor, formatRelativeDue } from "./lib/format";
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
type AuthMode = "login" | "register";

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
    user,
    subscriptions,
    settings,
    upcomingWindow,
    setUpcomingWindow,
    hydrate,
    register,
    login,
    forgotPassword,
    resetPassword,
    logout,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    updateSettings,
    exportBackup,
    importBackup
  } = useAppStore();

  const [activeView, setActiveView] = useState<AppView>("overview");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>("");
  const [todayIsoDate, setTodayIsoDate] = useState(nowIsoDate());
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [showRecoveryPanel, setShowRecoveryPanel] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryResetCode, setRecoveryResetCode] = useState("");
  const [recoveryNewPassword, setRecoveryNewPassword] = useState("");
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);
  const [recoveryNotice, setRecoveryNotice] = useState("");
  const [recoveryExpiresAt, setRecoveryExpiresAt] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState("");
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
    try {
      if (editingSubscription) {
        await updateSubscription(editingSubscription.id, draft);
        setEditingId(null);
        setNotice("Subscription updated.");
        return;
      }

      await addSubscription(draft);
      setNotice("Subscription added.");
    } catch {
      // Error banner is managed by store state.
    }
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

    try {
      await deleteSubscription(id);
      if (editingId === id) {
        setEditingId(null);
      }

      setNotice("Subscription deleted.");
    } catch {
      // Error banner is managed by store state.
    }
  };

  const handleEnableNotifications = async (enabled: boolean): Promise<void> => {
    try {
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
    } catch {
      // Error banner is managed by store state.
    }
  };

  const handleExportBackup = async () => {
    try {
      const backup = await exportBackup();
      const text = serializeBackup(backup);
      downloadTextFile(backupFilename(), text, "application/json;charset=utf-8");
      setNotice("Backup exported.");
    } catch {
      // Error banner is managed by store state.
    }
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
    const safeName = subscription.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
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

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthNotice("");

    try {
      if (authMode === "register") {
        await register(email, password);
        setAuthNotice("Account created.");
      } else {
        await login(email, password);
        setAuthNotice("Signed in.");
      }

      setEmail("");
      setPassword("");
    } catch {
      setAuthNotice(authMode === "register" ? "Registration failed." : "Sign-in failed.");
    }
  };

  const handleRequestResetCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRecoveryNotice("");
    setRecoveryExpiresAt(null);

    try {
      const response = await forgotPassword(recoveryEmail);
      setRecoveryNotice(response.message);
      setRecoveryResetCode(response.resetToken ?? "");
      setRecoveryExpiresAt(response.expiresAt ?? null);
    } catch {
      setRecoveryNotice("Unable to generate reset code.");
    }
  };

  const handleResetPasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRecoveryNotice("");

    try {
      await resetPassword(recoveryEmail, recoveryResetCode, recoveryNewPassword);
      setRecoveryNotice("Password updated. Sign in with your new password.");
      setPassword("");
      setRecoveryResetCode("");
      setRecoveryNewPassword("");
      setRecoveryExpiresAt(null);
      setShowRecoveryPanel(false);
    } catch {
      setRecoveryNotice("Reset failed. Check the code and try again.");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setEditingId(null);
      setActiveView("overview");
      setNotice("Signed out.");
    } catch {
      // Error banner is managed by store state.
    }
  };

  const handleCurrencyChange = async (value: string) => {
    try {
      await updateSettings({ defaultCurrency: value.toUpperCase() });
      setNotice("Default currency updated.");
    } catch {
      // Error banner is managed by store state.
    }
  };

  if (loading && !hydrated) {
    return (
      <main className="loading-state">
        <p>Preparing your account workspace...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="auth-shell">
        <section className="panel auth-panel" aria-labelledby="auth-title">
          <p className="eyebrow">Subscription Tracker</p>
          <h1 id="auth-title">{authMode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p className="topbar-subtitle">Sign in to manage billing, reminders, and backups.</p>

          {error ? <p className="banner error">Error: {error}</p> : null}
          {authNotice ? <p className="banner">{authNotice}</p> : null}

          <div className="auth-switch" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              className={authMode === "login" ? "tab-btn active" : "tab-btn"}
              role="tab"
              aria-selected={authMode === "login"}
              onClick={() => {
                setAuthMode("login");
                setAuthNotice("");
                setRecoveryNotice("");
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={authMode === "register" ? "tab-btn active" : "tab-btn"}
              role="tab"
              aria-selected={authMode === "register"}
              onClick={() => {
                setAuthMode("register");
                setShowRecoveryPanel(false);
                setRecoveryNotice("");
              }}
            >
              Create account
            </button>
          </div>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label>
              Password
              <div className="password-row">
                <input
                  type={showAuthPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={authMode === "register" ? "new-password" : "current-password"}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowAuthPassword((value) => !value)}
                  aria-label={showAuthPassword ? "Hide password" : "Show password"}
                >
                  {showAuthPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <button type="submit" className="primary-btn" disabled={loading}>
              {loading
                ? "Submitting..."
                : authMode === "register"
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          {authMode === "login" ? (
            <section className="forgot-password-panel" aria-labelledby="forgot-password-title">
              <div className="forgot-password-header">
                <h2 id="forgot-password-title">Forgot password?</h2>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    setShowRecoveryPanel((value) => !value);
                    setRecoveryNotice("");
                    setRecoveryEmail((current) => current || email);
                  }}
                >
                  {showRecoveryPanel ? "Close" : "Reset password"}
                </button>
              </div>

              {showRecoveryPanel ? (
                <div className="forgot-password-body">
                  <form className="auth-form" onSubmit={handleRequestResetCode}>
                    <label>
                      Account email
                      <input
                        type="email"
                        value={recoveryEmail}
                        onChange={(event) => setRecoveryEmail(event.target.value)}
                        autoComplete="email"
                        required
                      />
                    </label>
                    <button type="submit" className="primary-btn" disabled={loading}>
                      {loading ? "Generating..." : "Generate reset code"}
                    </button>
                  </form>

                  <form className="auth-form" onSubmit={handleResetPasswordSubmit}>
                    <label>
                      Reset code
                      <input
                        type="text"
                        value={recoveryResetCode}
                        onChange={(event) => setRecoveryResetCode(event.target.value)}
                        autoComplete="one-time-code"
                        required
                      />
                    </label>

                    <label>
                      New password
                      <div className="password-row">
                        <input
                          type={showRecoveryPassword ? "text" : "password"}
                          value={recoveryNewPassword}
                          onChange={(event) => setRecoveryNewPassword(event.target.value)}
                          autoComplete="new-password"
                          minLength={8}
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => setShowRecoveryPassword((value) => !value)}
                          aria-label={showRecoveryPassword ? "Hide password" : "Show password"}
                        >
                          {showRecoveryPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                    </label>

                    <button type="submit" className="primary-btn" disabled={loading}>
                      {loading ? "Updating..." : "Update password"}
                    </button>
                  </form>

                  {recoveryNotice ? <p className="banner">{recoveryNotice}</p> : null}
                  {recoveryExpiresAt ? (
                    <p className="auth-footnote">
                      Reset code expires at {new Date(recoveryExpiresAt).toLocaleString()}.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}

          <p className="auth-footnote">
            Your data is tied to your account and stored in your backend database.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar panel">
        <div className="topbar-copy">
          <p className="eyebrow">Subscription Tracker</p>
          <h1>Track recurring costs in one place</h1>
          <p className="topbar-subtitle">Manage subscriptions, settings, reminders, and backups.</p>
          <p className="signed-in">Signed in as {user.email}</p>
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
          <button type="button" className="ghost-btn" onClick={() => void handleLogout()}>
            Sign out
          </button>
        </nav>
      </header>

      {error ? <p className="banner error">Error: {error}</p> : null}
      {notice ? <p className="banner">{notice}</p> : null}

      {activeView === "overview" ? (
        <div className="overview-grid">
          <section className="panel highlight-card" aria-labelledby="focus-title">
            <p className="highlight-label">Current spending pulse</p>
            <h2 id="focus-title">{formatCurrencyMinor(monthlyTotalMinor, settings.defaultCurrency)}</h2>
            <p>
              Monthly baseline with <strong>{activeSubscriptions.length}</strong> active services.
            </p>
            <p className="highlight-muted">
              Yearly projection: {formatCurrencyMinor(yearlyTotalMinor, settings.defaultCurrency)}
            </p>

            <div className="highlight-actions">
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
              <button type="button" className="ghost-btn" onClick={() => setActiveView("settings")}>
                Open settings
              </button>
            </div>
          </section>

          <section className="panel stats-shell" aria-labelledby="summary-title">
            <div className="panel-head">
              <h2 id="summary-title">Spend summary</h2>
            </div>
            <StatCards
              monthlyTotalMinor={monthlyTotalMinor}
              yearlyTotalMinor={yearlyTotalMinor}
              activeCount={activeSubscriptions.length}
              currency={settings.defaultCurrency}
            />
          </section>

          <div className="renewals-shell">
            <UpcomingRenewals
              renewals={renewals}
              currency={settings.defaultCurrency}
              windowDays={upcomingWindow}
              onWindowChange={setUpcomingWindow}
            />
          </div>

          <section className="panel reminder-panel" aria-label="Today reminders">
            <div className="panel-head">
              <h2>Reminder center</h2>
            </div>

            {reminderHits.length === 0 ? (
              <p className="empty-note">No reminder triggers for today.</p>
            ) : (
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
            )}
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
        <div className="settings-grid">
          <section className="panel" aria-labelledby="app-settings-title">
            <div className="panel-head">
              <h2 id="app-settings-title">App settings</h2>
            </div>

            <div className="control-grid">
              <label>
                Currency
                <select
                  value={settings.defaultCurrency}
                  onChange={(event) => void handleCurrencyChange(event.target.value)}
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
              <h2 id="data-controls-title">Backup & restore</h2>
            </div>

            <div className="data-actions">
              <button type="button" className="ghost-btn" onClick={() => void handleExportBackup()}>
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
              Import replaces your account data with the selected backup file. Keep periodic exports.
            </p>
          </section>
        </div>
      ) : null}
    </main>
  );
};

export default App;
