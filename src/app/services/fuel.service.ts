import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { FuelLogResponse, FuelLogRequest, FuelEfficiencyReportResponse } from '../models/fuel.model';
import { PagedResponse } from '../models/expense.model';

@Injectable({
  providedIn: 'root'
})
export class FuelService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  /**
   * Fetches paginated list of fuel logs
   */
  public getFuelLogs(params?: {
    PageNumber?: number;
    PageSize?: number;
    SearchTerm?: string;
    SortBy?: string;
    SortOrder?: string;
    VehicleId?: string;
    DriverId?: string;
  }): Observable<PagedResponse<FuelLogResponse>> {
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

    return this.http.get<PagedResponse<FuelLogResponse>>(`${apiUrl}/Fuel`, { params: httpParams });
  }

  /**
   * Fetches details of a specific fuel log by ID
   */
  public getFuelLogById(id: string): Observable<FuelLogResponse> {
    const apiUrl = this.authService.apiUrl();
    return this.http.get<FuelLogResponse>(`${apiUrl}/Fuel/${id}`);
  }

  /**
   * Creates a new fuel log entry
   */
  public createFuelLog(request: FuelLogRequest): Observable<any> {
    const apiUrl = this.authService.apiUrl();
    return this.http.post<any>(`${apiUrl}/Fuel/createFuelLog`, request);
  }

  /**
   * Fetches fuel efficiency report for the chart
   */
  public getFuelEfficiencyReport(unit: string = 'km/L'): Observable<FuelEfficiencyReportResponse[]> {
    const apiUrl = this.authService.apiUrl();
    return this.http.get<FuelEfficiencyReportResponse[]>(`${apiUrl}/Fuel/efficiency-report`, {
      params: new HttpParams().set('unit', unit)
    });
  }

  /**
   * Downloads the fuel report CSV as a Blob
   */
  public getFuelReportCsv(params?: {
    DriverId?: string;
    VehicleId?: string;
    StartDate?: string;
    EndDate?: string;
  }): Observable<Blob> {
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

    return this.http.get(`${apiUrl}/Fuel/report`, {
      params: httpParams,
      responseType: 'blob'
    });
  }
}
