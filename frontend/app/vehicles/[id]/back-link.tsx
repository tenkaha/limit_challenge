'use client';

import { Box } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MouseEvent } from 'react';
import { useSyncExternalStore } from 'react';
import { queries } from '@/lib/queries';
import { vehiclesListHref } from '@/lib/last-search';

const noSubscribe = () => () => {};
const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// "make: ford, Jan 1 – Mar 31" from the remembered search's query string.
function describeSearch(query: URLSearchParams, officeName: (id: string) => string | undefined) {
  const parts: string[] = [];
  const office = query.get('office');
  if (office) parts.push(officeName(office) ?? 'one office');
  for (const key of ['make', 'model'] as const) {
    const value = query.get(key);
    if (value) parts.push(`${key}: ${value}`);
  }
  const active = query.get('is_active');
  if (active) parts.push(active === 'true' ? 'active' : 'inactive');
  const from = query.get('maintenance_from');
  const to = query.get('maintenance_to');
  if (from && to) parts.push(`${shortDate(from)} – ${shortDate(to)}`);
  else if (from) parts.push(`serviced from ${shortDate(from)}`);
  else if (to) parts.push(`serviced until ${shortDate(to)}`);
  const certification = query.get('mechanic_certification');
  if (certification) parts.push(`by ${certification}`);
  return parts.join(', ');
}

export default function BackLink() {
  const router = useRouter();
  // sessionStorage only exists in the browser; the server snapshot keeps the
  // first render identical to the server HTML, with no effect needed.
  const href = useSyncExternalStore(noSubscribe, vehiclesListHref, () => '/vehicles');
  const offices = useQuery(queries.officeList());
  const query = new URLSearchParams(href.split('?')[1] ?? '');
  const summary = describeSearch(
    query,
    (id) => offices.data?.results.find((office) => String(office.id) === id)?.name,
  );

  return (
    <Box
      component={Link}
      href={href}
      onClick={(event: MouseEvent) => {
        event.preventDefault();
        router.push(vehiclesListHref());
      }}
      sx={{
        alignSelf: 'flex-start',
        minHeight: 44,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        fontSize: 14,
        color: 'primary.main',
        textDecoration: 'none',
        '&:hover': { color: '#163BA3' },
      }}
    >
      <ChevronLeft size={16} aria-hidden />
      {summary ? `Vehicles · ${summary}` : 'Vehicles'}
    </Box>
  );
}
