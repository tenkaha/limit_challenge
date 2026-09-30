'use client';

import { AppBar, Button, Stack, Toolbar, Typography } from '@mui/material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/vehicles', label: 'Vehicles' },
  { href: '/offices', label: 'Offices' },
  { href: '/mechanics', label: 'Mechanics' },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <AppBar
      position="sticky"
      elevation={0}
      color="default"
      sx={{ borderBottom: 1, borderColor: 'divider' }}
    >
      <Toolbar>
        <Typography variant="h6" component="span" sx={{ fontWeight: 700, mr: 4 }}>
          Fleet Tracker
        </Typography>
        <Stack direction="row" spacing={1} component="nav">
          {LINKS.map(({ href, label }) => (
            <Button
              key={href}
              component={Link}
              href={href}
              color={pathname.startsWith(href) ? 'primary' : 'inherit'}
              aria-current={pathname.startsWith(href) ? 'page' : undefined}
            >
              {label}
            </Button>
          ))}
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
