export interface UtilizationBreakdownResponse {
  label: string;
  utilizationPercentage: number;
  totalTransitHours: number;
  totalActiveHours: number;
  startDate: string;
  endDate: string;
}

export interface OverallUtilizationResponse {
  period: string;
  overallUtilizationPercentage: number;
  breakdown: UtilizationBreakdownResponse[];
}

export interface VehicleUtilizationResponse {
  vehicleId: string;
  regNo: string;
  vehicleModelName: string;
  totalTransitHours: number;
  totalHoursActive: number;
  utilizationRatePercentage: number;
}

export interface DriverBehaviorResponse {
  driverId: string;
  driverName: string;
  vehicleModelId: string;
  vehicleModelName: string;
  driverAvgEfficiencyKmPerLitre: number;
  fleetAvgEfficiencyKmPerLitre: number;
  deviationPercentage: number;
  driverScore: number;
  damagesCount: number;
}

export interface VehicleReplacementResponse {
  vehicleId: string;
  regNo: string;
  vehicleModelName: string;
  totalMaintenanceCost: number;
  totalFuelCost: number;
  totalExpenses: number;
  currentOdometer: number;
  expectedLifetimeKms: number;
  ageYears: number;
  expectedLifetimeYears: number;
  isRecommendedForReplacement: boolean;
  reason: string;
}
