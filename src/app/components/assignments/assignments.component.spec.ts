import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { provideMockActions } from '@ngrx/effects/testing';
import { AssignmentsComponent } from './assignments.component';
import { AuthService } from '../../services/auth.service';
import { VehicleService } from '../../services/vehicle.service';
import { AssignmentsService } from '../../services/assignments.service';
import * as AssignmentsActions from '../../store/assignments/assignments.actions';

describe('AssignmentsComponent', () => {
  let component: AssignmentsComponent;
  let fixture: ComponentFixture<AssignmentsComponent>;
  let store: MockStore;
  let actions$: Subject<any>;
  let dispatchSpy: any;

  const mockUserRole = signal<string>('Admin');
  const mockCurrentUser = signal<any>({ token: 'mock-token', email: 'operator@example.com', role: 'Admin', routeLocationId: 'loc1' });

  const authServiceMock = {
    apiUrl: () => 'https://localhost:7136/api/v1',
    userEmail: () => 'operator@example.com',
    userRole: mockUserRole,
    currentUser: mockCurrentUser,
    getRouteLocations: () => of([
      { id: 'loc1', location: 'Austin Hub', isActive: true },
      { id: 'loc2', location: 'Houston Hub', isActive: true }
    ])
  };

  const vehicleServiceMock = {
    getVehicles: () => of({
      totalCount: 2,
      pageNumber: 1,
      pageSize: 10,
      data: [
        { id: 'v1', regNo: 'TX01-1111', chassisNumber: 'VIN11111111111111', currentOdometerReading: 1000, status: 'Active', routeLocationId: 'loc1' },
        { id: 'v2', regNo: 'TX02-2222', chassisNumber: 'VIN22222222222222', currentOdometerReading: 2000, status: 'Active', routeLocationId: 'loc2' }
      ]
    })
  };

  const assignmentsServiceMock = {
    getActiveDrivers: () => of([
      { id: 'd1', firstName: 'John', lastName: 'Doe', licenseNumber: 'LIC111', currentDriverScore: 90, isActive: true, isOnTrip: false, currentLocationId: 'loc1' },
      { id: 'd2', firstName: 'Jane', lastName: 'Smith', licenseNumber: 'LIC222', currentDriverScore: 95, isActive: true, isOnTrip: false, currentLocationId: 'loc2' },
      { id: 'd3', firstName: 'Busy', lastName: 'Driver', licenseNumber: 'LIC333', currentDriverScore: 80, isActive: true, isOnTrip: true, currentLocationId: 'loc1' }
    ]),
    getAssignments: () => of([]),
    getAssignmentById: (id: string) => of({
      id,
      vehicleId: 'v1',
      vehicleName: 'TX01-1111',
      driverId: 'd1',
      driverName: 'John Doe',
      destinationLocationId: 'loc2',
      routeName: 'Houston Hub',
      status: 'Scheduled',
      scheduledDeparture: '2026-06-22T10:00:00Z',
      scheduledArrival: '2026-06-22T14:00:00Z',
      actualDeparture: null,
      actualArrival: null
    })
  };

  beforeEach(async () => {
    actions$ = new Subject<any>();
    await TestBed.configureTestingModule({
      imports: [AssignmentsComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        provideMockActions(() => actions$),
        provideMockStore({
          initialState: {
            assignments: {
              assignments: [
                { id: 'a1', vehicleId: 'v1', vehicleName: 'TX01-1111', driverId: 'd1', driverName: 'John Doe', destinationLocationId: 'loc2', routeName: 'Austin to Houston', status: 'Scheduled', scheduledDeparture: '2026-06-22T10:00:00Z', scheduledArrival: '2026-06-22T14:00:00Z' }
              ],
              filter: 'All',
              loading: false,
              error: null
            }
          }
        }),
        { provide: AuthService, useValue: authServiceMock },
        { provide: VehicleService, useValue: vehicleServiceMock },
        { provide: AssignmentsService, useValue: assignmentsServiceMock }
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    dispatchSpy = vi.spyOn(store, 'dispatch');
    fixture = TestBed.createComponent(AssignmentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load assignments on init', () => {
    expect(component).toBeTruthy();
    expect(dispatchSpy).toHaveBeenCalledWith(AssignmentsActions.loadAssignments({}));
  });

  it('should load dropdown data on init', () => {
    expect(component.routeLocations().length).toBe(2);
    expect(component.drivers().length).toBe(3);
    expect(component.vehicles().length).toBe(2);
  });

  it('should dynamically restrict available drivers and vehicles based on selected start location', () => {
    component.dispatchForm.patchValue({ startLocationId: 'loc1' });
    fixture.detectChanges();

    // Driver d1 is active, not on trip, and at loc1. Driver d3 is on trip.
    expect(component.availableDrivers().length).toBe(1);
    expect(component.availableDrivers()[0].id).toBe('d1');

    // Vehicle v1 is Active and at loc1.
    expect(component.availableVehicles().length).toBe(1);
    expect(component.availableVehicles()[0].id).toBe('v1');

    // Change start location to loc2
    component.dispatchForm.patchValue({ startLocationId: 'loc2' });
    fixture.detectChanges();

    // Driver d2 is at loc2
    expect(component.availableDrivers().length).toBe(1);
    expect(component.availableDrivers()[0].id).toBe('d2');

    // Vehicle v2 is at loc2
    expect(component.availableVehicles().length).toBe(1);
    expect(component.availableVehicles()[0].id).toBe('v2');
  });

  it('should submit form and dispatch createAssignment action', () => {
    component.openDispatchModal();
    expect(component.isDispatchModalOpen()).toBe(true);

    const todayStr = new Date().toISOString().substring(0, 10);
    const departureStr = `${todayStr}T10:00`;
    const arrivalStr = `${todayStr}T14:00`;

    component.dispatchForm.setValue({
      startLocationId: 'loc1',
      destinationLocationId: 'loc2',
      driverId: 'd1',
      vehicleId: 'v1',
      scheduledDeparture: departureStr,
      scheduledArrival: arrivalStr
    });

    component.onSubmit();

    expect(dispatchSpy).toHaveBeenCalledWith(
      AssignmentsActions.createAssignment({
        request: {
          vehicleId: 'v1',
          driverId: 'd1',
          destinationLocationId: 'loc2',
          scheduledDeparture: new Date(departureStr).toISOString(),
          scheduledArrival: new Date(arrivalStr).toISOString()
        }
      })
    );

    // Mock create assignment success to close modal
    actions$.next(AssignmentsActions.createAssignmentSuccess({
      assignment: { id: 'a2', vehicleId: 'v1', driverId: 'd1', destinationLocationId: 'loc2', status: 'Scheduled', scheduledDeparture: '', scheduledArrival: '' }
    }));
    expect(component.isDispatchModalOpen()).toBe(false);
  });

  it('should dispatch accept assignment action', () => {
    const assignment = { id: 'a1', vehicleId: 'v1', driverId: 'd1', destinationLocationId: 'loc2', status: 'Scheduled', scheduledDeparture: '', scheduledArrival: '' };
    component.accept(assignment);

    expect(dispatchSpy).toHaveBeenCalledWith(
      AssignmentsActions.acceptAssignment({
        request: { id: 'a1', vehicleId: 'v1', driverId: 'd1' }
      })
    );
  });

  it('should dispatch reject assignment action', () => {
    const assignment = { id: 'a1', vehicleId: 'v1', driverId: 'd1', destinationLocationId: 'loc2', status: 'Scheduled', scheduledDeparture: '', scheduledArrival: '' };
    component.reject(assignment);

    expect(dispatchSpy).toHaveBeenCalledWith(
      AssignmentsActions.rejectAssignment({
        request: { id: 'a1', vehicleId: 'v1', driverId: 'd1' }
      })
    );
  });

  it('should dispatch arrive assignment action', () => {
    const assignment = { id: 'a1', vehicleId: 'v1', driverId: 'd1', destinationLocationId: 'loc2', status: 'In Transit', scheduledDeparture: '', scheduledArrival: '' };
    component.arrive(assignment);

    expect(dispatchSpy).toHaveBeenCalledWith(
      AssignmentsActions.arriveAssignment({
        request: { id: 'a1', vehicleId: 'v1', driverId: 'd1' }
      })
    );
  });

  it('should dispatch setAssignmentFilter action', () => {
    component.setFilter('Scheduled');
    expect(dispatchSpy).toHaveBeenCalledWith(
      AssignmentsActions.setAssignmentFilter({ filter: 'Scheduled' })
    );
  });

  it('should open details modal and fetch details when selectRow is called first time', () => {
    const assignmentsService = TestBed.inject(AssignmentsService);
    const getByIdSpy = vi.spyOn(assignmentsService, 'getAssignmentById');

    component.selectRow('assignment-123');

    expect(component.selectedRowId()).toBe('assignment-123');
    expect(component.isDetailsModalOpen()).toBe(true);
    expect(component.detailsLoading()).toBe(false);
    expect(getByIdSpy).toHaveBeenCalledWith('assignment-123');
    expect(component.selectedAssignmentDetails()).toEqual({
      id: 'assignment-123',
      vehicleId: 'v1',
      vehicleName: 'TX01-1111',
      driverId: 'd1',
      driverName: 'John Doe',
      destinationLocationId: 'loc2',
      routeName: 'Houston Hub',
      status: 'Scheduled',
      scheduledDeparture: '2026-06-22T10:00:00Z',
      scheduledArrival: '2026-06-22T14:00:00Z',
      actualDeparture: null,
      actualArrival: null
    });
  });

  it('should close details modal when selectRow is called with currently selected ID', () => {
    component.selectedRowId.set('assignment-123');
    component.isDetailsModalOpen.set(true);

    component.selectRow('assignment-123');

    expect(component.selectedRowId()).toBeNull();
    expect(component.isDetailsModalOpen()).toBe(false);
    expect(component.selectedAssignmentDetails()).toBeNull();
  });

  it('should close details modal when closeDetailsModal is called', () => {
    component.selectedRowId.set('assignment-123');
    component.isDetailsModalOpen.set(true);

    component.closeDetailsModal();

    expect(component.selectedRowId()).toBeNull();
    expect(component.isDetailsModalOpen()).toBe(false);
    expect(component.selectedAssignmentDetails()).toBeNull();
  });
});

describe('AssignmentsComponent - FleetManager role', () => {
  let component: AssignmentsComponent;
  let fixture: ComponentFixture<AssignmentsComponent>;
  let actions$: Subject<any>;

  const mockUserRole = signal<string>('FleetManager');
  const mockCurrentUser = signal<any>({ token: 'mock-token', email: 'operator@example.com', role: 'FleetManager', routeLocationId: 'loc1' });

  const authServiceMock = {
    apiUrl: () => 'https://localhost:7136/api/v1',
    userEmail: () => 'operator@example.com',
    userRole: mockUserRole,
    currentUser: mockCurrentUser,
    getRouteLocations: () => of([
      { id: 'loc1', location: 'Austin Hub', isActive: true },
      { id: 'loc2', location: 'Houston Hub', isActive: true }
    ])
  };

  const vehicleServiceMock = {
    getVehicles: () => of({
      totalCount: 1,
      pageNumber: 1,
      pageSize: 10,
      data: [
        { id: 'v1', regNo: 'TX01-1111', status: 'Active', routeLocationId: 'loc1' }
      ]
    })
  };

  const assignmentsServiceMock = {
    getActiveDrivers: () => of([]),
    getAssignments: () => of([])
  };

  beforeEach(async () => {
    actions$ = new Subject<any>();
    await TestBed.configureTestingModule({
      imports: [AssignmentsComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        provideMockActions(() => actions$),
        provideMockStore({
          initialState: {
            assignments: {
              assignments: [],
              filter: 'All',
              loading: false,
              error: null
            }
          }
        }),
        { provide: AuthService, useValue: authServiceMock },
        { provide: VehicleService, useValue: vehicleServiceMock },
        { provide: AssignmentsService, useValue: assignmentsServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AssignmentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should not show actions column or action buttons in table if user is not a Driver', () => {
    expect(component.isDriver()).toBe(false);
    const compiled = fixture.nativeElement;
    const actionsHeader = compiled.querySelector('th.text-right');
    expect(actionsHeader).toBeNull();
  });

  it('should prefill and lock start location for Fleet Manager when opening dispatch modal', () => {
    component.openDispatchModal();
    fixture.detectChanges();

    expect(component.isDispatchModalOpen()).toBe(true);
    expect(component.dispatchForm.get('startLocationId')?.disabled).toBe(true);
    expect(component.dispatchForm.get('startLocationId')?.value).toBe('loc1');
    expect(component.selectedStartLocationId()).toBe('loc1');

    // Available vehicles should be filtered to loc1
    expect(component.availableVehicles().length).toBe(1);
    expect(component.availableVehicles()[0].id).toBe('v1');
  });
});

describe('AssignmentsComponent - Driver role', () => {
  let component: AssignmentsComponent;
  let fixture: ComponentFixture<AssignmentsComponent>;
  let store: MockStore;
  let dispatchSpy: any;
  let actions$: Subject<any>;

  const mockUserRole = signal<string>('Driver');
  const mockCurrentUser = signal<any>({ token: 'mock-token', email: 'driver@example.com', role: 'Driver', driverId: 'd-logged-in', routeLocationId: 'loc1' });

  const authServiceMock = {
    apiUrl: () => 'https://localhost:7136/api/v1',
    userEmail: () => 'driver@example.com',
    userRole: mockUserRole,
    currentUser: mockCurrentUser,
    getRouteLocations: () => of([])
  };

  const vehicleServiceMock = {
    getVehicles: () => of({ data: [] })
  };

  const assignmentsServiceMock = {
    getActiveDrivers: () => of([])
  };

  beforeEach(async () => {
    actions$ = new Subject<any>();
    await TestBed.configureTestingModule({
      imports: [AssignmentsComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        provideMockActions(() => actions$),
        provideMockStore({
          initialState: {
            assignments: {
              assignments: [],
              filter: 'All',
              loading: false,
              error: null
            }
          }
        }),
        { provide: AuthService, useValue: authServiceMock },
        { provide: VehicleService, useValue: vehicleServiceMock },
        { provide: AssignmentsService, useValue: assignmentsServiceMock }
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    dispatchSpy = vi.spyOn(store, 'dispatch');
    fixture = TestBed.createComponent(AssignmentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should not load active drivers on init', () => {
    expect(component.isDriver()).toBe(true);
    expect(component.drivers().length).toBe(0);
  });

  it('should dispatch accept, reject, and arrive with logged in driver ID', () => {
    const assignment = { id: 'a1', vehicleId: 'v1', driverId: 'd1', destinationLocationId: 'loc2', status: 'Scheduled', scheduledDeparture: '', scheduledArrival: '' };
    
    component.accept(assignment);
    expect(dispatchSpy).toHaveBeenCalledWith(
      AssignmentsActions.acceptAssignment({
        request: { id: 'a1', vehicleId: 'v1', driverId: 'd-logged-in' }
      })
    );

    component.reject(assignment);
    expect(dispatchSpy).toHaveBeenCalledWith(
      AssignmentsActions.rejectAssignment({
        request: { id: 'a1', vehicleId: 'v1', driverId: 'd-logged-in' }
      })
    );

    component.arrive(assignment);
    expect(dispatchSpy).toHaveBeenCalledWith(
      AssignmentsActions.arriveAssignment({
        request: { id: 'a1', vehicleId: 'v1', driverId: 'd-logged-in' }
      })
    );
  });
});
