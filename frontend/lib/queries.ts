import { type QueryClient, queryOptions } from '@tanstack/react-query';
import { api } from './api';
import type { Id, VehicleFilters } from './types';

// Every cache key in one place: each resource is cached once, and invalidation
// prefixes (offices.all, vehicles.all, …) can't drift from the keys they target.
export const keys = {
  offices: {
    all: ['offices'] as const,
    list: () => ['offices', 'list'] as const,
    summary: () => ['offices', 'summary'] as const,
  },
  mechanics: {
    all: ['mechanics'] as const,
    list: () => ['mechanics', 'list'] as const,
    workload: () => ['mechanics', 'workload'] as const,
  },
  vehicles: {
    all: ['vehicles'] as const,
    search: (filters: VehicleFilters) => ['vehicles', 'search', filters] as const,
  },
  vehicle: {
    all: ['vehicle'] as const,
    detail: (id: Id) => ['vehicle', id] as const,
  },
};

export const queries = {
  officeList: () => queryOptions({ queryKey: keys.offices.list(), queryFn: api.offices.list }),
  officeSummary: () =>
    queryOptions({ queryKey: keys.offices.summary(), queryFn: api.offices.summary }),
  mechanicList: () =>
    queryOptions({ queryKey: keys.mechanics.list(), queryFn: api.mechanics.list }),
  mechanicWorkload: () =>
    queryOptions({ queryKey: keys.mechanics.workload(), queryFn: api.mechanics.workload }),
  vehicleSearch: (filters: VehicleFilters) =>
    queryOptions({
      queryKey: keys.vehicles.search(filters),
      queryFn: () => api.vehicles.search(filters),
    }),
  vehicleDetail: (id: Id) =>
    queryOptions({ queryKey: keys.vehicle.detail(id), queryFn: () => api.vehicles.detail(id) }),
};

// What each kind of write can change. Reports are included so they never rely
// on a refetch-on-open to look right.
const refresh = (client: QueryClient, ...prefixes: readonly (readonly unknown[])[]) =>
  Promise.all(prefixes.map((queryKey) => client.invalidateQueries({ queryKey })));

export const invalidate = {
  // Search results, the changed vehicle's page, and the office counts/costs.
  vehicles: (client: QueryClient, vehicleId: Id) =>
    refresh(client, keys.vehicles.all, keys.vehicle.detail(vehicleId), keys.offices.summary()),
  // The vehicle's history plus both reports built from records.
  records: (client: QueryClient, vehicleId: Id) =>
    refresh(
      client,
      keys.vehicle.detail(vehicleId),
      keys.offices.summary(),
      keys.mechanics.workload(),
    ),
  // Office names appear in vehicle lists and detail pages.
  offices: (client: QueryClient) =>
    refresh(client, keys.offices.all, keys.vehicles.all, keys.vehicle.all),
  // Mechanic names appear in maintenance history.
  mechanics: (client: QueryClient) => refresh(client, keys.mechanics.all, keys.vehicle.all),
};
