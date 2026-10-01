'use client';

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from '@mui/material';
import type { ReactNode } from 'react';
import { generalError } from '@/lib/errors';

interface Props {
  title: string;
  submitLabel: string;
  /** The mutation's error: field errors render inline, anything else above the fields. */
  error: unknown;
  isPending: boolean;
  size?: 'xs' | 'sm';
  onSubmit: () => void;
  onClose: () => void;
  children: ReactNode;
}

// The frame every create/edit dialog shares; callers supply only their fields.
export default function FormDialog({
  title,
  submitLabel,
  error,
  isPending,
  size = 'sm',
  onSubmit,
  onClose,
  children,
}: Props) {
  const message = generalError(error);
  return (
    <Dialog open onClose={onClose} maxWidth={size} fullWidth>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <DialogTitle sx={{ fontSize: 18, fontWeight: 600 }}>{title}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            mt={0.5}
            sx={{ '& .MuiInputBase-root:not(.MuiInputBase-multiline)': { minHeight: 44 } }}
          >
            {message ? <Alert severity="error">{message}</Alert> : null}
            {children}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            color="inherit"
            onClick={onClose}
            sx={{ borderColor: 'divider' }}
          >
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={isPending}>
            {submitLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
