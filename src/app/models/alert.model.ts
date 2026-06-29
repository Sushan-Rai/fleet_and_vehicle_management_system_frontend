export interface AlertResponse {
  id: string;
  vehicleId?: string;
  vehicleRegNo?: string;
  title: string;
  message: string;
  alertType: string;
  severity: string;
  isRead: boolean;
  createdAt: string;
  targetRole: string;
}
