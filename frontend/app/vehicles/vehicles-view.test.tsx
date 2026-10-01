import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { currentUrl, setUrl } from '@/test/navigation';
import { API, page, server, vehicle } from '@/test/server';
import VehiclesView from './vehicles-view';

describe('VehiclesView', () => {
  it('pushes a typed filter to the URL after the debounce and searches with it', async () => {
    const searched: string[] = [];
    server.use(
      http.get(`${API}/vehicles/`, ({ request }) => {
        const make = new URL(request.url).searchParams.get('make');
        searched.push(make ?? '');
        return HttpResponse.json(page(make === 'toyota' ? [] : [vehicle()]));
      }),
    );
    renderWithProviders(<VehiclesView />);
    expect(await screen.findByText('FYT014')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Make'), 'toyota');
    expect(currentUrl()).toBe('/vehicles'); // still typing: nothing pushed yet

    await waitFor(() => expect(currentUrl()).toBe('/vehicles?make=toyota'));
    expect(await screen.findByText('No vehicles match these filters.')).toBeInTheDocument();
    expect(searched).toContain('toyota');
  });

  it('removes only the filter whose chip is deleted', async () => {
    setUrl('/vehicles?make=ford&model=escape');
    renderWithProviders(<VehiclesView />);

    const chip = await screen.findByRole('button', { name: 'Make: ford' });
    await userEvent.click(within(chip).getByTestId('CancelIcon'));

    expect(currentUrl()).toBe('/vehicles?model=escape');
  });

  it('closes the dialog and explains a blocked delete in a toast', async () => {
    server.use(
      http.delete(`${API}/vehicles/10/`, () =>
        HttpResponse.json(
          { detail: 'Cannot delete: it is referenced by 183 maintenance records.' },
          { status: 409 },
        ),
      ),
    );
    renderWithProviders(<VehiclesView />);

    await userEvent.click(await screen.findByRole('button', { name: 'Delete FYT014' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    const toast = await screen.findByRole('alert');
    expect(toast).toHaveTextContent("Can't delete FYT014");
    expect(toast).toHaveTextContent('It has 183 maintenance records. Mark it inactive instead.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
