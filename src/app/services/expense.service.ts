import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { VehicleExpenseResponse, VehicleExpenseRequest, PagedResponse } from '../models/expense.model';

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  /**
   * Fetches paginated list of vehicle expenses
   */
  public getExpenses(params?: {
    PageNumber?: number;
    PageSize?: number;
    SearchTerm?: string;
    SortBy?: string;
    SortOrder?: string;
  }): Observable<PagedResponse<VehicleExpenseResponse>> {
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

    return this.http.get<PagedResponse<VehicleExpenseResponse>>(`${apiUrl}/VehicleExpense`, { params: httpParams });
  }

  /**
   * Fetches details of a specific expense by ID
   */
  public getExpenseById(id: string): Observable<VehicleExpenseResponse> {
    const apiUrl = this.authService.apiUrl();
    return this.http.get<VehicleExpenseResponse>(`${apiUrl}/VehicleExpense/${id}`);
  }

  /**
   * Creates a new vehicle expense
   */
  public createExpense(request: VehicleExpenseRequest): Observable<VehicleExpenseResponse> {
    const apiUrl = this.authService.apiUrl();
    return this.http.post<VehicleExpenseResponse>(`${apiUrl}/VehicleExpense`, request);
  }

  /**
   * Downloads the expense report CSV as a Blob
   */
  public getExpenseReportCsv(params?: {
    DriverId?: string;
    VehicleId?: string;
    VehicleModelId?: string;
    CategoryId?: string;
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

    return this.http.get(`${apiUrl}/VehicleExpense/report`, {
      params: httpParams,
      responseType: 'blob'
    });
  }
}
