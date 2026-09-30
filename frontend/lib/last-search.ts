// Remembers the vehicles search (its query string) so "Back to vehicles" on a
// detail page returns to the same filters and page. sessionStorage can throw
// (private mode, blocked storage), so failures fall back to the plain list.
const KEY = 'vehicles:last-search';

export function rememberVehicleSearch(query: string): void {
  try {
    sessionStorage.setItem(KEY, query);
  } catch {
    // Not critical: the back link just goes to the unfiltered list.
  }
}

export function vehiclesListHref(): string {
  try {
    const query = sessionStorage.getItem(KEY);
    return query ? `/vehicles?${query}` : '/vehicles';
  } catch {
    return '/vehicles';
  }
}
