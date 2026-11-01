import { AttendanceRecordItem, DayAttendanceStatus, AttendanceStatsSummary } from "./types";

export const WEEK_ATTENDANCE_STRIP: DayAttendanceStatus[] = [
  {
    dayName: "Sen",
    dateNum: 10,
    fullDate: "2026-11-10",
    status: "on_time",
    icon: "check_circle",
    label: "Tepat Waktu",
  },
  {
    dayName: "Sel",
    dateNum: 11,
    fullDate: "2026-11-11",
    status: "on_time",
    icon: "check_circle",
    label: "Tepat Waktu",
  },
  {
    dayName: "Rab",
    dateNum: 12,
    fullDate: "2026-11-12",
    status: "grace",
    icon: "timelapse",
    label: "Masa Toleransi",
  },
  {
    dayName: "Kam",
    dateNum: 13,
    fullDate: "2026-11-13",
    status: "on_time",
    icon: "check_circle",
    label: "Tepat Waktu",
  },
  {
    dayName: "Jum",
    dateNum: 14,
    fullDate: "2026-11-14",
    status: "excused",
    icon: "assignment",
    label: "Izin Resmi",
  },
  {
    dayName: "Sab",
    dateNum: 15,
    fullDate: "2026-11-15",
    status: "on_time",
    icon: "check_circle",
    label: "Tepat Waktu",
  },
  {
    dayName: "Ahad",
    dateNum: 16,
    fullDate: "2026-11-16",
    status: "holiday",
    icon: "remove_circle_outline",
    label: "Libur Operasional",
  },
];

export const ATTENDANCE_HISTORY: AttendanceRecordItem[] = [
  {
    id: "att-hist-01",
    dateStr: "Sabtu, 16 Nov",
    dateFormatted: "Sabtu, 16 November 2026",
    timeStr: "07:54:12 WIB",
    classification: "on_time",
    label: "Tepat Waktu",
    sessionTitle: "Presensi Kelas Hadits Subuh",
    canCorrect: true,
  },
  {
    id: "att-hist-02",
    dateStr: "Jumat, 15 Nov",
    dateFormatted: "Jumat, 15 November 2026",
    timeStr: "Surat Dispensasi Santri",
    classification: "excused",
    label: "Izin Resmi",
    sessionTitle: "Kunjungan Keluarga Terkonfirmasi",
    canCorrect: false,
    notes: "Disetujui Mudir",
  },
  {
    id: "att-hist-03",
    dateStr: "Kamis, 14 Nov",
    dateFormatted: "Kamis, 14 November 2026",
    timeStr: "08:08:44 WIB",
    classification: "grace",
    label: "Masa Toleransi",
    sessionTitle: "Piket Dapur Umum Asrama",
    canCorrect: true,
  },
];

export const ATTENDANCE_MONTHLY_STATS: AttendanceStatsSummary = {
  onTimeCount: 13,
  graceCount: 2,
  excusedCount: 1,
  lateCount: 0,
  unrecordedCount: 0,
  attendanceRate: 94.2,
};
