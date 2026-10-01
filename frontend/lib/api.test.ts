import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { API, office, server } from '@/test/server';
import { api } from './api';

describe('api.offices.list', () => {
  it('follows pagination so dropdowns never silently lose rows', async () => {
    const first = Array.from({ length: 100 }, (_, i) => ({ ...office, id: i + 1 }));
    server.use(
      http.get(`${API}/offices/`, ({ request }) => {
        const page = new URL(request.url).searchParams.get('page');
        return HttpResponse.json(
          page === '2'
            ? { count: 101, next: null, previous: null, results: [{ ...office, id: 101 }] }
            : {
                count: 101,
                next: `${API}/offices/?page=2&page_size=100`,
                previous: null,
                results: first,
              },
        );
      }),
    );

    const offices = await api.offices.list();

    expect(offices.results).toHaveLength(101);
    expect(offices.count).toBe(101);
  });
});
