import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { AlertsComponent } from './alerts.component';
import { AlertsService } from '../../services/alerts.service';
import { AuthService } from '../../services/auth.service';

describe('AlertsComponent', () => {
  let component: AlertsComponent;
  let fixture: ComponentFixture<AlertsComponent>;
  let alertsServiceMock: any;
  let authServiceMock: any;

  const mockAlerts = [
    { id: 'a1', title: 'Speed Anomaly', message: 'Vehicle TX-101 speed exceeded limit', alertType: 'Speeding', severity: 'High', isRead: false, createdAt: '2026-06-22T10:00:00Z', targetRole: 'FleetManager' },
    { id: 'a2', title: 'Low Efficiency', message: 'Vehicle TX-102 average efficiency dropped', alertType: 'LowFuelEfficiency', severity: 'Medium', isRead: true, createdAt: '2026-06-22T11:00:00Z', targetRole: 'FleetManager' },
    { id: 'a3', title: 'Odometer Sync', message: 'Sync needed for TX-103', alertType: 'System', severity: 'Low', isRead: false, createdAt: '2026-06-22T12:00:00Z', targetRole: 'Driver' }
  ];

  beforeEach(async () => {
    authServiceMock = {
      userRole: signal('FleetManager'),
      userEmail: () => 'manager@example.com'
    };

    alertsServiceMock = {
      alerts: signal(mockAlerts),
      unreadCount: signal(2),
      fetchAlerts: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [AlertsComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: AlertsService, useValue: alertsServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AlertsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load initial alerts', () => {
    expect(component).toBeTruthy();
    expect(alertsServiceMock.fetchAlerts).toHaveBeenCalled();
    expect(component.filteredAlerts().length).toBe(3);
  });

  it('should filter alerts by severity', () => {
    component.setSeverityFilter('High');
    fixture.detectChanges();
    expect(component.filteredAlerts().length).toBe(1);
    expect(component.filteredAlerts()[0].id).toBe('a1');

    component.setSeverityFilter('Low');
    fixture.detectChanges();
    expect(component.filteredAlerts().length).toBe(1);
    expect(component.filteredAlerts()[0].id).toBe('a3');

    component.setSeverityFilter('All');
    fixture.detectChanges();
    expect(component.filteredAlerts().length).toBe(3);
  });

  it('should filter alerts by read status', () => {
    component.setReadStatusFilter('Unread');
    fixture.detectChanges();
    expect(component.filteredAlerts().length).toBe(2);
    expect(component.filteredAlerts().every(a => !a.isRead)).toBe(true);
  });

  it('should trigger markAsRead on service', () => {
    component.markAsRead('a1');
    expect(alertsServiceMock.markAsRead).toHaveBeenCalledWith('a1');
  });

  it('should trigger markAllAsRead on service', () => {
    component.markAllAsRead();
    expect(alertsServiceMock.markAllAsRead).toHaveBeenCalled();
  });
});
