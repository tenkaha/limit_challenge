'use client';

import { Box, Stack } from '@mui/material';
import { CarFront } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { colors } from '@/app/theme';

const LINKS = [
  { href: '/vehicles', label: 'Vehicles' },
  { href: '/offices', label: 'Offices' },
  { href: '/mechanics', label: 'Mechanics' },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        height: 60,
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        px: 4,
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, fontWeight: 600, fontSize: 16 }}>
        <CarFront size={22} color={colors.accent} aria-hidden />
        Fleet Tracker
      </Box>
      <Stack direction="row" spacing={0.5} component="nav" aria-label="Main">
        {LINKS.map(({ href, label }) => {
          const current = pathname.startsWith(href);
          return (
            <Box
              key={href}
              component={Link}
              href={href}
              aria-current={current ? 'page' : undefined}
              sx={{
                px: 1.5,
                py: 1,
                borderRadius: 1.5,
                fontSize: 14,
                textDecoration: 'none',
                fontWeight: current ? 500 : 400,
                color: current ? 'primary.main' : 'text.secondary',
                bgcolor: current ? colors.accentSoft : 'transparent',
                '&:hover': { bgcolor: current ? colors.accentSoft : colors.rowDivider },
              }}
            >
              {label}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
