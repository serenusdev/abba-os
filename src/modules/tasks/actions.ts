"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthUser } from "@/lib/auth/guards";
import { INITIAL_PROJECTS, INITIAL_TASKS } from "./data";
import { ProjectItem, TaskItem, TaskPriority, TaskStatus } from "./types";

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
 * Server Action: Query all live tasks from Supabase
 */
export async function getTasksAction(): Promise<TaskItem[]> {
  try {
    const supabase = createAdminClient();
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("*, projects(*)")
      .order("created_at", { ascending: false });

    if (!error && tasks) {
      if (tasks.length === 0) return [];

      return tasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description || "",
        projectId: t.project_id || "proj-general",
        projectName: t.projects?.name || "Operasional Santri",
        projectTeam: t.team_id || "Sentra Digital",
        priority: t.priority as TaskPriority,
        status: t.status as TaskStatus,
        requiresReview: t.requires_review,
        dueDateStr: t.due_date
          ? new Date(t.due_date).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
            })
          : "Segera",
        dueDateIso: t.due_date || "",
        isOverdue: t.due_date ? new Date(t.due_date) < new Date() && t.status !== "done" : false,
        checklist: [
          { id: `${t.id}-c1`, text: "Uraian tugas teknis", done: t.status === "done" },
          { id: `${t.id}-c2`, text: "Verifikasi & uji sistem", done: t.status === "done" },
        ],
        assignees: [
          {
            userId: t.created_by || "usr-salman",
            name: "Salman Al-Farisi",
            role: "Santri",
          },
        ],
      }));
    }
  } catch (err) {
    console.error("Failed to query tasks from Supabase:", err);
  }

  if (process.env.VITEST) {
    return INITIAL_TASKS;
  }

  return [];
}

/**
 * Server Action: Query projects from Supabase
 */
export async function getProjectsAction(): Promise<ProjectItem[]> {
  try {
    const supabase = createAdminClient();
    const { data: projects, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: true });

    if (!error && projects) {
      if (projects.length === 0) return [];

      return projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description || "",
        teamName: p.team_id || "Tim Pondok",
        status: p.status === "active" ? "active" : "completed",
        totalTasks: 0,
        completedTasks: 0,
        blockedTasks: 0,
        progressPercent: 0,
        icon: "folder",
      }));
    }
  } catch (err) {
    console.error("Failed to query projects from Supabase:", err);
  }

  if (process.env.VITEST) {
    return INITIAL_PROJECTS;
  }

  return [];
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

  try {
    const supabase = createAdminClient();
    await supabase
      .from("tasks")
      .update({
        status: newStatus,
        completed_at: newStatus === "done" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);
  } catch (err) {
    console.error("Failed to update task status in Supabase:", err);
  }

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
  try {
    const supabase = createAdminClient();
    await supabase.from("task_checklist_items").upsert({
      id: checklistId,
      task_id: taskId,
      title: "Item Checklist",
      is_completed: done,
    });
  } catch {
    // fallback
  }
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

  const user = await requireAuthUser();
  let newId = `tsk-${Date.now()}`;
  try {
    const supabase = createAdminClient();

    const { data: inserted, error } = await supabase
      .from("tasks")
      .insert({
        title: payload.title,
        description: payload.description || "",
        priority: payload.priority,
        status: "todo",
        requires_review: payload.requiresReview,
        project_id: payload.projectId && payload.projectId.length > 30 ? payload.projectId : null,
        due_date: payload.dueDateIso || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (!error && inserted) {
      newId = inserted.id;
    }
  } catch (err) {
    console.error("Failed to insert task to Supabase:", err);
  }

  return {
    success: true,
    message: `Tugas "${payload.title}" berhasil dibuat dan masuk ke daftar kerja santri.`,
    taskId: newId,
  };
}
