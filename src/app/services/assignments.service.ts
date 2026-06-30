import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { VehicleAssignment, VehicleAssignmentRequest, AcceptAssignmentRequest, Driver } from '../models/assignment.model';

@Injectable({
  providedIn: 'root'
})
export class AssignmentsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  /**
   * Fetches all vehicle assignments
   */
  public getAssignments(params?: { searchTerm?: string }): Observable<VehicleAssignment[]> {
    const apiUrl = this.authService.apiUrl();
    const role = this.authService.userRole();
    const driverId = this.authService.currentUser()?.driverId;

    if (role === 'Driver' && driverId) {
      return this.http.get<VehicleAssignment[]>(`${apiUrl}/VehicleAssignment/Driver/${driverId}`);
    }

    let httpParams = new HttpParams();
    if (params?.searchTerm) {
      httpParams = httpParams.set('SearchTerm', params.searchTerm);
    }
    return this.http.get<VehicleAssignment[]>(`${apiUrl}/VehicleAssignment`, { params: httpParams });
  }

  /**
   * Submits a request to create a new vehicle assignment
   */
  public createAssignment(request: VehicleAssignmentRequest): Observable<VehicleAssignment> {
    const apiUrl = this.authService.apiUrl();
    return this.http.post<VehicleAssignment>(`${apiUrl}/VehicleAssignment`, request);
  }

  /**
   * Transition assignment state to accepted / In Transit
   */
  public acceptAssignment(request: AcceptAssignmentRequest): Observable<VehicleAssignment> {
    const apiUrl = this.authService.apiUrl();
    return this.http.patch<VehicleAssignment>(`${apiUrl}/VehicleAssignment/accept`, request);
  }

  /**
   * Transition assignment state to rejected
   */
  public rejectAssignment(request: AcceptAssignmentRequest): Observable<VehicleAssignment> {
    const apiUrl = this.authService.apiUrl();
    return this.http.patch<VehicleAssignment>(`${apiUrl}/VehicleAssignment/reject`, request);
  }

  /**
   * Transition assignment state to arrived / completed
   */
  public arriveAssignment(request: AcceptAssignmentRequest): Observable<VehicleAssignment> {
    const apiUrl = this.authService.apiUrl();
    return this.http.patch<VehicleAssignment>(`${apiUrl}/VehicleAssignment/arrive`, request);
  }

  /**
   * Retrieves list of active drivers for allocation
   */
  public getActiveDrivers(): Observable<Driver[]> {
    const apiUrl = this.authService.apiUrl();
    return this.http.get<Driver[]>(`${apiUrl}/User/ActiveDrivers`);
  }

  /**
   * Fetches details of a single vehicle assignment by ID
   */
  public getAssignmentById(id: string): Observable<VehicleAssignment> {
    const apiUrl = this.authService.apiUrl();
    return this.http.get<VehicleAssignment>(`${apiUrl}/VehicleAssignment/${id}`);
  }
}
