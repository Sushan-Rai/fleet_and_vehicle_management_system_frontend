import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AnalyticsComponent } from './analytics.component';
import { AnalyticsService } from '../../services/analytics.service';
import { AuthService } from '../../services/auth.service';

describe('AnalyticsComponent', () => {
  let component: AnalyticsComponent;
  let fixture: ComponentFixture<AnalyticsComponent>;
  let analyticsServiceMock: any;

  const authServiceMock = {
    apiUrl: () => 'https://localhost:7136/api/v1',
    userRole: () => 'Admin',
    userEmail: () => 'admin@example.com'
  };

  const mockOverall = {
    period: 'month',
    overallUtilizationPercentage: 85.5,
    breakdown: [
      { label: 'Week 1', utilizationPercentage: 80, totalTransitHours: 10, totalActiveHours: 12, startDate: '2026-06-01', endDate: '2026-06-07' },
      { label: 'Week 2', utilizationPercentage: 90, totalTransitHours: 12, totalActiveHours: 13, startDate: '2026-06-08', endDate: '2026-06-14' }
    ]
  };

  const mockDrivers = [
    { driverId: 'd1', driverName: 'Sarah Jenkins', vehicleModelId: 'm1', vehicleModelName: 'Ford Transit', driverAvgEfficiencyKmPerLitre: 12.5, fleetAvgEfficiencyKmPerLitre: 12.0, deviationPercentage: 4.1, driverScore: 98.5, damagesCount: 0 },
    { driverId: 'd2', driverName: 'Robert Vance', vehicleModelId: 'm2', vehicleModelName: 'Freightliner', driverAvgEfficiencyKmPerLitre: 10.0, fleetAvgEfficiencyKmPerLitre: 12.0, deviationPercentage: -16.6, driverScore: 65.0, damagesCount: 2 }
  ];

  const mockReplacements = [
    { vehicleId: 'v1', regNo: 'TX01-1111', vehicleModelName: 'Ford Transit', totalMaintenanceCost: 12450, totalFuelCost: 4000, totalExpenses: 16450, currentOdometer: 184200, expectedLifetimeKms: 200000, ageYears: 8.5, expectedLifetimeYears: 10, isRecommendedForReplacement: true, reason: 'High Maintenance' },
    { vehicleId: 'v2', regNo: 'TX02-2222', vehicleModelName: 'Sprinter 2500', totalMaintenanceCost: 2000, totalFuelCost: 1500, totalExpenses: 3500, currentOdometer: 45000, expectedLifetimeKms: 150000, ageYears: 2.0, expectedLifetimeYears: 8, isRecommendedForReplacement: false, reason: '' }
  ];

  const mockUtilizations = [
    { vehicleId: 'v1', regNo: 'TX01-1111', vehicleModelName: 'Ford Transit', totalTransitHours: 45.5, totalHoursActive: 50.0, utilizationRatePercentage: 91.0 }
  ];

  beforeEach(async () => {
    analyticsServiceMock = {
      getOverallUtilization: vi.fn().mockReturnValue(of(mockOverall)),
      getDriverBehavior: vi.fn().mockReturnValue(of(mockDrivers)),
      getVehicleReplacementRecommendations: vi.fn().mockReturnValue(of(mockReplacements)),
      getVehicleUtilization: vi.fn().mockReturnValue(of(mockUtilizations))
    };

    await TestBed.configureTestingModule({
      imports: [AnalyticsComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: AnalyticsService, useValue: analyticsServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AnalyticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load analytics data on init', () => {
    expect(component).toBeTruthy();
    expect(component.isLoading()).toBe(false);
    expect(analyticsServiceMock.getOverallUtilization).toHaveBeenCalledWith('month');
    expect(analyticsServiceMock.getDriverBehavior).toHaveBeenCalled();
    expect(analyticsServiceMock.getVehicleReplacementRecommendations).toHaveBeenCalled();
    expect(analyticsServiceMock.getVehicleUtilization).toHaveBeenCalled();

    expect(component.overallUtilizationPercentage()).toBe(85.5);
    expect(component.driverPerformances().length).toBe(2);
    expect(component.vehicleReplacements().length).toBe(2);
    expect(component.vehicleUtilizations().length).toBe(1);
  });

  it('should calculate computed KPI metrics correctly', () => {
    // avg safety score = (98.5 + 65.0) / 2 = 81.75
    expect(component.avgDriverScore()).toBeCloseTo(81.75);

    // replacement candidates count
    expect(component.replacementCandidatesCount()).toBe(1);

    // safe, caution, high risk counts
    expect(component.safeDriversCount()).toBe(1); // Sarah score 98.5
    expect(component.cautionDriversCount()).toBe(0);
    expect(component.highRiskDriversCount()).toBe(1); // Robert score 65.0

    // initials helper
    expect(component.getInitials('Sarah Jenkins')).toBe('SJ');
    expect(component.getInitials('Robert')).toBe('R');
    expect(component.getInitials('')).toBe('D');
  });

  it('should reload overall utilization when onPeriodChange is triggered', () => {
    const event = { target: { value: 'year' } } as unknown as Event;
    component.onPeriodChange(event);

    expect(component.chartPeriod()).toBe('year');
    expect(analyticsServiceMock.getOverallUtilization).toHaveBeenCalledWith('year');
  });

  it('should gracefully handle service errors', () => {
    analyticsServiceMock.getOverallUtilization.mockReturnValue(throwError(() => new Error('Error')));
    analyticsServiceMock.getDriverBehavior.mockReturnValue(throwError(() => new Error('Error')));
    analyticsServiceMock.getVehicleReplacementRecommendations.mockReturnValue(throwError(() => new Error('Error')));
    analyticsServiceMock.getVehicleUtilization.mockReturnValue(throwError(() => new Error('Error')));

    component.loadAnalyticsData();
    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.overallUtilizationPercentage()).toBe(0.0);
    expect(component.driverPerformances().length).toBe(0);
    expect(component.vehicleReplacements().length).toBe(0);
    expect(component.vehicleUtilizations().length).toBe(0);
  });
});
