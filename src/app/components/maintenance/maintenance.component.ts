import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { AuthService } from '../../services/auth.service';
import { VehicleService } from '../../services/vehicle.service';
import { MaintenanceService } from '../../services/maintenance.service';
import { AlertsService } from '../../services/alerts.service';
import { MaintenanceRequest, MaintenanceResponse, MaintenanceStatus } from '../../models/maintenance.model';
import { Vehicle } from '../../models/vehicle.model';

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NavbarComponent, RouterLink],
  templateUrl: './maintenance.component.html',
  styleUrl: './maintenance.component.css'
})
export class MaintenanceComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly vehicleService = inject(VehicleService);
  private readonly maintenanceService = inject(MaintenanceService);
  private readonly alertsService = inject(AlertsService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  // Role Checks
  public readonly isDriver = computed(() => this.authService.userRole() === 'Driver');
  public readonly isAdmin = computed(() => this.authService.userRole() === 'Admin');
  public readonly isFleetManager = computed(() => this.authService.userRole() === 'FleetManager');

  // Logs States (Paginated Table)
  public readonly maintenanceLogs = signal<MaintenanceResponse[]>([]);
  public readonly totalCount = signal<number>(0);
  public readonly currentPage = signal<number>(1);
  public readonly pageSize = signal<number>(5);
  public readonly sortBy = signal<string>('ScheduledDate');
  public readonly sortOrder = signal<string>('desc');
  public readonly isLoading = signal<boolean>(false);
  public readonly errorMessage = signal<string>('');

  // Dropdowns & Types
  public readonly vehicles = signal<Vehicle[]>([]);
  public readonly filteredVehicles = computed(() => {
    const list = this.vehicles();
    if (this.isFleetManager()) {
      const userLocId = this.authService.currentUser()?.routeLocationId;
      if (userLocId) {
        return list.filter(v => v.routeLocationId === userLocId);
      }
    }
    return list;
  });
  public readonly serviceTypes = signal<string[]>([]);

  // Filters State
  public readonly filterStatus = signal<string>('');
  public readonly filterServiceType = signal<string>('');
  public readonly filterVehicleId = signal<string>('');
  public readonly filterSearchTerm = signal<string>('');

  // KPI/Stats (All logs representation)
  public readonly allMaintenancesList = signal<MaintenanceResponse[]>([]);
  public readonly kpiTotal = computed(() => this.allMaintenancesList().length);
  public readonly kpiScheduled = computed(() => this.allMaintenancesList().filter(m => m.status === 'scheduled').length);
  public readonly kpiInProgress = computed(() => this.allMaintenancesList().filter(m => m.status === 'in progress').length);
  public readonly kpiCompleted = computed(() => this.allMaintenancesList().filter(m => m.status === 'completed').length);

  // Modal States
  public readonly isCreateModalOpen = signal<boolean>(false);
  public readonly isEditModalOpen = signal<boolean>(false);
  public readonly modalErrorMessage = signal<string>('');
  public readonly isModalLoading = signal<boolean>(false);

  // Forms
  public maintenanceForm!: FormGroup;
  public editingLogId = signal<string | null>(null);
  public editingPredictiveTrigger = signal<boolean>(false);

  public ngOnInit(): void {
    if (this.isDriver()) {
      return;
    }

    this.initForm();
    this.loadData();
    this.loadDropdownData();
  }

  private initForm(): void {
    this.maintenanceForm = this.fb.group({
      vehicleId: ['', Validators.required],
      scheduledDate: [this.todayDate(), Validators.required],
      odometerReading: [0, [Validators.required, Validators.min(0)]],
      serviceType: ['', Validators.required],
      cost: [0, [Validators.required, Validators.min(0)]],
      status: ['scheduled', Validators.required],
      notes: ['']
    });
  }

  public todayDate(): string {
    return new Date().toISOString().substring(0, 10);
  }

  public loadData(): void {
    this.loadMaintenanceLogs();
    this.loadKPIStats();
  }

  public loadMaintenanceLogs(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.maintenanceService.getMaintenances({
      PageNumber: this.currentPage(),
      PageSize: this.pageSize(),
      SearchTerm: this.filterSearchTerm(),
      SortBy: this.sortBy(),
      SortOrder: this.sortOrder(),
      VehicleId: this.filterVehicleId(),
      Status: this.filterStatus(),
      ServiceType: this.filterServiceType()
    }).subscribe({
      next: (res) => {
        this.maintenanceLogs.set(res.data || []);
        this.totalCount.set(res.totalCount || 0);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('Failed to load maintenance logs. Please check your connection.');
        this.isLoading.set(false);
      }
    });
  }

  public loadKPIStats(): void {
    // Query a large PageSize to compute KPIs for the entire database
    this.maintenanceService.getMaintenances({ PageSize: 1000 }).subscribe({
      next: (res) => {
        this.allMaintenancesList.set(res.data || []);
      },
      error: (err) => {
        console.error('Failed to load KPIs:', err);
      }
    });
  }

  public loadDropdownData(): void {
    this.vehicleService.getVehicles({ PageSize: 1000 }).subscribe({
      next: (res) => this.vehicles.set(res.data || []),
      error: () => this.vehicles.set([])
    });

    this.maintenanceService.getServiceTypes().subscribe({
      next: (types) => {
        // Seed some defaults and merge with database service types
        const defaults = ['preventive', 'corrective', 'predictive'];
        const unique = Array.from(new Set([...defaults, ...(types || []).map(t => t.toLowerCase())]));
        this.serviceTypes.set(unique);
      },
      error: () => this.serviceTypes.set(['preventive', 'corrective', 'predictive'])
    });
  }

  // Filters & Actions
  public onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.filterSearchTerm.set(target.value || '');
    this.currentPage.set(1);
    this.loadMaintenanceLogs();
  }

  public onStatusFilterChange(status: string): void {
    this.filterStatus.set(status);
    this.currentPage.set(1);
    this.loadMaintenanceLogs();
  }

  public onServiceTypeFilterChange(type: string): void {
    this.filterServiceType.set(type);
    this.currentPage.set(1);
    this.loadMaintenanceLogs();
  }

  public onVehicleFilterChange(vehicleId: string): void {
    this.filterVehicleId.set(vehicleId);
    this.currentPage.set(1);
    this.loadMaintenanceLogs();
  }

  public clearFilters(): void {
    this.filterStatus.set('');
    this.filterServiceType.set('');
    this.filterVehicleId.set('');
    this.filterSearchTerm.set('');
    this.currentPage.set(1);
    this.loadData();
  }

  // Pagination
  public totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize()));

  public changePage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadMaintenanceLogs();
  }

  public changeSort(field: string): void {
    if (this.sortBy() === field) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(field);
      this.sortOrder.set('asc');
    }
    this.currentPage.set(1);
    this.loadMaintenanceLogs();
  }

  // Modal Handlers
  public openCreateModal(): void {
    this.modalErrorMessage.set('');
    this.maintenanceForm.reset({
      vehicleId: '',
      scheduledDate: this.todayDate(),
      odometerReading: 0,
      serviceType: '',
      cost: 0,
      status: 'scheduled',
      notes: ''
    });
    this.isCreateModalOpen.set(true);
  }

  public closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  public openEditModal(log: MaintenanceResponse): void {
    this.modalErrorMessage.set('');
    this.editingLogId.set(log.id);
    this.editingPredictiveTrigger.set(!!log.completedDate); // wait, isPredictiveTrigger can be preserved, but let's check what it was

    // Get date in YYYY-MM-DD
    const dateStr = log.scheduledDate ? new Date(log.scheduledDate).toISOString().substring(0, 10) : '';

    this.maintenanceForm.reset({
      vehicleId: log.vehicleId,
      scheduledDate: dateStr,
      odometerReading: log.odometerReading,
      serviceType: log.serviceType,
      cost: log.cost,
      status: log.status,
      notes: log.notes || ''
    });
    this.isEditModalOpen.set(true);
  }

  public closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.editingLogId.set(null);
  }

  private mapStatusForBackend(status: string): string {
    if (status === 'in progress') return 'InProgress';
    if (status === 'completed') return 'Completed';
    return 'Scheduled';
  }

  // Create Submission
  public onSubmitCreate(): void {
    if (this.maintenanceForm.invalid) {
      this.maintenanceForm.markAllAsTouched();
      return;
    }

    this.isModalLoading.set(true);
    this.modalErrorMessage.set('');

    const formValues = this.maintenanceForm.value;
    const request: MaintenanceRequest = {
      vehicleId: formValues.vehicleId,
      scheduledDate: new Date(formValues.scheduledDate).toISOString(),
      odometerReading: formValues.odometerReading,
      serviceType: formValues.serviceType.toLowerCase().trim(),
      cost: formValues.cost,
      status: this.mapStatusForBackend(formValues.status),
      notes: formValues.notes || null
    };

    this.maintenanceService.createMaintenance(request).subscribe({
      next: () => {
        this.isModalLoading.set(false);
        this.closeCreateModal();
        this.currentPage.set(1);
        this.loadData();
        this.alertsService.fetchAlerts();
      },
      error: (err) => {
        this.isModalLoading.set(false);
        // Extract and clearly display the backend's validation/rule message
        const message = err.error?.message || err.error?.Message || 'Failed to schedule maintenance. Please verify details.';
        this.modalErrorMessage.set(message);
      }
    });
  }

  // Update Submission
  public onSubmitUpdate(): void {
    const id = this.editingLogId();
    if (!id) return;

    if (this.maintenanceForm.invalid) {
      this.maintenanceForm.markAllAsTouched();
      return;
    }

    this.isModalLoading.set(true);
    this.modalErrorMessage.set('');

    const formValues = this.maintenanceForm.value;
    const request: MaintenanceRequest = {
      vehicleId: formValues.vehicleId,
      scheduledDate: new Date(formValues.scheduledDate).toISOString(),
      odometerReading: formValues.odometerReading,
      serviceType: formValues.serviceType.toLowerCase().trim(),
      cost: formValues.cost,
      status: this.mapStatusForBackend(formValues.status),
      notes: formValues.notes || null
    };

    this.maintenanceService.updateMaintenance(id, request).subscribe({
      next: () => {
        this.isModalLoading.set(false);
        this.closeEditModal();
        this.loadData();
        this.alertsService.fetchAlerts();
      },
      error: (err) => {
        this.isModalLoading.set(false);
        // Extract and clearly display the backend's validation/rule message
        const message = err.error?.message || err.error?.Message || 'Failed to update maintenance log. Please verify details.';
        this.modalErrorMessage.set(message);
      }
    });
  }
}
