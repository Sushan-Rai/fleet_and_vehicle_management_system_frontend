export interface VehicleExpenseResponse {
  id: string;
  vehicleId: string;
  vehicleRegNo: string;
  vehicleModelName: string;
  expenseType: string;
  amount: number;
  validFrom: string;
  validTo: string;
  referenceNumber: string;
  createdAt: string;
}

export interface VehicleExpenseRequest {
  vehicleId: string;
  expenseType: string;
  amount: number;
  validFrom: string;
  validTo: string;
  referenceNumber: string;
}

export interface PagedResponse<T> {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  data: T[];
}
