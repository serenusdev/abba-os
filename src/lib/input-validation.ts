export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isDateOnly(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isTimeOnly(value: unknown): value is string {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function isNonEmptyString(value: unknown, maxLength = 10000): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}
