import { isAxiosError } from 'axios';

// A 409 from a protected delete carries `blocked_count`: how many rows still
// reference the object. Null when the error isn't a blocked delete.
export function blockedCount(error: unknown): number | null {
  if (!isAxiosError(error) || error.response?.status !== 409) return null;
  const count: unknown = (error.response.data as { blocked_count?: unknown } | undefined)
    ?.blocked_count;
  return typeof count === 'number' ? count : null;
}
