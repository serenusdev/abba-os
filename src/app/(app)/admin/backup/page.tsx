"use client";

import * as React from "react";
import { createBackupManifestAction, getBackupRunsAction } from "@/modules/operations/actions";
import { getCurrentUserAction } from "@/modules/iam/actions";
import type { UserProfile } from "@/lib/auth/types";
import { UnauthorizedState } from "@/components/ui/unauthorized-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface BackupRun {
  id: string;
  run_type: string;
  status: string;
  artifact_ref?: string | null;
  started_at: string;
}

export default function AdminBackupPage() {
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [runs, setRuns] = React.useState<BackupRun[]>([]);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const load = React.useCallback(async () => { setRuns(await getBackupRunsAction()); }, []);
  React.useEffect(() => { getCurrentUserAction().then(setUser).finally(() => setLoading(false)); load(); }, [load]);
  if (loading) return <div className="min-h-[360px] grid place-items-center"><LoadingSpinner size="lg" /></div>;
  if (!user || user.role !== "super_admin") return <UnauthorizedState requiredRole="Super Admin" />;
  const run = async (type: "database" | "storage" | "restore_test") => { const result = await createBackupManifestAction(type); setNotice(result.message); await load(); };
  return <div className="w-full max-w-5xl mx-auto space-y-6 pb-20"><header><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">ADM-009 · Kontinuitas</p><h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface mt-1">Backup &amp; pemulihan</h1><p className="text-sm text-muted-foreground mt-1">Catat pemeriksaan backup, row count, dan uji restore. Backup penuh tetap dikelola oleh Supabase PITR atau operator infrastructure.</p></header>{notice && <div className="rounded-xl border border-primary/30 bg-accent/30 p-3 text-sm" aria-live="polite">{notice}</div>}<section className="grid grid-cols-1 md:grid-cols-3 gap-3"><button type="button" onClick={() => run("database")} className="rounded-xl border border-border bg-card p-4 text-left hover:border-primary"><span className="material-symbols-outlined text-primary">database</span><p className="font-semibold mt-2">Catat backup database</p><p className="text-xs text-muted-foreground mt-1">Verifikasi jumlah record dan jejak run.</p></button><button type="button" onClick={() => run("storage")} className="rounded-xl border border-border bg-card p-4 text-left hover:border-primary"><span className="material-symbols-outlined text-primary">cloud_upload</span><p className="font-semibold mt-2">Catat backup storage</p><p className="text-xs text-muted-foreground mt-1">Tandai pemeriksaan file Storage privat.</p></button><button type="button" onClick={() => run("restore_test")} className="rounded-xl border border-border bg-card p-4 text-left hover:border-primary"><span className="material-symbols-outlined text-primary">restore</span><p className="font-semibold mt-2">Catat uji restore</p><p className="text-xs text-muted-foreground mt-1">Gunakan setelah staging dipulihkan dan smoke test selesai.</p></button></section><section className="rounded-2xl border border-border bg-card overflow-hidden"><div className="p-5 border-b border-border"><h2 className="font-semibold">Riwayat pemeriksaan</h2></div><div className="divide-y divide-border">{runs.length === 0 ? <p className="p-5 text-sm text-muted-foreground">Belum ada catatan backup.</p> : runs.map((item) => <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"><div><p className="text-sm font-medium">{item.run_type} · {item.status}</p><p className="text-xs text-muted-foreground">{new Date(item.started_at).toLocaleString("id-ID")}</p></div><span className="text-xs font-mono text-muted-foreground">{item.artifact_ref || "-"}</span></div>)}</div></section></div>;
}
