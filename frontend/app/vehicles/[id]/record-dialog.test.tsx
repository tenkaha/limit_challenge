import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { API, page, server } from '@/test/server';
import RecordDialog from './record-dialog';

describe('RecordDialog', () => {
  it('offers inactive mechanics too, tagged so they are recognisable', async () => {
    server.use(
      http.get(`${API}/mechanics/`, () =>
        HttpResponse.json(
          page([
            { id: 1, name: 'Ana', certification_number: 'ASE-1', is_active: true },
            { id: 2, name: 'Rex', certification_number: 'GONE-1', is_active: false },
          ]),
        ),
      ),
    );
    renderWithProviders(
      <RecordDialog vehicleId={10} record={null} onClose={vi.fn()} onSaved={vi.fn()} />,
    );

    await userEvent.click(await screen.findByRole('combobox', { name: 'Mechanic' }));
    const options = within(await screen.findByRole('listbox')).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      'Ana · ASE-1',
      'Rex · GONE-1 (inactive)',
    ]);
  });
});
