import { apiClient } from './api-client';
import type {
  Id,
  MaintenanceHistoryItem,
  MaintenanceRecord,
  MaintenanceRecordInput,
  Mechanic,
  MechanicInput,
  MechanicWorkload,
  Office,
  OfficeInput,
  OfficeSummary,
  Page,
  Vehicle,
  VehicleDetail,
  VehicleFilters,
  VehicleInput,
} from './types';

// Offices and mechanics are small lists used in dropdowns, so fetch them in one page.
const ALL = { page_size: 100 };

async function get<T>(url: string, params?: object): Promise<T> {
  return (await apiClient.get<T>(url, { params })).data;
}

export const api = {
  offices: {
    list: () => get<Page<Office>>('/offices/', ALL),
    summary: () => get<OfficeSummary[]>('/offices/summary/'),
    create: async (input: OfficeInput) => (await apiClient.post<Office>('/offices/', input)).data,
    update: async (id: Id, input: OfficeInput) =>
      (await apiClient.put<Office>(`/offices/${id}/`, input)).data,
    remove: async (id: Id) => {
      await apiClient.delete(`/offices/${id}/`);
    },
  },
  mechanics: {
    list: () => get<Page<Mechanic>>('/mechanics/', ALL),
    workload: () => get<MechanicWorkload[]>('/mechanics/workload/'),
    create: async (input: MechanicInput) =>
      (await apiClient.post<Mechanic>('/mechanics/', input)).data,
    update: async (id: Id, input: MechanicInput) =>
      (await apiClient.put<Mechanic>(`/mechanics/${id}/`, input)).data,
    remove: async (id: Id) => {
      await apiClient.delete(`/mechanics/${id}/`);
    },
  },
  vehicles: {
    search: (filters: VehicleFilters) => get<Page<Vehicle>>('/vehicles/', filters),
    detail: (id: Id) => get<VehicleDetail>(`/vehicles/${id}/`),
    history: (id: Id, page: number) =>
      get<Page<MaintenanceHistoryItem>>(`/vehicles/${id}/maintenance/`, { page }),
    create: async (input: VehicleInput) =>
      (await apiClient.post<Vehicle>('/vehicles/', input)).data,
    update: async (id: Id, input: VehicleInput) =>
      (await apiClient.put<Vehicle>(`/vehicles/${id}/`, input)).data,
    remove: async (id: Id) => {
      await apiClient.delete(`/vehicles/${id}/`);
    },
    assign: async (id: Id, office: Id) =>
      (await apiClient.post<Vehicle>(`/vehicles/${id}/assign/`, { office })).data,
  },
  records: {
    create: async (input: MaintenanceRecordInput) =>
      (await apiClient.post<MaintenanceRecord>('/maintenance-records/', input)).data,
    update: async (id: Id, input: MaintenanceRecordInput) =>
      (await apiClient.put<MaintenanceRecord>(`/maintenance-records/${id}/`, input)).data,
    remove: async (id: Id) => {
      await apiClient.delete(`/maintenance-records/${id}/`);
    },
  },
};
