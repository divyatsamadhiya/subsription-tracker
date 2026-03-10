"use client";

import { useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardProvider, useDashboard } from "@/lib/dashboard-context";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileHeader } from "@/components/dashboard/mobile-header";
import { Loader2 } from "lucide-react";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { loading, error } = useDashboard();

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="text-center">
          <p className="text-sm text-destructive">{error}</p>
          <a
            href="/login"
            className="mt-2 inline-block text-sm font-medium text-primary hover:text-primary/80"
          >
            Back to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      {/* Mobile header */}
      <MobileHeader />

      {/* Main content */}
      <main className="transition-[margin] duration-200 ease-in-out max-md:!ml-0 md:ml-64"
        style={{ marginLeft: collapsed ? 68 : undefined }}
      >
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <DashboardProvider>
        <DashboardShell>{children}</DashboardShell>
      </DashboardProvider>
    </TooltipProvider>
  );
}
