export interface RegisterUserRequest {
  email: string;
  password?: string;
  role: 'Driver' | 'FleetManager';
  firstName?: string | null;
  lastName?: string | null;
  licenseNumber?: string | null;
  currentLocationId?: string | null;
  routeLocationId?: string | null;
}
