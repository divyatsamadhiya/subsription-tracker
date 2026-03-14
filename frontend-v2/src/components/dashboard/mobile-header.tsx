"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  LayoutDashboard,
  CreditCard,
  BarChart3,
  Settings,
  User,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useDashboard } from "@/lib/dashboard-context";
import { RenewalAlertsBell } from "@/components/dashboard/top-bar";

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, label: "Overview" },
  { href: "/subscriptions", icon: CreditCard, label: "Subscriptions" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
] as const;

export function MobileHeader() {
  const pathname = usePathname();
  const { user, logout } = useDashboard();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const allPages = [
    ...NAV_ITEMS,
    { href: "/profile", icon: User, label: "Profile" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ] as const;

  const currentPage =
    allPages.find((item) => isActive(item.href))?.label ?? "Dashboard";

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-sm md:hidden">
      <Sheet>
        <SheetTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label="Open menu" />}
        >
          <Menu className="size-4" />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <div className="flex h-14 items-center gap-2.5 px-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary-foreground"
              >
                <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
              </svg>
            </div>
            <span className="font-heading text-base font-semibold">
              Pulseboard
            </span>
          </div>
          <Separator />
          <nav className="space-y-1 p-2">
            {NAV_ITEMS.map(({ href, icon: Icon, label }, i) => (
              <motion.div
                key={href}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.2 }}
              >
                <Link
                  href={href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive(href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
                      isActive(href)
                        ? "border-primary/20 bg-primary/12 text-primary"
                        : "border-border/70 bg-background/60 text-muted-foreground group-hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  {label}
                </Link>
              </motion.div>
            ))}
          </nav>
          <Separator />

          {/* User section with profile/settings links */}
          <div className="p-2 space-y-1">
            <Link
              href="/profile"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive("/profile")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <User className="size-4" />
              Profile
            </Link>
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive("/settings")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Settings className="size-4" />
              Settings
            </Link>
          </div>

          <Separator />
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary overflow-hidden">
                {user?.profile?.avatarUrl ? (
                  <img src={user.profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  user?.profile?.fullName?.[0]?.toUpperCase() ??
                  user?.email[0]?.toUpperCase() ??
                  "?"
                )}
              </div>
              <p className="truncate text-sm font-medium">
                {user?.profile?.fullName ?? user?.email}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={logout}
              aria-label="Sign out"
            >
              <LogOut className="size-3.5" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <motion.h1
        key={currentPage}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className="min-w-0 flex-1 truncate font-heading text-base font-semibold"
      >
        {currentPage}
      </motion.h1>

      <RenewalAlertsBell />
    </header>
  );
}
