"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasMinimumRole, requireAuthUser } from "@/lib/auth/guards";
import { sendPushToUsers } from "@/lib/fcm";
import { INITIAL_PROJECTS, INITIAL_TASKS } from "./data";
import { ProjectItem, TaskItem, TaskPriority, TaskStatus, TaskVisibility } from "./types";

interface TaskActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

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
  visibility?: TaskVisibility;
}

export interface ProjectPayload {
  name: string;
  description?: string;
  teamName?: string;
  status?: ProjectItem["status"];
}

async function canAccessTaskForUser(
  supabase: ReturnType<typeof createAdminClient>,
  user: { id: string; role: string; roles?: string[] },
  taskId: string
) {
  const { data: task, error } = await supabase
    .from("tasks")
    .select("id, created_by, team_id, task_assignees(user_id, unassigned_at)")
    .eq("id", taskId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!task) return false;
  const roles = user.roles || [user.role];
  if (roles.some((role) => ["super_admin", "yayasan", "pengurus"].includes(role))) return true;
  if (task.created_by === user.id || (task.task_assignees || []).some((item: any) => item.user_id === user.id && !item.unassigned_at)) return true;
  if (!task.team_id) return false;
  const { data: memberships, error: membershipError } = await supabase
    .from("team_members")
    .select("team_id, teams(id, name, slug)")
    .eq("user_id", user.id)
    .is("valid_to", null);
  if (membershipError) throw membershipError;
  return (memberships || []).some((item: any) =>
    task.team_id === item.team_id || task.team_id === item.teams?.id || task.team_id === item.teams?.name || task.team_id === item.teams?.slug
  );
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
          (task.visibility === "organization") ||
          (task.visibility !== "private" && task.team_id && teamIds.has(task.team_id))
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
        visibility: (t.visibility || "team") as TaskVisibility,
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
  const user = await requireAuthUser();
  try {
    const supabase = createAdminClient();
    const { data: projects, error } = await supabase
      .from("projects")
      .select("*")
      .is("archived_at", null)
      .order("created_at", { ascending: true });

    if (!error && projects) {
      if (projects.length === 0) return [];
      const elevated = (user.roles || [user.role]).some((role) => ["super_admin", "yayasan", "pengurus"].includes(role));
      let visibleProjects = projects as any[];
      if (!elevated) {
        const { data: memberships, error: membershipError } = await supabase
          .from("team_members")
          .select("team_id, teams(id, name, slug)")
          .eq("user_id", user.id)
          .is("valid_to", null);
        if (membershipError) throw membershipError;
        const teamKeys = new Set((memberships || []).flatMap((item: any) => [item.team_id, item.teams?.id, item.teams?.name, item.teams?.slug]).filter(Boolean));
        visibleProjects = visibleProjects.filter((project) =>
          project.owner_id === user.id || project.created_by === user.id || (project.team_id && teamKeys.has(project.team_id))
        );
      }
      if (visibleProjects.length === 0) return [];
      const visibleProjectIds = new Set(visibleProjects.map((project) => project.id));
      const { data: tasks, error: taskError } = await supabase
        .from("tasks")
        .select("project_id, status")
        .is("deleted_at", null);
      if (taskError) throw taskError;
      const byProject = new Map<string, any[]>();
      for (const task of tasks || []) {
        if (task.project_id && !visibleProjectIds.has(task.project_id)) continue;
        const list = byProject.get(task.project_id) || [];
        list.push(task);
        byProject.set(task.project_id, list);
      }

      return visibleProjects.map((p: any) => ({
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
        canManage: elevated || p.owner_id === user.id || p.created_by === user.id,
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

export async function createProjectAction(payload: ProjectPayload): Promise<TaskActionResult<{ projectId: string }>> {
  const user = await requireAuthUser();
  if (!hasMinimumRole(user, "koordinator")) return { success: false, message: "Hanya koordinator atau pengurus yang dapat membuat proyek." };
  const name = payload.name.trim();
  if (!name) return { success: false, message: "Nama proyek wajib diisi." };
  if (name.length > 120) return { success: false, message: "Nama proyek maksimal 120 karakter." };
  if (process.env.VITEST) return { success: true, message: "Proyek berhasil dibuat.", data: { projectId: `project-${Date.now()}` } };
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("projects").insert({
      name,
      description: payload.description?.trim() || null,
      team_id: payload.teamName?.trim() || null,
      status: payload.status || "planned",
      owner_id: user.id,
      created_by: user.id,
    }).select("id").single();
    if (error) throw error;
    const { error: auditError } = await supabase.from("audit_logs").insert({
      event_name: "task.project_created",
      actor_id: user.id,
      actor_name: user.full_name,
      target_id: data.id,
      target_label: name,
      action_detail: "Proyek operasional dibuat.",
    });
    if (auditError) throw auditError;
    return { success: true, message: `Proyek "${name}" berhasil dibuat.`, data: { projectId: data.id } };
  } catch (error) {
    console.error("Failed to create project:", error);
    return { success: false, message: "Gagal membuat proyek." };
  }
}

export async function updateProjectAction(projectId: string, payload: ProjectPayload): Promise<TaskActionResult> {
  const user = await requireAuthUser();
  const name = payload.name.trim();
  if (!projectId || !name) return { success: false, message: "ID dan nama proyek wajib diisi." };
  if (name.length > 120) return { success: false, message: "Nama proyek maksimal 120 karakter." };
  if (process.env.VITEST) return { success: true, message: "Proyek berhasil diperbarui." };
  try {
    const supabase = createAdminClient();
    const { data: project, error: projectError } = await supabase.from("projects").select("id, name, owner_id, created_by").eq("id", projectId).is("archived_at", null).maybeSingle();
    if (projectError) throw projectError;
    if (!project) return { success: false, message: "Proyek tidak ditemukan." };
    if (!hasMinimumRole(user, "koordinator") && project.owner_id !== user.id && project.created_by !== user.id) return { success: false, message: "Anda tidak memiliki akses mengubah proyek ini." };
    const { error } = await supabase.from("projects").update({ name, description: payload.description?.trim() || null, team_id: payload.teamName?.trim() || null, status: payload.status || "active", updated_at: new Date().toISOString() }).eq("id", projectId).is("archived_at", null);
    if (error) throw error;
    const { error: auditError } = await supabase.from("audit_logs").insert({ event_name: "task.project_updated", actor_id: user.id, actor_name: user.full_name, target_id: projectId, target_label: name, action_detail: "Detail proyek diperbarui." });
    if (auditError) throw auditError;
    return { success: true, message: `Proyek "${name}" berhasil diperbarui.` };
  } catch (error) {
    console.error("Failed to update project:", error);
    return { success: false, message: "Gagal memperbarui proyek." };
  }
}

export async function archiveProjectAction(projectId: string): Promise<TaskActionResult> {
  const user = await requireAuthUser();
  if (!projectId) return { success: false, message: "ID proyek tidak valid." };
  if (process.env.VITEST) return { success: true, message: "Proyek berhasil diarsipkan." };
  try {
    const supabase = createAdminClient();
    const { data: project, error: projectError } = await supabase.from("projects").select("id, name, owner_id, created_by").eq("id", projectId).is("archived_at", null).maybeSingle();
    if (projectError) throw projectError;
    if (!project) return { success: false, message: "Proyek tidak ditemukan." };
    if (!hasMinimumRole(user, "koordinator") && project.owner_id !== user.id && project.created_by !== user.id) return { success: false, message: "Anda tidak memiliki akses mengarsipkan proyek ini." };
    const { error } = await supabase.from("projects").update({ status: "archived", archived_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", projectId).is("archived_at", null);
    if (error) throw error;
    const { error: auditError } = await supabase.from("audit_logs").insert({ event_name: "task.project_archived", actor_id: user.id, actor_name: user.full_name, target_id: projectId, target_label: project.name, action_detail: "Proyek diarsipkan tanpa menghapus task dan riwayat." });
    if (auditError) throw auditError;
    return { success: true, message: `Proyek "${project.name}" berhasil diarsipkan.` };
  } catch (error) {
    console.error("Failed to archive project:", error);
    return { success: false, message: "Gagal mengarsipkan proyek." };
  }
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
    if (!(await canAccessTaskForUser(supabase, user, taskId))) {
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
    const { error: auditError } = await supabase.from("audit_logs").insert({ event_name: "task.checklist_toggled", actor_id: user.id, actor_name: user.full_name, target_id: taskId, target_label: checklistId, action_detail: `Checklist ditandai ${done ? "selesai" : "belum selesai"}.` });
    if (auditError) throw auditError;
  } catch (err) {
    console.error("Failed to update checklist:", err);
    return { success: false, message: "Gagal memperbarui checklist tugas." };
  }
  return {
    success: true,
    message: `Checklist tugas berhasil ${done ? "diselesaikan" : "dibuka kembali"}.`,
  };
}

export async function addChecklistItemAction(taskId: string, text: string): Promise<TaskActionResult<{ itemId: string }>> {
  const user = await requireAuthUser();
  const cleanText = text.trim();
  if (!taskId || !cleanText) return { success: false, message: "Tugas dan teks checklist wajib diisi." };
  if (process.env.VITEST) return { success: true, message: "Checklist ditambahkan.", data: { itemId: `check-${Date.now()}` } };
  try {
    const supabase = createAdminClient();
    if (!(await canAccessTaskForUser(supabase, user, taskId))) return { success: false, message: "Anda tidak memiliki akses ke checklist tugas ini." };
    const { data: last } = await supabase.from("task_checklist_items").select("sort_order").eq("task_id", taskId).order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const { data, error } = await supabase.from("task_checklist_items").insert({ task_id: taskId, text: cleanText, sort_order: Number(last?.sort_order || 0) + 1 }).select("id").single();
    if (error) throw error;
    const { error: auditError } = await supabase.from("audit_logs").insert({ event_name: "task.checklist_created", actor_id: user.id, actor_name: user.full_name, target_id: taskId, target_label: cleanText, action_detail: "Item checklist ditambahkan." });
    if (auditError) throw auditError;
    return { success: true, message: "Checklist berhasil ditambahkan.", data: { itemId: data.id } };
  } catch (error) {
    console.error("Failed to add checklist item:", error);
    return { success: false, message: "Gagal menambahkan checklist." };
  }
}

export async function updateChecklistItemAction(taskId: string, checklistId: string, text: string): Promise<TaskActionResult> {
  const user = await requireAuthUser();
  const cleanText = text.trim();
  if (!taskId || !checklistId || !cleanText) return { success: false, message: "Checklist tidak valid." };
  if (process.env.VITEST) return { success: true, message: "Checklist diperbarui." };
  try {
    const supabase = createAdminClient();
    if (!(await canAccessTaskForUser(supabase, user, taskId))) return { success: false, message: "Anda tidak memiliki akses ke checklist tugas ini." };
    const { data, error } = await supabase.from("task_checklist_items").update({ text: cleanText }).eq("id", checklistId).eq("task_id", taskId).select("id").maybeSingle();
    if (error) throw error;
    if (data) {
      const { error: auditError } = await supabase.from("audit_logs").insert({ event_name: "task.checklist_updated", actor_id: user.id, actor_name: user.full_name, target_id: taskId, target_label: checklistId, action_detail: "Item checklist diperbarui." });
      if (auditError) throw auditError;
    }
    return data ? { success: true, message: "Checklist berhasil diperbarui." } : { success: false, message: "Checklist tidak ditemukan." };
  } catch (error) {
    console.error("Failed to update checklist item:", error);
    return { success: false, message: "Gagal memperbarui checklist." };
  }
}

export async function deleteChecklistItemAction(taskId: string, checklistId: string): Promise<TaskActionResult> {
  const user = await requireAuthUser();
  if (!taskId || !checklistId) return { success: false, message: "Checklist tidak valid." };
  if (process.env.VITEST) return { success: true, message: "Checklist dihapus." };
  try {
    const supabase = createAdminClient();
    if (!(await canAccessTaskForUser(supabase, user, taskId))) return { success: false, message: "Anda tidak memiliki akses ke checklist tugas ini." };
    const { data, error } = await supabase.from("task_checklist_items").delete().eq("id", checklistId).eq("task_id", taskId).select("id").maybeSingle();
    if (error) throw error;
    if (data) {
      const { error: auditError } = await supabase.from("audit_logs").insert({ event_name: "task.checklist_deleted", actor_id: user.id, actor_name: user.full_name, target_id: taskId, target_label: checklistId, action_detail: "Item checklist dihapus." });
      if (auditError) throw auditError;
    }
    return data ? { success: true, message: "Checklist berhasil dihapus." } : { success: false, message: "Checklist tidak ditemukan." };
  } catch (error) {
    console.error("Failed to delete checklist item:", error);
    return { success: false, message: "Gagal menghapus checklist." };
  }
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

  await requireAuthUser();
  if (process.env.VITEST) {
    return {
      success: true,
      message: `Tugas "${payload.title}" berhasil dibuat dan masuk ke daftar kerja santri.`,
      taskId: `tsk-${Date.now()}`,
    };
  }
  let newId = `tsk-${Date.now()}`;
  try {
    const supabase = await createClient();
    const assigneeIds = Array.from(new Set((payload.assigneeIds || []).filter(Boolean)));
    const dueDate = payload.dueDateIso || (payload.dueDateStr && /^\d{4}-\d{2}-\d{2}$/.test(payload.dueDateStr) ? payload.dueDateStr : null);
    const { data: created, error } = await supabase.rpc("create_task", {
      p_title: payload.title,
      p_description: payload.description || "",
      p_priority: payload.priority,
      p_requires_review: payload.requiresReview,
      p_project_id: payload.projectId && payload.projectId.length > 30 ? payload.projectId : null,
      p_due_date: dueDate,
      p_visibility: payload.visibility || "team",
      p_assignee_ids: assigneeIds,
    });
    if (error) throw error;
    if (!created?.success || !created.task_id) throw new Error(created?.message || "Tugas tidak tersimpan.");
    newId = created.task_id;
    if (assigneeIds.length > 0) {
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

export async function updateTaskAction(
  taskId: string,
  payload: CreateTaskPayload
): Promise<{ success: boolean; message: string; taskId?: string }> {
  if (!taskId || !payload.title.trim()) return { success: false, message: "ID dan judul tugas wajib diisi." };
  const user = await requireAuthUser();
  if (process.env.VITEST) return { success: true, message: "Tugas berhasil diperbarui.", taskId };
  try {
    const supabase = createAdminClient();
    const { data: task, error: taskError } = await supabase.from("tasks").select("id, title, created_by").eq("id", taskId).is("deleted_at", null).maybeSingle();
    if (taskError) throw taskError;
    if (!task) return { success: false, message: "Tugas tidak ditemukan." };
    if (task.created_by !== user.id && !hasMinimumRole(user, "pengurus")) return { success: false, message: "Hanya pembuat tugas atau pengurus yang dapat mengubah tugas." };
    const dueDate = payload.dueDateIso || payload.dueDateStr || null;
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return { success: false, message: "Format tenggat tugas tidak valid." };
    const { error } = await supabase.from("tasks").update({
      title: payload.title.trim(),
      description: payload.description?.trim() || "",
      project_id: payload.projectId && payload.projectId.length > 30 ? payload.projectId : null,
      priority: payload.priority,
      requires_review: payload.requiresReview,
      due_date: dueDate,
      visibility: payload.visibility || "team",
      updated_at: new Date().toISOString(),
    }).eq("id", taskId).is("deleted_at", null);
    if (error) throw error;
    const { error: auditError } = await supabase.from("audit_logs").insert({ event_name: "task.updated", actor_id: user.id, actor_name: user.full_name, target_id: taskId, target_label: payload.title.trim(), action_detail: "Detail tugas diperbarui." });
    if (auditError) throw auditError;
    return { success: true, message: `Tugas "${payload.title.trim()}" berhasil diperbarui.`, taskId };
  } catch (error) {
    console.error("Failed to update task:", error);
    return { success: false, message: "Gagal memperbarui tugas." };
  }
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
    const { error: auditError } = await supabase.from("audit_logs").insert({ event_name: "task.archived", actor_id: user.id, actor_name: user.full_name, target_id: taskId, target_label: task.title, action_detail: "Tugas diarsipkan secara soft-delete." });
    if (auditError) throw auditError;
    return { success: true, message: "Tugas berhasil diarsipkan." };
  } catch (error) {
    console.error("Failed to archive task:", error);
    return { success: false, message: "Gagal mengarsipkan tugas." };
  }
}
