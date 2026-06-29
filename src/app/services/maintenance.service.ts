import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { MaintenanceRequest, MaintenanceResponse } from '../models/maintenance.model';
import { PagedResponse } from '../models/expense.model';

@Injectable({
  providedIn: 'root'
})
export class MaintenanceService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  /**
   * Fetches paginated list of maintenance logs with optional filters
   */
  public getMaintenances(params?: {
    PageNumber?: number;
    PageSize?: number;
    SearchTerm?: string;
    SortBy?: string;
    SortOrder?: string;
    VehicleId?: string;
    Status?: string;
    ServiceType?: string;
    IsPredictiveTrigger?: boolean;
    StartScheduledDate?: string;
    StopScheduledDate?: string;
  }): Observable<PagedResponse<MaintenanceResponse>> {
    const apiUrl = this.authService.apiUrl();
    let httpParams = new HttpParams();

    if (params) {
      Object.keys(params).forEach(key => {
        const val = (params as any)[key];
        if (val !== undefined && val !== null && val !== '') {
          httpParams = httpParams.set(key, val.toString());
        }
      });
    }

    return this.http.get<PagedResponse<MaintenanceResponse>>(`${apiUrl}/Maintenance`, { params: httpParams });
  }

  /**
   * Fetches details of a specific maintenance log by ID
   */
  public getMaintenanceById(id: string): Observable<MaintenanceResponse> {
    const apiUrl = this.authService.apiUrl();
    return this.http.get<MaintenanceResponse>(`${apiUrl}/Maintenance/${id}`);
  }

  /**
   * Creates a new maintenance log entry
   */
  public createMaintenance(request: MaintenanceRequest): Observable<MaintenanceResponse> {
    const apiUrl = this.authService.apiUrl();
    return this.http.post<MaintenanceResponse>(`${apiUrl}/Maintenance`, request);
  }

  /**
   * Updates an existing maintenance log entry
   */
  public updateMaintenance(id: string, request: MaintenanceRequest): Observable<any> {
    const apiUrl = this.authService.apiUrl();
    return this.http.put<any>(`${apiUrl}/Maintenance/${id}`, request);
  }

  /**
   * Fetches distinct service types from database
   */
  public getServiceTypes(): Observable<string[]> {
    const apiUrl = this.authService.apiUrl();
    return this.http.get<string[]>(`${apiUrl}/Maintenance/Services`);
  }
}
