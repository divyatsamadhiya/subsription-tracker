import type { ReactNode } from "react";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import SubscriptionsRoundedIcon from "@mui/icons-material/SubscriptionsRounded";
import {
  AppBar,
  Box,
  Button,
  Drawer,
  IconButton,
  ListItemIcon,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Toolbar,
  Typography
} from "@mui/material";
import { alpha } from "@mui/material/styles";

interface WorkspaceTab {
  id: string;
  label: string;
}

interface WorkspaceLayoutProps {
  tabs: WorkspaceTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onOpenMobileNav: () => void;
  mobileOpen: boolean;
  onCloseMobileNav: () => void;
  onLogout: () => void;
  userLabel: string;
  monthlySpend: string;
  activeServices: number;
  nextRenewal: string;
  headerTitle: string;
  headerSubtitle: string;
  headerActions: ReactNode;
  children: ReactNode;
}

const drawerWidth = 280;

const tabIcon = (id: string) => {
  switch (id) {
    case "overview":
      return <DashboardRoundedIcon fontSize="small" />;
    case "analytics":
      return <InsightsRoundedIcon fontSize="small" />;
    case "subscriptions":
      return <SubscriptionsRoundedIcon fontSize="small" />;
    case "profile":
      return <PersonRoundedIcon fontSize="small" />;
    case "settings":
      return <SettingsRoundedIcon fontSize="small" />;
    default:
      return <DashboardRoundedIcon fontSize="small" />;
  }
};

export const WorkspaceLayout = ({
  tabs,
  activeTab,
  onTabChange,
  onOpenMobileNav,
  mobileOpen,
  onCloseMobileNav,
  onLogout,
  userLabel,
  monthlySpend,
  activeServices,
  nextRenewal,
  headerTitle,
  headerSubtitle,
  headerActions,
  children
}: WorkspaceLayoutProps) => {
  const navContent = (
    <Stack sx={{ height: "100%", p: 1.5 }} spacing={1.25}>
      <Paper
        variant="outlined"
        sx={{
          p: 1.75,
          borderRadius: "14px",
          borderColor: "divider",
          backgroundColor: "background.paper"
        }}
      >
        <Typography variant="overline" color="text.secondary">
          Subscription Tracker
        </Typography>
        <Typography variant="h4" sx={{ mt: 0.5, mb: 0.25 }}>
          Billing Workspace
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Signed in as {userLabel}
        </Typography>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: "14px", py: 0.75 }}>
        <List disablePadding>
          {tabs.map((tab) => (
            <ListItemButton
              key={tab.id}
              selected={activeTab === tab.id}
              onClick={() => {
                onTabChange(tab.id);
                onCloseMobileNav();
              }}
              sx={{
                mx: 1,
                my: 0.25,
                borderRadius: "10px",
                px: 1,
                py: 0.9,
                "& .MuiListItemIcon-root": {
                  minWidth: 34,
                  color: "text.secondary"
                },
                "&.Mui-selected": {
                  backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.18),
                  border: "1px solid",
                  borderColor: (theme) => alpha(theme.palette.primary.main, 0.35),
                  "& .MuiListItemIcon-root": {
                    color: "primary.main"
                  },
                  "& .MuiListItemText-primary": {
                    fontWeight: 700
                  }
                },
                "&.Mui-selected:hover": {
                  backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.24)
                }
              }}
            >
              <ListItemIcon>{tabIcon(tab.id)}</ListItemIcon>
              <ListItemText primary={tab.label} primaryTypographyProps={{ variant: "subtitle1" }} />
            </ListItemButton>
          ))}
        </List>
      </Paper>

      <Paper variant="outlined" sx={{ p: 1.75, borderRadius: "14px" }}>
        <Stack spacing={1.5}>
          <Typography variant="overline" color="text.secondary">
            Monthly spend
          </Typography>
          <Typography variant="h5">{monthlySpend}</Typography>
          <Typography variant="body2" color="text.secondary">
            Active services: {activeServices}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Next renewal: {nextRenewal}
          </Typography>
        </Stack>
      </Paper>

      <Button size="small" variant="outlined" color="inherit" startIcon={<LogoutIcon />} onClick={onLogout}>
        Sign out
      </Button>
    </Stack>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        color="transparent"
        elevation={0}
        sx={{ display: { md: "none" }, borderBottom: "1px solid", borderColor: "divider" }}
      >
        <Toolbar>
          <IconButton edge="start" onClick={onOpenMobileNav} aria-label="Open navigation">
            <MenuIcon />
          </IconButton>
          <Typography variant="h5" sx={{ ml: 1 }}>
            {headerTitle}
          </Typography>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={onCloseMobileNav}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              borderRight: "1px solid",
              borderColor: "divider"
            }
          }}
        >
          {navContent}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              borderRight: "1px solid",
              borderColor: "divider"
            }
          }}
        >
          {navContent}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 1.5, md: 2 }, mt: { xs: 8, md: 0 } }}>
        <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 }, borderRadius: "14px", mb: 2 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={1.25}
          >
            <Box>
              <Typography variant="overline" color="text.secondary">
                Workspace overview
              </Typography>
              <Typography variant="h5">{headerTitle}</Typography>
              <Typography variant="body2" color="text.secondary">
                {headerSubtitle}
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              {headerActions}
            </Stack>
          </Stack>
        </Paper>

        {children}
      </Box>
    </Box>
  );
};
