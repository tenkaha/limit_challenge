'use client';

import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { errorMessage, isRetryable } from '@/lib/errors';

interface QueryStateProps {
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
}

// One place for the loading / error / empty states every list shares.
export default function QueryState({
  isPending,
  error,
  onRetry,
  isEmpty = false,
  emptyMessage = 'Nothing here yet.',
  children,
}: QueryStateProps) {
  if (isPending) {
    return (
      <Box display="flex" justifyContent="center" py={6} role="status" aria-label="Loading">
        <CircularProgress />
      </Box>
    );
  }
  if (error) {
    return (
      <Alert
        severity="error"
        action={
          isRetryable(error) ? (
            <Button color="inherit" size="small" onClick={onRetry}>
              Retry
            </Button>
          ) : null
        }
      >
        {errorMessage(error)}
      </Alert>
    );
  }
  if (isEmpty) {
    return (
      <Typography color="text.secondary" textAlign="center" py={6}>
        {emptyMessage}
      </Typography>
    );
  }
  return children;
}
