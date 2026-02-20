import { useEffect, useMemo, useRef, useState } from "react";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import { SubscriptionForm } from "./components/SubscriptionForm";
import { StatCards } from "./components/StatCards";
import { SubscriptionGrid } from "./components/SubscriptionGrid";
import { UpcomingRenewals } from "./components/UpcomingRenewals";
import {
  buildAnalyticsSummary,
  buildCategorySpend,
  buildRenewalBuckets,
  buildSpendTrend
} from "./lib/analytics";
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
import type { Subscription, ThemePreference } from "./types";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type AppView = "overview" | "analytics" | "subscriptions" | "profile" | "settings";
type AuthMode = "login" | "register";

const viewTabs: Array<{ id: AppView; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "analytics", label: "Analytics" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "profile", label: "Profile" },
  { id: "settings", label: "Settings & Backup" }
];

const App = () => {
  const {
    hydrated,
    loading,
    error,
    user,
    profile,
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
    updateProfile,
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
  const [registerFullName, setRegisterFullName] = useState("");
  const [registerCountry, setRegisterCountry] = useState("");
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [showRecoveryPanel, setShowRecoveryPanel] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryResetCode, setRecoveryResetCode] = useState("");
  const [recoveryNewPassword, setRecoveryNewPassword] = useState("");
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);
  const [recoveryNotice, setRecoveryNotice] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [profileFullName, setProfileFullName] = useState("");
  const [profileCountry, setProfileCountry] = useState("");
  const [profileTimeZone, setProfileTimeZone] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [showProfileCompletionPrompt, setShowProfileCompletionPrompt] = useState(true);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light");
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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = () => {
      setSystemTheme(mediaQuery.matches ? "dark" : "light");
    };

    syncSystemTheme();
    mediaQuery.addEventListener("change", syncSystemTheme);
    return () => {
      mediaQuery.removeEventListener("change", syncSystemTheme);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setProfileFullName("");
      setProfileCountry("");
      setProfileTimeZone("");
      setProfilePhone("");
      setProfileBio("");
      return;
    }

    setProfileFullName(profile.fullName ?? "");
    setProfileCountry(profile.country ?? "");
    setProfileTimeZone(profile.timeZone ?? "");
    setProfilePhone(profile.phone ?? "");
    setProfileBio(profile.bio ?? "");
    setShowProfileCompletionPrompt(true);
  }, [profile, user]);

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

  const spendTrend = useMemo(() => {
    return buildSpendTrend(subscriptions, { fromIsoDate: todayIsoDate, monthsAhead: 6 });
  }, [subscriptions, todayIsoDate]);

  const categorySpend = useMemo(() => {
    return buildCategorySpend(subscriptions);
  }, [subscriptions]);

  const renewalBuckets = useMemo(() => {
    return buildRenewalBuckets(subscriptions, { fromIsoDate: todayIsoDate, daysAhead: 30 });
  }, [subscriptions, todayIsoDate]);

  const analyticsSummary = useMemo(() => {
    return buildAnalyticsSummary(subscriptions, todayIsoDate);
  }, [subscriptions, todayIsoDate]);

  const resolvedTheme = useMemo(() => {
    if (settings.themePreference === "system") {
      return systemTheme;
    }

    return settings.themePreference;
  }, [settings.themePreference, systemTheme]);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

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
        await register({
          email,
          password,
          fullName: registerFullName,
          country: registerCountry
        });
        setAuthNotice("Account created.");
      } else {
        await login(email, password);
        setAuthNotice("Signed in.");
      }

      setEmail("");
      setPassword("");
      setRegisterFullName("");
      setRegisterCountry("");
    } catch {
      setAuthNotice(authMode === "register" ? "Registration failed." : "Sign-in failed.");
    }
  };

  const handleRequestResetCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRecoveryNotice("");

    try {
      const response = await forgotPassword(recoveryEmail);
      setRecoveryNotice(response.message);
    } catch (requestError) {
      setRecoveryNotice(
        requestError instanceof Error ? requestError.message : "Unable to generate reset code."
      );
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

  const handleThemePreferenceChange = async (value: ThemePreference) => {
    try {
      await updateSettings({ themePreference: value });
      setNotice(
        value === "system"
          ? "Theme follows your system preference."
          : `${value[0].toUpperCase()}${value.slice(1)} theme enabled.`
      );
    } catch {
      // Error banner is managed by store state.
    }
  };

  const handleProfileSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const normalizedFullName = profileFullName.trim();
      const normalizedCountry = profileCountry.trim();
      const normalizedTimeZone = profileTimeZone.trim();
      const normalizedPhone = profilePhone.trim();
      const normalizedBio = profileBio.trim();

      await updateProfile({
        fullName: normalizedFullName,
        country: normalizedCountry,
        timeZone: normalizedTimeZone.length > 0 ? normalizedTimeZone : null,
        phone: normalizedPhone.length > 0 ? normalizedPhone : null,
        bio: normalizedBio.length > 0 ? normalizedBio : null
      });

      setNotice("Profile updated.");
      setShowProfileCompletionPrompt(false);
    } catch {
      // Error banner is managed by store state.
    }
  };

  const shouldShowProfilePrompt =
    user !== null && !user.profileComplete && showProfileCompletionPrompt;

  const todayLabel = useMemo(() => {
    return new Date(todayIsoDate).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }, [todayIsoDate]);

  const activeViewLabel = useMemo(() => {
    return viewTabs.find((tab) => tab.id === activeView)?.label ?? "Overview";
  }, [activeView]);

  if (loading && !hydrated) {
    return (
      <main className="loading-state">
        <p>Preparing your account workspace...</p>
      </main>
    );
  }

  if (!user) {
    const showRecoveryCard = authMode === "login" && showRecoveryPanel;
    const authLayoutClass = showRecoveryCard
      ? "auth-layout with-recovery"
      : authMode === "register"
        ? "auth-layout register-layout"
        : "auth-layout";

    return (
      <main className="auth-shell">
        <div className={authLayoutClass}>
          {authMode === "login" ? (
            <aside className="panel auth-showcase" aria-hidden="true">
              <p className="eyebrow">Finance command center</p>
              <h2>Everything recurring, visualized in one clean workspace.</h2>
              <p>
                Stay ahead of renewals, forecast yearly spending, and keep your account history safe
                with backup and restore controls.
              </p>
              <ul className="showcase-list">
                <li>Live monthly and annual spend metrics</li>
                <li>Upcoming renewal timeline with due-state badges</li>
                <li>Secure profile, settings, and backup management</li>
              </ul>
            </aside>
          ) : (
            <aside className="panel auth-showcase register-showcase" aria-hidden="true">
              <p className="eyebrow">Account setup flow</p>
              <h2>Create your workspace and start tracking within a minute.</h2>
              <p>Set your identity once, then manage subscriptions from a clean dashboard.</p>
              <ol className="showcase-steps">
                <li>
                  <strong>Step 1</strong>
                  <span>Add your basic account details.</span>
                </li>
                <li>
                  <strong>Step 2</strong>
                  <span>Create your first subscription entry.</span>
                </li>
                <li>
                  <strong>Step 3</strong>
                  <span>Enable reminders and backup data.</span>
                </li>
              </ol>
            </aside>
          )}

          <section className="panel auth-panel" aria-labelledby="auth-title">
            <p className="eyebrow">Subscription Tracker</p>
            <h1 id="auth-title">{authMode === "login" ? "Welcome back" : "Create your account"}</h1>
            <p className="topbar-subtitle">
              {authMode === "login"
                ? "Sign in to manage billing, reminders, and backups."
                : "Create an account to start tracking subscriptions with reminders and backups."}
            </p>

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
              {authMode === "register" ? (
                <label>
                  Full name
                  <input
                    type="text"
                    value={registerFullName}
                    onChange={(event) => setRegisterFullName(event.target.value)}
                    autoComplete="name"
                    minLength={2}
                    maxLength={80}
                    required
                  />
                </label>
              ) : null}

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

              {authMode === "register" ? (
                <label>
                  Country
                  <input
                    type="text"
                    value={registerCountry}
                    onChange={(event) => setRegisterCountry(event.target.value)}
                    placeholder="India"
                    autoComplete="country-name"
                    minLength={2}
                    maxLength={80}
                    required
                  />
                </label>
              ) : null}

              <button type="submit" className="primary-btn" disabled={loading}>
                {loading
                  ? "Submitting..."
                  : authMode === "register"
                    ? "Create account"
                    : "Sign in"}
              </button>
            </form>

            {authMode === "login" ? (
              <button
                type="button"
                className="ghost-btn auth-secondary"
                onClick={() => {
                  setShowRecoveryPanel(true);
                  setRecoveryNotice("");
                  setRecoveryEmail((current) => current || email);
                }}
              >
                Forgot password?
              </button>
            ) : null}
          </section>

          {showRecoveryCard ? (
            <section className="panel auth-panel recovery-panel" aria-labelledby="password-reset-title">
              <div className="recovery-card-header">
                <h2 id="password-reset-title">Reset password</h2>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    setShowRecoveryPanel(false);
                    setRecoveryNotice("");
                  }}
                >
                  Back to sign in
                </button>
              </div>

              <p className="tiny-note">Request a code, then set a new password for your account.</p>

              <div className="recovery-card-body">
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
                    {loading ? "Sending..." : "Send reset code"}
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
              </div>

              {recoveryNotice ? <p className="banner">{recoveryNotice}</p> : null}
            </section>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <div className="workspace-layout">
        <aside className="workspace-sidebar panel">
          <div className="sidebar-brand">
            <p className="eyebrow">Subscription Tracker</p>
            <h1>Billing Workspace</h1>
            <p className="tiny-note">Signed in as {user.profile.fullName ?? user.email}</p>
          </div>

          <nav className="sidebar-nav" aria-label="Primary sections">
            {viewTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeView === tab.id ? "sidebar-btn active" : "sidebar-btn"}
                onClick={() => setActiveView(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="sidebar-metrics" aria-label="Workspace highlights">
            <article className="topbar-metric">
              <span>Monthly spend</span>
              <strong>{formatCurrencyMinor(monthlyTotalMinor, settings.defaultCurrency)}</strong>
            </article>
            <article className="topbar-metric">
              <span>Active services</span>
              <strong>{activeSubscriptions.length}</strong>
            </article>
            <article className="topbar-metric">
              <span>Next renewal</span>
              <strong>{renewals[0]?.nextBillingDate ?? "No upcoming dates"}</strong>
            </article>
          </div>

          <button
            type="button"
            className="ghost-btn signout-btn signout-btn-sidebar"
            onClick={() => void handleLogout()}
          >
            Sign out
          </button>
        </aside>

        <section className="workspace-main">
          <header className="workspace-header panel">
            <div className="workspace-copy">
              <p className="eyebrow">Workspace overview</p>
              <h2>{activeViewLabel}</h2>
              <p className="topbar-subtitle">Date: {todayLabel}</p>
            </div>

            <div className="workspace-actions">
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
          </header>

          {error ? <p className="banner error">Error: {error}</p> : null}
          {notice ? <p className="banner">{notice}</p> : null}
          {shouldShowProfilePrompt ? (
            <div className="banner profile-banner" role="status">
              <p>
                Complete your profile details (full name and country) to finish account setup.
              </p>
              <div className="profile-banner-actions">
                <button type="button" className="ghost-btn" onClick={() => setActiveView("profile")}>
                  Complete now
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => setShowProfileCompletionPrompt(false)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          ) : null}

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

                <div className="highlight-kpis">
                  <span>
                    <strong>{subscriptions.length}</strong> total subscriptions
                  </span>
                  <span>
                    <strong>{renewals.length}</strong> renewals in selected window
                  </span>
                </div>

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
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => setActiveView("settings")}
                  >
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

          {activeView === "analytics" ? (
            <AnalyticsDashboard
              spendTrend={spendTrend}
              categorySpend={categorySpend}
              renewalBuckets={renewalBuckets}
              summary={analyticsSummary}
              currency={settings.defaultCurrency}
              onAddSubscription={() => {
                setEditingId(null);
                setActiveView("subscriptions");
              }}
            />
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

          {activeView === "profile" ? (
            <div className="profile-grid">
              <section className="panel" aria-labelledby="profile-title">
                <div className="panel-head">
                  <h2 id="profile-title">Profile details</h2>
                </div>

                <form className="auth-form profile-form" onSubmit={handleProfileSave}>
                  <label>
                    Full name
                    <input
                      type="text"
                      value={profileFullName}
                      onChange={(event) => setProfileFullName(event.target.value)}
                      autoComplete="name"
                      minLength={2}
                      maxLength={80}
                      required
                    />
                  </label>

                  <div className="split">
                    <label>
                      Country
                      <input
                        type="text"
                        value={profileCountry}
                        onChange={(event) => setProfileCountry(event.target.value)}
                        placeholder="India"
                        autoComplete="country-name"
                        minLength={2}
                        maxLength={80}
                        required
                      />
                    </label>

                    <label>
                      Timezone (optional)
                      <input
                        type="text"
                        value={profileTimeZone}
                        onChange={(event) => setProfileTimeZone(event.target.value)}
                        placeholder="America/New_York"
                        autoComplete="off"
                      />
                    </label>
                  </div>

                  <label>
                    Phone (optional)
                    <input
                      type="tel"
                      value={profilePhone}
                      onChange={(event) => setProfilePhone(event.target.value)}
                      placeholder="+14155552671"
                      autoComplete="tel"
                    />
                  </label>

                  <label>
                    Bio (optional)
                    <textarea
                      value={profileBio}
                      onChange={(event) => setProfileBio(event.target.value)}
                      rows={4}
                      maxLength={280}
                      placeholder="Tell us a bit about your billing setup."
                    />
                  </label>

                  <button type="submit" className="primary-btn">
                    Save profile
                  </button>
                </form>
              </section>
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

                  <label>
                    Theme
                    <select
                      value={settings.themePreference}
                      onChange={(event) =>
                        void handleThemePreferenceChange(event.target.value as ThemePreference)
                      }
                    >
                      <option value="system">System</option>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
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
        </section>
      </div>
    </main>
  );
};

export default App;
