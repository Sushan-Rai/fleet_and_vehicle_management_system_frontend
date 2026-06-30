import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { AuthService } from './auth.service';
import { AlertResponse } from '../models/alert.model';

@Injectable({
  providedIn: 'root'
})
export class AlertsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private connection: HubConnection | null = null;
  private readonly alertsSignal = signal<AlertResponse[]>([]);

  // Public exposed read-only states
  public readonly alerts = this.alertsSignal.asReadonly();
  public readonly unreadCount = computed(() => this.alerts().filter(a => !a.isRead).length);

  constructor() {
    // Automatically manage connection lifecycle based on authentication state
    effect(() => {
      const userFn = this.authService.currentUser;
      const user = typeof userFn === 'function' ? userFn() : null;
      if (user) {
        this.fetchAlerts();
        this.startConnection();
      } else {
        this.stopConnection();
        this.alertsSignal.set([]);
      }
    });
  }

  /**
   * Fetches historical alerts from the database
   */
  public fetchAlerts(): void {
    const apiUrl = this.authService.apiUrl();
    this.http.get<AlertResponse[]>(`${apiUrl}/Alert`).subscribe({
      next: (alerts) => {
        this.alertsSignal.set(alerts);
      },
      error: (err) => {
        console.error('Failed to fetch historical alerts:', err);
      }
    });
  }

  /**
   * Marks a specific alert as read
   */
  public markAsRead(id: string): void {
    const apiUrl = this.authService.apiUrl();
    this.http.patch(`${apiUrl}/Alert/${id}/read`, {}).subscribe({
      next: () => {
        this.alertsSignal.update(alerts =>
          alerts.map(a => a.id === id ? { ...a, isRead: true } : a)
        );
      },
      error: (err) => {
        console.error('Failed to mark alert as read:', err);
      }
    });
  }

  /**
   * Marks all alerts for the current role as read
   */
  public markAllAsRead(): void {
    const apiUrl = this.authService.apiUrl();
    this.http.patch(`${apiUrl}/Alert/mark-all-read`, {}).subscribe({
      next: () => {
        this.alertsSignal.update(alerts =>
          alerts.map(a => ({ ...a, isRead: true }))
        );
      },
      error: (err) => {
        console.error('Failed to mark all alerts as read:', err);
      }
    });
  }

  /**
   * Establishes SignalR Connection
   */
  private startConnection(): void {
    if (this.connection) {
      return;
    }

    const userFn = this.authService.currentUser;
    const token = typeof userFn === 'function' ? userFn()?.token : null;
    if (!token) {
      return;
    }

    const api = this.authService.apiUrl();
    // Dynamically resolve NotificationHub URL from REST base URL
    const hubUrl = api.replace(/\/api\/v1\/?$/, '/notificationHub');

    this.connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();

    // Listen for live alert events
    this.connection.on('ReceiveAlert', (alert: AlertResponse) => {
      const userFn = this.authService.currentUser;
      const currentUser = typeof userFn === 'function' ? userFn() : null;
      
      // Perform role and specific driver targeting filters on client side
      if (alert.targetRole.startsWith('Driver:')) {
        const targetDriverId = alert.targetRole.split(':')[1];
        if (currentUser?.role === 'Driver' && targetDriverId !== currentUser.driverId) {
          return; // Skip since it's targeted at another driver
        }
      } else if (alert.targetRole === 'Driver' && currentUser?.role !== 'Driver' && currentUser?.role !== 'Admin') {
        return; // Skip if user is FleetManager and it is a generic driver alert
      } else if (alert.targetRole === 'FleetManager' && currentUser?.role !== 'FleetManager' && currentUser?.role !== 'Admin') {
        return; // Skip if user is Driver and it's a manager alert
      }

      // Add to notifications queue
      this.alertsSignal.update(alerts => [alert, ...alerts]);
    });

    this.connection.start().catch(err => {
      console.error('SignalR Hub Connection error:', err);
    });
  }

  /**
   * Closes SignalR Connection
   */
  private stopConnection(): void {
    if (this.connection) {
      this.connection.stop().catch(err => {
        console.error('Failed to stop SignalR connection:', err);
      });
      this.connection = null;
    }
  }
}
