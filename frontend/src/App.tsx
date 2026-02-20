import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import DownloadIcon from "@mui/icons-material/Download";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import HowToRegRoundedIcon from "@mui/icons-material/HowToRegRounded";
import UploadIcon from "@mui/icons-material/Upload";
import InstallDesktopIcon from "@mui/icons-material/InstallDesktop";
import PlaylistAddCheckRoundedIcon from "@mui/icons-material/PlaylistAddCheckRounded";
import SettingsIcon from "@mui/icons-material/Settings";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import { SubscriptionForm } from "./components/SubscriptionForm";
import { StatCards } from "./components/StatCards";
import { SubscriptionGrid } from "./components/SubscriptionGrid";
import { UpcomingRenewals } from "./components/UpcomingRenewals";
import { AuthLayout } from "./components/layout/AuthLayout";
import { WorkspaceLayout } from "./components/layout/WorkspaceLayout";
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
type SnackbarSeverity = "success" | "info" | "warning" | "error";

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: SnackbarSeverity;
  }>({ open: false, message: "", severity: "info" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (message: string, severity: SnackbarSeverity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (error) {
      showFeedback(`Error: ${error}`, "error");
    }
  }, [error]);

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
    if (!user) {
      setProfileFullName("");
      setProfileCountry("");
      setProfileTimeZone("");
      setProfilePhone("");
      setProfileBio("");
      setAuthNotice("");
      setRecoveryNotice("");
      setShowRecoveryPanel(false);
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

  const openCreateSubscriptionDialog = () => {
    setEditingId(null);
    setActiveView("subscriptions");
    setSubscriptionDialogOpen(true);
  };

  const openEditSubscriptionDialog = (id: string) => {
    setEditingId(id);
    setActiveView("subscriptions");
    setSubscriptionDialogOpen(true);
  };

  const closeSubscriptionDialog = () => {
    setSubscriptionDialogOpen(false);
    setEditingId(null);
  };

  const handleFormSubmit = async (
    draft: Parameters<typeof addSubscription>[0]
  ): Promise<void> => {
    try {
      if (editingSubscription) {
        await updateSubscription(editingSubscription.id, draft);
        closeSubscriptionDialog();
        showFeedback("Subscription updated.");
        return;
      }

      await addSubscription(draft);
      setSubscriptionDialogOpen(false);
      showFeedback("Subscription added.");
    } catch {
      // Error feedback is managed by store state.
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    const target = subscriptions.find((subscription) => subscription.id === id);
    if (!target) {
      return;
    }

    try {
      await deleteSubscription(id);
      if (editingId === id) {
        closeSubscriptionDialog();
      }

      showFeedback("Subscription deleted.");
    } catch {
      // Error feedback is managed by store state.
    }
  };

  const handleEnableNotifications = async (enabled: boolean): Promise<void> => {
    try {
      if (enabled) {
        const permission = await requestNotificationPermission();
        if (permission !== "granted") {
          showFeedback("Browser notification permission was not granted.", "warning");
          await updateSettings({ notificationsEnabled: false });
          return;
        }
      }

      await updateSettings({ notificationsEnabled: enabled });
      showFeedback(enabled ? "Browser notifications enabled." : "Browser notifications disabled.");
    } catch {
      // Error feedback is managed by store state.
    }
  };

  const handleExportBackup = async () => {
    try {
      const backup = await exportBackup();
      const text = serializeBackup(backup);
      downloadTextFile(backupFilename(), text, "application/json;charset=utf-8");
      showFeedback("Backup exported.");
    } catch {
      // Error feedback is managed by store state.
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
      showFeedback("Backup imported and applied.");
    } catch (importError) {
      const message = importError instanceof Error ? importError.message : "Import failed.";
      showFeedback(`Import failed: ${message}`, "error");
    }
  };

  const handleExportIcs = (subscription: Subscription) => {
    const ics = generateSubscriptionIcs(subscription);
    const safeName = subscription.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    downloadTextFile(`${safeName || "subscription"}.ics`, ics, "text/calendar;charset=utf-8");
    showFeedback(`Exported ${subscription.name} reminder.`);
  };

  const handleInstallApp = async () => {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === "accepted") {
      showFeedback("App install started.", "info");
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
      setSubscriptionDialogOpen(false);
      setEditingId(null);
      setActiveView("overview");
      showFeedback("Signed out.", "info");
    } catch {
      // Error feedback is managed by store state.
    }
  };

  const handleCurrencyChange = async (value: string) => {
    try {
      await updateSettings({ defaultCurrency: value.toUpperCase() });
      showFeedback("Default currency updated.");
    } catch {
      // Error feedback is managed by store state.
    }
  };

  const handleThemePreferenceChange = async (value: ThemePreference) => {
    try {
      await updateSettings({ themePreference: value });
      showFeedback(
        value === "system"
          ? "Theme follows your system preference."
          : `${value[0].toUpperCase()}${value.slice(1)} theme enabled.`
      );
    } catch {
      // Error feedback is managed by store state.
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

      showFeedback("Profile updated.");
      setShowProfileCompletionPrompt(false);
    } catch {
      // Error feedback is managed by store state.
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
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Typography color="text.secondary">Preparing your account workspace...</Typography>
      </Box>
    );
  }

  if (!user) {
    const showRecoveryCard = authMode === "login" && showRecoveryPanel;
    const showcaseItems =
      authMode === "login"
        ? [
            {
              title: "Live spending intelligence",
              body: "Track monthly and yearly subscription spend in real time.",
              icon: <AutoGraphRoundedIcon fontSize="small" />
            },
            {
              title: "Renewal awareness",
              body: "Never miss upcoming charges with priority reminder windows.",
              icon: <EventAvailableRoundedIcon fontSize="small" />
            },
            {
              title: "Secure account controls",
              body: "Profile, settings, and backups are always tied to your account.",
              icon: <ShieldRoundedIcon fontSize="small" />
            }
          ]
        : [
            {
              title: "Create your profile",
              body: "Add core identity details once to initialize your billing workspace.",
              icon: <HowToRegRoundedIcon fontSize="small" />
            },
            {
              title: "Add first subscription",
              body: "Track amount, billing cycle, and renewal date in one structured form.",
              icon: <PlaylistAddCheckRoundedIcon fontSize="small" />
            },
            {
              title: "Enable continuity",
              body: "Set notifications and keep JSON backups ready for recovery.",
              icon: <CloudUploadRoundedIcon fontSize="small" />
            }
          ];

    return (
      <>
        <AuthLayout
          primary={
            <Card
              variant="outlined"
              sx={{
                height: "100%",
                background:
                  "linear-gradient(160deg, rgba(120, 94, 197, 0.14) 0%, rgba(46, 34, 72, 0.04) 45%, transparent 80%)"
              }}
            >
              <CardContent>
                <Stack spacing={1.75}>
                  <Typography variant="overline" color="text.secondary">
                    {authMode === "login" ? "Finance command center" : "Account setup flow"}
                  </Typography>
                  <Typography variant="h3" sx={{ maxWidth: 620 }}>
                    {authMode === "login"
                      ? "Everything recurring, visualized in one clean workspace."
                      : "Create your workspace and start tracking within a minute."}
                  </Typography>
                  <Typography color="text.secondary" sx={{ maxWidth: 620 }}>
                    {authMode === "login"
                      ? "Stay ahead of renewals, forecast yearly spending, and keep your account history safe with backup and restore controls."
                      : "Set your identity once, then manage subscriptions from a clean dashboard."}
                  </Typography>

                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {(authMode === "login"
                      ? ["Spend insights", "Renewal alerts", "Backup safety"]
                      : ["3-step onboarding", "Guided setup", "Reminder ready"]
                    ).map((item) => (
                      <Chip key={item} size="small" label={item} />
                    ))}
                  </Stack>

                  <Divider flexItem />

                  <Stack spacing={1}>
                    {showcaseItems.map((item) => (
                      <Box
                        key={item.title}
                        sx={{
                          p: 1.25,
                          borderRadius: 2,
                          border: "1px solid",
                          borderColor: "divider",
                          backgroundColor: "background.paper",
                          transition: "all 180ms ease",
                          "&:hover": {
                            borderColor: "primary.main",
                            transform: "translateY(-1px)"
                          }
                        }}
                      >
                        <Stack direction="row" spacing={1.2} alignItems="flex-start">
                          <Box
                            sx={{
                              mt: 0.15,
                              width: 28,
                              height: 28,
                              borderRadius: 1.5,
                              display: "grid",
                              placeItems: "center",
                              color: "primary.main",
                              backgroundColor: "action.hover"
                            }}
                          >
                            {item.icon}
                          </Box>
                          <Box>
                            <Typography variant="subtitle2">
                              {item.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {item.body}
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          }
          panel={
            <Card
              variant="outlined"
              sx={{
                height: "100%",
                backgroundColor: "background.paper"
              }}
            >
              <CardContent>
                <Stack spacing={1.5} sx={{ maxWidth: 760, mx: "auto" }}>
                  <Stack spacing={0.5}>
                    <Typography variant="overline" color="text.secondary">
                      Subscription Tracker
                    </Typography>
                    <Typography id="auth-title" variant="h3">
                      {authMode === "login" ? "Welcome back" : "Create your account"}
                    </Typography>
                    <Typography color="text.secondary">
                      {authMode === "login"
                        ? "Sign in to manage billing, reminders, and backups."
                        : "Create an account to start tracking subscriptions with reminders and backups."}
                    </Typography>
                  </Stack>

                  <Box sx={{ p: 0.5, borderRadius: 2, backgroundColor: "action.hover" }}>
                    <Tabs
                      value={authMode}
                      onChange={(_event, value: AuthMode) => {
                        setAuthMode(value);
                        setAuthNotice("");
                        if (value === "login") {
                          setRecoveryNotice("");
                        }
                        if (value === "register") {
                          setShowRecoveryPanel(false);
                          setRecoveryNotice("");
                        }
                      }}
                      variant="fullWidth"
                      aria-label="Authentication mode"
                      sx={{
                        minHeight: 38,
                        "& .MuiTabs-indicator": {
                          display: "none"
                        },
                        "& .MuiTab-root": {
                          minHeight: 38,
                          borderRadius: 1.5,
                          fontWeight: 700
                        },
                        "& .Mui-selected": {
                          backgroundColor: "background.paper",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.08)"
                        }
                      }}
                    >
                      <Tab value="login" label="Sign in" />
                      <Tab value="register" label="Create account" />
                    </Tabs>
                  </Box>

                  {authNotice ? <Alert severity="info">{authNotice}</Alert> : null}

                  <Stack component="form" spacing={1.5} onSubmit={handleAuthSubmit}>
                    {authMode === "register" ? (
                      <Grid container spacing={1.25}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField
                            label="Full name"
                            value={registerFullName}
                            onChange={(event) => setRegisterFullName(event.target.value)}
                            autoComplete="name"
                            inputProps={{ minLength: 2, maxLength: 80 }}
                            required
                          />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField
                            label="Country"
                            value={registerCountry}
                            onChange={(event) => setRegisterCountry(event.target.value)}
                            placeholder="India"
                            autoComplete="country-name"
                            inputProps={{ minLength: 2, maxLength: 80 }}
                            required
                          />
                        </Grid>
                      </Grid>
                    ) : null}

                    <TextField
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      required
                    />

                    <TextField
                      label="Password"
                      type={showAuthPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete={authMode === "register" ? "new-password" : "current-password"}
                      inputProps={{ minLength: 8 }}
                      required
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              type="button"
                              onClick={() => setShowAuthPassword((value) => !value)}
                              aria-label={showAuthPassword ? "Hide password" : "Show password"}
                              edge="end"
                            >
                              {showAuthPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />

                    <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}>
                      {loading
                        ? "Submitting..."
                        : authMode === "register"
                          ? "Create account"
                          : "Sign in"}
                    </Button>
                  </Stack>

                  {authMode === "login" ? (
                    <Button
                      variant="text"
                      color="inherit"
                      sx={{ alignSelf: "flex-start" }}
                      onClick={() => {
                        setShowRecoveryPanel(true);
                        setRecoveryNotice("");
                        setRecoveryEmail((current) => current || email);
                      }}
                    >
                      Forgot password?
                    </Button>
                  ) : null}
                </Stack>
              </CardContent>
            </Card>
          }
          secondary={
            showRecoveryCard ? (
              <Card
                variant="outlined"
                sx={{
                  height: "100%",
                  backgroundColor: "background.paper"
                }}
              >
                <CardContent>
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography id="password-reset-title" variant="h5">
                        Reset password
                      </Typography>
                      <Button
                        variant="text"
                        color="inherit"
                        onClick={() => {
                          setShowRecoveryPanel(false);
                          setRecoveryNotice("");
                        }}
                      >
                        Back to sign in
                      </Button>
                    </Stack>

                    <Typography variant="body2" color="text.secondary">
                      Request a code, then set a new password for your account.
                    </Typography>

                    <Stack component="form" spacing={1.5} onSubmit={handleRequestResetCode}>
                      <TextField
                        label="Account email"
                        type="email"
                        value={recoveryEmail}
                        onChange={(event) => setRecoveryEmail(event.target.value)}
                        autoComplete="email"
                        required
                      />
                      <Button type="submit" variant="contained" disabled={loading}>
                        {loading ? "Sending..." : "Send reset code"}
                      </Button>
                    </Stack>

                    <Stack component="form" spacing={1.5} onSubmit={handleResetPasswordSubmit}>
                      <TextField
                        label="Reset code"
                        value={recoveryResetCode}
                        onChange={(event) => setRecoveryResetCode(event.target.value)}
                        autoComplete="one-time-code"
                        required
                      />

                      <TextField
                        label="New password"
                        type={showRecoveryPassword ? "text" : "password"}
                        value={recoveryNewPassword}
                        onChange={(event) => setRecoveryNewPassword(event.target.value)}
                        autoComplete="new-password"
                        inputProps={{ minLength: 8 }}
                        required
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                type="button"
                                onClick={() => setShowRecoveryPassword((value) => !value)}
                                aria-label={showRecoveryPassword ? "Hide password" : "Show password"}
                                edge="end"
                              >
                                {showRecoveryPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                              </IconButton>
                            </InputAdornment>
                          )
                        }}
                      />

                      <Button type="submit" variant="contained" disabled={loading}>
                        {loading ? "Updating..." : "Update password"}
                      </Button>
                    </Stack>

                    {recoveryNotice ? <Alert severity="info">{recoveryNotice}</Alert> : null}
                  </Stack>
                </CardContent>
              </Card>
            ) : undefined
          }
        />

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </>
    );
  }

  return (
    <>
      <WorkspaceLayout
        tabs={viewTabs}
        activeTab={activeView}
        onTabChange={(id) => setActiveView(id as AppView)}
        onOpenMobileNav={() => setMobileNavOpen(true)}
        mobileOpen={mobileNavOpen}
        onCloseMobileNav={() => setMobileNavOpen(false)}
        onLogout={() => {
          void handleLogout();
        }}
        userLabel={user.profile.fullName ?? user.email}
        monthlySpend={formatCurrencyMinor(monthlyTotalMinor, settings.defaultCurrency)}
        activeServices={activeSubscriptions.length}
        nextRenewal={renewals[0]?.nextBillingDate ?? "No upcoming dates"}
        headerTitle={activeViewLabel}
        headerSubtitle={`Date: ${todayLabel}`}
        headerActions={
          <>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreateSubscriptionDialog}
            >
              Add subscription
            </Button>
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={() => setActiveView("settings")}
            >
              Open settings
            </Button>
          </>
        }
      >
        {shouldShowProfilePrompt ? (
          <Alert
            severity="warning"
            action={
              <Stack direction="row" spacing={1}>
                <Button color="inherit" size="small" onClick={() => setActiveView("profile")}>
                  Complete now
                </Button>
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => setShowProfileCompletionPrompt(false)}
                >
                  Dismiss
                </Button>
              </Stack>
            }
            sx={{ mb: 2 }}
          >
            Complete your profile details (full name and country) to finish account setup.
          </Alert>
        ) : null}

        {activeView === "overview" ? (
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, xl: 4 }}>
              <Card variant="outlined">
                <CardContent>
                  <Stack spacing={1.5}>
                    <Typography variant="overline" color="text.secondary">
                      Current spending pulse
                    </Typography>
                    <Typography variant="h3">
                      {formatCurrencyMinor(monthlyTotalMinor, settings.defaultCurrency)}
                    </Typography>
                    <Typography color="text.secondary">
                      Monthly baseline with <strong>{activeSubscriptions.length}</strong> active services.
                    </Typography>
                    <Typography color="text.secondary">
                      Yearly projection: {formatCurrencyMinor(yearlyTotalMinor, settings.defaultCurrency)}
                    </Typography>

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip label={`${subscriptions.length} total subscriptions`} />
                      <Chip label={`${renewals.length} renewals in selected window`} />
                    </Stack>

                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, xl: 8 }}>
              <Card variant="outlined">
                <CardContent>
                  <Stack spacing={1.5}>
                    <Typography id="summary-title" variant="h5">
                      Spend summary
                    </Typography>
                    <StatCards
                      monthlyTotalMinor={monthlyTotalMinor}
                      yearlyTotalMinor={yearlyTotalMinor}
                      activeCount={activeSubscriptions.length}
                      currency={settings.defaultCurrency}
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, lg: 7 }}>
              <UpcomingRenewals
                renewals={renewals}
                currency={settings.defaultCurrency}
                windowDays={upcomingWindow}
                onWindowChange={setUpcomingWindow}
              />
            </Grid>

            <Grid size={{ xs: 12, lg: 5 }}>
              <Card variant="outlined">
                <CardContent>
                  <Stack spacing={1.5}>
                    <Typography variant="h5">Reminder center</Typography>
                    {reminderHits.length === 0 ? (
                      <Typography color="text.secondary">No reminder triggers for today.</Typography>
                    ) : (
                      <List disablePadding>
                        {reminderHits.map((hit) => {
                          const normalizedDays = Math.max(
                            0,
                            daysUntil(hit.subscription.nextBillingDate, todayIsoDate)
                          );

                          return (
                            <ListItem
                              key={`${hit.subscription.id}-${hit.subscription.nextBillingDate}-${hit.daysBefore}`}
                              disableGutters
                            >
                              <ListItemText
                                primary={hit.subscription.name}
                                secondary={formatRelativeDue(normalizedDays)}
                              />
                            </ListItem>
                          );
                        })}
                      </List>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        ) : null}

        {activeView === "analytics" ? (
          <AnalyticsDashboard
            spendTrend={spendTrend}
            categorySpend={categorySpend}
            renewalBuckets={renewalBuckets}
            summary={analyticsSummary}
            currency={settings.defaultCurrency}
            onAddSubscription={() => {
              openCreateSubscriptionDialog();
            }}
          />
        ) : null}

        {activeView === "subscriptions" ? (
          <Stack spacing={1.5}>
            <Card variant="outlined">
              <CardContent>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  spacing={1}
                >
                  <Box>
                    <Typography variant="h5">Active subscriptions</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Manage your recurring services with cleaner category filters and consistent cards.
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            <SubscriptionGrid
              subscriptions={subscriptions}
              currency={settings.defaultCurrency}
              onEdit={openEditSubscriptionDialog}
              onDelete={handleDelete}
              onExportIcs={handleExportIcs}
            />

            <Dialog
              open={subscriptionDialogOpen}
              onClose={closeSubscriptionDialog}
              fullWidth
              maxWidth="md"
              PaperProps={{
                sx: {
                  backgroundColor: "transparent",
                  boxShadow: "none",
                  overflow: "visible"
                }
              }}
            >
              <DialogContent sx={{ p: 0 }}>
                <SubscriptionForm
                  mode={editingSubscription ? "edit" : "create"}
                  currency={settings.defaultCurrency}
                  initialValue={editingSubscription}
                  onSubmit={handleFormSubmit}
                  onCancelEdit={closeSubscriptionDialog}
                />
              </DialogContent>
            </Dialog>
          </Stack>
        ) : null}

        {activeView === "profile" ? (
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, lg: 10 }}>
              <Card variant="outlined" aria-labelledby="profile-title">
                <CardContent>
                  <Stack component="form" spacing={1.5} onSubmit={handleProfileSave}>
                    <Typography id="profile-title" variant="h5">
                      Profile details
                    </Typography>

                    <TextField
                      label="Full name"
                      value={profileFullName}
                      onChange={(event) => setProfileFullName(event.target.value)}
                      autoComplete="name"
                      inputProps={{ minLength: 2, maxLength: 80 }}
                      required
                    />

                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="Country"
                          value={profileCountry}
                          onChange={(event) => setProfileCountry(event.target.value)}
                          placeholder="India"
                          autoComplete="country-name"
                          inputProps={{ minLength: 2, maxLength: 80 }}
                          required
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="Timezone (optional)"
                          value={profileTimeZone}
                          onChange={(event) => setProfileTimeZone(event.target.value)}
                          placeholder="America/New_York"
                        />
                      </Grid>
                    </Grid>

                    <TextField
                      label="Phone (optional)"
                      value={profilePhone}
                      onChange={(event) => setProfilePhone(event.target.value)}
                      placeholder="+14155552671"
                      autoComplete="tel"
                    />

                    <TextField
                      id="profile-bio"
                      label="Bio (optional)"
                      value={profileBio}
                      onChange={(event) => setProfileBio(event.target.value)}
                      rows={4}
                      multiline
                      inputProps={{ maxLength: 280 }}
                      placeholder="Tell us a bit about your billing setup."
                    />

                    <Button type="submit" variant="contained">
                      Save profile
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        ) : null}

        {activeView === "settings" ? (
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, lg: 6 }}>
              <Card variant="outlined" aria-labelledby="app-settings-title">
                <CardContent>
                  <Stack spacing={1.5}>
                    <Typography id="app-settings-title" variant="h5">
                      App settings
                    </Typography>

                    <FormControl>
                      <InputLabel id="currency-label">Currency</InputLabel>
                      <Select
                        labelId="currency-label"
                        label="Currency"
                        value={settings.defaultCurrency}
                        onChange={(event) => void handleCurrencyChange(event.target.value)}
                      >
                        <MenuItem value="USD">USD</MenuItem>
                        <MenuItem value="EUR">EUR</MenuItem>
                        <MenuItem value="GBP">GBP</MenuItem>
                        <MenuItem value="INR">INR</MenuItem>
                        <MenuItem value="CAD">CAD</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControl>
                      <InputLabel id="theme-label">Theme</InputLabel>
                      <Select
                        labelId="theme-label"
                        label="Theme"
                        value={settings.themePreference}
                        onChange={(event) =>
                          void handleThemePreferenceChange(event.target.value as ThemePreference)
                        }
                      >
                        <MenuItem value="system">System</MenuItem>
                        <MenuItem value="light">Light</MenuItem>
                        <MenuItem value="dark">Dark</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.notificationsEnabled}
                          disabled={!supportsNotifications()}
                          onChange={(event) => void handleEnableNotifications(event.target.checked)}
                        />
                      }
                      label="Browser reminders"
                    />

                    {installPrompt ? (
                      <Button
                        variant="outlined"
                        startIcon={<InstallDesktopIcon />}
                        onClick={() => void handleInstallApp()}
                      >
                        Install app
                      </Button>
                    ) : null}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, lg: 6 }}>
              <Card variant="outlined" aria-labelledby="data-controls-title">
                <CardContent>
                  <Stack spacing={1.5}>
                    <Typography id="data-controls-title" variant="h5">
                      Backup & restore
                    </Typography>

                    <Button
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      onClick={() => void handleExportBackup()}
                    >
                      Export backup (JSON)
                    </Button>

                    <Button variant="outlined" startIcon={<UploadIcon />} onClick={handleImportClick}>
                      Import backup (JSON)
                    </Button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/json"
                      onChange={(event) => void handleImportFile(event)}
                      hidden
                    />

                    <Typography variant="body2" color="text.secondary">
                      Import replaces your account data with the selected backup file. Keep periodic
                      exports.
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        ) : null}
      </WorkspaceLayout>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default App;
