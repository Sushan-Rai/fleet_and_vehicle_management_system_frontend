import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
  });

  const flushDashboardRequests = () => {
    const apiUrl = component.authService.apiUrl();
    const healthUrl = apiUrl.includes('/api/v1') 
      ? apiUrl.replace('/api/v1', '/healthcheck') 
      : `${apiUrl}/healthcheck`;

    const reqHealth = httpMock.expectOne(healthUrl);
    expect(reqHealth.request.method).toBe('GET');
    reqHealth.flush('Healthy');

    const reqActive = httpMock.expectOne(`${apiUrl}/VehicleAssignment/active/count`);
    reqActive.flush(15);

    const reqTotal = httpMock.expectOne(`${apiUrl}/Vehicle/count`);
    reqTotal.flush(50);

    const reqActiveVeh = httpMock.expectOne(`${apiUrl}/Vehicle/count?status=Active`);
    reqActiveVeh.flush(20);

    const reqInTransit = httpMock.expectOne(`${apiUrl}/Vehicle/count?status=InTransit`);
    reqInTransit.flush(15);

    const reqMaint = httpMock.expectOne(`${apiUrl}/Vehicle/count?status=Maintenance`);
    reqMaint.flush(5);

    const reqInactive = httpMock.expectOne(`${apiUrl}/Vehicle/count?status=Inactive`);
    reqInactive.flush(10);

    const reqUtilYear = httpMock.expectOne(`${apiUrl}/Analytics/overall-utilization?period=year`);
    reqUtilYear.flush({ overallUtilizationPercentage: 82.5, breakdown: [] });

    const reqUtilMonth = httpMock.expectOne(`${apiUrl}/Analytics/overall-utilization?period=month`);
    reqUtilMonth.flush({ overallUtilizationPercentage: 80.0, breakdown: [{ label: 'W1', utilizationPercentage: 75.0 }] });

    const reqMaintJobs = httpMock.expectOne(`${apiUrl}/Maintenance?Status=Scheduled&PageSize=10`);
    reqMaintJobs.flush({
      totalCount: 1,
      pageNumber: 1,
      pageSize: 10,
      data: [
        {
          id: '88888888-8888-8888-8888-888888888888',
          vehicleId: '55555555-5555-5555-5555-555555555555',
          scheduledDate: '2026-06-12T22:58:13.599935',
          completedDate: null,
          odometerReading: 15000,
          serviceType: 'Engine Repair',
          status: 'Scheduled',
          cost: 0,
          notes: 'Triggering Overdue Job',
          vehicleName: 'RAV4 SUV',
          vehicleRegNo: 'KA-01-ME-1234'
        }
      ]
    });
  };

  it('should create and load dashboard metrics successfully', () => {
    expect(component).toBeTruthy();
    expect(component.isLoading()).toBe(true);

    fixture.detectChanges(); // Triggers ngOnInit -> loadDashboardData()

    flushDashboardRequests();

    expect(component.isLoading()).toBe(false);
    expect(component.apiStatus()).toBe(true);
    expect(component.totalVehicles()).toBe(50);
    expect(component.activeAssignmentsCount()).toBe(15);
    expect(component.maintenanceAlertsCount()).toBe(5);
    expect(component.yearUtilization()).toBe(82.5);
    expect(component.chartData().length).toBe(1);
    expect(component.chartData()[0].label).toBe('W1');
    expect(component.chartData()[0].value).toBe(75.0);
    expect(component.upcomingMaintenances().length).toBe(1);
    expect(component.upcomingMaintenances()[0].notes).toBe('Triggering Overdue Job');
  });

  describe('helper methods', () => {
    it('should determine if a date is overdue', () => {
      // Past date (overdue)
      const pastDate = '2026-06-11T11:39:40.664475';
      // Future date (not overdue)
      const futureDate = '2099-12-31T23:59:59';
      
      expect(component.isOverdue(pastDate)).toBe(true);
      expect(component.isOverdue(futureDate)).toBe(false);
      expect(component.isOverdue('')).toBe(false);
    });

    it('should return today date string in long format', () => {
      const today = component.getTodayDate();
      expect(today).toContain(new Date().getFullYear().toString());
    });

    it('should toggle table row selection', () => {
      expect(component.selectedRowId()).toBeNull();
      
      const testId = '88888888-8888-8888-8888-888888888888';
      component.selectRow(testId);
      expect(component.selectedRowId()).toBe(testId);

      component.selectRow(testId);
      expect(component.selectedRowId()).toBeNull();
    });
  });
});
