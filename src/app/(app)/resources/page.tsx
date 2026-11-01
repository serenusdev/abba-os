"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function ResourcesPage() {
  const [search, setSearch] = React.useState("");

  const resources = [
    {
      id: "res-01",
      title: "SOP Presensi Mandiri & Dispensasi Pondok OS",
      category: "SOP",
      updated: "15 Nov 2026",
      desc: "Panduan lengkap mengenai kebijakan jam server, batas toleransi, dan mekanisme koreksi keterlambatan.",
    },
    {
      id: "res-02",
      title: "Panduan Setup Lingkungan Dev Next.js & Supabase",
      category: "Teknis",
      updated: "10 Nov 2026",
      desc: "Instruksi konfigurasi local Supabase CLI, migrasi SQL terversi, dan type generation.",
    },
    {
      id: "res-03",
      title: "Panduan Identitas Visual & Desain Brand Pondok",
      category: "Aset Brand",
      updated: "05 Nov 2026",
      desc: "Palet Clinic Pearl & Teal, tipografi Hanken Grotesk, dan aturan penggunaan logo resmi.",
    },
  ];

  return (
    <div className="flex flex-col w-full pb-8 space-y-4 max-w-4xl mx-auto">
      <div className="bg-card rounded-2xl p-4 sm:p-5 shadow-sm border border-border">
        <span className="font-label-sm text-[11px] uppercase tracking-wider text-primary font-semibold">
          Pustaka Pengetahuan • PRD-02
        </span>
        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          Resource Library
        </h2>
        <p className="font-body-sm text-[13px] text-muted-foreground mt-0.5">
          Pusat dokumentasi SOP, kredensial resmi, panduan teknis, dan aset media
        </p>

        <div className="mt-4">
          <Input
            placeholder="Cari dokumen, SOP, atau panduan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        {resources
          .filter((r) =>
            r.title.toLowerCase().includes(search.toLowerCase()) ||
            r.desc.toLowerCase().includes(search.toLowerCase())
          )
          .map((res) => (
            <div
              key={res.id}
              className="bg-card rounded-xl p-4 border border-border shadow-sm flex flex-col space-y-2 hover:border-primary/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <Badge variant="default">{res.category}</Badge>
                <span className="font-body-sm text-[12px] text-muted-foreground">
                  Diperbarui {res.updated}
                </span>
              </div>
              <h4 className="font-headline-sm text-[16px] text-on-surface font-semibold">
                {res.title}
              </h4>
              <p className="font-body-sm text-body-sm text-muted-foreground">
                {res.desc}
              </p>
            </div>
          ))}
      </div>
    </div>
  );
}

