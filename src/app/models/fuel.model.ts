import { PagedResponse } from './expense.model';

export interface FuelEfficiencyMetrics {
  kmPerLitre: number;
  litresPer100Km: number;
  milesPerGallon: number;
}

export interface FuelLogResponse {
  id: string;
  vehicleId: string;
  vehicleRegNo: string;
  vehicleModelName: string;
  driverId?: string;
  driverFullName: string;
  logDate: string;
  odometerReading: number;
  fuelLitres: number;
  totalCost: number;
  costPerLitre: number;
  distanceTraveled: number;
  efficiency: FuelEfficiencyMetrics;
  isEfficiencyAnomaly: boolean;
}

export interface FuelLogRequest {
  vehicleId: string;
  driverId: string | null;
  logDate: string;
  odometerReading: number;
  fuelLitres: number;
  totalCost: number;
}

export interface FuelEfficiencyReportResponse {
  vehicleId: string;
  vehicleRegNo: string;
  vehicleModelName: string;
  categoryName: string;
  totalDistanceTraveled: number;
  totalFuelConsumed: number;
  averageEfficiency: number;
  chosenUnit: string;
  isAnomaly: boolean;
}
