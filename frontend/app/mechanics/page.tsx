'use client';

import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import { type UseQueryResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { colors, fonts } from '@/app/theme';
import ConfirmDialog from '@/components/confirm-dialog';
import LabeledInput from '@/components/labeled-input';
import PageHeader from '@/components/page-header';
import QueryState from '@/components/query-state';
import StatusDot from '@/components/status-dot';
import { useToast } from '@/components/toast';
import { api } from '@/lib/api';
import { blockedCount } from '@/lib/blocked';
import { errorMessage, fieldErrors } from '@/lib/errors';
import { formatMoney } from '@/lib/format';
import type { Mechanic, MechanicInput, Page } from '@/lib/types';

const tabular = { fontVariantNumeric: 'tabular-nums' };
const visuallyHidden = { position: 'absolute', left: -9999 } as const;

export default function MechanicsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<'workload' | 'list'>('workload');
  const [editing, setEditing] = useState<Mechanic | 'new' | null>(null);
  const list = useQuery({ queryKey: ['mechanics', 'list'], queryFn: api.mechanics.list });
  const year = new Date().getFullYear();

  return (
    <>
      <PageHeader
        title="Mechanics"
        action={
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => setEditing('new')}
            sx={{ minHeight: 44 }}
          >
            New mechanic
          </Button>
        }
      />
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2.5 }}>
        <Tabs
          value={tab}
          onChange={(_event, value: 'workload' | 'list') => setTab(value)}
          aria-label="Mechanics views"
        >
          <Tab value="workload" label={`Workload ${year}`} />
          <Tab
            value="list"
            label={list.data ? `All mechanics (${list.data.count})` : 'All mechanics'}
          />
        </Tabs>
      </Box>

      {tab === 'workload' ? (
        <Workload mechanics={list.data?.results ?? []} />
      ) : (
        <MechanicList
          list={list}
          onEdit={setEditing}
          onDeleted={(name) => toast.success('Mechanic deleted', name)}
          onBlocked={(name, message) => toast.error(`Can't delete ${name}`, message)}
        />
      )}

      {editing !== null ? (
        <MechanicDialog
          mechanic={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(title, detail) => {
            setEditing(null);
            toast.success(title, detail);
          }}
        />
      ) : null}
    </>
  );
}

function Workload({ mechanics }: { mechanics: Mechanic[] }) {
  const workload = useQuery({
    queryKey: ['mechanics', 'workload'],
    queryFn: api.mechanics.workload,
  });
  const rows = workload.data ?? [];
  const inactive = useMemo(
    () => new Set(mechanics.filter((m) => !m.is_active).map((m) => m.id)),
    [mechanics],
  );
  const busiest = Math.max(1, ...rows.map((row) => row.jobs_this_year));

  return (
    <QueryState
      isPending={workload.isPending}
      error={workload.error}
      onRetry={() => void workload.refetch()}
      isEmpty={rows.length === 0}
      emptyMessage="No mechanics to rank yet."
    >
      <TableContainer component={Paper} variant="outlined">
        <Table aria-label="Mechanic workload">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 48 }}>#</TableCell>
              <TableCell>Mechanic</TableCell>
              <TableCell sx={{ width: '40%' }}>Jobs this year</TableCell>
              <TableCell align="right">Cost this year</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.id} hover>
                <TableCell sx={{ ...tabular, color: 'text.secondary' }}>{index + 1}</TableCell>
                <TableCell>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography fontSize={14} fontWeight={500}>
                      {row.name}
                    </Typography>
                    {inactive.has(row.id) ? <InactivePill /> : null}
                  </Stack>
                  <Typography fontSize={12} color={colors.subtle} fontFamily={fonts.mono}>
                    {row.certification_number}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box
                      role="img"
                      aria-label={`${row.jobs_this_year} jobs`}
                      sx={{
                        flexGrow: 1,
                        height: 8,
                        borderRadius: 99,
                        bgcolor: colors.rowDivider,
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          height: 8,
                          borderRadius: 99,
                          bgcolor: 'primary.main',
                          width: `${row.jobs_this_year ? Math.max(2, (row.jobs_this_year / busiest) * 100) : 0}%`,
                        }}
                      />
                    </Box>
                    <Box component="span" sx={{ ...tabular, width: 36, textAlign: 'right' }}>
                      {row.jobs_this_year}
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell align="right" sx={tabular}>
                  {formatMoney(row.cost_this_year)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography fontSize={13} color={colors.subtle} mt={2}>
        Busiest first: most jobs, then highest cost. Inactive mechanics appear only if they worked
        this year.
      </Typography>
    </QueryState>
  );
}

function InactivePill() {
  return (
    <Box
      component="span"
      sx={{
        fontSize: 12,
        color: 'text.secondary',
        bgcolor: colors.rowDivider,
        borderRadius: 99,
        px: 1,
        py: 0.25,
      }}
    >
      Inactive
    </Box>
  );
}

function MechanicList({
  list,
  onEdit,
  onDeleted,
  onBlocked,
}: {
  list: UseQueryResult<Page<Mechanic>>;
  onEdit: (mechanic: Mechanic) => void;
  onDeleted: (name: string) => void;
  onBlocked: (name: string, message: string) => void;
}) {
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState<Mechanic | null>(null);
  const remove = useMutation({
    mutationFn: (mechanic: Mechanic) => api.mechanics.remove(mechanic.id),
    onSuccess: async (_data, mechanic) => {
      setDeleting(null);
      onDeleted(mechanic.name);
      await queryClient.invalidateQueries({ queryKey: ['mechanics'] });
    },
    onError: (error, mechanic) => {
      setDeleting(null);
      const count = blockedCount(error);
      onBlocked(
        mechanic.name,
        count === null
          ? errorMessage(error)
          : `It has ${count} maintenance ${count === 1 ? 'record' : 'records'}. Mark them inactive instead.`,
      );
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
          <Table aria-label="Mechanics">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Certification</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">
                  <Box component="span" sx={visuallyHidden}>
                    Actions
                  </Box>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mechanics.map((mechanic) => (
                <TableRow key={mechanic.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{mechanic.name}</TableCell>
                  <TableCell sx={{ fontFamily: fonts.mono, fontSize: 13, color: 'text.secondary' }}>
                    {mechanic.certification_number}
                  </TableCell>
                  <TableCell>
                    <StatusDot active={mechanic.is_active} />
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="Edit">
                      <IconButton
                        aria-label={`Edit ${mechanic.name}`}
                        onClick={() => onEdit(mechanic)}
                      >
                        <Pencil size={18} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        aria-label={`Delete ${mechanic.name}`}
                        onClick={() => {
                          remove.reset();
                          setDeleting(mechanic);
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
      <ConfirmDialog
        open={deleting !== null}
        title="Delete mechanic?"
        message={`${deleting?.name ?? ''} will be removed permanently.`}
        isPending={remove.isPending}
        error={null}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting);
        }}
        onClose={() => setDeleting(null)}
      />
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
  onSaved: (title: string, detail: string) => void;
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
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['mechanics'] });
      onSaved(mechanic ? 'Mechanic updated' : 'Mechanic created', saved.name);
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
        <DialogTitle sx={{ fontSize: 18, fontWeight: 600 }}>
          {mechanic ? 'Edit mechanic' : 'New mechanic'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={0.5}>
            {otherError ? <Alert severity="error">{otherError}</Alert> : null}
            <LabeledInput
              id="mechanic-name"
              label="Name"
              value={form.name}
              error={errors.name}
              autoFocus
              onChange={(name) => setForm({ ...form, name })}
            />
            <LabeledInput
              id="mechanic-certification"
              label="Certification number"
              value={form.certification_number}
              error={errors.certification_number}
              mono
              onChange={(certification_number) => setForm({ ...form, certification_number })}
            />
            <FormControlLabel
              sx={{ minHeight: 44 }}
              control={
                <Checkbox
                  checked={form.is_active}
                  onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
                />
              }
              label="Active (currently working)"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button variant="outlined" color="inherit" onClick={onClose} sx={{ minHeight: 44 }}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={save.isPending} sx={{ minHeight: 44 }}>
            Save mechanic
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
