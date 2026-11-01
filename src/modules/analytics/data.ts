import {
  AttendanceMetricSummary,
  AuditLogItem,
  PolicySetting,
  ReportMetricSummary,
  TaskSprintMetricSummary,
} from "./types";

export const INITIAL_ATTENDANCE_METRIC: AttendanceMetricSummary = {
  rate: 94.8,
  checkedInCount: 36,
  totalPopulation: 38,
  onTimeCount: 32,
  onTimePercent: 84.2,
  graceCount: 4,
  gracePercent: 10.5,
  unrecordedCount: 2,
  unrecordedPercent: 5.3,
};

export const INITIAL_REPORT_METRIC: ReportMetricSummary = {
  rate: 91.2,
  deadlineStr: "Batas 21.00 WIB",
  onTimeCount: 31,
  lateCount: 4,
  unsubmittedCount: 3,
  reviewBacklogCount: 6,
  reviewBacklogHoursEst: 3.2,
};

export const INITIAL_TASK_METRIC: TaskSprintMetricSummary = {
  completionRate: 78,
  completedCount: 24,
  totalCount: 31,
  overdueCount: 1,
};

export const ACTIVE_POLICY_SETTING: PolicySetting = {
  id: "pol-2026-v21",
  code: "POL-2026-v2.1",
  name: "Kebijakan Operasional Terpadu Semester Ganjil 2026/2027",
  effectiveFromStr: "Efektif sejak 1 Nov 2026",
  attendanceCutoffStr: "08.00 WIB",
  attendanceGraceStr: "Toleransi s/d 08.15 WIB",
  reportDeadlineStr: "21.00 WIB (Sore/Malam)",
  status: "locked",
};

export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: "aud-01",
    eventName: "attendance.correction_approved",
    timeAgo: "10m lalu",
    actorName: "Ustadz Ahmad Fauzi",
    targetLabel: "Fikri Haikal (ATT-007)",
    actionDetail: "Status diubah ke Tepat Waktu (Alasan: Penugasan lab riset).",
    hash: "sha256-hash-chain-001",
  },
  {
    id: "aud-02",
    eventName: "policy.settings_updated",
    timeAgo: "Kemarin 16:40",
    actorName: "Super Admin",
    targetLabel: "POL-2026-v2.1",
    actionDetail: "Kalender libur tasyafa'ah semester ganjil ditambahkan.",
    hash: "sha256-hash-chain-002",
  },
  {
    id: "aud-03",
    eventName: "iam.account_approved",
    timeAgo: "17 Nov 14:15",
    actorName: "Super Admin",
    targetLabel: "Santri Baru (M. Ridwan)",
    actionDetail: "Penetapan hak akses peranan: santri divisi Media IT.",
    hash: "sha256-hash-chain-003",
  },
];

