export type MemberType =
  | "santri"
  | "ustadz"
  | "pengurus"
  | "yayasan"
  | "staf";

export type OnlineStatus = "active" | "away" | "offline";

export interface PersonProfile {
  id: string;
  name: string;
  nickname?: string;
  isCurrentUser?: boolean;
  avatar?: string;
  memberType: MemberType;
  memberTypeLabel: string;
  roleLabel: string;
  teamName: string;
  teamId: string;
  primaryReviewerName: string;
  phoneMasked: string;
  phoneUnmasked: string;
  onlineStatus: OnlineStatus;
  dutyFlags: {
    attendanceRequired: boolean;
    reportRequired: boolean;
  };
  specialBadge?: string;
  bio?: string;
}

export interface TeamStructureItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  coordinatorName: string;
  memberCount: number;
  icon: string;
  badgeLabel?: string;
}

export interface PeopleStatsSummary {
  totalActiveMembers: number;
  totalTeams: number;
  santriCount: number;
  ustadzCount: number;
  pengurusCount: number;
  yayasanCount: number;
}
