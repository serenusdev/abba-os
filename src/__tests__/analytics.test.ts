import { describe, it, expect } from "vitest";
import {
  exportAuditedDataAction,
  queryAuditLogsAction,
} from "@/modules/analytics/actions";
import {
  ACTIVE_POLICY_SETTING,
  INITIAL_ATTENDANCE_METRIC,
  INITIAL_AUDIT_LOGS,
  INITIAL_REPORT_METRIC,
  INITIAL_TASK_METRIC,
} from "@/modules/analytics/data";

describe("Stage 9 — Analytics & Administration / Audit Trail (PRD-08)", () => {
  it("records export action in compliance with BR-ADM-08", async () => {
    const res = await exportAuditedDataAction(
      "csv",
      "presensi",
      "Super Admin"
    );
    expect(res.success).toBe(true);
    expect(res.exportId).toBeDefined();
    expect(res.downloadUrl).toContain("/api/exports/");
    expect(res.message).toContain("berhasil dicatat pada audit log");
  });

  it("filters audit logs correctly in explorer search", async () => {
    const allLogs = await queryAuditLogsAction("");
    expect(allLogs.success).toBe(true);
    expect(allLogs.logs.length).toBe(3);

    const filtered = await queryAuditLogsAction("correction");
    expect(filtered.success).toBe(true);
    expect(filtered.logs.length).toBe(1);
    expect(filtered.logs[0].eventName).toBe("attendance.correction_approved");
  });

  it("verifies operational metrics definitions (PRD-08 §4)", () => {
    // Attendance rate
    expect(INITIAL_ATTENDANCE_METRIC.rate).toBe(94.8);
    expect(INITIAL_ATTENDANCE_METRIC.checkedInCount).toBe(36);
    expect(INITIAL_ATTENDANCE_METRIC.totalPopulation).toBe(38);

    // Report compliance
    expect(INITIAL_REPORT_METRIC.rate).toBe(91.2);
    expect(INITIAL_REPORT_METRIC.deadlineStr).toBe("Batas 21.00 WIB");
    expect(INITIAL_REPORT_METRIC.reviewBacklogCount).toBe(6);

    // Task sprint
    expect(INITIAL_TASK_METRIC.completionRate).toBe(78);
    expect(INITIAL_TASK_METRIC.overdueCount).toBe(1);
  });

  it("verifies active locked policy and immutable cryptographic audit hashes", () => {
    expect(ACTIVE_POLICY_SETTING.code).toBe("POL-2026-v2.1");
    expect(ACTIVE_POLICY_SETTING.status).toBe("locked");
    expect(ACTIVE_POLICY_SETTING.attendanceCutoffStr).toBe("08.00 WIB");
    expect(ACTIVE_POLICY_SETTING.reportDeadlineStr).toBe("21.00 WIB (Sore/Malam)");

    expect(INITIAL_AUDIT_LOGS).toHaveLength(3);
    for (const log of INITIAL_AUDIT_LOGS) {
      expect(log.hash).toMatch(/^sha256-hash-chain/);
    }
  });
});

