export type AttendanceClassification =
  | "on_time"
  | "grace"
  | "late"
  | "excused"
  | "sick"
  | "no_checkin";

export interface AttendanceRecordItem {
  id: string;
  dateStr: string;
  dateFormatted: string;
  timeStr: string;
  classification: AttendanceClassification;
  label: string;
  sessionTitle: string;
  canCorrect: boolean;
  notes?: string;
}

export interface DayAttendanceStatus {
  dayName: string;
  dateNum: number;
  fullDate: string;
  status: AttendanceClassification | "holiday";
  icon: string;
  label: string;
  isToday?: boolean;
}

export interface AttendanceStatsSummary {
  onTimeCount: number;
  graceCount: number;
  excusedCount: number;
  lateCount: number;
  unrecordedCount: number;
  attendanceRate: number;
}

export interface CorrectionRequestPayload {
  attendanceDate: string;
  recordedTime: string;
  reasonCategory: string;
  notes?: string;
  evidenceUrl?: string;
}
