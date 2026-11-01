export type TaskPriority = "low" | "normal" | "high" | "urgent";

export type TaskStatus =
  | "todo"
  | "in_progress"
  | "in_review"
  | "done"
  | "cancelled";

export type ProjectStatus =
  | "planned"
  | "active"
  | "on_hold"
  | "completed"
  | "archived";

export interface TaskChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface TaskAssignee {
  userId: string;
  name: string;
  role: string;
  avatar?: string;
}

export interface TaskItem {
  id: string;
  projectId?: string;
  projectName?: string;
  projectTeam?: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  requiresReview: boolean;
  reviewerName?: string;
  dueDateStr: string;
  dueDateIso?: string;
  isOverdue?: boolean;
  isDueToday?: boolean;
  isDueThisWeek?: boolean;
  checklist: TaskChecklistItem[];
  assignees: TaskAssignee[];
  locationNote?: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  teamName: string;
  status: ProjectStatus;
  totalTasks: number;
  completedTasks: number;
  blockedTasks: number;
  progressPercent: number;
  icon: string;
}

export type TaskTimeFilter = "all" | "overdue" | "today" | "this_week" | "later";

