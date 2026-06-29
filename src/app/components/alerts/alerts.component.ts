import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../navbar/navbar.component';
import { AlertsService } from '../../services/alerts.service';
import { AuthService } from '../../services/auth.service';
import { AlertResponse } from '../../models/alert.model';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './alerts.component.html',
  styleUrl: './alerts.component.css'
})
export class AlertsComponent implements OnInit {
  public readonly alertsService = inject(AlertsService);
  private readonly authService = inject(AuthService);

  // Filters State
  public readonly selectedSeverity = signal<'All' | 'High' | 'Medium' | 'Low'>('All');
  public readonly selectedReadStatus = signal<'All' | 'Unread'>('All');

  // Computed lists based on filters
  public readonly filteredAlerts = computed(() => {
    let list = this.alertsService.alerts();
    const severity = this.selectedSeverity();
    const readStatus = this.selectedReadStatus();

    if (severity !== 'All') {
      list = list.filter(a => a.severity.toLowerCase() === severity.toLowerCase());
    }

    if (readStatus === 'Unread') {
      list = list.filter(a => !a.isRead);
    }

    return list;
  });

  public ngOnInit(): void {
    // Sync/refresh alerts on page load
    this.alertsService.fetchAlerts();
  }

  public setSeverityFilter(sev: 'All' | 'High' | 'Medium' | 'Low'): void {
    this.selectedSeverity.set(sev);
  }

  public setReadStatusFilter(status: 'All' | 'Unread'): void {
    this.selectedReadStatus.set(status);
  }

  public markAsRead(id: string): void {
    this.alertsService.markAsRead(id);
  }

  public markAllAsRead(): void {
    this.alertsService.markAllAsRead();
  }

  public getSeverityClass(severity: string): string {
    const s = severity.toLowerCase();
    if (s === 'high') return 'border-error bg-error-container/10 text-error';
    if (s === 'medium') return 'border-amber-500 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400';
    return 'border-secondary bg-secondary-container/5 text-secondary';
  }

  public getSeverityIcon(severity: string): string {
    const s = severity.toLowerCase();
    if (s === 'high') return 'warning';
    if (s === 'medium') return 'error_outline';
    return 'info';
  }
}
