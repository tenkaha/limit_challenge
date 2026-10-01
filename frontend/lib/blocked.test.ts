import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { blockedCount, blockedMessage } from './blocked';

const apiError = (status: number, data: unknown) =>
  new AxiosError('failed', undefined, undefined, undefined, {
    status,
    data,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

describe('blockedCount', () => {
  it('reads the structured count, not the wording of the message', () => {
    const error = apiError(409, { detail: 'Reworded by the backend.', blocked_count: 3 });
    expect(blockedCount(error)).toBe(3);
  });

  it('is null for errors that are not a blocked delete', () => {
    expect(blockedCount(apiError(400, { name: ['Required.'] }))).toBeNull();
    expect(blockedCount(apiError(409, { detail: 'Something else.' }))).toBeNull();
  });
});

describe('blockedMessage', () => {
  const describeRecords = (count: number) => `It has ${count} records.`;

  it('builds the wording from the count', () => {
    const error = apiError(409, { detail: 'x', blocked_count: 2 });
    expect(blockedMessage(error, describeRecords)).toBe('It has 2 records.');
  });

  it("falls back to the API's message for any other error", () => {
    const error = apiError(404, { detail: 'No Vehicle matches the given query.' });
    expect(blockedMessage(error, describeRecords)).toBe('No Vehicle matches the given query.');
  });
});
