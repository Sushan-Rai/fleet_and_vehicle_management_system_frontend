import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  /**
   * Fetches the current user's alert preferences
   */
  public getAlertPreferences(): Observable<any> {
    const apiUrl = this.authService.apiUrl();
    return this.http.get<any>(`${apiUrl}/AlertPreference`);
  }

  /**
   * Updates the current user's alert preferences
   */
  public updateAlertPreferences(request: any): Observable<any> {
    const apiUrl = this.authService.apiUrl();
    return this.http.put<any>(`${apiUrl}/AlertPreference`, request);
  }

  /**
   * Fetches the list of users pending admin approval (FleetManagers & Drivers)
   */
  public getPendingApprovals(): Observable<any[]> {
    const apiUrl = this.authService.apiUrl();
    return this.http.get<any[]>(`${apiUrl}/User/Approvals`);
  }

  /**
   * Approves a user by ID
   */
  public approveUser(userId: string): Observable<any> {
    const apiUrl = this.authService.apiUrl();
    return this.http.post<any>(`${apiUrl}/User/Approve/${userId}`, {});
  }

  /**
   * Fetches Fleet Manager profile details by ID
   */
  public getFleetManagerProfile(id: string): Observable<any> {
    const apiUrl = this.authService.apiUrl();
    return this.http.get<any>(`${apiUrl}/User/FleetManager/${id}`);
  }

  /**
   * Fetches Driver profile details by ID
   */
  public getDriverProfile(id: string): Observable<any> {
    const apiUrl = this.authService.apiUrl();
    return this.http.get<any>(`${apiUrl}/User/Driver/${id}`);
  }
}
