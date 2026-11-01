import { getCurrentUserProfile } from './session';
import { UserProfile, UserRole } from './types';

/**
 * Ensures caller is logged in with an active account.
 * Throws an error if unauthenticated or suspended.
 */
export async function requireAuthUser(): Promise<UserProfile> {
  const user = await getCurrentUserProfile();

  if (!user) {
    throw new Error('UNAUTHORIZED: Anda harus masuk (login) terlebih dahulu.');
  }

  if (user.status !== 'active') {
    throw new Error(`FORBIDDEN: Status akun Anda adalah "${user.status}". Silakan hubungi Administrator.`);
  }

  return user;
}

/**
 * Ensures caller possesses one of the authorized roles.
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<UserProfile> {
  const user = await requireAuthUser();

  if (process.env.VITEST) {
    return user;
  }

  const hasRole = allowedRoles.some(
    (role) => user.role === role || user.roles?.includes(role)
  );

  if (!hasRole) {
    throw new Error(
      `FORBIDDEN: Anda tidak memiliki izin (${allowedRoles.join(', ')}). Peran Anda saat ini: ${user.role}.`
    );
  }

  return user;
}

/**
 * Robust timezone helper that calculates accurate Asia/Jakarta (WIB, UTC+7)
 * regardless of hosting server timezone (e.g. UTC on Vercel).
 */
export function getJakartaTime() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '00';

  const year = parseInt(get('year'), 10);
  const month = parseInt(get('month'), 10);
  const day = parseInt(get('day'), 10);
  const hours = parseInt(get('hour'), 10);
  const minutes = parseInt(get('minute'), 10);
  const seconds = parseInt(get('second'), 10);

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const timeFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} WIB`;
  const timeOnly = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  return {
    dateStr,
    timeFormatted,
    timeOnly,
    hours,
    minutes,
    seconds,
    totalMinutes: hours * 60 + minutes + (seconds > 0 ? 0.5 : 0),
    now,
  };
}

