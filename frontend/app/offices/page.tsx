'use client';

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import ConfirmDialog from '@/components/confirm-dialog';
import LabeledInput from '@/components/labeled-input';
import PageHeader from '@/components/page-header';
import QueryState from '@/components/query-state';
import { useToast } from '@/components/toast';
import { api } from '@/lib/api';
import { invalidate, queries } from '@/lib/queries';
import { blockedMessage } from '@/lib/blocked';
import { fieldErrors, generalError } from '@/lib/errors';
import { formatDate, formatMoney, plural } from '@/lib/format';
import type { Office, OfficeInput, OfficeSummary } from '@/lib/types';
import { tabular, visuallyHidden } from '@/lib/sx';

function windowStart(): string {
  const since = new Date();
  since.setFullYear(since.getFullYear() - 1);
  return since.toLocaleDateString('en-US', { dateStyle: 'medium' });
}

export default function OfficesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const summary = useQuery(queries.officeSummary());
  const [editing, setEditing] = useState<Office | 'new' | null>(null);
  const [deleting, setDeleting] = useState<OfficeSummary | null>(null);

  const remove = useMutation({
    mutationFn: (office: OfficeSummary) => api.offices.remove(office.id),
    onSuccess: async (_data, office) => {
      setDeleting(null);
      toast.success('Office deleted', office.name);
      await invalidate.offices(queryClient);
    },
    onError: (error, office) => {
      setDeleting(null);
      // The count comes from the API: the summary only counts active vehicles,
      // but inactive ones block the delete too.
      toast.error(
        `Can't delete ${office.name}`,
        blockedMessage(
          error,
          (count) =>
            `It still has ${plural(count, 'vehicle')}. Move ${count === 1 ? 'it' : 'them'} to another office first.`,
        ),
      );
    },
  });

  const offices = summary.data ?? [];

  return (
    <>
      <PageHeader
        title="Offices"
        subtitle={`Cost covers the last 12 months (${windowStart()} – today) and includes inactive vehicles.`}
        action={
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => setEditing('new')}
            sx={{ minHeight: 44 }}
          >
            New office
          </Button>
        }
      />
      <QueryState
        isPending={summary.isPending}
        error={summary.error}
        onRetry={() => void summary.refetch()}
        isEmpty={offices.length === 0}
        emptyMessage="No offices yet. Create the first one."
      >
        <TableContainer component={Paper} variant="outlined" sx={{ position: 'relative' }}>
          <Table aria-label="Offices">
            <TableHead>
              <TableRow>
                <TableCell>Office</TableCell>
                <TableCell align="right">Active vehicles</TableCell>
                <TableCell align="right">Cost, last 12 months</TableCell>
                <TableCell>Last maintenance</TableCell>
                <TableCell align="right">
                  <Box component="span" sx={visuallyHidden}>
                    Actions
                  </Box>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {offices.map((office) => (
                <TableRow key={office.id} hover>
                  <TableCell>
                    <Typography fontSize={14} fontWeight={500}>
                      {office.name}
                    </Typography>
                    <Typography fontSize={13} color="text.secondary">
                      {office.city}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={tabular}>
                    {office.active_vehicle_count}
                  </TableCell>
                  <TableCell align="right" sx={tabular}>
                    {formatMoney(office.maintenance_cost_last_year)}
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>
                    {office.last_maintenance
                      ? formatDate(office.last_maintenance)
                      : 'No maintenance yet'}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="Edit">
                      <IconButton
                        aria-label={`Edit ${office.name}`}
                        onClick={() => setEditing(office)}
                      >
                        <Pencil size={18} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        aria-label={`Delete ${office.name}`}
                        onClick={() => {
                          setDeleting(office);
                        }}
                      >
                        <Trash2 size={18} />
                      </IconButton>
                    </Tooltip>
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
          onSaved={(title, detail) => {
            setEditing(null);
            toast.success(title, detail);
          }}
        />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete office?"
        message={`${deleting?.name ?? ''} will be removed permanently.`}
        isPending={remove.isPending}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting);
        }}
        onClose={() => setDeleting(null)}
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
  onSaved: (title: string, detail: string) => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<OfficeInput>({
    name: office?.name ?? '',
    city: office?.city ?? '',
  });
  const save = useMutation({
    mutationFn: (input: OfficeInput) =>
      office ? api.offices.update(office.id, input) : api.offices.create(input),
    onSuccess: async (saved) => {
      await invalidate.offices(queryClient);
      onSaved(office ? 'Office updated' : 'Office created', saved.name);
    },
  });
  const errors = fieldErrors(save.error);
  const otherError = generalError(save.error);

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate(form);
        }}
      >
        <DialogTitle sx={{ fontSize: 18, fontWeight: 600 }}>
          {office ? 'Edit office' : 'New office'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={0.5}>
            {otherError ? <Alert severity="error">{otherError}</Alert> : null}
            <LabeledInput
              id="office-name"
              label="Name"
              value={form.name}
              error={errors.name}
              autoFocus
              onChange={(name) => setForm({ ...form, name })}
            />
            <LabeledInput
              id="office-city"
              label="City"
              value={form.city}
              error={errors.city}
              onChange={(city) => setForm({ ...form, city })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button variant="outlined" color="inherit" onClick={onClose} sx={{ minHeight: 44 }}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={save.isPending} sx={{ minHeight: 44 }}>
            Save office
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
