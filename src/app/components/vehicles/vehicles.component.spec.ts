import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, Observable } from 'rxjs';
import { vi } from 'vitest';
import { provideMockActions } from '@ngrx/effects/testing';
import { signal } from '@angular/core';
import { VehiclesComponent } from './vehicles.component';
import { AuthService } from '../../services/auth.service';
import { VehicleService } from '../../services/vehicle.service';
import * as VehiclesActions from '../../store/vehicles/vehicles.actions';
import { selectEnrichedVehicles, selectVehicleModelsList } from '../../store/vehicles/vehicles.selectors';

describe('VehiclesComponent', () => {
  let component: VehiclesComponent;
  let fixture: ComponentFixture<VehiclesComponent>;
  let store: MockStore;
  let actions$: Subject<any>;
  let dispatchSpy: any;

  const mockUserRole = signal<string>('FleetManager');
  const mockCurrentUser = signal<any>({ token: 'mock-token', email: 'james.miller@example.com', role: 'FleetManager', routeLocationId: 'loc1' });

  const authServiceMock = {
    apiUrl: () => 'https://localhost:7136/api/v1',
    userEmail: () => 'james.miller@example.com',
    userRole: mockUserRole,
    currentUser: mockCurrentUser,
    getRouteLocations: () => of([
      { id: 'loc1', location: 'Main Depot', isActive: true }
    ])
  };

  const vehicleServiceMock = {
    getVehicleCategories: () => of({
      totalCount: 1,
      pageNumber: 1,
      pageSize: 100,
      data: [{ id: 'cat1', name: 'Delivery Van', fuelEfficiencyThreshold: 15 }]
    }),
    createVehicleModel: (req: any) => of({
      id: 'model2',
      modelName: req.modelName,
      manufacturer: req.manufacturer,
      expectedLifeTimeYears: req.expectedLifeTimeYears,
      expectedLifeTimeKms: req.expectedLifeTimeKms,
      categoryId: req.categoryId,
      categoryName: 'Delivery Van'
    }),
    createVehicleCategory: (req: any) => of({
      id: 'cat2',
      name: req.name,
      fuelEfficiencyThreshold: req.fuelEfficiencyThreshold
    }),
    getVehicleById: () => of({})
  };

  beforeEach(async () => {
    mockUserRole.set('FleetManager');
    mockCurrentUser.set({ token: 'mock-token', email: 'james.miller@example.com', role: 'FleetManager', routeLocationId: 'loc1' });
    actions$ = new Subject<any>();
    await TestBed.configureTestingModule({
      imports: [VehiclesComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        provideMockActions(() => actions$),
        provideMockStore({
          initialState: {
            vehicles: {
              vehicles: [
                { id: '101', regNo: 'KA01AB1234', chassisNumber: '11111111111111111', currentOdometerReading: 5000, modelId: 'model1', routeLocationId: 'loc1', status: 'InTransit' }
              ],
              models: [
                { id: 'model1', modelName: 'Sprinter', manufacturer: 'Mercedes', expectedLifeTimeYears: 10, expectedLifeTimeKms: 200000, categoryId: 'cat1', categoryName: 'Delivery Van' }
              ],
              totalCount: 1,
              loading: false,
              error: null
            }
          }
        }),
        { provide: AuthService, useValue: authServiceMock },
        { provide: VehicleService, useValue: vehicleServiceMock }
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    dispatchSpy = vi.spyOn(store, 'dispatch');
    fixture = TestBed.createComponent(VehiclesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and dispatch load actions on init if store is empty', () => {
    store.overrideSelector(selectEnrichedVehicles, []);
    store.overrideSelector(selectVehicleModelsList, []);
    store.refreshState();

    const localFixture = TestBed.createComponent(VehiclesComponent);
    const localComponent = localFixture.componentInstance;
    const localDispatchSpy = vi.spyOn(store, 'dispatch');
    
    localFixture.detectChanges();

    expect(localComponent).toBeTruthy();
    expect(localDispatchSpy).toHaveBeenCalledWith(VehiclesActions.loadVehicles({ filters: { PageSize: 1000 } }));
    expect(localDispatchSpy).toHaveBeenCalledWith(VehiclesActions.loadVehicleModels());

    store.resetSelectors();
    store.refreshState();
  });

  it('should compute KPI values correctly', () => {
    // KA01AB1234 has status 'InTransit' (Assigned)
    expect(component.kpiTotal()).toBe(1);
    expect(component.kpiAssigned()).toBe(1);
    expect(component.kpiAvailable()).toBe(0);
    expect(component.kpiInService()).toBe(0);
  });

  it('should filter items by search term', () => {
    component.searchTerm.set('KA01');
    expect(component.filteredVehicles().length).toBe(1);

    component.searchTerm.set('NonExistent');
    expect(component.filteredVehicles().length).toBe(0);
  });

  it('should filter items by status', () => {
    component.selectedStatus.set('InTransit');
    expect(component.filteredVehicles().length).toBe(1);

    component.selectedStatus.set('Active');
    expect(component.filteredVehicles().length).toBe(0);
  });

  it('should submit form and dispatch addVehicle action', () => {
    component.openAddModal();
    expect(component.isAddModalOpen()).toBe(true);

    component.vehicleForm.setValue({
      regNo: 'KA02XY9999',
      chassisNumber: '22222222222222222',
      currentOdometerReading: 1200,
      vehicleModelId: 'model1',
      routeLocationId: 'loc1'
    });

    component.onSubmit();

    expect(dispatchSpy).toHaveBeenCalledWith(
      VehiclesActions.addVehicle({
        request: {
          regNo: 'KA02XY9999',
          chassisNumber: '22222222222222222',
          currentOdometerReading: 1200,
          vehicleModelId: 'model1',
          routeLocationId: 'loc1'
        }
      })
    );
    expect(component.isAddModalOpen()).toBe(true);

    actions$.next(VehiclesActions.addVehicleSuccess({
      vehicle: {
        id: '102',
        regNo: 'KA02XY9999',
        chassisNumber: '22222222222222222',
        currentOdometerReading: 1200,
        modelId: 'model1',
        routeLocationId: 'loc1',
        status: 'Active'
      }
    }));
    expect(component.isAddModalOpen()).toBe(false);
  });

  it('should handle vehicle creation error gracefully', () => {
    component.openAddModal();
    expect(component.isAddModalOpen()).toBe(true);

    component.vehicleForm.setValue({
      regNo: 'KA02XY9999',
      chassisNumber: '22222222222222222',
      currentOdometerReading: 1200,
      vehicleModelId: 'model1',
      routeLocationId: 'loc1'
    });

    component.onSubmit();

    expect(component.isAddModalOpen()).toBe(true);
    expect(component.addErrorMessage()).toBe('');

    actions$.next(VehiclesActions.addVehicleFailure({
      error: { status: 409, error: 'duplicate key value violates unique constraint "IX_Vehicles_RegNo"' }
    }));

    expect(component.isAddModalOpen()).toBe(true);
    expect(component.addErrorMessage()).toBe('Registration Number already registered');

    // Simulate chassis duplicate
    actions$.next(VehiclesActions.addVehicleFailure({
      error: { status: 409, error: 'duplicate key value violates unique constraint "IX_Vehicles_ChassisNumber"' }
    }));

    expect(component.isAddModalOpen()).toBe(true);
    expect(component.addErrorMessage()).toBe('Chassis Number already registered');

    // Simulate status 500 error
    actions$.next(VehiclesActions.addVehicleFailure({
      error: { status: 500 }
    }));
    expect(component.addErrorMessage()).toBe('Internal server error. Please try again later.');

    // Simulate status 0 connection error
    actions$.next(VehiclesActions.addVehicleFailure({
      error: { status: 0 }
    }));
    expect(component.addErrorMessage()).toContain('Cannot connect to the server');

    // Simulate statusText "OK" fallback
    actions$.next(VehiclesActions.addVehicleFailure({
      error: { statusText: 'OK' }
    }));
    expect(component.addErrorMessage()).toBe('Failed to create vehicle. Please try again.');

    // Simulate real backend duplicate key violation error with uppercase Message property
    actions$.next(VehiclesActions.addVehicleFailure({
      error: {
        status: 409,
        error: {
          StatusCode: 409,
          Message: '23505: duplicate key value violates unique constraint "IX_Vehicles_RegNo"'
        }
      }
    }));
    expect(component.addErrorMessage()).toBe('Registration Number already registered');
  });

  it('should compute role properties and check category load', () => {
    expect(component.isAdmin()).toBe(false);
    expect(component.isFleetManager()).toBe(true);
    expect(component.allCategories().length).toBe(1);
    expect(component.allCategories()[0].name).toBe('Delivery Van');
  });

  it('should submit vehicle model form and dispatch loadVehicleModels action', () => {
    const createModelSpy = vi.spyOn(vehicleServiceMock, 'createVehicleModel');
    component.openAddModelModal();
    expect(component.isModelModalOpen()).toBe(true);

    component.modelForm.setValue({
      manufacturer: 'Tesla',
      modelName: 'Semi',
      expectedLifeTimeYears: 8,
      expectedLifeTimeKms: 500000,
      categoryId: 'cat1'
    });

    component.onSubmitModel();

    expect(createModelSpy).toHaveBeenCalledWith({
      manufacturer: 'Tesla',
      modelName: 'Semi',
      expectedLifeTimeYears: 8,
      expectedLifeTimeKms: 500000,
      categoryId: 'cat1'
    });
    expect(component.isModelModalOpen()).toBe(false);
    expect(dispatchSpy).toHaveBeenCalledWith(VehiclesActions.loadVehicleModels());
  });

  it('should submit category form and reload categories', () => {
    const createCatSpy = vi.spyOn(vehicleServiceMock, 'createVehicleCategory').mockReturnValue(of({} as any));
    const loadCatSpy = vi.spyOn(component, 'loadCategories');
    component.openAddCategoryModal();
    expect(component.isCategoryModalOpen()).toBe(true);

    component.categoryForm.setValue({
      name: 'Electric Truck',
      fuelEfficiencyThreshold: 12.5
    });

    component.onSubmitCategory();

    expect(createCatSpy).toHaveBeenCalledWith({
      name: 'Electric Truck',
      fuelEfficiencyThreshold: 12.5
    });
    expect(component.isCategoryModalOpen()).toBe(false);
    expect(loadCatSpy).toHaveBeenCalled();
  });

  it('should handle duplicate category name error gracefully', () => {
    const errObj = {
      status: 409,
      error: '23505: duplicate key value violates unique constraint "IX_Categories_Name"'
    };
    vi.spyOn(vehicleServiceMock, 'createVehicleCategory').mockReturnValue(
      new Observable(obs => obs.error(errObj))
    );
    component.openAddCategoryModal();
    component.categoryForm.setValue({
      name: 'Electric Truck',
      fuelEfficiencyThreshold: 12.5
    });
    component.onSubmitCategory();
    expect(component.isCategoryModalOpen()).toBe(true);
    expect(component.categoryErrorMessage()).toBe('Category Name already exists');
  });

  it('should prefill and lock route location for Fleet Manager when opening add modal', () => {
    mockUserRole.set('FleetManager');
    mockCurrentUser.set({ token: 'mock-token', email: 'james.miller@example.com', role: 'FleetManager', routeLocationId: 'loc1' });
    fixture.detectChanges();
    component.openAddModal();
    expect(component.vehicleForm.get('routeLocationId')?.value).toBe('loc1');
  });

  it('should not prefill route location for Admin when opening add modal', () => {
    mockUserRole.set('Admin');
    mockCurrentUser.set({ token: 'mock-token', email: 'james.miller@example.com', role: 'Admin' });
    fixture.detectChanges();
    component.openAddModal();
    expect(component.vehicleForm.get('routeLocationId')?.value).toBe('');
  });

  describe('selectEnrichedVehicles', () => {
    it('should fall back to modelName and categoryname directly from vehicle object when model is not found in store', () => {
      const mockVehicles = [
        { id: '1', regNo: 'MH12AB1234', modelName: 'Sprinter Cargo', categoryname: 'Cargo Van' }
      ] as any[];
      const mockModels = [] as any[];
      const result = selectEnrichedVehicles.projector(mockVehicles, mockModels);
      expect(result[0].modelName).toBe('Sprinter Cargo');
      expect(result[0].categoryName).toBe('Cargo Van');
    });
  });
});
