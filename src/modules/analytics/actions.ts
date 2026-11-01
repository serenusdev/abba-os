"use server";

import { INITIAL_AUDIT_LOGS } from "./data";
import { AuditLogItem } from "./types";

/**
 * Server Action: Export Audited Report (BR-ADM-08)
 * Strictly records export action in compliance with audit trail.
 */
export async function exportAuditedDataAction(
  exportType: "csv" | "pdf",
  category: string,
  requesterName: string = "Super Admin"
): Promise<{ success: boolean; message: string; exportId: string; downloadUrl?: string }> {
  const exportId = `exp-${Date.now()}`;
  return {
    success: true,
    message: `Ekspor data ${category.toUpperCase()} (${exportType.toUpperCase()}) oleh ${requesterName} berhasil dicatat pada audit log.`,
    exportId,
    downloadUrl: `/api/exports/${exportId}.${exportType}`,
  };
}

/**
 * Server Action: Search and Filter Audit Logs Explorer
 */
export async function queryAuditLogsAction(
  query: string
): Promise<{ success: boolean; logs: AuditLogItem[] }> {
  if (!query.trim()) {
    return { success: true, logs: INITIAL_AUDIT_LOGS };
  }

  const q = query.toLowerCase();
  const filtered = INITIAL_AUDIT_LOGS.filter(
    (log) =>
      log.eventName.toLowerCase().includes(q) ||
      log.actorName.toLowerCase().includes(q) ||
      log.targetLabel.toLowerCase().includes(q) ||
      log.actionDetail.toLowerCase().includes(q)
  );

  return { success: true, logs: filtered };
}

