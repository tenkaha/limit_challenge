'use client';

import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
  Snackbar,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
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
import { formatMoney } from '@/lib/format';
import type { Mechanic, MechanicInput } from '@/lib/types';

export default function MechanicsPage() {
  const [tab, setTab] = useState<'list' | 'workload'>('list');
  const [editing, setEditing] = useState<Mechanic | 'new' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        title="Mechanics"
        action={
          <Button variant="contained" onClick={() => setEditing('new')}>
            New mechanic
          </Button>
        }
      />
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tab} onChange={(_event, value: 'list' | 'workload') => setTab(value)}>
          <Tab value="list" label="Mechanics" />
          <Tab value="workload" label="Workload this year" />
        </Tabs>
      </Box>

      {tab === 'list' ? <MechanicList onEdit={setEditing} onNotice={setNotice} /> : <Workload />}

      {editing !== null ? (
        <MechanicDialog
          mechanic={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            setNotice(message);
          }}
        />
      ) : null}

      <Snackbar
        open={notice !== null}
        autoHideDuration={3000}
        onClose={() => setNotice(null)}
        message={notice}
      />
    </>
  );
}

function MechanicList({
  onEdit,
  onNotice,
}: {
  onEdit: (mechanic: Mechanic) => void;
  onNotice: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: ['mechanics', 'list'], queryFn: api.mechanics.list });
  const [deleting, setDeleting] = useState<Mechanic | null>(null);
  const remove = useMutation({
    mutationFn: (id: number) => api.mechanics.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mechanics'] });
      setDeleting(null);
      onNotice('Mechanic deleted.');
    },
  });
  const mechanics = list.data?.results ?? [];

  return (
    <>
      <QueryState
        isPending={list.isPending}
        error={list.error}
        onRetry={() => void list.refetch()}
        isEmpty={mechanics.length === 0}
        emptyMessage="No mechanics yet. Create the first one."
      >
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Certification</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mechanics.map((mechanic) => (
                <TableRow key={mechanic.id} hover>
                  <TableCell>{mechanic.name}</TableCell>
                  <TableCell>{mechanic.certification_number}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={mechanic.is_active ? 'Active' : 'Inactive'}
                      color={mechanic.is_active ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" onClick={() => onEdit(mechanic)}>
                        Edit
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => {
                          remove.reset();
                          setDeleting(mechanic);
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
      <ConfirmDialog
        open={deleting !== null}
        title="Delete mechanic?"
        message={`"${deleting?.name ?? ''}" will be removed permanently. Mechanics with maintenance history can't be deleted; mark them inactive instead.`}
        isPending={remove.isPending}
        error={remove.error}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting.id);
        }}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}

function Workload() {
  const workload = useQuery({
    queryKey: ['mechanics', 'workload'],
    queryFn: api.mechanics.workload,
  });
  const rows = workload.data ?? [];

  return (
    <>
      <Typography color="text.secondary" variant="body2" mb={2}>
        Jobs and cost for the current calendar year, busiest first. Includes active mechanics and
        inactive ones who worked this year.
      </Typography>
      <QueryState
        isPending={workload.isPending}
        error={workload.error}
        onRetry={() => void workload.refetch()}
        isEmpty={rows.length === 0}
        emptyMessage="No mechanics to rank yet."
      >
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Certification</TableCell>
                <TableCell align="right">Jobs</TableCell>
                <TableCell align="right">Cost</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={row.id} hover>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.certification_number}</TableCell>
                  <TableCell align="right">{row.jobs_this_year}</TableCell>
                  <TableCell align="right">{formatMoney(row.cost_this_year)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </QueryState>
    </>
  );
}

function MechanicDialog({
  mechanic,
  onClose,
  onSaved,
}: {
  mechanic: Mechanic | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<MechanicInput>({
    name: mechanic?.name ?? '',
    certification_number: mechanic?.certification_number ?? '',
    is_active: mechanic?.is_active ?? true,
  });
  const save = useMutation({
    mutationFn: (input: MechanicInput) =>
      mechanic ? api.mechanics.update(mechanic.id, input) : api.mechanics.create(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mechanics'] });
      onSaved(mechanic ? 'Mechanic updated.' : 'Mechanic created.');
    },
  });
  const errors = fieldErrors(save.error);
  const otherError =
    save.error && !errors.name && !errors.certification_number && !errors.is_active
      ? errorMessage(save.error)
      : null;

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate(form);
        }}
      >
        <DialogTitle>{mechanic ? 'Edit mechanic' : 'New mechanic'}</DialogTitle>
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
              label="Certification number"
              value={form.certification_number}
              onChange={(event) => setForm({ ...form, certification_number: event.target.value })}
              error={Boolean(errors.certification_number)}
              helperText={errors.certification_number}
              required
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.is_active}
                  onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
                />
              }
              label="Active"
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
