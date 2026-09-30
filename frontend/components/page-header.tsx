import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export default function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <Box display="flex" alignItems="center" justifyContent="space-between" mb={3} gap={2}>
      <Typography variant="h4" component="h1" fontWeight={700}>
        {title}
      </Typography>
      {action}
    </Box>
  );
}
