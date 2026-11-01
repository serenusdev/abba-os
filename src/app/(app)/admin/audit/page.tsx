"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";

export default function AdminAuditPage() {
  const auditLogs = [
    {
      id: "aud-001",
      actor: "Super Admin",
      action: "IAM_USER_ACTIVATED",
      target: "salman.alfarisi@pondok.id",
      time: "01 Nov 2026, 08:00:12 WIB",
      ip: "103.28.12.44",
      status: "SUCCESS",
    },
    {
      id: "aud-002",
      actor: "Salman Al-Farisi",
      action: "ATTENDANCE_CHECKIN",
      target: "Shift Pagi (Status: Tepat Waktu)",
      time: "01 Nov 2026, 07:48:15 WIB",
      ip: "182.253.110.15",
      status: "SUCCESS",
    },
    {
      id: "aud-003",
      actor: "Ustadz Abdullah",
      action: "REPORT_REVIEW_APPROVED",
      target: "Laporan Harian (Ahmad Dahlan)",
      time: "31 Okt 2026, 21:30:00 WIB",
      ip: "103.28.12.89",
      status: "SUCCESS",
    },
  ];

  return (
    <div className="flex flex-col w-full pb-8 space-y-4 max-w-4xl mx-auto">
      <div className="bg-card rounded-2xl p-4 sm:p-5 shadow-sm border border-border">
        <span className="font-label-sm text-[11px] uppercase tracking-wider text-primary font-semibold">
          Kepatuhan &amp; Pengawasan • PRD-08
        </span>
        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          Dasbor Analitik &amp; Audit Trail
        </h2>
        <p className="font-body-sm text-[13px] text-muted-foreground mt-0.5">
          Jejak audit tidak dapat diubah (append-only) untuk seluruh mutasi data operasional penting
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card p-3.5 rounded-xl border border-border shadow-xs">
          <p className="font-label-sm text-[11px] text-muted-foreground">Tingkat Hadir Tepat</p>
          <p className="font-mono text-[22px] font-bold text-success mt-0.5">94.2%</p>
        </div>
        <div className="bg-card p-3.5 rounded-xl border border-border shadow-xs">
          <p className="font-label-sm text-[11px] text-muted-foreground">Kepatuhan Laporan</p>
          <p className="font-mono text-[22px] font-bold text-primary mt-0.5">91.8%</p>
        </div>
        <div className="bg-card p-3.5 rounded-xl border border-border shadow-xs">
          <p className="font-label-sm text-[11px] text-muted-foreground">Santri Aktif</p>
          <p className="font-mono text-[22px] font-bold text-on-surface mt-0.5">48</p>
        </div>
        <div className="bg-card p-3.5 rounded-xl border border-border shadow-xs">
          <p className="font-label-sm text-[11px] text-muted-foreground">Log 24 Jam</p>
          <p className="font-mono text-[22px] font-bold text-muted-foreground mt-0.5">142</p>
        </div>
      </div>

      {/* Audit Log Table / Cards */}
      <div className="space-y-3 pt-2">
        <h3 className="font-headline-sm text-[17px] text-on-surface">
          Riwayat Audit Terkini (Append-Only)
        </h3>
        <div className="space-y-2">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="bg-card rounded-xl p-3.5 border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface-container font-semibold text-primary">
                    {log.action}
                  </span>
                  <span className="font-body-sm text-[12px] text-muted-foreground">
                    oleh {log.actor}
                  </span>
                </div>
                <p className="font-label-md text-label-md text-on-surface">
                  {log.target}
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  IP: {log.ip} • {log.time}
                </p>
              </div>

              <div className="self-start sm:self-auto">
                <Badge variant="tepat_waktu" className="text-[10px]">
                  {log.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

