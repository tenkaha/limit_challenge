export type Id = number;

export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Office {
  id: Id;
  name: string;
  city: string;
}

export interface OfficeSummary extends Office {
  active_vehicle_count: number;
  maintenance_cost_last_year: number;
  last_maintenance: string | null;
}

export interface Mechanic {
  id: Id;
  name: string;
  certification_number: string;
  is_active: boolean;
}

export interface MechanicWorkload {
  id: Id;
  name: string;
  certification_number: string;
  jobs_this_year: number;
  cost_this_year: number;
}

export interface Vehicle {
  id: Id;
  vin: string;
  license_plate: string;
  make: string;
  model: string;
  year: number;
  office: Id;
  is_active: boolean;
}

export const MAINTENANCE_TYPES = {
  oil_change: 'Oil change',
  tire_rotation: 'Tire rotation',
  brakes: 'Brakes',
  inspection: 'Inspection',
  repair: 'Repair',
  other: 'Other',
} as const;

export type MaintenanceType = keyof typeof MAINTENANCE_TYPES;

export interface MaintenanceRecord {
  id: Id;
  vehicle: Id;
  mechanic: Id;
  performed_on: string;
  maintenance_type: MaintenanceType;
  cost: number;
  notes: string;
}

export interface MaintenanceHistoryItem extends Omit<MaintenanceRecord, 'vehicle' | 'mechanic'> {
  mechanic: Mechanic;
}

export interface VehicleDetail extends Omit<Vehicle, 'office'> {
  office: Office;
  maintenance_records: MaintenanceHistoryItem[];
}

export interface VehicleFilters {
  office?: string;
  is_active?: string;
  make?: string;
  model?: string;
  maintenance_from?: string;
  maintenance_to?: string;
  mechanic_certification?: string;
  page?: string;
}

export type VehicleInput = Omit<Vehicle, 'id'>;
export type OfficeInput = Omit<Office, 'id'>;
export type MechanicInput = Omit<Mechanic, 'id'>;
export type MaintenanceRecordInput = Omit<MaintenanceRecord, 'id' | 'cost'> & {
  cost: string;
};
