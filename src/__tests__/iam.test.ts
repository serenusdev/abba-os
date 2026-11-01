import { describe, it, expect } from "vitest";
import {
  approveAccountApplicationAction,
  rejectAccountApplicationAction,
  createManualAccountAction,
  resetUserSessionAction,
} from "@/modules/iam/actions";

describe("Stage 2 — Identity & Access Management (IAM)", () => {
  it("approves account application with specified role per BR-IAM-01", async () => {
    const result = await approveAccountApplicationAction("applicant-card-1", "Santri • Sentra Digitalpreneur");
    expect(result.success).toBe(true);
    expect(result.message).toContain("berhasil disetujui");
    expect(result.message).toContain("Santri • Sentra Digitalpreneur");
  });

  it("requires rejection reason when rejecting account per BR-IAM-02", async () => {
    const emptyReasonResult = await rejectAccountApplicationAction("applicant-card-1", "   ");
    expect(emptyReasonResult.success).toBe(false);
    expect(emptyReasonResult.message).toContain("Alasan penolakan wajib diisi");

    const validReasonResult = await rejectAccountApplicationAction("applicant-card-1", "Penempatan belum sesuai kuota");
    expect(validReasonResult.success).toBe(true);
    expect(validReasonResult.message).toContain("telah ditolak");
  });

  it("creates manual account directly into active state (Pathway B Admin)", async () => {
    const payload = {
      fullName: "Bilal bin Rabah",
      email: "bilal@pondok.id",
      phone: "081234567890",
      role: "santri" as const,
      teamName: "Sentra Digitalpreneur",
    };
    const result = await createManualAccountAction(payload);
    expect(result.success).toBe(true);
    expect(result.message).toContain("berhasil dibuat dan langsung berstatus aktif");
  });

  it("revokes user session securely", async () => {
    const result = await resetUserSessionAction("usr-salman");
    expect(result.success).toBe(true);
    expect(result.message).toContain("berhasil dicabut");
  });
});
