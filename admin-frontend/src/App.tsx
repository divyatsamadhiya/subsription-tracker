import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@mui/material";
import { ApiError, api } from "./lib/api";
import type {
  AdminOverviewAnalytics,
  AdminUserDetail,
  AdminUserListItem,
  AdminUserListResponse,
  AuthUser
} from "./types";

type DashboardView = "users" | "analytics";
type UserFilter = "active" | "deleted" | "all";
type ActionKind = "delete" | "restore" | "force-logout";

const formatCurrencyMinor = (amountMinor: number, currency: string): string => {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(amountMinor / 100);
};

const retentionLabel = (deletedAt?: string): string => {
  if (!deletedAt) {
    return "";
  }

  const deletedTs = new Date(deletedAt).getTime();
  const expiryTs = deletedTs + 30 * 24 * 60 * 60 * 1000;
  const remaining = Math.ceil((expiryTs - Date.now()) / (24 * 60 * 60 * 1000));

  if (remaining <= 0) {
    return "Retention expired";
  }

  return `${remaining}d to purge`;
};

const App = () => {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [sessionUser, setSessionUser] = useState<AuthUser | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [activeView, setActiveView] = useState<DashboardView>("users");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<UserFilter>("active");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [usersResponse, setUsersResponse] = useState<AdminUserListResponse | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);

  const [analytics, setAnalytics] = useState<AdminOverviewAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: ActionKind;
    target: AdminUserListItem | null;
    reason: string;
    submitting: boolean;
  }>({
    open: false,
    action: "delete",
    target: null,
    reason: "",
    submitting: false
  });

  const isAuthenticatedAdmin = sessionUser?.role === "admin";

  const loadUsers = async (): Promise<void> => {
    if (!sessionUser || sessionUser.role !== "admin") {
      return;
    }

    setUsersLoading(true);
    try {
      const response = await api.listUsers({
        search: search.trim() || undefined,
        status,
        page,
        pageSize
      });
      setUsersResponse(response);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load users.";
      setError(message);
    } finally {
      setUsersLoading(false);
    }
  };

  const loadAnalytics = async (): Promise<void> => {
    if (!sessionUser || sessionUser.role !== "admin") {
      return;
    }

    setAnalyticsLoading(true);
    try {
      const response = await api.getAnalyticsOverview();
      setAnalytics(response);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load analytics.";
      setError(message);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const loadUserDetail = async (userId: string): Promise<void> => {
    try {
      const detail = await api.getUser(userId);
      setSelectedUser(detail);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load user details.";
      setError(message);
    }
  };

  const bootstrap = async (): Promise<void> => {
    setBootstrapping(true);
    setError(null);

    try {
      const session = await api.getAdminSession();

      if (session.user.role !== "admin") {
        setSessionUser(null);
        setAccessDenied(true);
        setUsersResponse(null);
        setAnalytics(null);
        return;
      }

      setAccessDenied(false);
      setSessionUser(session.user);
    } catch (bootstrapError) {
      if (bootstrapError instanceof ApiError) {
        if (bootstrapError.status === 401) {
          setSessionUser(null);
          setAccessDenied(false);
          setUsersResponse(null);
          setAnalytics(null);
          return;
        }

        if (bootstrapError.status === 403) {
          setSessionUser(null);
          setAccessDenied(true);
          return;
        }
      }

      const message =
        bootstrapError instanceof Error ? bootstrapError.message : "Failed to initialize admin app.";
      setError(message);
      setSessionUser(null);
    } finally {
      setBootstrapping(false);
    }
  };

  useEffect(() => {
    void bootstrap();
    // We intentionally bootstrap only once on app mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAuthenticatedAdmin) {
      return;
    }

    void loadUsers();
  }, [isAuthenticatedAdmin, page, status, sessionUser]);

  useEffect(() => {
    if (!isAuthenticatedAdmin) {
      return;
    }

    void loadAnalytics();
  }, [isAuthenticatedAdmin, sessionUser]);

  const loginRequired = !bootstrapping && !isAuthenticatedAdmin && !accessDenied;

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setAuthLoading(true);
    setError(null);

    try {
      await api.login(email, password);
      setEmail("");
      setPassword("");
      await bootstrap();
    } catch (loginError) {
      const message = loginError instanceof Error ? loginError.message : "Login failed.";
      setError(message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await api.logout();
    } finally {
      setSessionUser(null);
      setAccessDenied(false);
      setUsersResponse(null);
      setSelectedUser(null);
      setAnalytics(null);
      setPage(1);
      setSearch("");
    }
  };

  const openActionDialog = (action: ActionKind, target: AdminUserListItem) => {
    setActionDialog({
      open: true,
      action,
      target,
      reason: "",
      submitting: false
    });
  };

  const closeActionDialog = () => {
    setActionDialog((current) => ({ ...current, open: false, reason: "", target: null }));
  };

  const handleActionConfirm = async (): Promise<void> => {
    if (!actionDialog.target) {
      return;
    }

    const reason = actionDialog.reason.trim();
    if (reason.length < 3) {
      setError("Please provide a reason with at least 3 characters.");
      return;
    }

    setActionDialog((current) => ({ ...current, submitting: true }));

    try {
      if (actionDialog.action === "delete") {
        await api.softDeleteUser(actionDialog.target.id, reason);
      } else if (actionDialog.action === "restore") {
        await api.restoreUser(actionDialog.target.id, reason);
      } else {
        await api.forceLogoutUser(actionDialog.target.id, reason);
      }

      closeActionDialog();
      await loadUsers();

      if (selectedUser?.id === actionDialog.target.id) {
        await loadUserDetail(actionDialog.target.id);
      }
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : "Action failed.";
      setError(message);
      setActionDialog((current) => ({ ...current, submitting: false }));
    }
  };

  const totalPages = useMemo(() => {
    const total = usersResponse?.total ?? 0;
    return Math.max(1, Math.ceil(total / pageSize));
  }, [usersResponse?.total]);

  if (bootstrapping) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography color="text.secondary">Loading admin console...</Typography>
        </Stack>
      </Box>
    );
  }

  if (accessDenied) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2 }}>
        <Card sx={{ maxWidth: 520, width: "100%" }}>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h4">Admin access denied</Typography>
              <Typography color="text.secondary">
                This account is signed in but does not have admin permissions.
              </Typography>
              <Button variant="outlined" onClick={handleLogout}>
                Sign out
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (loginRequired) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2 }}>
        <Card sx={{ maxWidth: 480, width: "100%" }}>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="overline" color="text.secondary">
                Pulseboard
              </Typography>
              <Typography variant="h4">Admin login</Typography>
              <Typography color="text.secondary">
                Sign in with an admin account to access user controls and platform analytics.
              </Typography>

              {error ? <Alert severity="error">{error}</Alert> : null}

              <Stack component="form" spacing={1.5} onSubmit={handleLogin}>
                <TextField
                  required
                  type="email"
                  label="Email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <TextField
                  required
                  type="password"
                  label="Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <Button type="submit" variant="contained" disabled={authLoading}>
                  {authLoading ? "Signing in..." : "Sign in"}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      <Stack spacing={2.5}>
        <Card>
          <CardContent>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.5}
              alignItems={{ xs: "flex-start", md: "center" }}
              justifyContent="space-between"
            >
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Pulseboard Operations
                </Typography>
                <Typography variant="h4">Admin Dashboard</Typography>
                <Typography color="text.secondary">
                  Signed in as {sessionUser?.email}
                </Typography>
              </Box>
              <Button variant="outlined" onClick={handleLogout}>
                Sign out
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {error ? <Alert severity="error">{error}</Alert> : null}

        <Card>
          <CardContent>
            <Tabs
              value={activeView}
              onChange={(_event, value: DashboardView) => setActiveView(value)}
              aria-label="Admin views"
            >
              <Tab value="users" label="Users" />
              <Tab value="analytics" label="Analytics" />
            </Tabs>
          </CardContent>
        </Card>

        {activeView === "users" ? (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, lg: 8 }}>
              <Card>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                      <TextField
                        fullWidth
                        label="Search users"
                        placeholder="email, full name, country"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                      />
                      <FormControl sx={{ minWidth: 160 }}>
                        <InputLabel id="status-filter-label">Status</InputLabel>
                        <Select
                          labelId="status-filter-label"
                          value={status}
                          label="Status"
                          onChange={(event) => {
                            setStatus(event.target.value as UserFilter);
                            setPage(1);
                          }}
                        >
                          <MenuItem value="active">Active</MenuItem>
                          <MenuItem value="deleted">Deleted</MenuItem>
                          <MenuItem value="all">All</MenuItem>
                        </Select>
                      </FormControl>
                      <Button
                        variant="contained"
                        onClick={() => {
                          setPage(1);
                          void loadUsers();
                        }}
                      >
                        Apply
                      </Button>
                    </Stack>

                    <Divider />

                    {usersLoading ? (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CircularProgress size={20} />
                        <Typography color="text.secondary">Loading users...</Typography>
                      </Stack>
                    ) : (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>User</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell align="right">Subscriptions</TableCell>
                              <TableCell align="right">Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(usersResponse?.users ?? []).map((user) => (
                              <TableRow
                                hover
                                key={user.id}
                                onClick={() => {
                                  void loadUserDetail(user.id);
                                }}
                                sx={{ cursor: "pointer" }}
                              >
                                <TableCell>
                                  <Stack spacing={0.3}>
                                    <Typography variant="subtitle2">{user.email}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {user.fullName ?? "No name"} · {user.country ?? "No country"}
                                    </Typography>
                                  </Stack>
                                </TableCell>
                                <TableCell>
                                  <Stack direction="row" spacing={0.5} alignItems="center">
                                    <Chip
                                      size="small"
                                      color={user.status === "active" ? "success" : "warning"}
                                      label={user.status}
                                    />
                                    {user.status === "deleted" ? (
                                      <Typography variant="caption" color="text.secondary">
                                        {retentionLabel(user.deletedAt)}
                                      </Typography>
                                    ) : null}
                                  </Stack>
                                </TableCell>
                                <TableCell align="right">
                                  {user.activeSubscriptionCount}/{user.subscriptionCount}
                                </TableCell>
                                <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                    {user.status === "active" ? (
                                      <>
                                        <Button
                                          size="small"
                                          color="warning"
                                          onClick={() => openActionDialog("delete", user)}
                                        >
                                          Delete
                                        </Button>
                                        <Button
                                          size="small"
                                          onClick={() => openActionDialog("force-logout", user)}
                                        >
                                          Force logout
                                        </Button>
                                      </>
                                    ) : (
                                      <Button
                                        size="small"
                                        color="success"
                                        onClick={() => openActionDialog("restore", user)}
                                      >
                                        Restore
                                      </Button>
                                    )}
                                  </Stack>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}

                    <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="text.secondary">
                        {usersResponse?.total ?? 0} users total
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={page <= 1}
                          onClick={() => setPage((current) => Math.max(1, current - 1))}
                        >
                          Prev
                        </Button>
                        <Typography variant="body2" sx={{ px: 1, py: 0.5 }}>
                          {page} / {totalPages}
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={page >= totalPages}
                          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                        >
                          Next
                        </Button>
                      </Stack>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, lg: 4 }}>
              <Card>
                <CardContent>
                  <Stack spacing={1.2}>
                    <Typography variant="h6">User detail</Typography>
                    {!selectedUser ? (
                      <Typography color="text.secondary">Select a user row to inspect details.</Typography>
                    ) : (
                      <>
                        <Typography variant="subtitle2">{selectedUser.email}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedUser.profile.fullName ?? "No name"} · {selectedUser.profile.country ?? "No country"}
                        </Typography>
                        <Chip
                          size="small"
                          color={selectedUser.status === "active" ? "success" : "warning"}
                          label={selectedUser.status}
                          sx={{ width: "fit-content" }}
                        />
                        {selectedUser.deleteReason ? (
                          <Typography variant="body2" color="text.secondary">
                            Delete reason: {selectedUser.deleteReason}
                          </Typography>
                        ) : null}
                        <Divider />
                        <Typography variant="subtitle2">Subscription summary</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Active: {selectedUser.subscriptionSummary.activeSubscriptions} / Total: {" "}
                          {selectedUser.subscriptionSummary.totalSubscriptions}
                        </Typography>
                        <Stack spacing={0.5}>
                          {selectedUser.subscriptionSummary.monthlySpendByCurrency.map((item) => (
                            <Typography key={item.currency} variant="caption" color="text.secondary">
                              {item.currency}: {formatCurrencyMinor(item.amountMinor, item.currency)} monthly
                            </Typography>
                          ))}
                        </Stack>
                      </>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        ) : (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">
                    Active users
                  </Typography>
                  <Typography variant="h3">{analyticsLoading ? "..." : analytics?.users.active ?? 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">
                    Deleted users
                  </Typography>
                  <Typography variant="h3">{analyticsLoading ? "..." : analytics?.users.deleted ?? 0}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="overline" color="text.secondary">
                    New users (30d)
                  </Typography>
                  <Typography variant="h3">
                    {analyticsLoading ? "..." : analytics?.users.newLast30Days ?? 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, lg: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Active subscriptions by category</Typography>
                  <Stack spacing={0.5} sx={{ mt: 1 }}>
                    {analytics
                      ? Object.entries(analytics.subscriptions.totalByCategory).map(([category, count]) => (
                          <Typography key={category} variant="body2" color="text.secondary">
                            {category}: {count}
                          </Typography>
                        ))
                      : null}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, lg: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Estimated monthly spend</Typography>
                  <Stack spacing={0.5} sx={{ mt: 1 }}>
                    {analytics?.monthlySpendByCurrency.map((item) => (
                      <Typography key={item.currency} variant="body2" color="text.secondary">
                        {item.currency}: {formatCurrencyMinor(item.amountMinor, item.currency)}
                      </Typography>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Signup trend (30d)</Typography>
                  <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                    {analytics?.signupTrend.slice(-10).map((point) => (
                      <Chip key={point.date} size="small" label={`${point.date}: ${point.count}`} />
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Stack>

      <Dialog open={actionDialog.open} onClose={closeActionDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {actionDialog.action === "delete"
            ? "Soft-delete user"
            : actionDialog.action === "restore"
              ? "Restore user"
              : "Force logout user"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.2} sx={{ pt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Target: {actionDialog.target?.email}
            </Typography>
            <TextField
              autoFocus
              fullWidth
              label="Reason"
              value={actionDialog.reason}
              onChange={(event) =>
                setActionDialog((current) => ({ ...current, reason: event.target.value }))
              }
              helperText="Reason is required for audit logs"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeActionDialog}>Cancel</Button>
          <Button
            variant="contained"
            disabled={actionDialog.submitting}
            onClick={() => {
              void handleActionConfirm();
            }}
          >
            {actionDialog.submitting ? "Saving..." : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default App;
