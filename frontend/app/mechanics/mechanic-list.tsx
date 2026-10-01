'use client';

import {
  Box,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import { type UseQueryResult, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { fonts } from '@/app/theme';
import ConfirmDialog from '@/components/confirm-dialog';
import QueryState from '@/components/query-state';
import StatusDot from '@/components/status-dot';
import { api } from '@/lib/api';
import { invalidate } from '@/lib/queries';
import { blockedMessage } from '@/lib/blocked';
import { plural } from '@/lib/format';
import type { Mechanic, Page } from '@/lib/types';
import { visuallyHidden } from '@/lib/sx';

export default function MechanicList({
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
      await invalidate.mechanics(queryClient);
    },
    onError: (error, mechanic) => {
      setDeleting(null);
      onBlocked(
        mechanic.name,
        blockedMessage(
          error,
          (count) =>
            `It has ${plural(count, 'maintenance record')}. Mark the mechanic inactive instead.`,
        ),
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
        <TableContainer component={Paper} variant="outlined" sx={{ position: 'relative' }}>
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
        onConfirm={() => {
          if (deleting) remove.mutate(deleting);
        }}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
