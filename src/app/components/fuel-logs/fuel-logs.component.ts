import { Component, inject, signal, computed, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { AuthService } from '../../services/auth.service';
import { VehicleService } from '../../services/vehicle.service';
import { AssignmentsService } from '../../services/assignments.service';
import { FuelService } from '../../services/fuel.service';
import { AlertsService } from '../../services/alerts.service';
import { FuelLogResponse, FuelLogRequest, FuelEfficiencyReportResponse } from '../../models/fuel.model';
import { Vehicle } from '../../models/vehicle.model';
import { Driver } from '../../models/assignment.model';

@Component({
  selector: 'app-fuel-logs',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NavbarComponent],
  templateUrl: './fuel-logs.component.html',
  styleUrl: './fuel-logs.component.css'
})
export class FuelLogsComponent implements OnInit {
  public readonly authService = inject(AuthService);
  private readonly vehicleService = inject(VehicleService);
  private readonly assignmentsService = inject(AssignmentsService);
  private readonly fuelService = inject(FuelService);
  private readonly alertsService = inject(AlertsService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Forms
  public fuelForm!: FormGroup;

  // Role check
  public readonly isDriver = computed(() => this.authService.userRole() === 'Driver');
  public readonly isFleetManager = computed(() => this.authService.userRole() === 'FleetManager');

  // Logs States
  public readonly fuelLogs = signal<FuelLogResponse[]>([]);
  public readonly totalCount = signal<number>(0);
  public readonly currentPage = signal<number>(1);
  public readonly pageSize = signal<number>(5);
  public readonly searchTerm = signal<string>('');
  public readonly sortBy = signal<string>('LogDate');
  public readonly sortOrder = signal<string>('desc');
  public readonly isLoading = signal<boolean>(false);
  public readonly errorMessage = signal<string>('');

  // Dropdown lists
  public readonly vehicles = signal<Vehicle[]>([]);
  public readonly filteredVehicles = computed(() => {
    const list = this.vehicles();
    if (this.isFleetManager()) {
      const userLocId = this.authService.currentUser()?.routeLocationId;
      if (userLocId) {
        return list.filter(v => v.routeLocationId?.toLowerCase() === userLocId.toLowerCase());
      } else {
        return [];
      }
    } else if (this.isDriver()) {
      const userLocId = this.authService.currentUser()?.routeLocationId;
      if (userLocId) {
        return list.filter(v => v.routeLocationId?.toLowerCase() === userLocId.toLowerCase());
      }
    }
    return list;
  });
  public readonly drivers = signal<Driver[]>([]);

  // Efficiency Chart & Summary
  public readonly allEfficiencyReport = signal<FuelEfficiencyReportResponse[]>([]);
  public readonly chartStartIndex = signal<number>(0);
  public readonly chartPageSize = signal<number>(6);

  public readonly efficiencyReport = computed(() => {
    const data = this.allEfficiencyReport();
    const start = this.chartStartIndex();
    const size = this.chartPageSize();
    return data.slice(start, start + size);
  });

  public readonly chartEndIndex = computed(() => {
    return Math.min(this.chartStartIndex() + this.chartPageSize(), this.allEfficiencyReport().length);
  });

  public readonly hasNextChartPage = computed(() => {
    return this.chartStartIndex() + this.chartPageSize() < this.allEfficiencyReport().length;
  });

  public readonly hasPrevChartPage = computed(() => {
    return this.chartStartIndex() > 0;
  });

  public readonly activeReportUnit = signal<string>('km/L');
  public readonly overallAvgEfficiency = computed(() => {
    if (this.allEfficiencyReport().length === 0) return 0;
    const total = this.allEfficiencyReport().reduce((sum, r) => sum + r.averageEfficiency, 0);
    return total / this.allEfficiencyReport().length;
  });

  // Alerts linked from AlertsService
  public readonly fuelAlerts = computed(() => {
    return this.alertsService.alerts()
      .filter(a => a.alertType === 'LowFuelEfficiency')
      .slice(0, 3);
  });

  // Modal States
  public readonly isAddModalOpen = signal<boolean>(false);
  public readonly addErrorMessage = signal<string>('');
  public readonly isAddLoading = signal<boolean>(false);

  // Computed summary metrics based on recent logs (simulated context)
  public readonly monthlySpend = computed(() => {
    return this.fuelLogs().reduce((sum, item) => sum + item.totalCost, 0);
  });

  public readonly totalLitersLogged = computed(() => {
    return this.fuelLogs().reduce((sum, item) => sum + Number(item.fuelLitres), 0);
  });

  public readonly totalPages = computed(() => {
    const total = this.totalCount();
    const size = this.pageSize();
    return Math.ceil(total / size) || 1;
  });

  public readonly maxEfficiency = computed(() => {
    const vals = this.allEfficiencyReport().map(r => r.averageEfficiency);
    return vals.length > 0 ? Math.max(...vals) : 1;
  });

  public readonly todayDate = signal<string>(new Date().toISOString().substring(0, 10));

  private locationAndDateValidator = (form: FormGroup): { [key: string]: boolean } | null => {
    const vehicleId = form.get('vehicleId')?.value;
    const driverId = form.get('driverId')?.value;
    const logDate = form.get('logDate')?.value;

    const errors: any = {};

    if (logDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const inputDate = new Date(logDate);
      inputDate.setHours(0, 0, 0, 0);
      if (inputDate < today) {
        errors['pastDate'] = true;
      }
    }

    if (vehicleId && driverId) {
      const vehicle = this.vehicles().find(v => v.id === vehicleId);
      const driver = this.drivers().find(d => d.id === driverId);
      if (vehicle && driver) {
        if (vehicle.routeLocationId?.toLowerCase() !== driver.currentLocationId?.toLowerCase()) {
          errors['locationMismatch'] = true;
        }
      }
    }

    return Object.keys(errors).length > 0 ? errors : null;
  };

  public ngOnInit(): void {
    // Initialize creation form
    this.fuelForm = this.fb.group({
      vehicleId: ['', Validators.required],
      driverId: ['', Validators.required],
      logDate: [new Date().toISOString().substring(0, 10), Validators.required],
      odometerReading: [0, [Validators.required, Validators.min(0)]],
      fuelLitres: [0, [Validators.required, Validators.min(0.1)]],
      totalCost: [0, [Validators.required, Validators.min(0.1)]]
    }, { validators: this.locationAndDateValidator });

    // Load initial data
    if (!this.isDriver()) {
      this.loadFuelLogs();
      this.loadEfficiencyReport();
    }
    this.loadDropdownData();

    // Check query params to pre-open modal with vehicle
    this.route.queryParams.subscribe(params => {
      if (params['open'] === 'true') {
        const vehicleId = params['vehicleId'];
        this.openAddModal();
        if (vehicleId) {
          this.fuelForm.patchValue({ vehicleId });
        }
      }
    });
  }

  public loadFuelLogs(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.fuelService.getFuelLogs({
      PageNumber: this.currentPage(),
      PageSize: this.pageSize(),
      SearchTerm: this.searchTerm(),
      SortBy: this.sortBy(),
      SortOrder: this.sortOrder()
    }).subscribe({
      next: (res) => {
        this.fuelLogs.set(res.data || []);
        this.totalCount.set(res.totalCount || 0);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load recent fuel logs. Please check your connection.');
        this.isLoading.set(false);
      }
    });
  }

  public loadEfficiencyReport(): void {
    this.fuelService.getFuelEfficiencyReport(this.activeReportUnit()).subscribe({
      next: (res) => {
        this.allEfficiencyReport.set(res || []);
        this.updateChartPageSize();
      },
      error: (err) => {
        console.error('Failed to load efficiency report:', err);
      }
    });
  }

  @HostListener('window:resize')
  public onResize(): void {
    this.updateChartPageSize();
  }

  private updateChartPageSize(): void {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 640;
      this.chartPageSize.set(isMobile ? 3 : 6);
      
      const maxStart = Math.max(0, this.allEfficiencyReport().length - this.chartPageSize());
      if (this.chartStartIndex() > maxStart) {
        this.chartStartIndex.set(maxStart);
      }
    }
  }

  public nextChartPage(): void {
    const nextStart = this.chartStartIndex() + 1;
    if (nextStart + this.chartPageSize() <= this.allEfficiencyReport().length) {
      this.chartStartIndex.set(nextStart);
    }
  }

  public prevChartPage(): void {
    const prevStart = this.chartStartIndex() - 1;
    if (prevStart >= 0) {
      this.chartStartIndex.set(prevStart);
    }
  }

  public setReportUnit(unit: string): void {
    this.activeReportUnit.set(unit);
    this.loadEfficiencyReport();
  }

  public loadDropdownData(): void {
    this.vehicleService.getVehicles({ PageSize: 1000 }).subscribe({
      next: (res) => this.vehicles.set(res.data || []),
      error: () => this.vehicles.set([])
    });

    if (!this.isDriver()) {
      this.assignmentsService.getActiveDrivers().subscribe({
        next: (drivers) => this.drivers.set(drivers),
        error: () => this.drivers.set([])
      });
    }
  }

  public onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value || '');
    this.currentPage.set(1);
    this.loadFuelLogs();
  }

  public changePage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadFuelLogs();
  }

  public changeSort(field: string): void {
    if (this.sortBy() === field) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(field);
      this.sortOrder.set('asc');
    }
    this.currentPage.set(1);
    this.loadFuelLogs();
  }

  public openAddModal(): void {
    this.addErrorMessage.set('');
    const currentDriverId = this.authService.currentUser()?.driverId;
    this.fuelForm.reset({
      vehicleId: '',
      driverId: this.isDriver() ? currentDriverId : '',
      logDate: new Date().toISOString().substring(0, 10),
      odometerReading: 0,
      fuelLitres: 0,
      totalCost: 0
    });
    
    if (this.isDriver()) {
      this.fuelForm.get('driverId')?.disable();
    } else {
      this.fuelForm.get('driverId')?.enable();
    }
    
    this.isAddModalOpen.set(true);
  }

  public closeAddModal(): void {
    this.isAddModalOpen.set(false);
  }

  public onSubmitFuelLog(): void {
    if (this.fuelForm.invalid) {
      this.fuelForm.markAllAsTouched();
      return;
    }

    this.isAddLoading.set(true);
    this.addErrorMessage.set('');

    const formValues = this.fuelForm.getRawValue();
    const request: FuelLogRequest = {
      vehicleId: formValues.vehicleId,
      driverId: formValues.driverId || null,
      logDate: new Date(formValues.logDate).toISOString(),
      odometerReading: formValues.odometerReading,
      fuelLitres: formValues.fuelLitres,
      totalCost: formValues.totalCost
    };

    this.fuelService.createFuelLog(request).subscribe({
      next: () => {
        this.isAddLoading.set(false);
        this.closeAddModal();
        this.currentPage.set(1);
        this.loadFuelLogs();
        this.loadEfficiencyReport();
        // Refresh alerts in case a new efficiency anomaly alert was triggered
        this.alertsService.fetchAlerts();
      },
      error: (err) => {
        this.isAddLoading.set(false);
        const serverError = err.error?.message || 'Failed to submit fuel log. Please verify details.';
        this.addErrorMessage.set(serverError);
      }
    });
  }

  public exportReport(): void {
    this.fuelService.getFuelReportCsv().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fuel_logs_report_${new Date().toISOString().substring(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        alert('Failed to export fuel logs report. Please try again.');
      }
    });
  }

  public navigateToAlerts(): void {
    this.router.navigate(['/alerts']);
  }
}
