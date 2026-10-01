'use client';

import {
  Box,
  Button,
  IconButton,
  Link as MuiLink,
  MenuItem,
  Select,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { colors, fonts } from '@/app/theme';
import ConfirmDialog from '@/components/confirm-dialog';
import PageHeader from '@/components/page-header';
import QueryState from '@/components/query-state';
import StatusDot from '@/components/status-dot';
import { useToast } from '@/components/toast';
import { api } from '@/lib/api';
import { invalidate, queries } from '@/lib/queries';
import { blockedMessage } from '@/lib/blocked';
import { plural } from '@/lib/format';
import { rememberVehicleSearch } from '@/lib/last-search';
import type { Vehicle } from '@/lib/types';
import { visuallyHidden } from '@/lib/sx';
import VehicleFiltersBar from './vehicle-filters';
import VehicleFormDialog from './vehicle-form-dialog';
import { useVehicleFilters } from './use-vehicle-filters';

export const PAGE_SIZES = [10, 25, 50] as const;

const blockedDeleteDetail = (error: unknown) =>
  blockedMessage(
    error,
    (count) => `It has ${plural(count, 'maintenance record')}. Mark the vehicle inactive instead.`,
  );

export default function VehiclesView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { filters, setFilters, activeCount, clear, query } = useVehicleFilters();
  const [editing, setEditing] = useState<Vehicle | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Vehicle | null>(null);

  const offices = useQuery(queries.officeList());
  const vehicles = useQuery({
    ...queries.vehicleSearch(filters),
    placeholderData: keepPreviousData,
    // A 400 (e.g. from > to) won't fix itself by retrying.
    retry: false,
  });
  // Same key as the unfiltered list, so it is shared with that page when cached.
  const fleet = useQuery({
    ...queries.vehicleSearch({}),
    enabled: activeCount > 0,
  });
  const officeById = useMemo(
    () => new Map((offices.data?.results ?? []).map((office) => [office.id, office])),
    [offices.data],
  );

  const remove = useMutation({
    mutationFn: (vehicle: Vehicle) => api.vehicles.remove(vehicle.id),
    onSuccess: async (_data, vehicle) => {
      toast.success('Vehicle deleted', `${vehicle.license_plate} was removed.`);
      await invalidate.vehicles(queryClient);
    },
    onError: (error, vehicle) =>
      toast.error(`Can't delete ${vehicle.license_plate}`, blockedDeleteDetail(error)),
    onSettled: () => setDeleting(null),
  });

  const page = Number(filters.page ?? '1');
  const pageSize = Number(filters.page_size ?? PAGE_SIZES[0]);
  const rows = vehicles.data?.results ?? [];
  const total = vehicles.data?.count ?? 0;
  const first = total ? (page - 1) * pageSize + 1 : 0;
  const last = Math.min(page * pageSize, total);
  const subtitle = !vehicles.data
    ? ' '
    : activeCount
      ? `${total} match your filters${fleet.data ? ` · ${fleet.data.count} in the fleet` : ''}`
      : `${total} vehicles in the fleet`;

  const openVehicle = (vehicle: Vehicle) => {
    rememberVehicleSearch(query);
    router.push(`/vehicles/${vehicle.id}`);
  };

  return (
    <>
      <PageHeader
        title="Vehicles"
        subtitle={subtitle}
        action={
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => setEditing('new')}
            disabled={!offices.data?.results.length}
            sx={{ minHeight: 44 }}
          >
            New vehicle
          </Button>
        }
      />
      <VehicleFiltersBar
        filters={filters}
        offices={offices.data?.results ?? []}
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
        <Paper
          variant="outlined"
          component="section"
          aria-label="Results"
          sx={{ overflow: 'hidden', opacity: vehicles.isPlaceholderData ? 0.6 : 1 }}
        >
          <Box sx={{ overflowX: 'auto', position: 'relative' }}>
            <Table aria-label="Vehicles" sx={{ minWidth: 860 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Plate</TableCell>
                  <TableCell>Vehicle</TableCell>
                  <TableCell>VIN</TableCell>
                  <TableCell>Office</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">
                    <Box component="span" sx={visuallyHidden}>
                      Actions
                    </Box>
                  </TableCell>
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
                      onClick={() => openVehicle(vehicle)}
                    >
                      <TableCell sx={{ fontFamily: fonts.mono, fontWeight: 500 }}>
                        {/* A real link: reachable with Tab, opens in a new tab, etc.
                          The row click is only a mouse convenience. */}
                        <MuiLink
                          component={NextLink}
                          href={`/vehicles/${vehicle.id}`}
                          underline="hover"
                          color="inherit"
                          onClick={(event) => {
                            event.stopPropagation();
                            rememberVehicleSearch(query);
                          }}
                        >
                          {vehicle.license_plate}
                        </MuiLink>
                      </TableCell>
                      <TableCell>
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </TableCell>
                      <TableCell
                        sx={{ fontFamily: fonts.mono, fontSize: 12, color: 'text.secondary' }}
                      >
                        {vehicle.vin}
                      </TableCell>
                      <TableCell sx={{ color: colors.inkSoft }}>
                        {office ? `${office.name} · ${office.city}` : '…'}
                      </TableCell>
                      <TableCell>
                        <StatusDot active={vehicle.is_active} />
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ whiteSpace: 'nowrap', py: 0.5 }}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Tooltip title="Edit">
                          <IconButton
                            aria-label={`Edit ${vehicle.license_plate}`}
                            onClick={() => setEditing(vehicle)}
                          >
                            <Pencil size={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            aria-label={`Delete ${vehicle.license_plate}`}
                            onClick={() => setDeleting(vehicle)}
                          >
                            <Trash2 size={18} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1.5,
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1.5,
            }}
          >
            <Typography fontSize={13} color="text.secondary">
              Showing {first}–{last} of {total}
            </Typography>
            <Box display="flex" gap={1} alignItems="center">
              <Typography
                component="label"
                htmlFor="rows-per-page"
                fontSize={13}
                color="text.secondary"
              >
                Rows per page
              </Typography>
              <Select
                id="rows-per-page"
                size="small"
                value={pageSize}
                onChange={(event) =>
                  setFilters({
                    page_size:
                      Number(event.target.value) === PAGE_SIZES[0]
                        ? ''
                        : String(event.target.value),
                  })
                }
                sx={{ fontSize: 13, height: 36, mr: 1 }}
              >
                {PAGE_SIZES.map((size) => (
                  <MenuItem key={size} value={size}>
                    {size}
                  </MenuItem>
                ))}
              </Select>
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                disabled={page <= 1}
                onClick={() => setFilters({ page: page > 2 ? String(page - 1) : '' })}
                sx={{ borderColor: 'divider' }}
              >
                Previous
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                disabled={!vehicles.data?.next}
                onClick={() => setFilters({ page: String(page + 1) })}
                sx={{ borderColor: 'divider' }}
              >
                Next
              </Button>
            </Box>
          </Box>
        </Paper>
      </QueryState>

      {editing ? (
        <VehicleFormDialog
          vehicle={editing === 'new' ? null : editing}
          offices={offices.data?.results ?? []}
          onClose={() => setEditing(null)}
          onSaved={(saved, created) => {
            setEditing(null);
            toast.success(
              created ? 'Vehicle created' : 'Vehicle updated',
              `${saved.license_plate} · ${saved.year} ${saved.make} ${saved.model}`,
            );
          }}
        />
      ) : null}
      <ConfirmDialog
        open={deleting !== null}
        title={deleting ? `Delete ${deleting.license_plate}?` : ''}
        message="This can't be undone. Vehicles with maintenance history can't be deleted; mark them inactive instead."
        isPending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
