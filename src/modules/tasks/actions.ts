"use server";

import { TaskPriority, TaskStatus } from "./types";

export interface CreateTaskPayload {
  title: string;
  projectId?: string;
  projectName?: string;
  priority: TaskPriority;
  requiresReview: boolean;
  dueDateStr?: string;
  dueDateIso?: string;
  description?: string;
}

/**
 * Server Action: Update Task Status with State Machine Check (BR-TSK-03, BR-TSK-06)
 */
export async function updateTaskStatusAction(
  taskId: string,
  newStatus: TaskStatus,
  requiresReview: boolean = false,
  currentStatus: TaskStatus = "todo",
  note?: string
): Promise<{ success: boolean; message: string; newStatus: TaskStatus }> {
  // BR-TSK-06: Done requires review if requires_review is true
  if (newStatus === "done" && requiresReview && currentStatus !== "in_review") {
    return {
      success: false,
      message:
        "Tugas ini memiliki klausul review wajib (BR-TSK-06). Silakan ajukan ke In Review terlebih dahulu agar dapat disetujui pereview.",
      newStatus: currentStatus,
    };
  }

  const labelMap: Record<TaskStatus, string> = {
    todo: "To Do",
    in_progress: "In Progress (Sedang Dikerjakan)",
    in_review: "In Review (Menunggu Review)",
    done: "Done (Selesai)",
    cancelled: "Cancelled (Dibatalkan)",
  };

  return {
    success: true,
    message: `Status tugas berhasil diperbarui menjadi ${labelMap[newStatus]}.${note ? ` Catatan: ${note}` : ""}`,
    newStatus,
  };
}

/**
 * Server Action: Toggle Checklist Item (TSK-014)
 */
export async function toggleChecklistItemAction(
  taskId: string,
  checklistId: string,
  done: boolean
): Promise<{ success: boolean; message: string }> {
  return {
    success: true,
    message: `Checklist tugas berhasil ${done ? "diselesaikan" : "dibuka kembali"}.`,
  };
}

/**
 * Server Action: Create New Task (TSK-001)
 */
export async function createTaskAction(
  payload: CreateTaskPayload
): Promise<{ success: boolean; message: string; taskId?: string }> {
  if (!payload.title.trim()) {
    return {
      success: false,
      message: "Judul tugas wajib diisi.",
    };
  }

  const newId = `tsk-${Date.now()}`;
  return {
    success: true,
    message: `Tugas "${payload.title}" berhasil dibuat dan masuk ke daftar kerja santri.`,
    taskId: newId,
  };
}
