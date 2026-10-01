'use client';

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

// Failures are reported by the caller (as a toast), so the dialog only confirms.
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  isPending,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="error" variant="contained" onClick={onConfirm} loading={isPending}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
