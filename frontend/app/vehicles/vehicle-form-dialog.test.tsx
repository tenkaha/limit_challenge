import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { API, office, server } from '@/test/server';
import VehicleFormDialog from './vehicle-form-dialog';

const open = () =>
  renderWithProviders(
    <VehicleFormDialog vehicle={null} offices={[office]} onClose={vi.fn()} onSaved={vi.fn()} />,
  );

describe('VehicleFormDialog', () => {
  it('previews the plate exactly as the API will store it', async () => {
    open();
    await userEvent.type(screen.getByLabelText(/License plate/), 'qa-77 58');
    expect(screen.getByText(/Saved as/)).toHaveTextContent('Saved as QA7758');
  });

  it('shows API validation errors under the matching field', async () => {
    server.use(
      http.post(`${API}/vehicles/`, () =>
        HttpResponse.json(
          { vin: ['VIN must be 17 characters, excluding I, O, Q.'] },
          { status: 400 },
        ),
      ),
    );
    open();
    await userEvent.type(screen.getByLabelText(/VIN/), '1HGCM82633A00435O');
    await userEvent.type(screen.getByLabelText(/License plate/), 'ABC1234');
    await userEvent.type(screen.getByLabelText(/^Make/), 'Ford');
    await userEvent.type(screen.getByLabelText(/^Model/), 'Escape');
    await userEvent.click(screen.getByRole('button', { name: 'Save vehicle' }));

    const vin = screen.getByLabelText(/VIN/);
    expect(vin).toHaveAttribute('aria-invalid', 'true');
    expect(await screen.findByText('VIN must be 17 characters, excluding I, O, Q.')).toBeVisible();
  });
});
