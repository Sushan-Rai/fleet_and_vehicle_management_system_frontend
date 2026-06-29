import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { signal } from '@angular/core';
import { FuelLogsComponent } from './fuel-logs.component';
import { AuthService } from '../../services/auth.service';
import { VehicleService } from '../../services/vehicle.service';
import { AssignmentsService } from '../../services/assignments.service';
import { FuelService } from '../../services/fuel.service';
import { AlertsService } from '../../services/alerts.service';

describe('FuelLogsComponent', () => {
  let component: FuelLogsComponent;
  let fixture: ComponentFixture<FuelLogsComponent>;
  let fuelServiceMock: any;
  let vehicleServiceMock: any;
  let assignmentsServiceMock: any;
  let alertsServiceMock: any;
  let authServiceMock: any;

  const mockFuelLogsPaged = {
    totalCount: 2,
    pageNumber: 1,
    pageSize: 5,
    data: [
      { id: 'f1', vehicleId: 'v1', vehicleRegNo: 'TX01-1111', vehicleModelName: 'Ford Transit', driverId: 'd1', driverFullName: 'Marcus J.', logDate: '2026-06-22T00:00:00Z', odometerReading: 124502, fuelLitres: 85.4, totalCost: 142.20, costPerLitre: 1.66, distanceTraveled: 500, efficiency: { kmPerLitre: 6.8, litresPer100Km: 14.7, milesPerGallon: 16.0 }, isEfficiencyAnomaly: true },
      { id: 'f2', vehicleId: 'v2', vehicleRegNo: 'TX02-2222', vehicleModelName: 'Freightliner', driverId: 'd2', driverFullName: 'Elena R.', logDate: '2026-06-22T00:00:00Z', odometerReading: 42310, fuelLitres: 45.0, totalCost: 74.25, costPerLitre: 1.65, distanceTraveled: 639, efficiency: { kmPerLitre: 14.2, litresPer100Km: 7.0, milesPerGallon: 33.4 }, isEfficiencyAnomaly: false }
    ]
  };

  const mockVehicles = {
    data: [
      { id: 'v1', regNo: 'TX01-1111', manufacturer: 'Ford', modelName: 'Transit' }
    ]
  };

  const mockDrivers = [
    { id: 'd1', firstName: 'Marcus', lastName: 'J.' }
  ];

  const mockEfficiencyReport = [
    { vehicleId: 'v1', vehicleRegNo: 'TX01-1111', vehicleModelName: 'Ford Transit', categoryName: 'Van', totalDistanceTraveled: 500, totalFuelConsumed: 85.4, averageEfficiency: 6.8, chosenUnit: 'km/L', isAnomaly: true }
  ];

  beforeEach(async () => {
    authServiceMock = {
      apiUrl: () => 'https://localhost:7136/api/v1',
      userRole: signal('FleetManager'),
      userEmail: () => 'manager@example.com',
      currentUser: () => ({ token: 'mock-token', email: 'manager@example.com', role: 'FleetManager' })
    };

    fuelServiceMock = {
      getFuelLogs: vi.fn().mockReturnValue(of(mockFuelLogsPaged)),
      getFuelEfficiencyReport: vi.fn().mockReturnValue(of(mockEfficiencyReport)),
      createFuelLog: vi.fn().mockReturnValue(of({ message: 'Success' })),
      getFuelReportCsv: vi.fn().mockReturnValue(of(new Blob(['csv'], { type: 'text/csv' })))
    };

    vehicleServiceMock = {
      getVehicles: vi.fn().mockReturnValue(of(mockVehicles))
    };

    assignmentsServiceMock = {
      getActiveDrivers: vi.fn().mockReturnValue(of(mockDrivers))
    };

    alertsServiceMock = {
      alerts: signal([]),
      unreadCount: signal(0),
      fetchAlerts: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [FuelLogsComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: VehicleService, useValue: vehicleServiceMock },
        { provide: AssignmentsService, useValue: assignmentsServiceMock },
        { provide: FuelService, useValue: fuelServiceMock },
        { provide: AlertsService, useValue: alertsServiceMock }
      ]
    }).compileComponents();
  });

  describe('As Manager', () => {
    beforeEach(() => {
      authServiceMock.userRole.set('FleetManager');
      fixture = TestBed.createComponent(FuelLogsComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should load fuel logs, reports, and list data on init', () => {
      expect(component).toBeTruthy();
      expect(fuelServiceMock.getFuelLogs).toHaveBeenCalled();
      expect(fuelServiceMock.getFuelEfficiencyReport).toHaveBeenCalled();
      expect(vehicleServiceMock.getVehicles).toHaveBeenCalled();
      expect(assignmentsServiceMock.getActiveDrivers).toHaveBeenCalled();

      expect(component.fuelLogs().length).toBe(2);
      expect(component.vehicles().length).toBe(1);
      expect(component.drivers().length).toBe(1);
      expect(component.efficiencyReport().length).toBe(1);
      expect(component.overallAvgEfficiency()).toBe(6.8);
    });

    it('should search logs correctly', () => {
      const event = { target: { value: 'TX01' } } as unknown as Event;
      component.onSearch(event);

      expect(component.searchTerm()).toBe('TX01');
      expect(component.currentPage()).toBe(1);
      expect(fuelServiceMock.getFuelLogs).toHaveBeenLastCalledWith({
        PageNumber: 1,
        PageSize: 5,
        SearchTerm: 'TX01',
        SortBy: 'LogDate',
        SortOrder: 'desc'
      });
    });

    it('should handle sorting', () => {
      component.changeSort('TotalCost');
      expect(component.sortBy()).toBe('TotalCost');
      expect(component.sortOrder()).toBe('asc');

      component.changeSort('TotalCost');
      expect(component.sortOrder()).toBe('desc');
    });

    it('should submit form and trigger reloading on success', () => {
      component.openAddModal();
      expect(component.isAddModalOpen()).toBe(true);

      const todayStr = new Date().toISOString().substring(0, 10);

      component.fuelForm.patchValue({
        vehicleId: 'v1',
        driverId: 'd1',
        logDate: todayStr,
        odometerReading: 124502,
        fuelLitres: 85.4,
        totalCost: 142.20
      });

      component.onSubmitFuelLog();

      expect(fuelServiceMock.createFuelLog).toHaveBeenCalledWith({
        vehicleId: 'v1',
        driverId: 'd1',
        logDate: new Date(todayStr).toISOString(),
        odometerReading: 124502,
        fuelLitres: 85.4,
        totalCost: 142.20
      });
      expect(component.isAddModalOpen()).toBe(false);
    });

    it('should export csv correctly', () => {
      component.exportReport();
      expect(fuelServiceMock.getFuelReportCsv).toHaveBeenCalled();
    });
  });

  describe('As Driver', () => {
    beforeEach(() => {
      authServiceMock.userRole.set('Driver');
      authServiceMock.currentUser = () => ({ token: 'mock-token', email: 'driver@example.com', role: 'Driver', driverId: 'd1' });
      fixture = TestBed.createComponent(FuelLogsComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should restrict logs loading and show fuel logging option', () => {
      expect(component.isDriver()).toBe(true);
      expect(fuelServiceMock.getFuelLogs).not.toHaveBeenCalled();
      expect(assignmentsServiceMock.getActiveDrivers).not.toHaveBeenCalled();
    });

    it('should lock driverId on modal open and submit via getRawValue', () => {
      component.openAddModal();
      
      // Control should be disabled and prefilled
      const driverIdControl = component.fuelForm.get('driverId');
      expect(driverIdControl?.value).toBe('d1');
      expect(driverIdControl?.disabled).toBe(true);
      
      const todayStr = new Date().toISOString().substring(0, 10);
      component.fuelForm.patchValue({
        vehicleId: 'v1',
        logDate: todayStr,
        odometerReading: 120,
        fuelLitres: 40.0,
        totalCost: 65.0
      });
      
      component.onSubmitFuelLog();
      
      expect(fuelServiceMock.createFuelLog).toHaveBeenCalledWith({
        vehicleId: 'v1',
        driverId: 'd1',
        logDate: new Date(todayStr).toISOString(),
        odometerReading: 120,
        fuelLitres: 40.0,
        totalCost: 65.0
      });
    });
  });
});
