import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}

export default function PageHeader({ title, subtitle, action }: Props) {
  return (
    <Box display="flex" alignItems="flex-end" justifyContent="space-between" mb={2.5} gap={2}>
      <Box display="flex" flexDirection="column" gap={0.5}>
        <Typography variant="h1">{title}</Typography>
        {subtitle ? (
          <Typography fontSize={14} color="text.secondary">
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {action}
    </Box>
  );
}
