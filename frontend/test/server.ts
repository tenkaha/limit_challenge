import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { Office, Page, Vehicle } from '@/lib/types';

// A fake API at the network level: the real axios client and react-query run
// unchanged, and each test can override a handler to shape the response.
export const API = 'http://localhost:8000/api';

export const page = <T>(results: T[]): Page<T> => ({
  count: results.length,
  next: null,
  previous: null,
  results,
});

export const office: Office = { id: 1, name: 'Lisatown Depot', city: 'Lisatown' };

export const vehicle = (overrides: Partial<Vehicle> = {}): Vehicle => ({
  id: 10,
  vin: '1HGCM82633A004352',
  license_plate: 'FYT014',
  make: 'Ford',
  model: 'Escape',
  year: 2015,
  office: office.id,
  is_active: true,
  ...overrides,
});

export const server = setupServer(
  http.get(`${API}/offices/`, () => HttpResponse.json(page([office]))),
  http.get(`${API}/vehicles/`, () => HttpResponse.json(page([vehicle()]))),
);
