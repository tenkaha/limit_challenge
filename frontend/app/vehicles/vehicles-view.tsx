'use client';

import {
  Button,
  Chip,
  IconButton,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
} from '@mui/material';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import ConfirmDialog from '@/components/confirm-dialog';
import PageHeader from '@/components/page-header';
import QueryState from '@/components/query-state';
import { api } from '@/lib/api';
import type { Vehicle } from '@/lib/types';
import VehicleFiltersBar from './vehicle-filters';
import VehicleFormDialog from './vehicle-form-dialog';
import { useVehicleFilters } from './use-vehicle-filters';

const PAGE_SIZE = 10;

export default function VehiclesView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { filters, setFilters, activeCount, clear } = useVehicleFilters();
  const [editing, setEditing] = useState<Vehicle | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Vehicle | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const offices = useQuery({ queryKey: ['offices', 'list'], queryFn: api.offices.list });
  const vehicles = useQuery({
    queryKey: ['vehicles', filters],
    queryFn: () => api.vehicles.search(filters),
    placeholderData: keepPreviousData,
    // A 400 (e.g. from > to) won't fix itself by retrying.
    retry: false,
  });
  const officeById = useMemo(
    () => new Map((offices.data?.results ?? []).map((office) => [office.id, office])),
    [offices.data],
  );

  const remove = useMutation({
    mutationFn: (vehicle: Vehicle) => api.vehicles.remove(vehicle.id),
    onSuccess: async () => {
      setDeleting(null);
      setToast('Vehicle deleted');
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });

  const page = Number(filters.page ?? '1');
  const rows = vehicles.data?.results ?? [];

  return (
    <>
      <PageHeader
        title="Vehicles"
        action={
          <Button
            variant="contained"
            onClick={() => setEditing('new')}
            disabled={!offices.data?.results.length}
          >
            New vehicle
          </Button>
        }
      />
      <VehicleFiltersBar
        filters={filters}
        offices={offices.data?.results ?? []}
        activeCount={activeCount}
        onChange={setFilters}
        onClear={clear}
      />
      <QueryState
        isPending={vehicles.isPending}
        error={vehicles.error}
        onRetry={() => void vehicles.refetch()}
        isEmpty={rows.length === 0}
        emptyMessage={
          activeCount
            ? 'No vehicles match these filters.'
            : 'No vehicles yet. Create the first one.'
        }
      >
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{ opacity: vehicles.isPlaceholderData ? 0.6 : 1 }}
        >
          <Table size="small" aria-label="Vehicles">
            <TableHead>
              <TableRow>
                <TableCell>Plate</TableCell>
                <TableCell>Vehicle</TableCell>
                <TableCell>VIN</TableCell>
                <TableCell>Office</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((vehicle) => {
                const office = officeById.get(vehicle.office);
                return (
                  <TableRow
                    key={vehicle.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/vehicles/${vehicle.id}`)}
                  >
                    <TableCell sx={{ fontFamily: 'monospace' }}>{vehicle.license_plate}</TableCell>
                    <TableCell>
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {vehicle.vin}
                    </TableCell>
                    <TableCell>{office ? `${office.name} · ${office.city}` : '…'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={vehicle.is_active ? 'Active' : 'Inactive'}
                        color={vehicle.is_active ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                      <Tooltip title="Edit">
                        <IconButton
                          aria-label={`Edit ${vehicle.license_plate}`}
                          onClick={() => setEditing(vehicle)}
                        >
                          ✎
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          aria-label={`Delete ${vehicle.license_plate}`}
                          onClick={() => {
                            remove.reset();
                            setDeleting(vehicle);
                          }}
                        >
                          🗑
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={vehicles.data?.count ?? 0}
            page={page - 1}
            rowsPerPage={PAGE_SIZE}
            rowsPerPageOptions={[PAGE_SIZE]}
            onPageChange={(_event, next) => setFilters({ page: next ? String(next + 1) : '' })}
          />
        </TableContainer>
      </QueryState>

      {editing ? (
        <VehicleFormDialog
          vehicle={editing === 'new' ? null : editing}
          offices={offices.data?.results ?? []}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            setToast(message);
          }}
        />
      ) : null}
      <ConfirmDialog
        open={deleting !== null}
        title="Delete vehicle?"
        message={
          deleting
            ? `${deleting.license_plate} will be permanently deleted. Vehicles with maintenance history can't be deleted; mark them inactive instead.`
            : ''
        }
        isPending={remove.isPending}
        error={remove.error}
        onConfirm={() => deleting && remove.mutate(deleting)}
        onClose={() => setDeleting(null)}
      />
      <Snackbar
        open={toast !== null}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast}
      />
    </>
  );
}
