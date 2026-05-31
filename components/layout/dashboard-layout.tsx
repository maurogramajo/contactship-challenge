"use client";

import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

interface DashboardLayoutProps {
  children: ReactNode;
  organizationName: string;
  organizationEmail: string;
  hubSpotConnected: boolean;
}

export function DashboardLayout({
  children,
  organizationName,
  organizationEmail,
  hubSpotConnected,
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden lg:ml-0">
        <Header
          organizationName={organizationName}
          organizationEmail={organizationEmail}
          hubSpotConnected={hubSpotConnected}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
