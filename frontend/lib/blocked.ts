import { isAxiosError } from 'axios';

// A 409 from a protected delete reads "Cannot delete: it is referenced by N <things>."
// Returns N, or null when the error isn't that shape.
export function blockedCount(error: unknown): number | null {
  if (!isAxiosError(error) || error.response?.status !== 409) return null;
  const detail: unknown = (error.response.data as { detail?: unknown } | undefined)?.detail;
  const match = typeof detail === 'string' ? /referenced by (\d+)/.exec(detail) : null;
  return match?.[1] ? Number(match[1]) : null;
}
