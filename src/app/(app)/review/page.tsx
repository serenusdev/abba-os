"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ReviewPage() {
  const [filter, setFilter] = React.useState("pending");

  const reports = [
    {
      id: "rep-001",
      name: "Salman Al-Farisi",
      team: "Tim Media & IT",
      category: "Koding & Tech",
      summary: "Menyelesaikan implementasi Shell & Design Tokens Pondok OS sesuai Stitch Guide.",
      status: "menunggu",
      time: "20:15 WIB",
    },
    {
      id: "rep-002",
      name: "Ahmad Dahlan",
      team: "Tim Media & IT",
      category: "Media & Desain",
      summary: "Membuat aset visual poster kajian pekanan dan export banner media sosial.",
      status: "disetujui",
      time: "19:40 WIB",
    },
    {
      id: "rep-003",
      name: "Zaid bin Tsabit",
      team: "Santri Digitalpreneur",
      category: "Tahfidz & Diniyah",
      summary: "Setoran hafalan Juz 29 (Surah Al-Mulk s.d. Al-Qalam) mutqin.",
      status: "disetujui",
      time: "17:30 WIB",
    },
  ];

  return (
    <div className="flex flex-col w-full pb-8 space-y-4 max-w-4xl mx-auto">
      <div className="bg-card rounded-2xl p-4 sm:p-5 shadow-sm border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="font-label-sm text-[11px] uppercase tracking-wider text-primary font-semibold">
            Modul Reviewer • PRD-04
          </span>
          <h2 className="font-headline-sm text-headline-sm text-on-surface">
            Antrean Review Laporan Harian
          </h2>
          <p className="font-body-sm text-[13px] text-muted-foreground mt-0.5">
            Tinjau dan berikan catatan evaluasi capaian harian santri
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filter === "pending" ? "primary" : "outline"}
            onClick={() => setFilter("pending")}
          >
            Menunggu (1)
          </Button>
          <Button
            size="sm"
            variant={filter === "all" ? "primary" : "outline"}
            onClick={() => setFilter("all")}
          >
            Semua (3)
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {reports
          .filter((r) => (filter === "pending" ? r.status === "menunggu" : true))
          .map((item) => (
            <div
              key={item.id}
              className="bg-card rounded-xl p-4 border border-border shadow-sm flex flex-col space-y-2.5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-headline-sm text-[16px] text-on-surface font-semibold">
                    {item.name}
                  </h4>
                  <p className="font-body-sm text-[12px] text-muted-foreground">
                    {item.team} • {item.category} • {item.time}
                  </p>
                </div>
                {item.status === "menunggu" ? (
                  <Badge variant="menunggu" icon="alarm">
                    Menunggu Review
                  </Badge>
                ) : (
                  <Badge variant="disetujui" icon="check_circle">
                    Disetujui
                  </Badge>
                )}
              </div>

              <p className="font-body-sm text-body-sm text-on-surface bg-surface-container/50 p-3 rounded-lg">
                {item.summary}
              </p>

              {item.status === "menunggu" && (
                <div className="flex gap-2 pt-1 justify-end">
                  <Button size="sm" variant="outline">
                    Minta Revisi
                  </Button>
                  <Button size="sm" variant="success">
                    Setujui Laporan
                  </Button>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
