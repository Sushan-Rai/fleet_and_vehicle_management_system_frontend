import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NavbarComponent } from '../navbar/navbar.component';
import { AnalyticsService } from '../../services/analytics.service';
import { AuthService } from '../../services/auth.service';
import {
  DriverBehaviorResponse,
  VehicleReplacementResponse,
  VehicleUtilizationResponse
} from '../../models/analytics.model';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.css'
})
export class AnalyticsComponent implements OnInit {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly authService = inject(AuthService);

  // Role Checks
  public readonly isDriver = computed(() => this.authService.userRole() === 'Driver');

  // States
  public readonly isLoading = signal<boolean>(true);
  public readonly chartPeriod = signal<string>('month');
  public readonly overallUtilizationPercentage = signal<number>(0.0);
  public readonly chartData = signal<{ label: string; value: number }[]>([]);
  public readonly driverPerformances = signal<DriverBehaviorResponse[]>([]);
  public readonly vehicleReplacements = signal<VehicleReplacementResponse[]>([]);
  public readonly vehicleUtilizations = signal<VehicleUtilizationResponse[]>([]);

  // Computed KPIs
  public readonly avgDriverScore = computed(() => {
    const list = this.driverPerformances();
    if (list.length === 0) return 0.0;
    const sum = list.reduce((acc, d) => acc + d.driverScore, 0);
    return sum / list.length;
  });

  public readonly replacementCandidatesCount = computed(() => {
    return this.vehicleReplacements().filter(v => v.isRecommendedForReplacement).length;
  });

  // Risk Aggregates
  public readonly safeDriversCount = computed(() => {
    return this.driverPerformances().filter(d => d.driverScore >= 85).length;
  });

  public readonly cautionDriversCount = computed(() => {
    return this.driverPerformances().filter(d => d.driverScore >= 70 && d.driverScore < 85).length;
  });

  public readonly highRiskDriversCount = computed(() => {
    return this.driverPerformances().filter(d => d.driverScore < 70).length;
  });

  // Driver Lists (Sorted top vs bottom)
  public readonly topDrivers = computed(() => {
    return [...this.driverPerformances()]
      .sort((a, b) => b.driverScore - a.driverScore)
      .slice(0, 3);
  });

  public ngOnInit(): void {
    if (this.isDriver()) {
      this.isLoading.set(false);
      return;
    }
    this.loadAnalyticsData();
  }

  public loadAnalyticsData(): void {
    this.isLoading.set(true);
    const period = this.chartPeriod();

    forkJoin({
      overall: this.analyticsService.getOverallUtilization(period).pipe(
        catchError(() => of({ period, overallUtilizationPercentage: 0.0, breakdown: [] }))
      ),
      drivers: this.analyticsService.getDriverBehavior().pipe(
        catchError(() => of([] as DriverBehaviorResponse[]))
      ),
      replacements: this.analyticsService.getVehicleReplacementRecommendations().pipe(
        catchError(() => of([] as VehicleReplacementResponse[]))
      ),
      utilizations: this.analyticsService.getVehicleUtilization().pipe(
        catchError(() => of([] as VehicleUtilizationResponse[]))
      )
    }).subscribe({
      next: (res) => {
        this.overallUtilizationPercentage.set(res.overall.overallUtilizationPercentage || 0.0);
        this.processChartData(res.overall);
        this.driverPerformances.set(res.drivers);
        this.vehicleReplacements.set(res.replacements);
        this.vehicleUtilizations.set(res.utilizations);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  public onPeriodChange(event: Event): void {
    const selectEl = event.target as HTMLSelectElement;
    if (!selectEl) return;
    const period = selectEl.value;
    this.chartPeriod.set(period);

    this.analyticsService.getOverallUtilization(period).subscribe({
      next: (res) => {
        this.overallUtilizationPercentage.set(res.overallUtilizationPercentage || 0.0);
        this.processChartData(res);
      },
      error: () => {
        this.chartData.set([]);
      }
    });
  }

  private processChartData(response: any): void {
    if (!response) {
      this.chartData.set([]);
      return;
    }

    const rawList = response.breakdown || [];
    const mapped = rawList.map((item: any) => {
      const label = item.label || '';
      const value = item.utilizationPercentage !== undefined ? item.utilizationPercentage : 0.0;
      return { label: this.formatChartLabel(label), value: Number(value) };
    });

    this.chartData.set(mapped);
  }

  private formatChartLabel(label: string): string {
    if (!label) return '';
    if (label.includes('T') || label.match(/^\d{4}-\d{2}-\d{2}/)) {
      try {
        const date = new Date(label);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase();
        }
      } catch {}
    }
    return label.toUpperCase();
  }

  public getInitials(name: string): string {
    if (!name) return 'D';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }

  public getTodayDate(): string {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return new Date().toLocaleDateString('en-US', options);
  }
}
