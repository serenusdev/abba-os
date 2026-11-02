import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createAdminClient();
  const { data: run, error: startError } = await supabase.from("backup_runs").insert({ run_type: "database", status: "started", artifact_ref: "Supabase PITR / provider backup" }).select("id").single();
  if (startError) return NextResponse.json({ error: "Backup run could not be started" }, { status: 500 });
  try {
    const tables = ["profiles", "attendance_records", "daily_reports", "tasks", "events", "announcements"];
    const rowCounts: Record<string, number> = {};
    for (const table of tables) {
      const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
      if (error) throw error;
      rowCounts[table] = count || 0;
    }
    const { error } = await supabase.from("backup_runs").update({ status: "completed", row_counts: rowCounts, completed_at: new Date().toISOString() }).eq("id", run.id);
    if (error) throw error;
    return NextResponse.json({ success: true, runId: run.id, rowCounts, note: "Metadata manifest recorded; full database backup remains Supabase PITR/provider responsibility." });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Backup manifest failed";
    await supabase.from("backup_runs").update({ status: "failed", error_message: message, completed_at: new Date().toISOString() }).eq("id", run.id);
    return NextResponse.json({ error: "Backup manifest failed" }, { status: 500 });
  }
}
