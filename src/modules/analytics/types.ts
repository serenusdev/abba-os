export interface AuditLogItem {
  id: string;
  eventName: string;
  timeAgo: string;
  actorName: string;
  targetLabel: string;
  actionDetail: string;
  hash?: string;
  createdIso?: string;
}

export interface PolicySetting {
  id: string;
  code: string;
  name: string;
  effectiveFromStr: string;
  attendanceCutoffStr: string;
  attendanceGraceStr: string;
  reportDeadlineStr: string;
  status: "locked" | "active" | "proposed";
}

export interface AttendanceMetricSummary {
  rate: number;
  checkedInCount: number;
  totalPopulation: number;
  onTimeCount: number;
  onTimePercent: number;
  graceCount: number;
  gracePercent: number;
  unrecordedCount: number;
  unrecordedPercent: number;
}

export interface ReportMetricSummary {
  rate: number;
  deadlineStr: string;
  onTimeCount: number;
  lateCount: number;
  unsubmittedCount: number;
  reviewBacklogCount: number;
  reviewBacklogHoursEst: number;
}

export interface TaskSprintMetricSummary {
  completionRate: number;
  completedCount: number;
  totalCount: number;
  overdueCount: number;
}

export type AnalyticsPeriodOption = "this_week" | "this_month" | "q4";
export type AnalyticsScopeOption = "all" | "sentra-digital" | "media-konten" | "tahfidz";

