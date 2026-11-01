import { UserRole, AccountStatus } from "@/lib/auth/types";

export interface AccountApplicant {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  roleClaim: string;
  appliedAt: string;
  notes: string;
  turnstileVerified: boolean;
  status: AccountStatus;
  initialInitials: string;
}

export interface ActiveUserSession {
  id: string;
  fullName: string;
  email: string;
  roles: string[];
  roleTitle: string;
  teamName: string;
  status: AccountStatus;
  initials: string;
  activeDevicesCount: number;
  primaryDevice: string;
  mfaEnabled: boolean;
  isVerifiedReviewer?: boolean;
}

export interface ManualAccountPayload {
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  teamName: string;
  temporaryPassword?: string;
  notes?: string;
}

export interface RejectionPayload {
  applicantId: string;
  reason: string;
}
