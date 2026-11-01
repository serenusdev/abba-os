"use client";

import * as React from "react";
import Link from "next/link";
import { formatOperationalDateTime } from "@/lib/utils";

export default function BerandaPage() {
  const [checkedIn, setCheckedIn] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [currentDateTime, setCurrentDateTime] = React.useState(
    formatOperationalDateTime()
  );

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(formatOperationalDateTime());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleCheckin = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setCheckedIn(true);
    }, 1100);
  };

  return (
    <div className="flex flex-col w-full pb-8 space-y-4 max-w-4xl mx-auto">
      {/* Greeting & Server Sync Bar */}
      <section className="flex flex-col space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/60 text-accent-foreground w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="font-label-sm text-label-sm">
              Santri Digitalpreneur • Tim Media &amp; IT
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container-low text-success">
            <span className="material-symbols-outlined text-[14px]">
              cloud_done
            </span>
            <span className="font-label-sm text-[11px] leading-tight">
              Server Sinkron
            </span>
          </div>
        </div>
        <div>
          <h2 className="font-headline-sm text-headline-sm text-on-surface tracking-tight">
            Assalamu&apos;alaikum, Salman Al-Farisi
          </h2>
          <div className="flex items-center gap-1.5 text-muted-foreground mt-0.5">
            <span className="material-symbols-outlined text-[16px]">schedule</span>
            <p className="font-body-sm text-body-sm" id="live-server-clock">
              {currentDateTime}
            </p>
          </div>
        </div>
      </section>

      {/* Pinned Announcement Banner */}
      <section className="bg-surface-container-low rounded-xl p-3.5 shadow-sm relative overflow-hidden flex flex-col gap-2 border border-border/50">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[18px]">
              campaign
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="font-label-sm text-[11px] uppercase tracking-wider text-primary font-semibold">
                Pengumuman Pondok
              </span>
              <span className="font-body-sm text-[11px] text-muted-foreground">
                Hari ini
              </span>
            </div>
            <h3 className="font-label-md text-label-md text-on-surface truncate">
              Pembaruan Jam Operasional Semester Ganjil
            </h3>
            <p className="font-body-sm text-body-sm text-muted-foreground line-clamp-1 mt-0.5">
              Penyesuaian jam presensi subuh dan toleransi sesi malam berlaku
              mulai pekan depan...
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <Link
            href="/jadwal"
            className="text-primary font-label-sm text-label-sm flex items-center gap-0.5 py-1 px-2 rounded-lg hover:bg-accent/40 active:scale-95 transition-all"
          >
            <span>Lihat Selengkapnya</span>
            <span className="material-symbols-outlined text-[16px]">
              arrow_forward
            </span>
          </Link>
        </div>
      </section>

      {/* Card Presensi Hari Ini (Priority 1) */}
      <section className="bg-card rounded-xl p-4 shadow-sm flex flex-col space-y-3.5 relative overflow-hidden border border-border">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-primary flex-shrink-0">
              <span className="material-symbols-outlined text-[24px]">
                fingerprint
              </span>
            </div>
            <div>
              <span className="font-label-sm text-label-sm text-muted-foreground uppercase tracking-wider">
                Presensi Pagi
              </span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface leading-tight">
                Kehadiran Operasional
              </h3>
            </div>
          </div>
          {checkedIn ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-low text-success font-label-sm text-label-sm border border-success/30">
              <span className="material-symbols-outlined text-[14px]">
                check_circle
              </span>
              Tepat Waktu (07:42 WIB)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-tertiary font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-[14px]">
                alarm
              </span>
              Belum Check-in
            </span>
          )}
        </div>

        {/* Countdown & Rules Callout */}
        <div className="bg-surface-container rounded-lg p-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-tertiary">
                timer
              </span>
              Batas Tepat Waktu
            </span>
            <span className="font-label-md text-label-md text-tertiary" id="countdown-badge">
              18 menit lagi (08.00 WIB)
            </span>
          </div>
          <div className="w-full bg-card h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: "72%" }}
            />
          </div>
          <p className="font-body-sm text-[12px] text-muted-foreground flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-muted-foreground">
              info
            </span>
            Toleransi keterlambatan sistem s.d. 08.15 WIB (BR-ATT-03)
          </p>
        </div>

        {/* Primary Touch CTA Button */}
        {checkedIn ? (
          <div className="w-full h-[52px] bg-success text-white font-label-md text-body-md rounded-xl flex items-center justify-center gap-2.5 shadow-sm">
            <span className="material-symbols-outlined text-[24px]">
              check_circle
            </span>
            <span>Berhasil Presensi Hari Ini (07:42 WIB)</span>
          </div>
        ) : (
          <button
            className="w-full h-[52px] bg-primary text-on-primary font-label-md text-body-md rounded-xl flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.98] transition-all disabled:opacity-90"
            id="btn-checkin"
            type="button"
            onClick={handleCheckin}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[22px]">
                  progress_activity
                </span>
                <span>Memproses Geolocation...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[24px]">
                  touch_app
                </span>
                <span>Check-in Sekarang (07:42 WIB)</span>
              </>
            )}
          </button>
        )}

        <div className="flex items-center justify-center pt-0.5">
          <Link
            className="font-label-sm text-label-sm text-muted-foreground hover:text-primary active:scale-95 flex items-center gap-1 py-1 px-2 transition-colors"
            href="/kehadiran"
          >
            <span className="material-symbols-outlined text-[16px]">
              contact_support
            </span>
            <span>Ada kendala? Ajukan Izin / Sakit</span>
          </Link>
        </div>
      </section>

      {/* Card Laporan Aktivitas Harian (PRD-04) */}
      <section className="bg-card rounded-xl p-4 shadow-sm flex flex-col space-y-3.5 relative overflow-hidden border border-border">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-primary flex-shrink-0">
              <span className="material-symbols-outlined text-[24px]">
                edit_note
              </span>
            </div>
            <div>
              <span className="font-label-sm text-label-sm text-muted-foreground uppercase tracking-wider">
                Laporan Individu
              </span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface leading-tight">
                Aktivitas Harian Santri
              </h3>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-tertiary font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-[14px]">
              pending_actions
            </span>
            Belum Kirim
          </span>
        </div>

        <div className="bg-surface-container rounded-lg p-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-tertiary">
                timelapse
              </span>
              Batas Akhir Pelaporan
            </span>
            <span className="font-label-md text-label-md text-tertiary">
              Malam ini 21.00 WIB
            </span>
          </div>
          <div className="w-full bg-card h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: "35%" }}
            />
          </div>
          <p className="font-body-sm text-[12px] text-muted-foreground flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-muted-foreground">
              info
            </span>
            Keterlambatan tetap tercatat di sistem (BR-REP-05)
          </p>
        </div>

        <Link
          href="/laporan"
          className="w-full h-[52px] bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed font-label-md text-body-md rounded-xl flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-[22px]">
            edit_document
          </span>
          <span>Tulis Laporan Hari Ini</span>
        </Link>

        <div className="flex items-center justify-center pt-0.5">
          <Link
            className="font-label-sm text-label-sm text-muted-foreground hover:text-primary active:scale-95 flex items-center gap-1 py-1 px-2 transition-colors"
            href="/laporan"
          >
            <span className="material-symbols-outlined text-[16px]">
              history
            </span>
            <span>Lihat Riwayat &amp; Umpan Balik</span>
          </Link>
        </div>
      </section>

      {/* Agenda Hari Ini */}
      <section className="bg-card rounded-xl p-4 shadow-sm flex flex-col space-y-3 border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">
              event_note
            </span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">
              Jadwal &amp; Agenda Hari Ini
            </h3>
          </div>
          <Link
            href="/jadwal"
            className="text-primary font-label-sm text-label-sm hover:underline"
          >
            Lihat Semua
          </Link>
        </div>

        <div className="space-y-2">
          <div className="p-3 rounded-lg bg-surface flex items-start gap-3">
            <div className="flex flex-col items-center justify-center px-2 py-1.5 rounded-lg bg-surface-container text-center min-w-[76px] flex-shrink-0">
              <span className="font-label-sm text-[11px] text-primary font-bold">
                08.30
              </span>
              <span className="font-body-sm text-[10px] text-muted-foreground">
                11.30 WIB
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-label-md text-label-md text-on-surface truncate">
                Workshop Next.js &amp; Supabase
              </h4>
              <p className="font-body-sm text-body-sm text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-[14px]">
                  location_on
                </span>
                Lab Komputer Utama
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-surface flex items-start gap-3">
            <div className="flex flex-col items-center justify-center px-2 py-1.5 rounded-lg bg-surface-container text-center min-w-[76px] flex-shrink-0">
              <span className="font-label-sm text-[11px] text-primary font-bold">
                13.30
              </span>
              <span className="font-body-sm text-[10px] text-muted-foreground">
                15.00 WIB
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-label-md text-label-md text-on-surface truncate">
                Halaqah Tahsin &amp; Muroja&apos;ah
              </h4>
              <p className="font-body-sm text-body-sm text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-[14px]">
                  mosque
                </span>
                Masjid Baitul Quran (Juz 29)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Kilas Suasana Kampus */}
      <section className="bg-card rounded-xl p-3 shadow-sm flex flex-col space-y-2 border border-border">
        <div className="flex items-center justify-between px-1">
          <span className="font-label-sm text-label-sm text-muted-foreground">
            Kilas Suasana Kampus
          </span>
          <span className="font-label-sm text-[11px] text-primary font-semibold">
            Sentra Media Santri
          </span>
        </div>
        <div className="relative w-full h-32 rounded-lg overflow-hidden bg-surface-container">
          <img
            className="w-full h-full object-cover"
            alt="Modern Islamic tech boarding school lab"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAAWb46k7iqPbON373nxceUiAvK_KSVIIoBM8Wfs-AR5entkXqWuoRXPlHvDRNuW-JbYaN6dt_TGxyE3lFOOy89zH0dEuMQ0jPgBX0MkWPsBA8hW3nT-aVUlAGYFP6IJcpDUGUlpquaeeu1QIFGcolt5oe5lAl_h7Qb-f552zyMyZYyZdqcNOit5rMXoscEYG6n4C2SEhj4_J5Q5H7SqRCaSTqXm8gqe622p4Bt6hA"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-on-surface/80 via-transparent to-transparent flex items-end p-2.5">
            <p className="font-body-sm text-[12px] text-white font-medium truncate">
              Lab Komputer: Persiapan integrasi API presensi terpusat
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
