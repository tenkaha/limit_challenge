import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { errorMessage, fieldErrors, generalError, isRetryable } from './errors';

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

describe('generalError', () => {
  it('is null when the API pointed at specific fields (they show inline)', () => {
    expect(generalError(apiError(400, { name: ['Required.'] }))).toBeNull();
  });

  it('returns the message when no field can show it', () => {
    expect(generalError(apiError(400, { non_field_errors: ['Pick another.'] }))).toBe(
      'Pick another.',
    );
    expect(generalError(apiError(500, {}))).toBe('Request failed (500).');
  });

  it('is null when there is no error', () => {
    expect(generalError(null)).toBeNull();
  });
});
