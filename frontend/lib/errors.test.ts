import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { errorMessage, fieldErrors, isRetryable } from './errors';

const apiError = (status: number, data: unknown) =>
  new AxiosError('failed', undefined, undefined, undefined, {
    status,
    data,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

describe('fieldErrors', () => {
  it('keeps the first DRF message per field', () => {
    const error = apiError(400, { vin: ['Bad VIN.', 'Too long.'], year: ['Too old.'] });
    expect(fieldErrors(error)).toEqual({ vin: 'Bad VIN.', year: 'Too old.' });
  });

  it('ignores errors that are not validation errors', () => {
    expect(fieldErrors(apiError(409, { detail: 'Conflict' }))).toEqual({});
  });
});

describe('errorMessage', () => {
  it('uses the detail of 404/409 responses', () => {
    const error = apiError(409, { detail: 'Cannot delete: it is referenced by 3 vehicles.' });
    expect(errorMessage(error)).toBe('Cannot delete: it is referenced by 3 vehicles.');
  });

  it('falls back to the first field message instead of a status code', () => {
    const error = apiError(400, { maintenance_from: ['must be on or before maintenance_to.'] });
    expect(errorMessage(error)).toBe('must be on or before maintenance_to.');
  });

  it('explains an unreachable API', () => {
    expect(errorMessage(new AxiosError('Network Error'))).toBe(
      'Cannot reach the API. Is the backend running?',
    );
  });
});

describe('isRetryable', () => {
  it('only offers retry for network errors and 5xx', () => {
    expect(isRetryable(new AxiosError('Network Error'))).toBe(true);
    expect(isRetryable(apiError(503, {}))).toBe(true);
    expect(isRetryable(apiError(400, {}))).toBe(false);
  });
});
