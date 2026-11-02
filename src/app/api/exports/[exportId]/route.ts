import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const text = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${text.replace(/"/g, '""')}"`;
}

function buildPdf(title: string, lines: string[]): Uint8Array {
  const safe = [title, ...lines].slice(0, 60).map((line) =>
    String(line).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")
  );
  const commands = ["BT", "/F1 12 Tf", "40 780 Td"];
  safe.forEach((line, index) => {
    if (index > 0) commands.push("0 -16 Td");
    commands.push(`(${line.slice(0, 110)}) Tj`);
  });
  commands.push("ET");
  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ exportId: string }> }
) {
  try {
    const user = await requireRole(["super_admin", "pengurus"]);
    const { exportId } = await params;
    const exportType = new URL(request.url).pathname.endsWith(".pdf") ? "pdf" : "csv";
    const id = exportId.replace(/\.(csv|pdf)$/i, "");
    const supabase = createAdminClient();
    const { data: log, error: logError } = await supabase
      .from("export_logs")
      .select("id, user_id, category, export_type")
      .eq("id", id)
      .maybeSingle();
    if (logError) throw logError;
    if (!log || (log.user_id !== user.id && user.role !== "super_admin")) {
      return NextResponse.json({ error: "Ekspor tidak ditemukan atau tidak diizinkan." }, { status: 404 });
    }

    let headers: string[] = ["id", "created_at"];
    let rows: unknown[][] = [];
    if (log.category === "presensi_laporan") {
      headers = ["record_type", "id", "user_id", "date", "status", "review_status"];
      const result = await supabase.from("attendance_records").select("id,user_id,attendance_date,classification").order("attendance_date", { ascending: false });
      if (result.error) throw result.error;
      rows = (result.data || []).map((row: Record<string, unknown>) => ["attendance", row.id, row.user_id, row.attendance_date, row.classification, ""]);
      const reportResult = await supabase.from("daily_reports").select("id,user_id,report_date,submission_status,review_status").order("report_date", { ascending: false });
      if (reportResult.error) throw reportResult.error;
      rows = rows.concat((reportResult.data || []).map((row: Record<string, unknown>) => ["report", row.id, row.user_id, row.report_date, row.submission_status, row.review_status]));
    } else if (log.category === "presensi") {
      headers = ["id", "user_id", "attendance_date", "checked_in_at", "classification"];
      const result = await supabase.from("attendance_records").select(headers.join(",")).order("attendance_date", { ascending: false });
      if (result.error) throw result.error;
      rows = (result.data || []).map((row: Record<string, unknown>) => headers.map((header) => row[header]));
    } else if (log.category === "laporan") {
      headers = ["id", "user_id", "report_date", "submission_status", "review_status", "is_late"];
      const result = await supabase.from("daily_reports").select(headers.join(",")).order("report_date", { ascending: false });
      if (result.error) throw result.error;
      rows = (result.data || []).map((row: Record<string, unknown>) => headers.map((header) => row[header]));
    } else if (log.category === "tugas" || log.category === "tugas_proyek") {
      headers = ["id", "title", "status", "priority", "due_date", "created_by"];
      const result = await supabase.from("tasks").select(headers.join(",")).is("deleted_at", null).order("created_at", { ascending: false });
      if (result.error) throw result.error;
      rows = (result.data || []).map((row: Record<string, unknown>) => headers.map((header) => row[header]));
    } else if (log.category === "users") {
      headers = ["id", "email", "full_name", "status", "member_type", "team_name", "created_at"];
      const result = await supabase.from("profiles").select(headers.join(",")).order("created_at", { ascending: false });
      if (result.error) throw result.error;
      rows = (result.data || []).map((row: Record<string, unknown>) => headers.map((header) => row[header]));
    } else {
      const result = await supabase.from("audit_logs").select("id,event_name,actor_id,target_id,created_at").order("created_at", { ascending: false }).limit(500);
      if (result.error) throw result.error;
      headers = ["id", "event_name", "actor_id", "target_id", "created_at"];
      rows = (result.data || []).map((row: Record<string, unknown>) => headers.map((header) => row[header]));
    }

    const title = `Pondok OS - Ekspor ${log.category}`;
    await supabase.from("export_logs").update({ row_count: rows.length }).eq("id", id);
    if (exportType === "pdf") {
      const lines = [headers.join(" | "), ...rows.map((row) => row.map(String).join(" | "))];
      return new Response(Buffer.from(buildPdf(title, lines)), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="pondok-os-${log.category}.pdf"`,
        },
      });
    }
    const csv = "\uFEFF" + [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="pondok-os-${log.category}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export download failed:", error);
    return NextResponse.json({ error: "Gagal menghasilkan ekspor." }, { status: 500 });
  }
}
