import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { API, page, server } from '@/test/server';
import MechanicsPage from './page';

const ana = { id: 1, name: 'Ana', certification_number: 'ASE-1', is_active: true };

describe('MechanicsPage', () => {
  it('explains a blocked delete in a toast', async () => {
    server.use(
      http.get(`${API}/mechanics/`, () => HttpResponse.json(page([ana]))),
      http.get(`${API}/mechanics/workload/`, () => HttpResponse.json([])),
      http.delete(`${API}/mechanics/1/`, () =>
        HttpResponse.json(
          { detail: 'Cannot delete: it is referenced by 3 maintenance records.', blocked_count: 3 },
          { status: 409 },
        ),
      ),
    );
    renderWithProviders(<MechanicsPage />);

    await userEvent.click(await screen.findByRole('tab', { name: /All mechanics/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Ana' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    const toast = await screen.findByRole('alert');
    expect(toast).toHaveTextContent("Can't delete Ana");
    expect(toast).toHaveTextContent(
      'It has 3 maintenance records. Mark the mechanic inactive instead.',
    );
  });
});
