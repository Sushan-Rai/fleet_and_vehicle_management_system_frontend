import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import {
  OverallUtilizationResponse,
  VehicleUtilizationResponse,
  DriverBehaviorResponse,
  VehicleReplacementResponse
} from '../models/analytics.model';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  /**
   * Fetches overall utilization data for a specified period
   */
  public getOverallUtilization(period?: string): Observable<OverallUtilizationResponse> {
    const apiUrl = this.authService.apiUrl();
    let params = new HttpParams();
    if (period) {
      params = params.set('period', period);
    }
    return this.http.get<OverallUtilizationResponse>(`${apiUrl}/Analytics/overall-utilization`, { params });
  }

  /**
   * Fetches individual vehicle utilization data
   */
  public getVehicleUtilization(): Observable<VehicleUtilizationResponse[]> {
    const apiUrl = this.authService.apiUrl();
    return this.http.get<VehicleUtilizationResponse[]>(`${apiUrl}/Analytics/vehicle-utilization`);
  }

  /**
   * Fetches driver behavior and safety metrics
   */
  public getDriverBehavior(): Observable<DriverBehaviorResponse[]> {
    const apiUrl = this.authService.apiUrl();
    return this.http.get<DriverBehaviorResponse[]>(`${apiUrl}/Analytics/driver-behavior`);
  }

  /**
   * Fetches vehicle replacement recommendations
   */
  public getVehicleReplacementRecommendations(): Observable<VehicleReplacementResponse[]> {
    const apiUrl = this.authService.apiUrl();
    return this.http.get<VehicleReplacementResponse[]>(`${apiUrl}/Analytics/vehicle-replacement-recommendations`);
  }
}
