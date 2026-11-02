"use client";

import * as React from "react";
import { getAnnouncementsAction, markAnnouncementReadAction } from "@/modules/schedules/actions";
import type { AnnouncementItem } from "@/modules/schedules/types";

export default function NotificationsPage() {
  const [items, setItems] = React.useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getAnnouncementsAction()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (item: AnnouncementItem) => {
    if (!item.isRead) {
      await markAnnouncementReadAction(item.id);
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, isRead: true } : entry));
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 pb-20">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">NOT-001 · Pusat notifikasi</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface mt-1">Notifikasi operasional</h1>
        <p className="text-sm text-muted-foreground mt-1">Pengumuman resmi yang ditargetkan ke akun dan timmu.</p>
      </header>
      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">Memuat notifikasi...</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Belum ada notifikasi baru.</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} onClick={() => markRead(item)} className={`rounded-2xl border bg-card p-5 cursor-pointer transition-colors ${item.isRead ? "border-border" : "border-primary/40 bg-accent/20"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-primary">{item.priority === "important" ? "Penting" : "Pengumuman"} · {item.publishedAtStr}</p>
                  <h2 className="font-semibold text-on-surface mt-1">{item.title}</h2>
                </div>
                {!item.isRead && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-error shrink-0" aria-label="Belum dibaca" />}
              </div>
              <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">{item.bodyMarkdown}</p>
              {item.expiresAtStr && <p className="text-xs text-muted-foreground mt-3">Berlaku sampai {item.expiresAtStr}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
