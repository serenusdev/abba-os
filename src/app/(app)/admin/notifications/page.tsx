"use client";

import * as React from "react";
import { sendTestPushAction } from "@/modules/operations/actions";
import { getCurrentUserAction } from "@/modules/iam/actions";
import type { UserProfile } from "@/lib/auth/types";
import { UnauthorizedState } from "@/components/ui/unauthorized-state";

export default function AdminNotificationsPage() {
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [notice, setNotice] = React.useState("Tekan tombol untuk mengirim notifikasi ke perangkat yang sedang login.");
  React.useEffect(() => { getCurrentUserAction().then(setUser); }, []);
  if (!user) return <div className="min-h-[360px] grid place-items-center text-sm text-muted-foreground">Memverifikasi akses…</div>;
  if (!["super_admin", "yayasan", "pengurus"].includes(user.role)) return <UnauthorizedState requiredRole="Pengurus / Yayasan / Super Admin" />;
  const send = async () => { const result = await sendTestPushAction(); setNotice(result.message); };
  return <div className="w-full max-w-3xl mx-auto space-y-6 pb-20"><header><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">ADM-011 · Notifikasi</p><h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface mt-1">Uji push notification</h1><p className="text-sm text-muted-foreground mt-1">Pastikan aplikasi mobile sudah dibuka dan perangkat sudah memberi izin notifikasi.</p></header><section className="rounded-2xl border border-border bg-card p-6 space-y-4"><div className="flex items-start gap-3"><span className="material-symbols-outlined text-primary">notifications_active</span><div><h2 className="font-semibold">Kirim ke perangkat saya</h2><p className="text-sm text-muted-foreground mt-1">FCM tidak mengirim ke semua pengguna pada uji ini; hanya token perangkat akunmu.</p></div></div><button type="button" onClick={send} className="h-11 px-5 rounded-xl bg-primary text-on-primary text-sm font-semibold">Kirim push uji</button><div className="rounded-xl bg-surface-container-low p-3 text-sm" aria-live="polite">{notice}</div></section></div>;
}
