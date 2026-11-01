export type EventCategory =
  | "teknologi"
  | "keagamaan"
  | "operasional"
  | "umum";

export type EventStatusBadge =
  | "on_schedule"
  | "upcoming"
  | "location_changed"
  | "cancelled";

export interface ScheduleEventItem {
  id: string;
  timeRangeStr: string;
  statusBadge: EventStatusBadge;
  statusLabel: string;
  category: EventCategory;
  categoryLabel: string;
  title: string;
  location: string;
  previousLocation?: string;
  speakerOrHost?: string;
  groupName?: string;
  attendeesCount?: number;
  actionType: "detail" | "target" | "map";
  actionLabel: string;
  subNote?: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  bodyMarkdown: string;
  priority: "normal" | "important";
  isPinned: boolean;
  expiresAtStr?: string;
  targetAudienceLabel: string;
  publishedAtStr: string;
  isRead: boolean;
}

export interface WeekDayPickerItem {
  dayName: string;
  dateNum: number;
  fullDate: string;
  isActive: boolean;
  hasEvent: boolean;
}
