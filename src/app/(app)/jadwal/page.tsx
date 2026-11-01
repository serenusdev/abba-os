"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";

export default function JadwalPage() {
  const announcements = [
    {
      id: "ann-01",
      title: "Pembaruan Jam Operasional Semester Ganjil",
      category: "Kebijakan",
      date: "Hari ini",
      summary:
        "Penyesuaian jam presensi subuh dan toleransi sesi malam berlaku mulai pekan depan sesuai SK Pengurus.",
    },
    {
      id: "ann-02",
      title: "Kajian Bulanan Bersama Dewan Pembina Yayasan",
      category: "Kajian",
      date: "25 Nov 2026",
      summary:
        "Seluruh santri dan pengurus wajib hadir di Masjid Baitul Quran ba'da Maghrib.",
    },
  ];

  const events = [
    {
      time: "08:30 - 11:30 WIB",
      title: "Workshop Next.js App Router & Supabase",
      location: "Lab Komputer Utama",
      tag: "Tech",
    },
    {
      time: "13:30 - 15:00 WIB",
      title: "Halaqah Tahsin & Muroja'ah Juz 29",
      location: "Masjid Baitul Quran",
      tag: "Tahfidz",
    },
    {
      time: "16:00 - 17:30 WIB",
      title: "Rapat Koordinasi Mingguan Tim Media",
      location: "Ruang Media Lt. 2",
      tag: "Media",
    },
  ];

  return (
    <div className="flex flex-col w-full pb-8 space-y-4 max-w-4xl mx-auto">
      <div className="bg-card rounded-2xl p-4 sm:p-5 shadow-sm border border-border">
        <span className="font-label-sm text-[11px] uppercase tracking-wider text-primary font-semibold">
          Agenda &amp; Siaran • PRD-06
        </span>
        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          Jadwal &amp; Pengumuman Pondok
        </h2>
        <p className="font-body-sm text-[13px] text-muted-foreground mt-0.5">
          Pusat informasi kalender kegiatan harian dan pengumuman resmi yayasan
        </p>
      </div>

      {/* Pinned Announcements */}
      <div className="space-y-3">
        <h3 className="font-headline-sm text-[17px] text-on-surface">
          Pengumuman Resmi
        </h3>
        {announcements.map((ann) => (
          <div
            key={ann.id}
            className="bg-card rounded-xl p-4 border border-border shadow-sm flex flex-col gap-1.5"
          >
            <div className="flex items-center justify-between">
              <Badge variant="default">{ann.category}</Badge>
              <span className="font-body-sm text-[12px] text-muted-foreground">
                {ann.date}
              </span>
            </div>
            <h4 className="font-headline-sm text-[16px] text-on-surface font-semibold mt-1">
              {ann.title}
            </h4>
            <p className="font-body-sm text-body-sm text-muted-foreground">
              {ann.summary}
            </p>
          </div>
        ))}
      </div>

      {/* Schedule List */}
      <div className="space-y-3 pt-2">
        <h3 className="font-headline-sm text-[17px] text-on-surface">
          Agenda Kegiatan Harian
        </h3>
        <div className="space-y-2">
          {events.map((ev, i) => (
            <div
              key={i}
              className="bg-card rounded-xl p-3.5 border border-border shadow-sm flex items-center gap-3.5"
            >
              <div className="w-10 h-10 rounded-xl bg-accent text-primary flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[22px]">
                  event
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-label-sm text-[11px] text-primary font-mono block">
                  {ev.time}
                </span>
                <h4 className="font-headline-sm text-[15px] text-on-surface truncate font-semibold">
                  {ev.title}
                </h4>
                <p className="font-body-sm text-[12px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[13px]">
                    location_on
                  </span>
                  {ev.location}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

