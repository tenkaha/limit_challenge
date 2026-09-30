'use client';

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import ConfirmDialog from '@/components/confirm-dialog';
import PageHeader from '@/components/page-header';
import QueryState from '@/components/query-state';
import { api } from '@/lib/api';
import { errorMessage, fieldErrors } from '@/lib/errors';
import { formatDate, formatMoney } from '@/lib/format';
import type { Office, OfficeInput } from '@/lib/types';

export default function OfficesPage() {
  const queryClient = useQueryClient();
  const summary = useQuery({ queryKey: ['offices', 'summary'], queryFn: api.offices.summary });
  const [editing, setEditing] = useState<Office | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Office | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const remove = useMutation({
    mutationFn: (id: number) => api.offices.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['offices'] });
      setDeleting(null);
      setNotice('Office deleted.');
    },
  });

  const offices = summary.data ?? [];

  return (
    <>
      <PageHeader
        title="Offices"
        action={
          <Button variant="contained" onClick={() => setEditing('new')}>
            New office
          </Button>
        }
      />
      <Typography color="text.secondary" variant="body2" mb={2}>
        Cost covers the last 12 months, from the same date last year up to today, and includes
        inactive vehicles. The vehicle count only includes active vehicles.
      </Typography>
      <QueryState
        isPending={summary.isPending}
        error={summary.error}
        onRetry={() => void summary.refetch()}
        isEmpty={offices.length === 0}
        emptyMessage="No offices yet. Create the first one."
      >
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>City</TableCell>
                <TableCell align="right">Active vehicles</TableCell>
                <TableCell align="right">Cost, last 12 months</TableCell>
                <TableCell>Last maintenance</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {offices.map((office) => (
                <TableRow key={office.id} hover>
                  <TableCell>{office.name}</TableCell>
                  <TableCell>{office.city}</TableCell>
                  <TableCell align="right">{office.active_vehicle_count}</TableCell>
                  <TableCell align="right">
                    {formatMoney(office.maintenance_cost_last_year)}
                  </TableCell>
                  <TableCell>{formatDate(office.last_maintenance)}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" onClick={() => setEditing(office)}>
                        Edit
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => {
                          remove.reset();
                          setDeleting(office);
                        }}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </QueryState>

      {editing !== null ? (
        <OfficeDialog
          office={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            setNotice(message);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete office?"
        message={`"${deleting?.name ?? ''}" will be removed permanently.`}
        isPending={remove.isPending}
        error={remove.error}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting.id);
        }}
        onClose={() => setDeleting(null)}
      />

      <Snackbar
        open={notice !== null}
        autoHideDuration={3000}
        onClose={() => setNotice(null)}
        message={notice}
      />
    </>
  );
}

function OfficeDialog({
  office,
  onClose,
  onSaved,
}: {
  office: Office | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<OfficeInput>({
    name: office?.name ?? '',
    city: office?.city ?? '',
  });
  const save = useMutation({
    mutationFn: (input: OfficeInput) =>
      office ? api.offices.update(office.id, input) : api.offices.create(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['offices'] });
      onSaved(office ? 'Office updated.' : 'Office created.');
    },
  });
  const errors = fieldErrors(save.error);
  const otherError = save.error && !errors.name && !errors.city ? errorMessage(save.error) : null;

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate(form);
        }}
      >
        <DialogTitle>{office ? 'Edit office' : 'New office'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              error={Boolean(errors.name)}
              helperText={errors.name}
              required
              autoFocus
            />
            <TextField
              label="City"
              value={form.city}
              onChange={(event) => setForm({ ...form, city: event.target.value })}
              error={Boolean(errors.city)}
              helperText={errors.city}
              required
            />
            {otherError ? <Alert severity="error">{otherError}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" loading={save.isPending}>
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
