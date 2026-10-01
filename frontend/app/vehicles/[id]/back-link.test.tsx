import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { rememberVehicleSearch } from '@/lib/last-search';
import { renderWithProviders } from '@/test/render';
import BackLink from './back-link';

describe('BackLink', () => {
  it('names the remembered search and links back to it', async () => {
    rememberVehicleSearch('office=1&make=ford&is_active=false&maintenance_from=2026-01-01');
    renderWithProviders(<BackLink />);

    const link = await screen.findByRole('link', {
      name: 'Vehicles · Lisatown Depot, make: ford, inactive, serviced from Jan 1',
    });
    expect(link).toHaveAttribute(
      'href',
      '/vehicles?office=1&make=ford&is_active=false&maintenance_from=2026-01-01',
    );
  });

  it('is a plain link to the list when nothing was searched', () => {
    renderWithProviders(<BackLink />);
    expect(screen.getByRole('link', { name: 'Vehicles' })).toHaveAttribute('href', '/vehicles');
  });
});
