"use client";

import * as React from "react";

export default function KehadiranPage() {
  const [checkedIn, setCheckedIn] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleCheckin = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setCheckedIn(true);
    }, 900);
  };

  return (
    <div className="flex flex-col w-full pb-8 space-y-4 max-w-4xl mx-auto">
      {/* 1. Operational Server Clock & State Banner */}
      <div className="w-full bg-card rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-label-sm text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Status Sinkronisasi
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-low text-primary font-label-sm text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Tersambung
              <span className="material-symbols-outlined text-[14px] text-primary">
                verified
              </span>
            </span>
          </div>
          <span className="font-mono text-[12px] text-muted-foreground bg-surface-container px-2.5 py-0.5 rounded-full">
            BR-ATT-05
          </span>
        </div>

        <div className="flex items-baseline justify-between pt-1">
          <div>
            <p className="font-body-sm text-body-sm text-muted-foreground">
              Waktu Resmi Operasional
            </p>
            <p className="font-mono text-[28px] font-semibold tracking-tight text-primary leading-none mt-1">
              07:48:15{" "}
              <span className="font-body-sm text-body-sm font-normal text-muted-foreground">
                WIB
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="font-label-md text-label-md text-on-surface font-semibold">
              Senin, 18 Nov 2026
            </p>
            <span className="inline-block mt-0.5 font-label-sm text-[11px] text-primary bg-accent px-2 py-0.5 rounded-md font-semibold">
              Shift Pagi Santri
            </span>
          </div>
        </div>

        {/* Threshold Rules Bar */}
        <div className="bg-surface-container-low rounded-xl p-3 text-on-surface space-y-1.5 border border-border/50">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[18px]">
              info
            </span>
            <span className="font-label-sm text-label-sm text-on-surface font-semibold">
              Aturan Kebijakan Presensi (BR-ATT-03 &amp; 09)
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="bg-card rounded-lg p-2 shadow-sm border border-border/40">
              <p className="font-label-sm text-[11px] text-success font-semibold flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[13px]">
                  check_circle
                </span>{" "}
                Tepat
              </p>
              <p className="font-mono text-[13px] text-on-surface mt-0.5 font-medium">
                ≤ 08:00
              </p>
            </div>
            <div className="bg-card rounded-lg p-2 shadow-sm border border-border/40">
              <p className="font-label-sm text-[11px] text-warning font-semibold flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[13px]">
                  timelapse
                </span>{" "}
                Toleransi
              </p>
              <p className="font-mono text-[13px] text-on-surface mt-0.5 font-medium">
                08:01–08:15
              </p>
            </div>
            <div className="bg-card rounded-lg p-2 shadow-sm border border-border/40">
              <p className="font-label-sm text-[11px] text-tertiary font-semibold flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[13px]">
                  warning
                </span>{" "}
                Terlambat
              </p>
              <p className="font-mono text-[13px] text-on-surface mt-0.5 font-medium">
                &gt; 08:15
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Primary Check-in Interactive Tactile Card */}
      <div className="w-full bg-card rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">
              touch_app
            </span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">
              Presensi Mandiri Hari Ini
            </h2>
          </div>
          <span className="font-label-sm text-label-sm text-primary font-semibold bg-accent px-2.5 py-1 rounded-full">
            {checkedIn ? "Tercatat" : "Siap Dicatat"}
          </span>
        </div>

        {/* Primary CTA */}
        {checkedIn ? (
          <div className="p-4 bg-surface-container-low text-success border border-success/30 rounded-2xl flex items-center gap-3">
            <span className="material-symbols-outlined text-[28px]">
              check_circle
            </span>
            <div>
              <p className="font-headline-sm text-[17px] font-semibold leading-tight">
                Check-in Berhasil Dicatat!
              </p>
              <p className="font-body-sm text-[13px] text-muted-foreground">
                Timestamp: 07:48:15 WIB (Status: Tepat Waktu) • Terverifikasi Server
              </p>
            </div>
          </div>
        ) : (
          <button
            className="w-full min-h-[64px] bg-primary text-on-primary rounded-2xl flex items-center justify-center gap-3 shadow-md hover:bg-primary-container active:scale-[0.98] transition-all p-4 select-none relative overflow-hidden group disabled:opacity-90"
            id="btn-checkin"
            onClick={handleCheckin}
            disabled={isProcessing}
            type="button"
          >
            <span className="material-symbols-outlined text-[28px] group-active:rotate-12 transition-transform">
              how_to_reg
            </span>
            <div className="text-left">
              <p className="font-headline-sm text-headline-sm text-on-primary leading-tight font-semibold">
                {isProcessing
                  ? "Menghubungkan ke Server..."
                  : "Tekan untuk Check-in Mandiri"}
              </p>
              <p className="font-body-sm text-body-sm text-on-primary-container leading-none opacity-90 mt-0.5">
                Sinkronisasi 1 ketuk ke basis data pondok
              </p>
            </div>
          </button>
        )}

        <div className="flex items-start gap-2 bg-surface-container-low p-3 rounded-xl border border-border/40">
          <span className="material-symbols-outlined text-primary text-[18px] flex-shrink-0 mt-0.5">
            verified_user
          </span>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Presensi tervalidasi menggunakan jam server resmi (WIB). Tidak
            mewajibkan akses GPS maupun foto biometrik berulang.
          </p>
        </div>

        {/* Prior Active Record */}
        <div className="pt-1 flex items-center justify-between bg-surface-container/40 p-3 rounded-xl">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-primary flex-shrink-0">
              <span className="material-symbols-outlined text-[18px]">history</span>
            </span>
            <div>
              <p className="font-body-sm text-body-sm text-muted-foreground">
                Catatan Terakhir
              </p>
              <p className="font-label-md text-label-md text-on-surface font-medium">
                Sabtu, 16 Nov • 07:54 WIB
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">
            <span className="material-symbols-outlined text-[14px] text-success">
              check_circle
            </span>
            Tepat Waktu
          </span>
        </div>
      </div>

      {/* 3. Kendala Kehadiran & Pengajuan Izin */}
      <div className="w-full bg-card rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 border border-border">
        <h3 className="font-headline-sm text-headline-sm text-on-surface">
          Kendala Operasional &amp; Izin
        </h3>
        <p className="font-body-sm text-body-sm text-muted-foreground">
          Santri yang berhalangan hadir karena sakit, tugas luar, atau keperluan darurat dapat mengajukan permohonan dispensasi resmi.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            type="button"
            className="flex-1 h-12 rounded-xl bg-accent text-accent-foreground font-label-md flex items-center justify-center gap-2 hover:bg-accent/80 active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">healing</span>
            <span>Ajukan Sakit / Izin</span>
          </button>
          <button
            type="button"
            className="flex-1 h-12 rounded-xl border border-border bg-card text-foreground font-label-md flex items-center justify-center gap-2 hover:bg-muted active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">rule</span>
            <span>Permohonan Koreksi Absensi</span>
          </button>
        </div>
      </div>
    </div>
  );
}
