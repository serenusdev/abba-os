export type EventCategory =
  | "teknologi"
  | "keagamaan"
  | "operasional"
  | "umum";

export type AudienceConfig = {
  scope: "all" | "member_type" | "team" | "users";
  memberTypes?: string[];
  teamIds?: string[];
  userIds?: string[];
};

export type EventStatusBadge =
  | "on_schedule"
  | "upcoming"
  | "location_changed"
  | "cancelled";

export interface ScheduleEventItem {
  id: string;
  startsAt?: string;
  endsAt?: string;
  dateStr?: string;
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
  audienceConfig?: AudienceConfig;
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
  audienceConfig?: AudienceConfig;
}

export interface WeekDayPickerItem {
  dayName: string;
  dateNum: number;
  fullDate: string;
  isActive: boolean;
  hasEvent: boolean;
}

