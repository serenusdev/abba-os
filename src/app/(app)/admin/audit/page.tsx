"use client";

import * as React from "react";
import {
  ACTIVE_POLICY_SETTING,
  INITIAL_ATTENDANCE_METRIC,
  INITIAL_AUDIT_LOGS,
  INITIAL_REPORT_METRIC,
  INITIAL_TASK_METRIC,
} from "@/modules/analytics/data";
import {
  AnalyticsPeriodOption,
  AuditLogItem,
} from "@/modules/analytics/types";
import {
  exportAuditedDataAction,
  queryAuditLogsAction,
} from "@/modules/analytics/actions";

export default function AdminAuditPage() {
  const [period, setPeriod] = React.useState<AnalyticsPeriodOption>("this_week");
  const [scope, setScope] = React.useState("Semua Tim (Organisasi)");
  const [auditLogs, setAuditLogs] = React.useState<AuditLogItem[]>(INITIAL_AUDIT_LOGS);
  const [searchLogQuery, setSearchLogQuery] = React.useState("");
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // Modals state
  const [isExportDialogOpen, setIsExportDialogOpen] = React.useState(false);
  const [isDrilldownOpen, setIsDrilldownOpen] = React.useState(false);
  const [exportFormat, setExportFormat] = React.useState<"csv" | "pdf">("csv");
  const [exportCategory, setExportCategory] = React.useState("presensi_laporan");
  const [isExporting, setIsExporting] = React.useState(false);

  // Handle Log search
  const handleSearchLogs = async (q: string) => {
    setSearchLogQuery(q);
    const res = await queryAuditLogsAction(q);
    if (res.success) {
      setAuditLogs(res.logs);
    }
  };

  // Handle Export submission
  const handleExecuteExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsExporting(true);
    try {
      const res = await exportAuditedDataAction(
        exportFormat,
        exportCategory,
        "Super Admin"
      );
      if (res.success) {
        setToastMessage(res.message);
        setIsExportDialogOpen(false);
      }
    } catch {
      setToastMessage("Terjadi kesalahan saat memproses ekspor data.");
    } finally {
      setIsExporting(false);
      setTimeout(() => setToastMessage(null), 4500);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 pb-24">
      {/* Toast Alert Notice */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-surface-container text-primary border border-border flex items-center justify-between text-xs sm:text-sm shadow-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Sub-header & Meta Section */}
      <div className="flex flex-col gap-1 pt-1">
        <div className="flex items-center justify-between">
          <span className="font-code-md text-xs text-primary font-medium tracking-wider uppercase px-2.5 py-0.5 bg-accent rounded-lg">
            PRD-08 • ANALYTICS &amp; ADMIN
          </span>
          <span className="inline-flex items-center gap-1.5 font-label-sm text-xs text-success bg-surface-container-low px-2.5 py-0.5 rounded-full font-medium">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
            Audit Hash Valid
          </span>
        </div>
        <h1 className="font-headline-lg-mobile text-headline-sm sm:text-headline-md text-on-surface tracking-tight font-bold mt-1">
          Dasbor Operasional &amp; Audit
        </h1>
        <p className="font-body-sm text-xs sm:text-sm text-muted-foreground">
          Pemantauan kepatuhan terverifikasi dan jejak audit append-only sistem pondok.
        </p>
      </div>

      {/* Filter & Scope Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 sm:p-4 rounded-xl border border-border shadow-xs">
        {/* Time Period Tabs */}
        <div className="inline-flex p-1 bg-muted rounded-lg gap-1 max-w-md">
          <button
            type="button"
            onClick={() => setPeriod("this_week")}
            className={`flex-1 py-1.5 px-3 text-center rounded font-label-sm text-xs transition-all ${
              period === "this_week"
                ? "bg-card text-primary shadow-xs font-semibold"
                : "text-muted-foreground hover:text-on-surface"
            }`}
          >
            Pekan Ini
          </button>
          <button
            type="button"
            onClick={() => setPeriod("this_month")}
            className={`flex-1 py-1.5 px-3 text-center rounded font-label-sm text-xs transition-all ${
              period === "this_month"
                ? "bg-card text-primary shadow-xs font-semibold"
                : "text-muted-foreground hover:text-on-surface"
            }`}
          >
            Bulan Ini (Nov)
          </button>
          <button
            type="button"
            onClick={() => setPeriod("q4")}
            className={`flex-1 py-1.5 px-3 text-center rounded font-label-sm text-xs transition-all ${
              period === "q4"
                ? "bg-card text-primary shadow-xs font-semibold"
                : "text-muted-foreground hover:text-on-surface"
            }`}
          >
            Kuartal IV
          </button>
        </div>

        {/* Scope Selector */}
        <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <span className="material-symbols-outlined text-[18px] text-primary">
              corporate_fare
            </span>
            <span className="font-label-sm">Cakupan Unit:</span>
          </div>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="font-label-sm text-xs text-primary font-semibold py-1 px-2.5 rounded-lg bg-surface-container border border-border focus:outline-none"
          >
            <option value="Semua Tim (Organisasi)">Semua Tim (Organisasi)</option>
            <option value="Sentra Digital">Sentra Digital</option>
            <option value="Tim Media & Konten">Tim Media &amp; Konten</option>
            <option value="Halaqah Tahfidz">Halaqah Tahfidz</option>
          </select>
        </div>
      </div>

      {/* Main Responsive Grid Layout (Desktop 2-Column, Mobile Stack) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 3 Core Metrics & Guidance Banner (col-span-7) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Metric 1: Kehadiran / Absensi */}
          <div className="bg-card rounded-xl p-4 sm:p-5 shadow-xs border border-border flex flex-col gap-3.5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[22px]">
                    how_to_reg
                  </span>
                </div>
                <div>
                  <span className="font-label-sm text-xs text-muted-foreground uppercase tracking-wider block">
                    Absensi Santri Hari Ini
                  </span>
                  <span className="font-headline-sm text-sm sm:text-base font-semibold text-on-surface">
                    Tingkat Check-in
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-code-md text-xl sm:text-2xl text-primary font-bold leading-none">
                  {INITIAL_ATTENDANCE_METRIC.rate}%
                </div>
                <span className="font-body-sm text-xs text-muted-foreground">
                  {INITIAL_ATTENDANCE_METRIC.checkedInCount} dari{" "}
                  {INITIAL_ATTENDANCE_METRIC.totalPopulation} Santri
                </span>
              </div>
            </div>

            {/* Progress Bar Segments */}
            <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden flex">
              <div
                className="bg-primary h-full transition-all"
                style={{ width: `${INITIAL_ATTENDANCE_METRIC.onTimePercent}%` }}
                title="Tepat Waktu"
              ></div>
              <div
                className="bg-warning h-full transition-all"
                style={{ width: `${INITIAL_ATTENDANCE_METRIC.gracePercent}%` }}
                title="Toleransi"
              ></div>
              <div
                className="bg-error h-full transition-all"
                style={{ width: `${INITIAL_ATTENDANCE_METRIC.unrecordedPercent}%` }}
                title="Belum Check-in"
              ></div>
            </div>

            {/* Detailed Badges */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="bg-surface-container-low p-2 rounded-lg flex flex-col border border-border/40">
                <span className="font-label-sm text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>{" "}
                  Tepat Waktu
                </span>
                <span className="font-code-md text-base text-primary font-semibold mt-0.5">
                  {INITIAL_ATTENDANCE_METRIC.onTimeCount}
                </span>
              </div>
              <div className="bg-surface-container-low p-2 rounded-lg flex flex-col border border-border/40">
                <span className="font-label-sm text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-warning inline-block"></span>{" "}
                  Toleransi
                </span>
                <span className="font-code-md text-base text-on-surface font-semibold mt-0.5">
                  {INITIAL_ATTENDANCE_METRIC.graceCount}
                </span>
              </div>
              <div className="bg-surface-container-low p-2 rounded-lg flex flex-col border border-border/40">
                <span className="font-label-sm text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-error inline-block"></span>{" "}
                  Belum Hadir
                </span>
                <span className="font-code-md text-base text-error font-semibold mt-0.5">
                  {INITIAL_ATTENDANCE_METRIC.unrecordedCount}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsDrilldownOpen(true)}
              className="w-full mt-1 py-2 px-3 rounded-lg bg-surface-container-high hover:bg-surface-dim text-primary font-label-sm text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <span>Rincian Record Presensi</span>
              <span className="material-symbols-outlined text-[16px]">
                arrow_forward
              </span>
            </button>
          </div>

          {/* Metric 2: Kepatuhan Laporan Harian */}
          <div className="bg-card rounded-xl p-4 sm:p-5 shadow-xs border border-border flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center text-accent-foreground shrink-0">
                  <span className="material-symbols-outlined text-[22px]">
                    assignment_turned_in
                  </span>
                </div>
                <div>
                  <span className="font-label-sm text-xs text-muted-foreground uppercase tracking-wider block">
                    Laporan Mutaba&apos;ah &amp; Kerja
                  </span>
                  <span className="font-headline-sm text-sm sm:text-base font-semibold text-on-surface">
                    Kepatuhan Harian
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-code-md text-xl sm:text-2xl text-primary font-bold leading-none">
                  {INITIAL_REPORT_METRIC.rate}%
                </div>
                <span className="font-body-sm text-xs text-muted-foreground">
                  {INITIAL_REPORT_METRIC.deadlineStr}
                </span>
              </div>
            </div>

            {/* Mini Visual Strip */}
            <div className="flex items-center gap-2 bg-surface-container-low p-2.5 rounded-lg border border-border/40">
              <div className="flex-1 flex flex-col">
                <span className="font-label-sm text-[11px] text-muted-foreground">
                  Rekap Pelaporan
                </span>
                <div className="flex items-baseline gap-2 mt-0.5 text-xs">
                  <span className="font-code-md text-primary font-semibold">
                    {INITIAL_REPORT_METRIC.onTimeCount} Tepat
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="font-code-md text-warning font-semibold">
                    {INITIAL_REPORT_METRIC.lateCount} Terlambat
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="font-code-md text-error font-semibold">
                    {INITIAL_REPORT_METRIC.unsubmittedCount} Nihil
                  </span>
                </div>
              </div>
              <div className="w-px h-8 bg-border"></div>
              <div className="flex flex-col text-right pl-2">
                <span className="font-label-sm text-[11px] text-muted-foreground">
                  Backlog Tinjauan
                </span>
                <div className="flex items-center justify-end gap-1 mt-0.5 text-xs">
                  <span className="font-code-md font-semibold text-tertiary">
                    {INITIAL_REPORT_METRIC.reviewBacklogCount} Berkas
                  </span>
                  <span className="text-muted-foreground text-[10px]">
                    (~{INITIAL_REPORT_METRIC.reviewBacklogHoursEst}j)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Metric 3: Progres Tugas & Sprint Operasional */}
          <div className="bg-card rounded-xl p-4 sm:p-5 shadow-xs border border-border flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[22px]">task_alt</span>
                </div>
                <div>
                  <span className="font-label-sm text-xs text-muted-foreground uppercase tracking-wider block">
                    Sprint Mingguan Tim
                  </span>
                  <span className="font-headline-sm text-sm sm:text-base font-semibold text-on-surface">
                    Penyelesaian Tugas
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-code-md text-xl sm:text-2xl text-primary font-bold leading-none">
                  {INITIAL_TASK_METRIC.completionRate}%
                </div>
                <span className="font-body-sm text-xs text-muted-foreground">
                  {INITIAL_TASK_METRIC.completedCount} dari{" "}
                  {INITIAL_TASK_METRIC.totalCount} Tugas
                </span>
              </div>
            </div>

            {/* Alert Bar for Overdue */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-error-container/60 text-on-error-container text-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-destructive">
                  warning
                </span>
                <span className="font-label-sm">
                  {INITIAL_TASK_METRIC.overdueCount} Tugas melewati tenggat waktu (Overdue)
                </span>
              </div>
              <a
                href="/tugas"
                className="font-code-md underline font-semibold cursor-pointer hover:text-destructive"
              >
                Periksa
              </a>
            </div>
          </div>

          {/* Infobox Prinsip Amanah BR-ADM-04 */}
          <div className="bg-surface-container-high/60 rounded-xl p-4 flex items-start gap-3 border border-border/40">
            <span className="material-symbols-outlined text-primary text-[22px] shrink-0 mt-0.5">
              verified_user
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="font-label-sm text-xs font-semibold text-primary">
                Prinsip Amanah BR-ADM-04
              </span>
              <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
                Metrik murni untuk pemantauan operasional dan tindak lanjut
                pendampingan santri, bukan untuk pemeringkatan atau penghakiman skor
                individu.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Kebijakan Aktif, Jejak Audit Explorer, Actions (col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Versi Kebijakan Operasional Aktif (BR-ADM-05) */}
          <div className="bg-card rounded-xl p-4 sm:p-5 shadow-xs border border-border flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  rule_folder
                </span>
                <span className="font-headline-sm text-sm font-semibold text-on-surface">
                  Kebijakan Operasional Aktif
                </span>
              </div>
              <span className="inline-flex items-center gap-1 font-label-sm text-[11px] text-primary bg-accent px-2 py-0.5 rounded-full font-semibold">
                <span className="material-symbols-outlined text-[13px]">lock</span>
                Terkonfirmasi &amp; Terkunci
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex flex-col">
                <span className="font-body-sm text-muted-foreground">ID Kebijakan</span>
                <span className="font-code-md text-on-surface font-semibold text-sm">
                  {ACTIVE_POLICY_SETTING.code}
                </span>
                <span className="font-body-sm text-[11px] text-muted-foreground mt-0.5">
                  {ACTIVE_POLICY_SETTING.effectiveFromStr}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-body-sm text-muted-foreground">
                  Parameter Kehadiran
                </span>
                <span className="font-code-md text-on-surface text-sm">
                  {ACTIVE_POLICY_SETTING.attendanceCutoffStr}
                </span>
                <span className="font-body-sm text-[11px] text-muted-foreground mt-0.5">
                  {ACTIVE_POLICY_SETTING.attendanceGraceStr}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Batas Pelaporan Harian:</span>
              <span className="font-code-md font-semibold text-primary">
                {ACTIVE_POLICY_SETTING.reportDeadlineStr}
              </span>
            </div>
          </div>

          {/* Append-Only Audit Log List (PRD-08 §7) */}
          <div className="bg-card rounded-xl p-4 sm:p-5 shadow-xs border border-border flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  history_edu
                </span>
                <span className="font-headline-sm text-sm font-semibold text-on-surface">
                  Jejak Audit Terbaru
                </span>
              </div>
              <span className="font-code-md text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded font-medium">
                Append-Only
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-success font-label-sm text-[11px] pb-1">
              <span className="material-symbols-outlined text-[15px]">
                enhanced_encryption
              </span>
              <span>Hash Chaining Valid • Supabase Cryptographic Logs</span>
            </div>

            {/* Search Audit Logs input */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-muted-foreground text-[16px]">
                search
              </span>
              <input
                type="text"
                value={searchLogQuery}
                onChange={(e) => handleSearchLogs(e.target.value)}
                placeholder="Cari event atau target log..."
                className="w-full h-8 pl-8 pr-2.5 rounded-lg bg-surface-container-low border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Entry Timeline */}
            <div className="flex flex-col space-y-3 pt-1">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col gap-1.5 p-3 rounded-lg bg-surface-container-low border border-border/40 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-code-md text-xs text-primary font-semibold break-all">
                      {log.eventName}
                    </span>
                    <span className="font-code-md text-[10px] text-muted-foreground shrink-0">
                      {log.timeAgo}
                    </span>
                  </div>
                  <div className="text-on-surface-variant">
                    Oleh{" "}
                    <strong className="text-on-surface font-semibold">
                      {log.actorName}
                    </strong>{" "}
                    • Target:{" "}
                    <span className="font-code-md text-primary">
                      {log.targetLabel}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground bg-card p-2 rounded border border-border/60">
                    <span className="font-medium text-on-surface">Aksi:</span>{" "}
                    {log.actionDetail}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Operational Bottom Actions */}
          <div className="flex flex-col gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setIsExportDialogOpen(true)}
              className="w-full h-11 bg-primary hover:bg-primary-container text-on-primary rounded-xl font-label-md text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Ekspor Rekap Beraudit (CSV / PDF)</span>
            </button>

            <button
              type="button"
              onClick={() => handleSearchLogs("")}
              className="w-full h-11 bg-secondary-container hover:bg-secondary-fixed text-on-secondary-fixed font-label-md text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">
                manage_search
              </span>
              <span>Reset &amp; Muat Ulang Log Explorer</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Dialog: Drill-down Record Presensi */}
      {isDrilldownOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-card rounded-2xl w-full max-w-lg p-5 shadow-xl border border-border space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-headline-sm text-base text-on-surface font-semibold">
                Rincian Presensi Hari Ini (Drill-down BR-ADM-01)
              </h3>
              <button
                type="button"
                onClick={() => setIsDrilldownOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-lg bg-surface-container-low flex justify-between items-center">
                <div>
                  <p className="font-semibold text-on-surface">Salman Al-Farisi</p>
                  <p className="text-muted-foreground">07:54 WIB • Tepat Waktu</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-success/15 text-success font-semibold">
                  Tepat Waktu
                </span>
              </div>
              <div className="p-3 rounded-lg bg-surface-container-low flex justify-between items-center">
                <div>
                  <p className="font-semibold text-on-surface">Fikri Haikal</p>
                  <p className="text-muted-foreground">08:08 WIB • Koreksi Disetujui</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-warning/20 text-tertiary font-semibold">
                  Toleransi (ATT-007)
                </span>
              </div>
              <div className="p-3 rounded-lg bg-surface-container-low flex justify-between items-center">
                <div>
                  <p className="font-semibold text-on-surface">Zaid bin Tsabit</p>
                  <p className="text-muted-foreground">Surat Sakit Terkonfirmasi</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-semibold">
                  Izin Sakit
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsDrilldownOpen(false)}
                className="h-9 px-4 rounded-xl bg-primary text-on-primary font-label-md text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog: Ekspor Data Beraudit */}
      {isExportDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-card rounded-2xl w-full max-w-md p-5 shadow-xl border border-border space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-headline-sm text-base text-on-surface font-semibold">
                Ekspor Rekap Beraudit
              </h3>
              <button
                type="button"
                onClick={() => setIsExportDialogOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleExecuteExport} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface block">
                  Kategori Data
                </label>
                <select
                  value={exportCategory}
                  onChange={(e) => setExportCategory(e.target.value)}
                  className="w-full h-10 px-2.5 rounded-lg bg-surface-container-low border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="presensi_laporan">Rekap Presensi &amp; Laporan Santri</option>
                  <option value="tugas_sprint">Penyelesaian Tugas &amp; Proyek</option>
                  <option value="audit_logs">Laporan Jejak Audit Append-Only</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface block">
                  Format Berkas
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportFormat("csv")}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      exportFormat === "csv"
                        ? "bg-primary text-on-primary border-primary"
                        : "bg-card text-on-surface border-border hover:bg-muted"
                    }`}
                  >
                    CSV (Spreadsheet)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormat("pdf")}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      exportFormat === "pdf"
                        ? "bg-primary text-on-primary border-primary"
                        : "bg-card text-on-surface border-border hover:bg-muted"
                    }`}
                  >
                    PDF (Dokumen Resmi)
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed bg-surface-container-low p-2.5 rounded-lg border border-border/40">
                Sesuai <strong>BR-ADM-08</strong>, setiap aksi ekspor data pribadi
                tercatat secara otomatis di dalam audit log sistem.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsExportDialogOpen(false)}
                  className="h-9 px-3 rounded-xl bg-surface-container text-xs font-semibold text-on-surface hover:bg-muted"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isExporting}
                  className="h-9 px-4 rounded-xl bg-primary text-on-primary text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {isExporting ? "Memproses..." : "Konfirmasi & Unduh"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
