export interface VehicleAssignment {
  id: string;
  vehicleId: string;
  vehicleName?: string;
  driverId: string;
  driverName?: string;
  destinationLocationId: string;
  routeName?: string;
  status: string; // "Scheduled", "In Transit", "Completed", "Rejected"
  scheduledDeparture: string;
  scheduledArrival: string;
  actualDeparture?: string | null;
  actualArrival?: string | null;
}

export interface VehicleAssignmentRequest {
  vehicleId: string;
  driverId: string;
  destinationLocationId: string;
  scheduledDeparture: string;
  scheduledArrival: string;
}

export interface AcceptAssignmentRequest {
  id: string;
  vehicleId: string;
  driverId: string;
}

export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  licenseNumber: string;
  currentDriverScore: number;
  isActive: boolean;
  isOnTrip: boolean;
  currentLocationId?: string | null;
}
