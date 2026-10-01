'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import type { VehicleFilters } from '@/lib/types';

export const FILTER_KEYS = [
  'office',
  'is_active',
  'make',
  'model',
  'maintenance_from',
  'maintenance_to',
  'mechanic_certification',
] as const satisfies readonly (keyof VehicleFilters)[];

export type FilterKey = (typeof FILTER_KEYS)[number];

// The URL is the single source of truth for the search, so it can be shared,
// bookmarked, and survives refresh and back/forward.
export function useVehicleFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo(() => {
    const result: VehicleFilters = {};
    for (const key of [...FILTER_KEYS, 'page', 'page_size'] as const) {
      const value = searchParams.get(key);
      if (value) result[key] = value;
    }
    return result;
  }, [searchParams]);

  const setFilters = useCallback(
    (changes: Partial<VehicleFilters>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      if (!('page' in changes)) next.delete('page');
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const activeCount = FILTER_KEYS.filter((key) => filters[key]).length;
  const clear = useCallback(() => router.replace(pathname), [pathname, router]);

  return { filters, setFilters, activeCount, clear, query: searchParams.toString() };
}
