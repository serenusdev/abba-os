import {
  AnnouncementItem,
  ScheduleEventItem,
  WeekDayPickerItem,
} from "./types";

export const WEEK_DAYS_AGENDA: WeekDayPickerItem[] = [
  { dayName: "Min", dateNum: 17, fullDate: "2026-11-17", isActive: false, hasEvent: false },
  { dayName: "Sen", dateNum: 18, fullDate: "2026-11-18", isActive: true, hasEvent: true },
  { dayName: "Sel", dateNum: 19, fullDate: "2026-11-19", isActive: false, hasEvent: true },
  { dayName: "Rab", dateNum: 20, fullDate: "2026-11-20", isActive: false, hasEvent: true },
  { dayName: "Kam", dateNum: 21, fullDate: "2026-11-21", isActive: false, hasEvent: false },
  { dayName: "Jum", dateNum: 22, fullDate: "2026-11-22", isActive: false, hasEvent: true },
  { dayName: "Sab", dateNum: 23, fullDate: "2026-11-23", isActive: false, hasEvent: false },
];

export const INITIAL_ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    id: "ann-01",
    title: "Pembaruan Jam Operasional & Jadwal Evaluasi Pekanan",
    bodyMarkdown:
      "Mulai Senin ini, sesi workshop teknologi bergeser 30 menit lebih awal untuk alokasi sinkronisasi sprint santri dan tahfidz malam bersama pengasuh.",
    priority: "important",
    isPinned: true,
    expiresAtStr: "s.d. 25 Nov",
    targetAudienceLabel: "Semua Santri & Tim",
    publishedAtStr: "18 Nov 2026, 06.00 WIB",
    isRead: false,
  },
  {
    id: "ann-02",
    title: "Tata Tertib Penggunaan Lab Komputer & Server Supabase",
    bodyMarkdown:
      "Seluruh santri wajib menjaga kebersihan ruangan lab, mematikan perangkat setelah selesai digunakan, dan tidak memodifikasi credential production secara sepihak.",
    priority: "normal",
    isPinned: false,
    expiresAtStr: "s.d. 01 Des",
    targetAudienceLabel: "Santri Digital & IT",
    publishedAtStr: "17 Nov 2026, 08.00 WIB",
    isRead: true,
  },
];

export const INITIAL_EVENTS: ScheduleEventItem[] = [
  {
    id: "evt-01",
    timeRangeStr: "08.30 – 11.30 WIB",
    statusBadge: "on_schedule",
    statusLabel: "Sesuai Jadwal",
    category: "teknologi",
    categoryLabel: "Teknologi & Digital",
    title: "Workshop Next.js Server Actions & Supabase RLS",
    location: "Lab Komputer Utama, Gedung B",
    speakerOrHost: "Ustadz Ahmad Fauzi (Tim Digital)",
    attendeesCount: 28,
    actionType: "detail",
    actionLabel: "Detail Sesi",
  },
  {
    id: "evt-02",
    timeRangeStr: "13.30 – 15.00 WIB",
    statusBadge: "upcoming",
    statusLabel: "Akan Datang",
    category: "keagamaan",
    categoryLabel: "Keagamaan & Tahfidz",
    title: "Halaqah Tahsin & Muroja'ah Al-Quran",
    location: "Masjid Baitul Quran Lt. 2",
    groupName: "Santri Digitalpreneur Angkatan 3",
    subNote: "Hadir 10 menit sebelum adzan",
    actionType: "target",
    actionLabel: "Target Surat",
  },
  {
    id: "evt-03",
    timeRangeStr: "20.00 – 21.00 WIB",
    statusBadge: "location_changed",
    statusLabel: "Perubahan Lokasi",
    category: "operasional",
    categoryLabel: "Operasional Pesantren",
    title: "Evaluasi Harian & Muhasabah Malam",
    location: "Aula Pertemuan Utama",
    previousLocation: "Ruang Teori",
    speakerOrHost: "Review Standup & Presensi Harian",
    subNote: "Wajib bawa presensi digital",
    actionType: "map",
    actionLabel: "Lihat Denah",
  },
];
