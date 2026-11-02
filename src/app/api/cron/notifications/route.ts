import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/fcm";
import { getJakartaTime } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const admin = createAdminClient();
    const jakarta = getJakartaTime();
    const today = jakarta.dateStr;
    const sendAttendanceReminder = jakarta.hours === 7 && jakarta.minutes >= 25 && jakarta.minutes <= 35;
    const sendReportReminder = jakarta.hours === 21 && jakarta.minutes <= 5;
    if (!sendAttendanceReminder && !sendReportReminder) {
      return NextResponse.json({ success: true, today, skipped: true });
    }
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

    const attendancePush = sendAttendanceReminder
      ? await sendPushToUsers(attendanceTargets, {
        type: "ATTENDANCE_REMINDER",
        title: "Pengingat Presensi",
        body: "Batas waktu presensi pagi hampir ditutup.",
        url: "/kehadiran",
      })
      : { sent: 0, removed: 0, skipped: true };
    const reportPush = sendReportReminder
      ? await sendPushToUsers(reportTargets, {
        type: "REPORT_DEADLINE_REMINDER",
        title: "Pengingat Laporan",
        body: "Jangan lupa setor laporan harian sebelum batas waktu.",
        url: "/laporan",
      })
      : { sent: 0, removed: 0, skipped: true };

    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    await admin.from("device_tokens").delete().lt("updated_at", cutoff);
    return NextResponse.json({ success: true, today, attendancePush, reportPush });
  } catch (error) {
    console.error("Notification cron failed:", error);
    return NextResponse.json({ error: "Notification job failed" }, { status: 500 });
  }
}
