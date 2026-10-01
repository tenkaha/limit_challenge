import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { invalidate, keys } from './queries';

// Seed a cache entry per key so we can see which ones a write marks stale.
function seededClient() {
  const client = new QueryClient();
  const all = [
    keys.offices.list(),
    keys.offices.summary(),
    keys.mechanics.list(),
    keys.mechanics.workload(),
    keys.vehicles.search({}),
    keys.vehicle.detail(1),
    keys.vehicle.detail(2),
  ];
  all.forEach((key) => client.setQueryData(key, {}));
  const stale = () =>
    all.filter((key) => client.getQueryState(key)?.isInvalidated).map((key) => JSON.stringify(key));
  return { client, stale };
}

describe('invalidate', () => {
  it('a record change refreshes its vehicle and both reports built from records', async () => {
    const { client, stale } = seededClient();
    await invalidate.records(client, 1);
    expect(stale()).toEqual(['["offices","summary"]', '["mechanics","workload"]', '["vehicle",1]']);
  });

  it('a vehicle change refreshes searches, the office summary and only that vehicle', async () => {
    const { client, stale } = seededClient();
    await invalidate.vehicles(client, 1);
    expect(stale()).toEqual(['["offices","summary"]', '["vehicles","search",{}]', '["vehicle",1]']);
  });

  it('an office change refreshes every page that shows office names', async () => {
    const { client, stale } = seededClient();
    await invalidate.offices(client);
    expect(stale()).toEqual([
      '["offices","list"]',
      '["offices","summary"]',
      '["vehicles","search",{}]',
      '["vehicle",1]',
      '["vehicle",2]',
    ]);
  });

  it('a mechanic change refreshes mechanic queries and the histories that name them', async () => {
    const { client, stale } = seededClient();
    await invalidate.mechanics(client);
    expect(stale()).toEqual([
      '["mechanics","list"]',
      '["mechanics","workload"]',
      '["vehicle",1]',
      '["vehicle",2]',
    ]);
  });
});
