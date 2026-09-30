import { isAxiosError } from 'axios';

export type FieldErrors = Record<string, string>;

// DRF returns {"field": ["msg", ...]} for validation errors and {"detail": "msg"} otherwise.
export function fieldErrors(error: unknown): FieldErrors {
  if (!isAxiosError(error) || error.response?.status !== 400) return {};
  const data: unknown = error.response.data;
  if (typeof data !== 'object' || data === null) return {};
  return Object.fromEntries(
    Object.entries(data).map(([field, messages]) => [
      field,
      Array.isArray(messages) ? String(messages[0]) : String(messages),
    ]),
  );
}

export function errorMessage(error: unknown): string {
  if (!isAxiosError(error)) return 'Something went wrong.';
  if (!error.response) return 'Cannot reach the API. Is the backend running?';
  const data: unknown = error.response.data;
  if (typeof data === 'object' && data !== null) {
    if ('detail' in data && typeof data.detail === 'string') return data.detail;
    const errors = fieldErrors(error);
    if (errors.non_field_errors) return errors.non_field_errors;
    const [first] = Object.values(errors);
    if (first) return first;
  }
  return `Request failed (${error.response.status}).`;
}

// Network failures and 5xx may succeed on retry; a 4xx will fail the same way again.
export function isRetryable(error: unknown): boolean {
  if (!isAxiosError(error)) return true;
  const status = error.response?.status;
  return status === undefined || status >= 500;
}
