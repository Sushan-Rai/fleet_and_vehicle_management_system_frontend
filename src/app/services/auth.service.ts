import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginUserRequest } from '../models/login-user-request.model';
import { LoginUserResponse } from '../models/login-user-response.model';
import { RegisterUserRequest } from '../models/register-user-request.model';
import { ResetPasswordRequest } from '../models/reset-password-request.model';
import { RouteLocation } from '../models/route-location.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);

  // Api URL signal initialized from environment.apiUrl, allowing runtime configuration overrides if needed
  public readonly apiUrl = signal<string>(
    localStorage.getItem('fleet_control_api_url') || environment.apiUrl
  );

  // Signal holding the active authentication state (persisted to localStorage)
  public readonly currentUser = signal<{
    token: string;
    email: string;
    role: string;
    driverId?: string;
    fleetManagerId?: string;
    routeLocationId?: string;
  } | null>(this.loadUserFromStorage());

  // Computed helper signals
  public readonly isAuthenticated = computed(() => !!this.currentUser());
  public readonly userRole = computed(() => this.currentUser()?.role || '');
  public readonly userEmail = computed(() => this.currentUser()?.email || '');

  /**
   * Sets the API base URL dynamically
   */
  public setApiUrl(url: string): void {
    if (url) {
      localStorage.setItem('fleet_control_api_url', url);
      this.apiUrl.set(url);
    } else {
      localStorage.removeItem('fleet_control_api_url');
      this.apiUrl.set(environment.apiUrl);
    }
  }

  /**
   * Login user
   */
  public login(request: LoginUserRequest): Observable<LoginUserResponse> {
    const url = `${this.apiUrl()}/User/Login`;
    return this.http.post<LoginUserResponse>(url, request).pipe(
      tap((response) => {
        // Resolve user role based on payload details
        let role = 'Admin';
        if (response.driverId) {
          role = 'Driver';
        } else if (response.fleetManagerId) {
          role = 'FleetManager';
        }

        const userState = {
          token: response.token,
          email: request.email,
          role,
          driverId: response.driverId,
          fleetManagerId: response.fleetManagerId,
          routeLocationId: response.routeLocationId,
        };

        this.currentUser.set(userState);
        localStorage.setItem('fleet_control_user', JSON.stringify(userState));
      })
    );
  }

  /**
   * Register a new user (Driver or FleetManager)
   */
  public register(request: RegisterUserRequest): Observable<any> {
    const url = `${this.apiUrl()}/User/Register`;
    return this.http.post<any>(url, request);
  }

  /**
   * Fetches all route locations from the database
   */
  public getRouteLocations(): Observable<RouteLocation[]> {
    const url = `${this.apiUrl()}/User/RouteLocations`;
    return this.http.get<RouteLocation[]>(url);
  }

  /**
   * Reset user password
   */
  public resetPassword(request: ResetPasswordRequest): Observable<any> {
    const url = `${this.apiUrl()}/User/ResetPassword`;
    return this.http.post<any>(url, request);
  }

  /**
   * Logs out the current user and clears session state
   */
  public logout(): void {
    this.currentUser.set(null);
    localStorage.removeItem('fleet_control_user');
  }

  /**
   * Loads user state from localStorage
   */
  private loadUserFromStorage() {
    const data = localStorage.getItem('fleet_control_user');
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      localStorage.removeItem('fleet_control_user');
      return null;
    }
  }
}
