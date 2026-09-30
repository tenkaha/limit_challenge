'use client';

import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import ConfirmDialog from '@/components/confirm-dialog';
import QueryState from '@/components/query-state';
import { api } from '@/lib/api';
import { vehiclesListHref } from '@/lib/last-search';
import { formatDate, formatMoney } from '@/lib/format';
import { MAINTENANCE_TYPES, type MaintenanceHistoryItem } from '@/lib/types';
import AssignOffice from './assign-office';
import RecordDialog from './record-dialog';

type Editing = { record: MaintenanceHistoryItem | null } | null;

export default function VehicleDetailPage() {
  const vehicleId = Number(useParams<{ id: string }>().id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const vehicle = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: () => api.vehicles.detail(vehicleId),
    retry: false,
  });
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<MaintenanceHistoryItem | null>(null);
  const [moved, setMoved] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] });
  const remove = useMutation({
    mutationFn: (id: number) => api.records.remove(id),
    onSuccess: async () => {
      setDeleting(null);
      await refresh();
    },
  });

  const data = vehicle.data;
  const records = data?.maintenance_records ?? [];

  return (
    <Stack spacing={3}>
      <Box>
        <Button
          component={Link}
          href="/vehicles"
          size="small"
          onClick={(event) => {
            event.preventDefault();
            router.push(vehiclesListHref());
          }}
        >
          ← Back to vehicles
        </Button>
      </Box>
      <QueryState
        isPending={vehicle.isPending}
        error={vehicle.error}
        onRetry={() => vehicle.refetch()}
      >
        {data ? (
          <>
            <Card variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                    <Typography variant="h4" component="h1" fontWeight={700}>
                      {data.year} {data.make} {data.model}
                    </Typography>
                    <Chip
                      label={data.is_active ? 'Active' : 'Inactive'}
                      color={data.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </Stack>
                  <Typography color="text.secondary">
                    Plate <strong>{data.license_plate}</strong> · VIN{' '}
                    <Box component="span" fontFamily="monospace">
                      {data.vin}
                    </Box>
                  </Typography>
                  <Typography>
                    Office: {data.office.name} ({data.office.city})
                  </Typography>
                  <AssignOffice
                    key={data.office.id}
                    vehicleId={vehicleId}
                    office={data.office}
                    onMoved={() => setMoved(true)}
                  />
                </Stack>
              </CardContent>
            </Card>

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h5" component="h2">
                Maintenance history ({records.length})
              </Typography>
              <Button variant="contained" onClick={() => setEditing({ record: null })}>
                Add record
              </Button>
            </Stack>

            <QueryState
              isPending={false}
              error={null}
              onRetry={refresh}
              isEmpty={records.length === 0}
              emptyMessage="No maintenance recorded for this vehicle yet."
            >
              <TableContainer component={Card} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Mechanic</TableCell>
                      <TableCell align="right">Cost</TableCell>
                      <TableCell>Notes</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {formatDate(record.performed_on)}
                        </TableCell>
                        <TableCell>{MAINTENANCE_TYPES[record.maintenance_type]}</TableCell>
                        <TableCell>
                          {record.mechanic.name}
                          <Typography variant="caption" display="block" color="text.secondary">
                            {record.mechanic.certification_number}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{formatMoney(record.cost)}</TableCell>
                        <TableCell sx={{ whiteSpace: 'pre-line', maxWidth: 280 }}>
                          {record.notes}
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <IconButton
                            size="small"
                            aria-label={`Edit record from ${record.performed_on}`}
                            onClick={() => setEditing({ record })}
                          >
                            ✎
                          </IconButton>
                          <IconButton
                            size="small"
                            aria-label={`Delete record from ${record.performed_on}`}
                            onClick={() => {
                              remove.reset();
                              setDeleting(record);
                            }}
                          >
                            ✕
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </QueryState>
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
      <Snackbar
        open={moved}
        autoHideDuration={3000}
        onClose={() => setMoved(false)}
        message="Vehicle moved."
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Delete maintenance record?"
        message={
          deleting
            ? `${MAINTENANCE_TYPES[deleting.maintenance_type]} on ${formatDate(deleting.performed_on)}, ${formatMoney(deleting.cost)}.`
            : ''
        }
        isPending={remove.isPending}
        error={remove.error}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        onClose={() => setDeleting(null)}
      />
    </Stack>
  );
}
