export interface Vehicle {
  id: string;
  regNo: string;
  chassisNumber: string;
  currentOdometerReading: number;
  modelId?: string;
  routeLocationId?: string;
  status: "Active" | "InTransit" | "Maintenance" | "Inactive";
  modelName?: string;
  routename?: string;
  categoryname?: string;
}

export interface VehicleModel {
  id: string;
  modelName: string;
  manufacturer: string;
  expectedLifeTimeYears: number;
  expectedLifeTimeKms: number;
  categoryId: string;
  categoryName: string;
}

export interface VehicleCategory {
  id: string;
  name: string;
  fuelEfficiencyThreshold: number;
}

export interface VehicleRequest {
  regNo: string;
  chassisNumber: string;
  currentOdometerReading: number;
  vehicleModelId: string;
  routeLocationId?: string | null;
}

export interface VehicleResponsePagedResponse {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  data: Vehicle[] | null;
}

export interface VehicleModelResponsePagedResponse {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  data: VehicleModel[] | null;
}

export interface VehicleCategoryPagedResponse {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  data: VehicleCategory[] | null;
}

export interface VehicleInventoryItem extends Vehicle {
  modelName?: string;
  manufacturer?: string;
  categoryName?: string;
}

export interface VehicleModelRequest {
  manufacturer: string;
  modelName: string;
  expectedLifeTimeYears: number;
  expectedLifeTimeKms: number;
  categoryId: string;
}

export interface VehicleCategoryRequest {
  name: string;
  fuelEfficiencyThreshold: number;
}

