import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class DamageService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  /**
   * Submits a new vehicle damage record
   */
  public createDamage(request: {
    vehicleId: string;
    driverId: string | null;
    reportDate: string;
    description: string;
    estimatedRepairCost: number;
    driverDeductionScore: number;
  }): Observable<any> {
    const apiUrl = this.authService.apiUrl();
    return this.http.post<any>(`${apiUrl}/VehicleDamage`, request);
  }
}
