import * as React from "react";
import { MobileHeader } from "./mobile-header";
import { MobileNav } from "./mobile-nav";
import { DesktopSidebar } from "./desktop-sidebar";
import { DesktopHeader } from "./desktop-header";
import { UserProfile } from "@/lib/auth/types";

interface AppShellProps {
  children: React.ReactNode;
  user: UserProfile;
}

export function AppShell({ children, user }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-on-surface antialiased flex flex-col">
      {/* Mobile Header & Bottom Navigation */}
      <MobileHeader user={user} />
      <MobileNav user={user} />

      {/* Desktop Persistent Sidebar & Header */}
      <DesktopSidebar user={user} />
      <DesktopHeader user={user} />

      {/* Main Content Area */}
      <main className="flex-1 w-full pt-16 pb-24 md:pb-8 md:pl-64 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 md:py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
