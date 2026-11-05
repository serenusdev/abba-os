export class QueryError extends Error {
  readonly correlationId: string;

  constructor(message: string, correlationId: string) {
    super(`${message} (ID: ${correlationId})`);
    this.name = "QueryError";
    this.correlationId = correlationId;
  }
}

export function throwQueryError(scope: string, error: unknown): never {
  const correlationId = `QRY-${Date.now().toString(36).toUpperCase()}`;
  console.error(`[${correlationId}] ${scope}`, error);
  throw new QueryError("Data gagal dimuat. Coba lagi atau hubungi administrator", correlationId);
}
