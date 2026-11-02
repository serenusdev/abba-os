import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/fcm";
import { getJakartaTime } from "@/lib/auth/guards";
import { timingSafeEqual } from "node:crypto";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!secret || !provided) return false;
  const expected = Buffer.from(secret);
  const actual = Buffer.from(provided);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function GET(request: Request) {
  if (request.method !== "GET") return NextResponse.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const claimedKeys: string[] = [];
  try {
    const admin = createAdminClient();
    const jakarta = getJakartaTime();
    const today = jakarta.dateStr;
    const sendAttendanceReminder = jakarta.hours === 7 && jakarta.minutes >= 25 && jakarta.minutes <= 35;
    const sendReportReminder = jakarta.hours === 21 && jakarta.minutes <= 5;
    if (!sendAttendanceReminder && !sendReportReminder) {
      return NextResponse.json({ success: true, today, skipped: true });
    }
    const jobKeys = [
      ...(sendAttendanceReminder ? [`attendance-reminder:${today}`] : []),
      ...(sendReportReminder ? [`report-reminder:${today}`] : []),
    ];
    for (const jobKey of jobKeys) {
      const { data: claim, error: claimError } = await admin
        .from("cron_job_runs")
        .insert({ job_key: jobKey })
        .select("job_key")
        .maybeSingle();
      if (claimError && claimError.code !== "23505") throw claimError;
      if (claim?.job_key) claimedKeys.push(claim.job_key);
    }
    if (claimedKeys.length === 0) {
      return NextResponse.json({ success: true, today, skipped: true, reason: "already_processed" });
    }
    const shouldSendAttendance = claimedKeys.includes(`attendance-reminder:${today}`);
    const shouldSendReport = claimedKeys.includes(`report-reminder:${today}`);
    const { data: santri, error: santriError } = await admin
      .from("profiles")
      .select("id")
      .eq("status", "active")
      .eq("member_type", "santri");
    if (santriError) throw santriError;
    const ids: string[] = (santri || []).map((profile: { id: string }) => profile.id);

    const { data: attendance, error: attendanceError } = await admin
      .from("attendance_records")
      .select("user_id")
      .eq("attendance_date", today);
    if (attendanceError) throw attendanceError;
    const checkedIn = new Set((attendance || []).map((row: { user_id: string }) => row.user_id));
    const attendanceTargets = ids.filter((id) => !checkedIn.has(id));

    const { data: reports, error: reportError } = await admin
      .from("daily_reports")
      .select("user_id")
      .eq("report_date", today)
      .eq("submission_status", "submitted");
    if (reportError) throw reportError;
    const submitted = new Set((reports || []).map((row: { user_id: string }) => row.user_id));
    const reportTargets = ids.filter((id) => !submitted.has(id));

    const { data: approvedExceptions, error: exceptionError } = await admin
      .from("attendance_exceptions")
      .select("user_id")
      .eq("status", "approved")
      .lte("date_from", today)
      .gte("date_to", today);
    if (exceptionError) throw exceptionError;
    const excused = new Set((approvedExceptions || []).map((row: { user_id: string }) => row.user_id));
    const filteredAttendanceTargets = attendanceTargets.filter((id) => !excused.has(id));
    const filteredReportTargets = reportTargets.filter((id) => !excused.has(id));

    const attendancePush = shouldSendAttendance
      ? await sendPushToUsers(filteredAttendanceTargets, {
        type: "ATTENDANCE_REMINDER",
        title: "Pengingat Presensi",
        body: "Batas waktu presensi pagi hampir ditutup.",
        url: "/kehadiran",
      })
      : { sent: 0, removed: 0, skipped: true };
    const reportPush = shouldSendReport
      ? await sendPushToUsers(filteredReportTargets, {
        type: "REPORT_DEADLINE_REMINDER",
        title: "Pengingat Laporan",
        body: "Jangan lupa setor laporan harian sebelum batas waktu.",
        url: "/laporan",
      })
      : { sent: 0, removed: 0, skipped: true };

    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    await admin.from("device_tokens").delete().lt("updated_at", cutoff);
    await admin.from("cron_job_runs").update({ status: "completed", completed_at: new Date().toISOString() }).in("job_key", claimedKeys);
    return NextResponse.json({ success: true, today, attendancePush, reportPush });
  } catch (error) {
    console.error("Notification cron failed:", error);
    const message = error instanceof Error ? error.message : "Notification job failed";
    const admin = createAdminClient();
    if (claimedKeys.length > 0) {
      await admin.from("cron_job_runs").update({ status: "failed", error_message: message, completed_at: new Date().toISOString() }).in("job_key", claimedKeys);
    }
    return NextResponse.json({ error: "Notification job failed" }, { status: 500 });
  }
}
