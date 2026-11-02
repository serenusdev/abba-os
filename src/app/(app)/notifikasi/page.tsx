"use client";

import * as React from "react";
import {
  getNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  type NotificationItem,
} from "@/modules/notifications/actions";

export default function NotificationsPage() {
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getNotificationsAction()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (item: NotificationItem) => {
    if (!item.isRead) {
      await markNotificationReadAction(item.id);
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, isRead: true } : entry));
    }
  };

  const markAllRead = async () => {
    await markAllNotificationsReadAction();
    setItems((current) => current.map((item) => ({ ...item, isRead: true })));
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 pb-20">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">NOT-001 · Pusat notifikasi</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface mt-1">Notifikasi operasional</h1>
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-muted-foreground mt-1">Pengumuman, tugas, review, dan pengingat operasional untuk akunmu.</p>
          {items.some((item) => !item.isRead) && <button type="button" onClick={markAllRead} className="text-xs font-semibold text-primary hover:underline">Tandai semua dibaca</button>}
        </div>
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
                  <p className="text-[11px] font-mono uppercase tracking-wider text-primary">{item.type.replaceAll("_", " ")} · {new Date(item.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</p>
                  <h2 className="font-semibold text-on-surface mt-1">{item.title}</h2>
                </div>
                {!item.isRead && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-error shrink-0" aria-label="Belum dibaca" />}
              </div>
              <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">{item.body}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
