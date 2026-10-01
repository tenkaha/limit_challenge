import { isAxiosError } from 'axios';
import { errorMessage } from './errors';

// A 409 from a protected delete carries `blocked_count`: how many rows still
// reference the object. Null when the error isn't a blocked delete.
export function blockedCount(error: unknown): number | null {
  if (!isAxiosError(error) || error.response?.status !== 409) return null;
  const count: unknown = (error.response.data as { blocked_count?: unknown } | undefined)
    ?.blocked_count;
  return typeof count === 'number' ? count : null;
}

// Toast detail for a failed delete: the caller's wording when the delete was
// blocked by references, otherwise whatever the API said.
export function blockedMessage(error: unknown, describe: (count: number) => string): string {
  const count = blockedCount(error);
  return count === null ? errorMessage(error) : describe(count);
}
