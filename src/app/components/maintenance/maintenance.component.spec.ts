import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { signal } from '@angular/core';
import { MaintenanceComponent } from './maintenance.component';
import { AuthService } from '../../services/auth.service';
import { VehicleService } from '../../services/vehicle.service';
import { MaintenanceService } from '../../services/maintenance.service';
import { AlertsService } from '../../services/alerts.service';

describe('MaintenanceComponent', () => {
  let component: MaintenanceComponent;
  let fixture: ComponentFixture<MaintenanceComponent>;
  let maintenanceServiceMock: any;
  let vehicleServiceMock: any;
  let alertsServiceMock: any;
  let authServiceMock: any;

  const mockMaintenancesPaged = {
    totalCount: 3,
    pageNumber: 1,
    pageSize: 5,
    data: [
      { id: 'm1', vehicleId: 'v1', vehicleRegNo: 'TX01-1111', vehicleName: 'Ford Transit', scheduledDate: '2026-06-25T00:00:00Z', completedDate: null, odometerReading: 124500, serviceType: 'preventive', cost: 250.00, status: 'scheduled', notes: 'Oil change and filters' },
      { id: 'm2', vehicleId: 'v2', vehicleRegNo: 'TX02-2222', vehicleName: 'Freightliner', scheduledDate: '2026-06-26T00:00:00Z', completedDate: '2026-06-26T08:00:00Z', odometerReading: 42300, serviceType: 'corrective', cost: 1500.00, status: 'completed', notes: 'Brake pads replacement' },
      { id: 'm3', vehicleId: 'v1', vehicleRegNo: 'TX01-1111', vehicleName: 'Ford Transit', scheduledDate: '2026-06-28T00:00:00Z', completedDate: null, odometerReading: 125000, serviceType: 'predictive', cost: 350.00, status: 'in progress', notes: 'Predictive tire check' }
    ]
  };

  const mockVehicles = {
    data: [
      { id: 'v1', regNo: 'TX01-1111', manufacturer: 'Ford', modelName: 'Transit' },
      { id: 'v2', regNo: 'TX02-2222', manufacturer: 'Freightliner', modelName: 'M2' }
    ]
  };

  const mockServiceTypes = ['preventive', 'corrective', 'predictive'];

  beforeEach(async () => {
    authServiceMock = {
      apiUrl: () => 'https://localhost:7136/api/v1',
      userRole: signal('FleetManager'),
      userEmail: () => 'manager@example.com',
      currentUser: () => ({ token: 'mock-token', email: 'manager@example.com', role: 'FleetManager' })
    };

    maintenanceServiceMock = {
      getMaintenances: vi.fn().mockReturnValue(of(mockMaintenancesPaged)),
      getMaintenanceById: vi.fn().mockReturnValue(of(mockMaintenancesPaged.data[0])),
      createMaintenance: vi.fn().mockReturnValue(of(mockMaintenancesPaged.data[0])),
      updateMaintenance: vi.fn().mockReturnValue(of({ message: 'Maintenance updated successfully' })),
      getServiceTypes: vi.fn().mockReturnValue(of(mockServiceTypes))
    };

    vehicleServiceMock = {
      getVehicles: vi.fn().mockReturnValue(of(mockVehicles))
    };

    alertsServiceMock = {
      alerts: signal([]),
      unreadCount: signal(0),
      fetchAlerts: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [MaintenanceComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: VehicleService, useValue: vehicleServiceMock },
        { provide: MaintenanceService, useValue: maintenanceServiceMock },
        { provide: AlertsService, useValue: alertsServiceMock }
      ]
    }).compileComponents();
  });

  describe('As Manager / Admin', () => {
    beforeEach(() => {
      authServiceMock.userRole.set('FleetManager');
      fixture = TestBed.createComponent(MaintenanceComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should initialize, load maintenance logs, stats, and dropdown data', () => {
      expect(component).toBeTruthy();
      expect(maintenanceServiceMock.getMaintenances).toHaveBeenCalled();
      expect(vehicleServiceMock.getVehicles).toHaveBeenCalled();
      expect(maintenanceServiceMock.getServiceTypes).toHaveBeenCalled();

      expect(component.maintenanceLogs().length).toBe(3);
      expect(component.vehicles().length).toBe(2);
      expect(component.serviceTypes()).toContain('preventive');
      expect(component.kpiTotal()).toBe(3);
      expect(component.kpiScheduled()).toBe(1);
      expect(component.kpiInProgress()).toBe(1);
      expect(component.kpiCompleted()).toBe(1);
    });

    it('should search logs correctly', () => {
      const event = { target: { value: 'Transit' } } as unknown as Event;
      component.onSearch(event);

      expect(component.filterSearchTerm()).toBe('Transit');
      expect(component.currentPage()).toBe(1);
      expect(maintenanceServiceMock.getMaintenances).toHaveBeenLastCalledWith(
        expect.objectContaining({
          SearchTerm: 'Transit',
          PageNumber: 1
        })
      );
    });

    it('should filter logs by status, type, and vehicle', () => {
      component.onStatusFilterChange('scheduled');
      expect(component.filterStatus()).toBe('scheduled');

      component.onServiceTypeFilterChange('corrective');
      expect(component.filterServiceType()).toBe('corrective');

      component.onVehicleFilterChange('v1');
      expect(component.filterVehicleId()).toBe('v1');
    });

    it('should clear all filters and reload logs', () => {
      component.filterStatus.set('completed');
      component.filterSearchTerm.set('test');
      component.clearFilters();

      expect(component.filterStatus()).toBe('');
      expect(component.filterSearchTerm()).toBe('');
      expect(maintenanceServiceMock.getMaintenances).toHaveBeenCalled();
    });

    it('should handle sorting order changes', () => {
      component.changeSort('Cost');
      expect(component.sortBy()).toBe('Cost');
      expect(component.sortOrder()).toBe('asc');

      component.changeSort('Cost');
      expect(component.sortOrder()).toBe('desc');
    });

    it('should open and submit creation form successfully', () => {
      component.openCreateModal();
      expect(component.isCreateModalOpen()).toBe(true);

      const testDate = new Date().toISOString().substring(0, 10);
      component.maintenanceForm.patchValue({
        vehicleId: 'v1',
        scheduledDate: testDate,
        odometerReading: 125000,
        serviceType: 'preventive',
        cost: 200.00,
        status: 'scheduled',
        notes: 'Monthly inspection'
      });

      component.onSubmitCreate();

      expect(maintenanceServiceMock.createMaintenance).toHaveBeenCalledWith({
        vehicleId: 'v1',
        scheduledDate: new Date(testDate).toISOString(),
        odometerReading: 125000,
        serviceType: 'preventive',
        cost: 200.00,
        status: 'Scheduled',
        notes: 'Monthly inspection'
      });
      expect(component.isCreateModalOpen()).toBe(false);
    });

    it('should propagate backend validation error message during creation', () => {
      const errorMsg = 'Cannot schedule maintenance: vehicle is in an active trip';
      maintenanceServiceMock.createMaintenance.mockReturnValue(throwError(() => ({
        error: { message: errorMsg }
      })));

      component.openCreateModal();
      component.maintenanceForm.patchValue({
        vehicleId: 'v1',
        scheduledDate: new Date().toISOString().substring(0, 10),
        odometerReading: 125000,
        serviceType: 'preventive',
        cost: 200.00,
        status: 'scheduled',
        notes: 'Failed case'
      });

      component.onSubmitCreate();

      expect(component.isCreateModalOpen()).toBe(true);
      expect(component.modalErrorMessage()).toBe(errorMsg);
    });

    it('should open edit modal and submit update successfully', () => {
      const log = mockMaintenancesPaged.data[0];
      component.openEditModal(log);

      expect(component.isEditModalOpen()).toBe(true);
      expect(component.editingLogId()).toBe('m1');

      component.onSubmitUpdate();

      expect(maintenanceServiceMock.updateMaintenance).toHaveBeenCalledWith(
        'm1',
        expect.objectContaining({
          vehicleId: 'v1',
          serviceType: 'preventive',
          status: 'Scheduled'
        })
      );
      expect(component.isEditModalOpen()).toBe(false);
    });

    it('should propagate backend validation error message during update', () => {
      const errorMsg = 'Maintenance can only be moved to In Progress from Scheduled state';
      maintenanceServiceMock.updateMaintenance.mockReturnValue(throwError(() => ({
        error: { message: errorMsg }
      })));

      const log = mockMaintenancesPaged.data[0];
      component.openEditModal(log);
      component.onSubmitUpdate();

      expect(component.isEditModalOpen()).toBe(true);
      expect(component.modalErrorMessage()).toBe(errorMsg);
    });
  });

  describe('As Driver', () => {
    beforeEach(() => {
      authServiceMock.userRole.set('Driver');
      fixture = TestBed.createComponent(MaintenanceComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should restrict access and render lock screen', () => {
      expect(component.isDriver()).toBe(true);
      expect(maintenanceServiceMock.getMaintenances).not.toHaveBeenCalled();
    });
  });
});
