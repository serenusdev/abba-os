"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { formatOperationalDateTime } from "@/lib/utils";
import { UserProfile } from "@/lib/auth/types";
import { Avatar } from "@/components/ui/avatar";

interface DesktopHeaderProps {
  user: UserProfile;
}

export function DesktopHeader({ user }: DesktopHeaderProps) {
  const pathname = usePathname();
  const [currentDateTime, setCurrentDateTime] = React.useState<string>(
    formatOperationalDateTime()
  );

  React.useEffect(() => {
    // Update live clock every minute
    const interval = setInterval(() => {
      setCurrentDateTime(formatOperationalDateTime());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const getPageTitle = () => {
    if (pathname === "/" || pathname === "/beranda") return "Beranda Santri";
    if (pathname.startsWith("/kehadiran")) return "Presensi Operasional";
    if (pathname.startsWith("/laporan")) return "Laporan Aktivitas Harian";
    if (pathname.startsWith("/review")) return "Antrean Review Laporan";
    if (pathname.startsWith("/tugas")) return "Tugas & Proyek";
    if (pathname.startsWith("/jadwal")) return "Jadwal & Pengumuman";
    if (pathname.startsWith("/resources")) return "Resource Library";
    if (pathname.startsWith("/tim")) return "Direktori Tim & Orang";
    if (pathname.startsWith("/admin/users")) return "Kelola Pengguna IAM";
    if (pathname.startsWith("/admin/audit")) return "Dasbor Analitik & Audit";
    return "Pondok OS";
  };

  return (
    <header className="hidden md:flex h-16 fixed top-0 right-0 left-64 bg-card/85 backdrop-blur-md border-b border-border z-30 px-6 items-center justify-between">
      {/* Page Title & Context */}
      <div>
        <h1 className="font-headline-sm text-headline-sm text-on-surface">
          {getPageTitle()}
        </h1>
      </div>

      {/* Utilities: Server Clock, Sync Status, Notifications */}
      <div className="flex items-center gap-4">
        {/* Live Server Clock & Sync Pill */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-low text-success border border-success/20">
            <span className="material-symbols-outlined text-[15px]">cloud_done</span>
            <span className="font-label-sm text-[11px] font-medium leading-tight">
              Server Sinkron
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-muted-foreground text-[12px] font-mono px-2 py-1 rounded-md bg-surface-container">
            <span className="material-symbols-outlined text-[15px]">schedule</span>
            <span>{currentDateTime}</span>
          </div>
        </div>

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifikasi Operasional"
          className="relative w-10 h-10 flex items-center justify-center rounded-xl text-on-surface-variant hover:text-primary hover:bg-accent/40 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[22px]">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-error ring-2 ring-card" />
        </button>

        {/* User Mini Profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <Avatar
            src={user.avatar_url}
            alt={user.full_name}
            fallback={user.full_name}
            size="md"
          />
          <div className="flex flex-col text-left">
            <span className="font-label-md text-[13px] text-on-surface leading-tight">
              {user.full_name}
            </span>
            <span className="font-body-sm text-[11px] text-muted-foreground leading-tight">
              {user.team_name || "Santri"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

