import { PagedResponse } from './expense.model';

export type MaintenanceStatus = 'scheduled' | 'in progress' | 'completed';

export interface MaintenanceRequest {
  vehicleId: string;
  scheduledDate: string; // ISO String
  odometerReading: number;
  serviceType: string;
  cost: number;
  status: string; // matches Enum: "scheduled", "in progress", "completed"
  notes?: string | null;
}

export interface MaintenanceResponse {
  id: string;
  vehicleId: string;
  scheduledDate: string; // ISO String
  completedDate?: string | null; // ISO String
  odometerReading: number;
  serviceType: string;
  status: string; // e.g. "scheduled", "in progress", "completed" (lowercase in DB)
  cost: number;
  notes?: string | null;
  vehicleName: string;
  vehicleRegNo: string;
}
