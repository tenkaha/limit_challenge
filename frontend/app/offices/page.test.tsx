import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { API, office, server } from '@/test/server';
import OfficesPage from './page';

describe('OfficesPage', () => {
  it("explains a blocked delete with the API's count, including inactive vehicles", async () => {
    server.use(
      http.get(`${API}/offices/summary/`, () =>
        HttpResponse.json([
          // The summary counts active vehicles only; the delete is blocked by 1 inactive one.
          {
            ...office,
            active_vehicle_count: 0,
            maintenance_cost_last_year: 0,
            last_maintenance: null,
          },
        ]),
      ),
      http.delete(`${API}/offices/1/`, () =>
        HttpResponse.json(
          { detail: 'Cannot delete: it is referenced by 1 vehicle.', blocked_count: 1 },
          { status: 409 },
        ),
      ),
    );
    renderWithProviders(<OfficesPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Delete Lisatown Depot' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    const toast = await screen.findByRole('alert');
    expect(toast).toHaveTextContent("Can't delete Lisatown Depot");
    expect(toast).toHaveTextContent('It still has 1 vehicle. Move it to another office first.');
  });
});
