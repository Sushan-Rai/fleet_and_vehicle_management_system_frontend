import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { 
  Vehicle, 
  VehicleRequest, 
  VehicleResponsePagedResponse, 
  VehicleModelResponsePagedResponse,
  VehicleCategoryPagedResponse,
  VehicleModel,
  VehicleCategory,
  VehicleModelRequest,
  VehicleCategoryRequest
} from '../models/vehicle.model';

@Injectable({
  providedIn: 'root'
})
export class VehicleService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  /**
   * Fetches all vehicles from the API with optional query filters
   */
  public getVehicles(filters?: {
    CurrentStatus?: string;
    IsAvailable?: boolean;
    CategoryId?: string;
    CategoryName?: string;
    SearchTerm?: string;
    PageNumber?: number;
    PageSize?: number;
  }): Observable<VehicleResponsePagedResponse> {
    const apiUrl = this.authService.apiUrl();
    let params = new HttpParams();

    if (filters) {
      if (filters.CurrentStatus) params = params.set('CurrentStatus', filters.CurrentStatus);
      if (filters.IsAvailable !== undefined) params = params.set('IsAvailable', String(filters.IsAvailable));
      if (filters.CategoryId) params = params.set('CategoryId', filters.CategoryId);
      if (filters.CategoryName) params = params.set('CategoryName', filters.CategoryName);
      if (filters.SearchTerm) params = params.set('SearchTerm', filters.SearchTerm);
      if (filters.PageNumber) params = params.set('PageNumber', String(filters.PageNumber));
      if (filters.PageSize) params = params.set('PageSize', String(filters.PageSize));
    }

    return this.http.get<VehicleResponsePagedResponse>(`${apiUrl}/Vehicle`, { params });
  }

  /**
   * Fetches vehicle models for mapping IDs to names/categories
   */
  public getVehicleModels(): Observable<VehicleModelResponsePagedResponse> {
    const apiUrl = this.authService.apiUrl();
    // Default to large page size to fetch all models
    return this.http.get<VehicleModelResponsePagedResponse>(`${apiUrl}/VehicleModel?PageSize=100`);
  }

  /**
   * Fetches vehicle categories
   */
  public getVehicleCategories(): Observable<VehicleCategoryPagedResponse> {
    const apiUrl = this.authService.apiUrl();
    return this.http.get<VehicleCategoryPagedResponse>(`${apiUrl}/VehicleCategory?PageSize=100`);
  }

  /**
   * Submits a request to create a new vehicle in the system
   */
  public createVehicle(request: VehicleRequest): Observable<Vehicle> {
    const apiUrl = this.authService.apiUrl();
    return this.http.post<Vehicle>(`${apiUrl}/Vehicle/createVehicle`, request);
  }

  /**
   * Fetches details of a single vehicle by ID
   */
  public getVehicleById(id: string): Observable<Vehicle> {
    const apiUrl = this.authService.apiUrl();
    return this.http.get<Vehicle>(`${apiUrl}/Vehicle/${id}`);
  }

  /**
   * Submits a request to create a new vehicle model in the system
   */
  public createVehicleModel(request: VehicleModelRequest): Observable<VehicleModel> {
    const apiUrl = this.authService.apiUrl();
    return this.http.post<VehicleModel>(`${apiUrl}/VehicleModel/createVehicleModel`, request);
  }

  /**
   * Submits a request to create a new vehicle category in the system
   */
  public createVehicleCategory(request: VehicleCategoryRequest): Observable<VehicleCategory> {
    const apiUrl = this.authService.apiUrl();
    return this.http.post<VehicleCategory>(`${apiUrl}/VehicleCategory/CreateVehicleCategory`, request);
  }

  /**
   * Deletes a vehicle by ID
   */
  public deleteVehicle(id: string): Observable<any> {
    const apiUrl = this.authService.apiUrl();
    return this.http.delete<any>(`${apiUrl}/Vehicle/${id}`);
  }
}
