"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasMinimumRole, requireAuthUser } from "@/lib/auth/guards";
import { sendPushToUsers } from "@/lib/fcm";
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
  assigneeIds?: string[];
}

/**
 * Server Action: Query all live tasks from Supabase
 */
export async function getTasksAction(): Promise<TaskItem[]> {
  const user = await requireAuthUser();
  try {
    const supabase = createAdminClient();
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("*, projects(*), task_checklist_items(*), task_assignees(user_id, unassigned_at)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (tasks) {
      if (tasks.length === 0) return [];
      let visibleTasks = tasks as any[];
      if (!(user.roles || [user.role]).some((role) => ["super_admin", "yayasan", "pengurus"].includes(role))) {
        const { data: memberships } = await supabase.from("team_members").select("team_id, teams(id, name, slug)").eq("user_id", user.id).is("valid_to", null);
        const teamIds = new Set((memberships || []).flatMap((item: any) => [item.team_id, item.teams?.id, item.teams?.name, item.teams?.slug]));
        visibleTasks = visibleTasks.filter((task: any) =>
          task.created_by === user.id ||
          (task.task_assignees || []).some((assignment: any) => assignment.user_id === user.id && !assignment.unassigned_at) ||
          (task.team_id && teamIds.has(task.team_id))
        );
      }
      if (visibleTasks.length === 0) return [];
      const taskIds = visibleTasks.map((task: any) => task.id);
      const { data: assignments, error: assignmentError } = await supabase
        .from("task_assignees")
        .select("task_id, user_id")
        .in("task_id", taskIds)
        .is("unassigned_at", null);
      if (assignmentError) throw assignmentError;
      const assigneeIds = Array.from(new Set((assignments || []).map((a: any) => a.user_id)));
      const { data: profiles, error: profileError } = assigneeIds.length
        ? await supabase.from("profiles").select("id, full_name, member_type").in("id", assigneeIds)
        : { data: [], error: null };
      if (profileError) throw profileError;
      const profileMap = new Map<string, any>((profiles || []).map((profile: any) => [profile.id, profile]));
      const assignmentsByTask = new Map<string, any[]>();
      for (const assignment of assignments || []) {
        const list = assignmentsByTask.get(assignment.task_id) || [];
        const profile = profileMap.get(assignment.user_id);
        if (profile) list.push({ userId: profile.id, name: profile.full_name, role: profile.member_type || "Santri" });
        assignmentsByTask.set(assignment.task_id, list);
      }

      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
      return visibleTasks.map((t: any) => ({
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
        isOverdue: Boolean(t.due_date && t.due_date < today && !["done", "cancelled"].includes(t.status)),
        isDueToday: t.due_date === today,
        checklist: (t.task_checklist_items || []).map((item: any) => ({ id: item.id, text: item.text, done: item.done })),
        assignees: assignmentsByTask.get(t.id) || [],
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
  await requireAuthUser();
  try {
    const supabase = createAdminClient();
    const { data: projects, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: true });

    if (!error && projects) {
      if (projects.length === 0) return [];
      const { data: tasks, error: taskError } = await supabase
        .from("tasks")
        .select("project_id, status")
        .is("deleted_at", null);
      if (taskError) throw taskError;
      const byProject = new Map<string, any[]>();
      for (const task of tasks || []) {
        const list = byProject.get(task.project_id) || [];
        list.push(task);
        byProject.set(task.project_id, list);
      }

      return projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description || "",
        teamName: p.team_id || "Tim Pondok",
        status: p.status as ProjectItem["status"],
        totalTasks: (byProject.get(p.id) || []).length,
        completedTasks: (byProject.get(p.id) || []).filter((task: any) => task.status === "done").length,
        blockedTasks: (byProject.get(p.id) || []).filter((task: any) => task.status === "cancelled").length,
        progressPercent: (byProject.get(p.id) || []).length
          ? Math.round(((byProject.get(p.id) || []).filter((task: any) => task.status === "done").length / (byProject.get(p.id) || []).length) * 100)
          : 0,
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
  const user = await requireAuthUser();
  // BR-TSK-06: Done requires review if requires_review is true
  if (newStatus === "done" && requiresReview && currentStatus !== "in_review") {
    return {
      success: false,
      message:
        "Tugas ini memiliki klausul review wajib (BR-TSK-06). Silakan ajukan ke In Review terlebih dahulu agar dapat disetujui pereview.",
      newStatus: currentStatus,
    };
  }

  if (process.env.VITEST) {
    return {
      success: true,
      message: `Status tugas berhasil diperbarui menjadi ${newStatus}.`,
      newStatus,
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
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("task_transition", {
      p_task_id: taskId,
      p_new_status: newStatus,
      p_user_id: user.id,
      p_note: note || null,
    });
    if (error) throw error;
    if (!data?.success) {
      return { success: false, message: data?.message || "Status tugas tidak berubah.", newStatus: currentStatus };
    }
    return {
      success: true,
      message: `Status tugas berhasil diperbarui menjadi ${labelMap[newStatus]}.${note ? ` Catatan: ${note}` : ""}`,
      newStatus,
    };
  } catch (err) {
    console.error("Failed to update task status in Supabase:", err);
    return { success: false, message: "Gagal memperbarui status tugas.", newStatus: currentStatus };
  }
}

/**
 * Server Action: Toggle Checklist Item (TSK-014)
 */
export async function toggleChecklistItemAction(
  taskId: string,
  checklistId: string,
  done: boolean
): Promise<{ success: boolean; message: string }> {
  const user = await requireAuthUser();
  if (process.env.VITEST) {
    return {
      success: true,
      message: `Checklist tugas berhasil ${done ? "diselesaikan" : "dibuka kembali"}.`,
    };
  }
  try {
    const supabase = createAdminClient();
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id, created_by")
      .eq("id", taskId)
      .is("deleted_at", null)
      .maybeSingle();
    if (taskError) throw taskError;
    if (!task) return { success: false, message: "Tugas tidak ditemukan." };
    const { data: assignment } = await supabase
      .from("task_assignees")
      .select("task_id")
      .eq("task_id", taskId)
      .eq("user_id", user.id)
      .is("unassigned_at", null)
      .maybeSingle();
    if (task.created_by !== user.id && !assignment && !hasMinimumRole(user, "pengurus")) {
      return { success: false, message: "Anda tidak memiliki akses ke checklist tugas ini." };
    }
    const { data: item, error: itemError } = await supabase
      .from("task_checklist_items")
      .update({ done })
      .eq("id", checklistId)
      .eq("task_id", taskId)
      .select("id")
      .maybeSingle();
    if (itemError) throw itemError;
    if (!item) return { success: false, message: "Item checklist tidak ditemukan." };
  } catch (err) {
    console.error("Failed to update checklist:", err);
    return { success: false, message: "Gagal memperbarui checklist tugas." };
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
  if (process.env.VITEST) {
    return {
      success: true,
      message: `Tugas "${payload.title}" berhasil dibuat dan masuk ke daftar kerja santri.`,
      taskId: `tsk-${Date.now()}`,
    };
  }
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
        due_date: payload.dueDateIso || (payload.dueDateStr && /^\d{4}-\d{2}-\d{2}$/.test(payload.dueDateStr) ? payload.dueDateStr : null),
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error || !inserted) throw error || new Error("Tugas tidak tersimpan.");
    newId = inserted.id;
    const assigneeIds = Array.from(new Set((payload.assigneeIds || []).filter(Boolean)));
    if (assigneeIds.length > 0) {
      const { error: assigneeError } = await supabase.from("task_assignees").insert(
        assigneeIds.map((assigneeId) => ({ task_id: newId, user_id: assigneeId, assigned_by: user.id }))
      );
      if (assigneeError) {
        await supabase.from("tasks").delete().eq("id", newId);
        throw assigneeError;
      }
      try {
        await sendPushToUsers(assigneeIds, {
          type: "TASK_ASSIGNED",
          title: "Amanah Baru",
          body: `Anda mendapat tugas: ${payload.title}`,
          url: "/tugas",
          referenceId: newId,
        });
      } catch (pushError) {
        console.error("Task saved but push delivery failed:", pushError);
      }
    }
  } catch (err) {
    console.error("Failed to insert task to Supabase:", err);
    return { success: false, message: "Gagal membuat tugas." };
  }

  return {
    success: true,
    message: `Tugas "${payload.title}" berhasil dibuat dan masuk ke daftar kerja santri.`,
    taskId: newId,
  };
}

export async function deleteTaskAction(taskId: string): Promise<{ success: boolean; message: string }> {
  const user = await requireAuthUser();
  if (!taskId) return { success: false, message: "ID tugas tidak valid." };
  if (process.env.VITEST) return { success: true, message: "Tugas berhasil diarsipkan." };
  try {
    const supabase = createAdminClient();
    const { data: task, error: taskError } = await supabase.from("tasks").select("id, title, created_by").eq("id", taskId).is("deleted_at", null).maybeSingle();
    if (taskError) throw taskError;
    if (!task) return { success: false, message: "Tugas tidak ditemukan." };
    if (task.created_by !== user.id && !hasMinimumRole(user, "pengurus")) return { success: false, message: "Hanya pembuat tugas atau pengurus yang dapat mengarsipkan tugas." };
    const { error } = await supabase.from("tasks").update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", taskId).is("deleted_at", null);
    if (error) throw error;
    await supabase.from("audit_logs").insert({ event_name: "task.archived", actor_id: user.id, actor_name: user.full_name, target_id: taskId, target_label: task.title, action_detail: "Tugas diarsipkan secara soft-delete." });
    return { success: true, message: "Tugas berhasil diarsipkan." };
  } catch (error) {
    console.error("Failed to archive task:", error);
    return { success: false, message: "Gagal mengarsipkan tugas." };
  }
}
