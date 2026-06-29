import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { SettingsComponent } from './settings.component';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let settingsService: SettingsService;

  const authServiceMock = {
    apiUrl: () => 'https://localhost:7136/api/v1',
    userEmail: () => 'admin@example.com',
    userRole: () => 'Admin',
    currentUser: () => ({ token: 'mock-token', email: 'admin@example.com', role: 'Admin' })
  };

  const mockPrefs = {
    id: 'pref123',
    userId: 'user123',
    alertOnAbnormalFuel: true,
    fuelEfficiencyThreshold: 15,
    alertOnMaintenanceApproaching: true,
    maintenanceOdometerThreshold: 1200,
    alertOnVehicleAvailability: false,
    alertOnRouteDelay: true,
    routeDelayThresholdMinutes: 45,
    receiveEmail: true,
    receiveSignalR: false
  };

  const mockPendingApprovals = [
    {
      userId: 'pending1',
      email: 'driver1@example.com',
      role: 'Driver',
      firstName: 'John',
      lastName: 'Driver',
      licenseNumber: 'DL12345',
      createdAt: '2026-06-20T10:00:00Z'
    }
  ];

  const settingsServiceMock = {
    getAlertPreferences: () => of(mockPrefs),
    updateAlertPreferences: (prefs: any) => of(prefs),
    getPendingApprovals: () => of(mockPendingApprovals),
    approveUser: (userId: string) => of({ message: 'User approved successfully' }),
    getFleetManagerProfile: (id: string) => of({})
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: SettingsService, useValue: settingsServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    settingsService = TestBed.inject(SettingsService);
  });

  it('should create and load alert preferences and approvals for Admin on init', () => {
    const getPrefsSpy = vi.spyOn(settingsService, 'getAlertPreferences');
    const getApprovalsSpy = vi.spyOn(settingsService, 'getPendingApprovals');

    fixture.detectChanges(); // Triggers ngOnInit

    expect(component).toBeTruthy();
    expect(getPrefsSpy).toHaveBeenCalled();
    expect(getApprovalsSpy).toHaveBeenCalled();

    // Verify form matches mock preferences
    expect(component.alertForm.value.fuelEfficiencyThreshold).toBe(15);
    expect(component.alertForm.value.maintenanceOdometerThreshold).toBe(1200);
    expect(component.alertForm.value.routeDelayThresholdMinutes).toBe(45);
    expect(component.alertForm.value.alertOnVehicleAvailability).toBe(false);
    expect(component.alertForm.value.receiveSignalR).toBe(false);

    // Verify pending approvals are loaded
    expect(component.pendingApprovals().length).toBe(1);
    expect(component.pendingApprovals()[0].firstName).toBe('John');
  });

  it('should submit preferences and show success message', () => {
    fixture.detectChanges();
    const updateSpy = vi.spyOn(settingsService, 'updateAlertPreferences').mockReturnValue(of({}));

    component.alertForm.patchValue({
      fuelEfficiencyThreshold: 20
    });

    component.onSubmitAlertPreferences();

    expect(updateSpy).toHaveBeenCalled();
    expect(component.successMessage()).toBe('Alert preferences updated successfully.');
  });

  it('should handle preferences update error gracefully', () => {
    fixture.detectChanges();
    vi.spyOn(settingsService, 'updateAlertPreferences').mockReturnValue(throwError(() => new Error('Error')));

    component.onSubmitAlertPreferences();

    expect(component.error()).toBe('Failed to update alert preferences. Please try again.');
  });

  it('should approve user and reload pending approvals list', () => {
    fixture.detectChanges();
    const approveSpy = vi.spyOn(settingsService, 'approveUser');
    const reloadSpy = vi.spyOn(settingsService, 'getPendingApprovals').mockReturnValue(of([]));

    component.onApproveUser('pending1');

    expect(approveSpy).toHaveBeenCalledWith('pending1');
    expect(component.approvalSuccessMessage()).toBe('User approved successfully.');
    expect(reloadSpy).toHaveBeenCalled();
  });
});

describe('SettingsComponent - FleetManager role', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let settingsService: SettingsService;

  const authServiceMock = {
    apiUrl: () => 'https://localhost:7136/api/v1',
    userEmail: () => 'manager@example.com',
    userRole: () => 'FleetManager',
    currentUser: () => ({ token: 'mock-token', email: 'manager@example.com', role: 'FleetManager', fleetManagerId: 'fm123', routeLocationId: 'loc123' })
  };

  const mockPrefs = {
    id: 'pref123',
    userId: 'user123',
    alertOnAbnormalFuel: true,
    fuelEfficiencyThreshold: 15,
    alertOnMaintenanceApproaching: true,
    maintenanceOdometerThreshold: 1200,
    alertOnVehicleAvailability: false,
    alertOnRouteDelay: true,
    routeDelayThresholdMinutes: 45,
    receiveEmail: true,
    receiveSignalR: false
  };

  const mockProfile = {
    id: 'fm123',
    firstName: 'Alex',
    lastName: 'Manager',
    email: 'manager@example.com',
    routeLocationId: 'loc123',
    routeLocationName: 'Austin Hub'
  };

  const settingsServiceMock = {
    getAlertPreferences: () => of(mockPrefs),
    updateAlertPreferences: (prefs: any) => of(prefs),
    getPendingApprovals: () => of([]),
    approveUser: (userId: string) => of({ message: 'User approved successfully' }),
    getFleetManagerProfile: (id: string) => of(mockProfile)
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: SettingsService, useValue: settingsServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    settingsService = TestBed.inject(SettingsService);
  });

  it('should create and load alert preferences and fleet manager profile on init', () => {
    const getPrefsSpy = vi.spyOn(settingsService, 'getAlertPreferences');
    const getProfileSpy = vi.spyOn(settingsService, 'getFleetManagerProfile');
    const getApprovalsSpy = vi.spyOn(settingsService, 'getPendingApprovals');

    fixture.detectChanges(); // Triggers ngOnInit

    expect(component).toBeTruthy();
    expect(getPrefsSpy).toHaveBeenCalled();
    expect(getProfileSpy).toHaveBeenCalledWith('fm123');
    expect(getApprovalsSpy).not.toHaveBeenCalled();

    // Verify profile details are loaded
    expect(component.fmProfile()).toEqual(mockProfile);
    expect(component.fmProfile().firstName).toBe('Alex');
    expect(component.fmProfile().routeLocationName).toBe('Austin Hub');
  });
});

describe('SettingsComponent - Driver role', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let settingsService: SettingsService;

  const authServiceMock = {
    apiUrl: () => 'https://localhost:7136/api/v1',
    userEmail: () => 'driver@example.com',
    userRole: () => 'Driver',
    currentUser: () => ({ token: 'mock-token', email: 'driver@example.com', role: 'Driver', driverId: 'd123' })
  };

  const mockProfile = {
    id: 'd123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'driver@example.com',
    licenseNumber: 'DL99999',
    currentDriverScore: 95,
    currentLocationName: 'Austin Hub'
  };

  const settingsServiceMock = {
    getAlertPreferences: () => of({}),
    updateAlertPreferences: (prefs: any) => of(prefs),
    getPendingApprovals: () => of([]),
    approveUser: (userId: string) => of({ message: 'User approved successfully' }),
    getDriverProfile: (id: string) => of(mockProfile)
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: SettingsService, useValue: settingsServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    settingsService = TestBed.inject(SettingsService);
  });

  it('should create and load driver profile on init without calling getAlertPreferences', () => {
    const getPrefsSpy = vi.spyOn(settingsService, 'getAlertPreferences');
    const getProfileSpy = vi.spyOn(settingsService, 'getDriverProfile');

    fixture.detectChanges(); // Triggers ngOnInit

    expect(component).toBeTruthy();
    expect(getPrefsSpy).not.toHaveBeenCalled();
    expect(getProfileSpy).toHaveBeenCalledWith('d123');

    // Verify profile details are loaded
    expect(component.driverProfile()).toEqual(mockProfile);
    expect(component.driverProfile().firstName).toBe('John');
    expect(component.driverProfile().licenseNumber).toBe('DL99999');
  });
});

