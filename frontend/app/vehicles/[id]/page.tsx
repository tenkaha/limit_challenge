'use client';

import {
  Box,
  Button,
  Divider,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { colors, fonts } from '@/app/theme';
import ConfirmDialog from '@/components/confirm-dialog';
import QueryState from '@/components/query-state';
import StatusDot from '@/components/status-dot';
import { useToast } from '@/components/toast';
import { api } from '@/lib/api';
import { invalidate, queries } from '@/lib/queries';
import { errorMessage } from '@/lib/errors';
import { formatDate, formatMoney } from '@/lib/format';
import { MAINTENANCE_TYPES, type MaintenanceHistoryItem } from '@/lib/types';
import AssignOffice from './assign-office';
import BackLink from './back-link';
import RecordDialog from './record-dialog';

type Editing = { record: MaintenanceHistoryItem | null } | null;

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <Box display="flex" flexDirection="column" gap={0.25}>
      <Typography fontSize={12} color="text.secondary">
        {label}
      </Typography>
      <Typography fontSize={20} fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function VehicleDetailPage() {
  const vehicleId = Number(useParams<{ id: string }>().id);
  const queryClient = useQueryClient();
  const toast = useToast();
  const vehicle = useQuery({
    ...queries.vehicleDetail(vehicleId),
    retry: false,
  });
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<MaintenanceHistoryItem | null>(null);

  const refresh = () => invalidate.records(queryClient, vehicleId);
  const remove = useMutation({
    mutationFn: (id: number) => api.records.remove(id),
    onSuccess: async () => {
      setDeleting(null);
      toast.success('Record deleted');
      await refresh();
    },
    onError: (error) => {
      setDeleting(null);
      toast.error("Can't delete record", errorMessage(error));
    },
  });

  const data = vehicle.data;
  const records = data?.maintenance_records ?? [];
  // Derived from the embedded history (newest first), so no extra request.
  const totalSpent = records.reduce((sum, record) => sum + record.cost, 0);
  const lastService = records[0]?.performed_on ?? null;

  return (
    <Stack spacing={2.5}>
      <BackLink />
      <QueryState
        isPending={vehicle.isPending}
        error={vehicle.error}
        onRetry={() => vehicle.refetch()}
      >
        {data ? (
          <>
            <Box
              display="grid"
              gridTemplateColumns={{ xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }}
              gap={2}
            >
              <Paper
                variant="outlined"
                sx={{
                  gridColumn: { md: 'span 2' },
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Typography
                    component="h1"
                    sx={{
                      fontFamily: fonts.mono,
                      fontSize: 30,
                      fontWeight: 500,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {data.license_plate}
                  </Typography>
                  <Box
                    sx={{
                      bgcolor: data.is_active ? '#ECFDF3' : colors.rowDivider,
                      borderRadius: 999,
                      px: 1.25,
                      py: 0.5,
                    }}
                  >
                    <StatusDot active={data.is_active} />
                  </Box>
                </Stack>
                <Typography fontSize={18} color={colors.inkSoft}>
                  {data.year} {data.make} {data.model}
                </Typography>
                <Typography sx={{ fontFamily: fonts.mono, fontSize: 13, color: colors.subtle }}>
                  VIN {data.vin}
                </Typography>
                <Divider sx={{ mt: 1, borderColor: colors.rowDivider }} />
                <Stack direction="row" spacing={4} pt={0.5} flexWrap="wrap" useFlexGap>
                  <Figure label="Records" value={String(records.length)} />
                  <Figure label="Total spent" value={formatMoney(totalSpent)} />
                  <Figure
                    label="Last service"
                    value={lastService ? formatDate(lastService) : 'No service yet'}
                  />
                </Stack>
              </Paper>
              <AssignOffice key={data.office.id} vehicleId={vehicleId} office={data.office} />
            </Box>

            <Paper
              variant="outlined"
              component="section"
              aria-label="Maintenance history"
              sx={{ overflow: 'hidden' }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" p={2}>
                <Typography variant="h2">Maintenance history</Typography>
                <Button
                  variant="contained"
                  startIcon={<Plus size={16} />}
                  onClick={() => setEditing({ record: null })}
                >
                  Add record
                </Button>
              </Stack>
              {records.length === 0 ? (
                <Typography
                  color="text.secondary"
                  textAlign="center"
                  py={6}
                  borderTop={1}
                  borderColor="divider"
                >
                  No maintenance recorded for this vehicle yet.
                </Typography>
              ) : (
                <>
                  <Box sx={{ overflowX: 'auto', position: 'relative' }}>
                    <Table sx={{ minWidth: 760 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Mechanic</TableCell>
                          <TableCell align="right">Cost</TableCell>
                          <TableCell>Notes</TableCell>
                          <TableCell>
                            <Box component="span" sx={{ position: 'absolute', left: -9999 }}>
                              Actions
                            </Box>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {records.map((record) => (
                          <TableRow key={record.id} hover sx={{ verticalAlign: 'top' }}>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              {formatDate(record.performed_on)}
                            </TableCell>
                            <TableCell>
                              <Box
                                component="span"
                                sx={{
                                  fontSize: 13,
                                  bgcolor: colors.rowDivider,
                                  color: colors.inkSoft,
                                  borderRadius: 1.5,
                                  px: 1,
                                  py: 0.375,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {MAINTENANCE_TYPES[record.maintenance_type]}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <div>{record.mechanic.name}</div>
                              <Box
                                sx={{ fontFamily: fonts.mono, fontSize: 12, color: colors.subtle }}
                              >
                                {record.mechanic.certification_number}
                              </Box>
                            </TableCell>
                            <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                              {formatMoney(record.cost)}
                            </TableCell>
                            <TableCell
                              sx={{
                                whiteSpace: 'pre-line',
                                maxWidth: 280,
                                color: 'text.secondary',
                              }}
                            >
                              {record.notes || '—'}
                            </TableCell>
                            <TableCell align="right" sx={{ whiteSpace: 'nowrap', py: 1 }}>
                              <IconButton
                                aria-label={`Edit record from ${record.performed_on}`}
                                onClick={() => setEditing({ record })}
                                sx={{ color: 'text.secondary' }}
                              >
                                <Pencil size={18} />
                              </IconButton>
                              <IconButton
                                aria-label={`Delete record from ${record.performed_on}`}
                                onClick={() => setDeleting(record)}
                                sx={{ color: 'text.secondary' }}
                              >
                                <Trash2 size={18} />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                  <Typography fontSize={13} color={colors.subtle} px={2} py={1.5}>
                    Newest first · all {records.length} records
                  </Typography>
                </>
              )}
            </Paper>
          </>
        ) : null}
      </QueryState>

      {editing ? (
        <RecordDialog
          key={editing.record?.id ?? 'new'}
          vehicleId={vehicleId}
          record={editing.record}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await refresh();
          }}
        />
      ) : null}
      <ConfirmDialog
        open={deleting !== null}
        title="Delete maintenance record?"
        message={
          deleting
            ? `${MAINTENANCE_TYPES[deleting.maintenance_type]} on ${formatDate(deleting.performed_on)}, ${formatMoney(deleting.cost)}.`
            : ''
        }
        isPending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        onClose={() => setDeleting(null)}
      />
    </Stack>
  );
}
