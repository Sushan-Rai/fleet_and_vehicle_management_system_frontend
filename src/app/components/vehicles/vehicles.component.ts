import { Component, inject, signal, computed, OnInit, OnDestroy, effect, untracked, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { Actions, ofType } from '@ngrx/effects';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NavbarComponent } from '../navbar/navbar.component';
import { AuthService } from '../../services/auth.service';
import { VehicleService } from '../../services/vehicle.service';
import {
  selectEnrichedVehicles,
  selectVehicleModelsList,
  selectVehiclesLoading,
  selectVehiclesError,
  selectSearchTerm,
  selectSelectedStatus,
  selectSelectedCategory
} from '../../store/vehicles/vehicles.selectors';
import * as VehiclesActions from '../../store/vehicles/vehicles.actions';
import { VehicleInventoryItem, VehicleRequest, VehicleModel, VehicleCategory, VehicleModelRequest, VehicleCategoryRequest } from '../../models/vehicle.model';
import { RouteLocation } from '../../models/route-location.model';

@Component({
  selector: 'app-vehicles',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NavbarComponent, RouterLink],
  templateUrl: './vehicles.component.html',
  styleUrl: './vehicles.component.css'
})
export class VehiclesComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly authService = inject(AuthService);
  private readonly vehicleService = inject(VehicleService);
  private readonly fb = inject(FormBuilder);
  private readonly actions$ = inject(Actions);
  private readonly destroy$ = new Subject<void>();

  // Form groups for creating models and categories
  public vehicleForm!: FormGroup;
  public modelForm!: FormGroup;
  public categoryForm!: FormGroup;

  // Local component states
  public readonly isAddModalOpen = signal<boolean>(false);
  public readonly isModelModalOpen = signal<boolean>(false);
  public readonly isCategoryModalOpen = signal<boolean>(false);
  public readonly searchTerm = toSignal(this.store.select(selectSearchTerm), { initialValue: '' });
  public readonly selectedStatus = toSignal(this.store.select(selectSelectedStatus), { initialValue: '' });
  public readonly selectedCategory = toSignal(this.store.select(selectSelectedCategory), { initialValue: '' });
  public readonly addErrorMessage = signal<string>('');
  public readonly modelErrorMessage = signal<string>('');
  public readonly categoryErrorMessage = signal<string>('');
  public readonly allCategories = signal<VehicleCategory[]>([]);

  // Pagination states
  public readonly currentPage = signal<number>(1);
  public readonly pageSize = signal<number>(10);
  public readonly activeDropdownVehicleId = signal<string | null>(null);

  constructor() {
    effect(() => {
      // Establish reactive dependency on filters
      this.searchTerm();
      this.selectedStatus();
      this.selectedCategory();
      
      // Reset page to 1
      untracked(() => {
        this.currentPage.set(1);
      });
    });
  }

  @HostListener('document:click')
  public closeDropdowns(): void {
    this.activeDropdownVehicleId.set(null);
  }

  // Selected row ID state for interactive table hover highlights
  public readonly selectedRowId = signal<string | null>(null);

  // Details Modal States
  public readonly isDetailsModalOpen = signal<boolean>(false);
  public readonly selectedVehicleDetails = signal<any | null>(null);
  public readonly detailsLoading = signal<boolean>(false);
  public readonly detailsError = signal<string>('');

  // Selectors from NgRx store converted to Angular signals
  public readonly loading = toSignal(this.store.select(selectVehiclesLoading), { initialValue: false });
  public readonly error = toSignal(this.store.select(selectVehiclesError), { initialValue: null as any });
  public readonly storeVehicles = toSignal(this.store.select(selectEnrichedVehicles), { initialValue: [] as VehicleInventoryItem[] });
  public readonly models = toSignal(this.store.select(selectVehicleModelsList), { initialValue: [] as VehicleModel[] });

  // Route locations signal
  public readonly routeLocations = signal<RouteLocation[]>([]);

  // Combined inventory list
  public readonly vehiclesList = computed(() => {
    return this.storeVehicles();
  });

  // Filtered vehicles signal reacting to filter options
  public readonly filteredVehicles = computed(() => {
    let items = this.vehiclesList();

    // Status filter
    const status = this.selectedStatus();
    if (status) {
      items = items.filter(v => v.status.toLowerCase() === status.toLowerCase());
    }

    // Category filter
    const category = this.selectedCategory();
    if (category) {
      items = items.filter(v => v.categoryName?.toLowerCase() === category.toLowerCase());
    }

    // Search filter
    const term = this.searchTerm().trim().toLowerCase();
    if (term) {
      items = items.filter(v =>
        v.regNo?.toLowerCase().includes(term) ||
        v.modelName?.toLowerCase().includes(term) ||
        v.chassisNumber?.toLowerCase().includes(term)
      );
    }

    return items;
  });

  // Paginated vehicles list
  public readonly paginatedVehicles = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.pageSize();
    return this.filteredVehicles().slice(startIndex, startIndex + this.pageSize());
  });

  public readonly totalPages = computed(() => {
    return Math.ceil(this.filteredVehicles().length / this.pageSize());
  });

  // KPI Calculations
  public readonly kpiTotal = computed(() => this.vehiclesList().length);
  public readonly kpiAvailable = computed(() => this.vehiclesList().filter(v => v.status === 'Active').length);
  public readonly kpiAssigned = computed(() => this.vehiclesList().filter(v => v.status === 'InTransit').length);
  public readonly kpiInService = computed(() => this.vehiclesList().filter(v => v.status === 'Maintenance').length);

  // Available unique categories extracted dynamically
  public readonly categories = computed(() => {
    const unique = new Set(this.vehiclesList().map(v => v.categoryName).filter(Boolean));
    return Array.from(unique) as string[];
  });

  public readonly isAdmin = computed(() => this.authService.userRole() === 'Admin');
  public readonly isFleetManager = computed(() => this.authService.userRole() === 'FleetManager');
  public readonly isDriver = computed(() => this.authService.userRole() === 'Driver');

  public readonly Math = Math;

  public readonly pageNumbers = computed(() => {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  });

  public ngOnInit(): void {
    // Dispatch store loading actions
    this.store.dispatch(VehiclesActions.loadVehicles({ filters: { PageSize: 1000 } }));
    this.store.dispatch(VehiclesActions.loadVehicleModels());
    if (this.allCategories().length === 0) {
      this.loadCategories();
    }

    // Initialize Add Vehicle Form
    this.vehicleForm = this.fb.group({
      regNo: ['', [
        Validators.required,
        Validators.pattern('^[a-zA-Z0-9 -]{5,15}$')
      ]],
      chassisNumber: ['', [
        Validators.required,
        Validators.pattern('^[A-HJ-NPR-Z0-9]{17}$')
      ]],
      currentOdometerReading: [0, [
        Validators.required,
        Validators.min(0)
      ]],
      vehicleModelId: ['', Validators.required],
      routeLocationId: ['']
    });

    // Initialize Add Model Form
    this.modelForm = this.fb.group({
      manufacturer: ['', Validators.required],
      modelName: ['', Validators.required],
      expectedLifeTimeYears: [0, [Validators.required, Validators.min(0), Validators.max(30)]],
      expectedLifeTimeKms: [0, [Validators.required, Validators.min(0)]],
      categoryId: ['', Validators.required]
    });

    // Initialize Add Category Form
    this.categoryForm = this.fb.group({
      name: ['', Validators.required],
      fuelEfficiencyThreshold: [0, [Validators.required, Validators.min(0), Validators.max(120)]]
    });

    // Retrieve active route locations
    this.authService.getRouteLocations().subscribe({
      next: (locations) => this.routeLocations.set(locations),
      error: () => this.routeLocations.set([])
    });

    // Handle create vehicle success & failure actions
    this.actions$.pipe(
      ofType(VehiclesActions.addVehicleSuccess),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.closeAddModal();
    });

    this.actions$.pipe(
      ofType(VehiclesActions.addVehicleFailure),
      takeUntil(this.destroy$)
    ).subscribe(({ error }) => {
      this.addErrorMessage.set(this.extractErrorMessage(error, 'Failed to create vehicle. Please try again.'));
    });
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Sets the active status filter chip
   */
  public selectStatusFilter(status: string): void {
    this.updateStatus(status);
  }

  public updateCategory(category: string): void {
    this.store.dispatch(VehiclesActions.updateSelectedCategory({ selectedCategory: category }));
  }

  public updateStatus(status: string): void {
    this.store.dispatch(VehiclesActions.updateSelectedStatus({ selectedStatus: status }));
  }

  public updateSearchTerm(term: string): void {
    this.store.dispatch(VehiclesActions.updateSearchTerm({ searchTerm: term }));
  }

  public clearFilters(): void {
    this.store.dispatch(VehiclesActions.updateSearchTerm({ searchTerm: '' }));
    this.store.dispatch(VehiclesActions.updateSelectedStatus({ selectedStatus: '' }));
    this.store.dispatch(VehiclesActions.updateSelectedCategory({ selectedCategory: '' }));
  }

  /**
   * Opens the Add Vehicle modal dialog
   */
  public openAddModal(): void {
    this.addErrorMessage.set('');
    const fmLocId = this.isFleetManager() ? (this.authService.currentUser()?.routeLocationId || '') : '';
    this.vehicleForm.reset({
      currentOdometerReading: 0,
      vehicleModelId: '',
      routeLocationId: fmLocId
    });
    if (this.isFleetManager()) {
      this.vehicleForm.get('routeLocationId')?.disable();
    } else {
      this.vehicleForm.get('routeLocationId')?.enable();
    }
    this.isAddModalOpen.set(true);
  }

  /**
   * Closes the Add Vehicle modal dialog
   */
  public closeAddModal(): void {
    this.isAddModalOpen.set(false);
  }

  /**
   * Fetches vehicle categories list from backend
   */
  public loadCategories(): void {
    this.vehicleService.getVehicleCategories().subscribe({
      next: (res) => this.allCategories.set(res.data || []),
      error: () => this.allCategories.set([])
    });
  }

  /**
   * Opens the Add Vehicle Model modal
   */
  public openAddModelModal(): void {
    this.modelErrorMessage.set('');
    this.modelForm.reset({
      manufacturer: '',
      modelName: '',
      expectedLifeTimeYears: 0,
      expectedLifeTimeKms: 0,
      categoryId: ''
    });
    this.isModelModalOpen.set(true);
  }

  /**
   * Closes the Add Vehicle Model modal
   */
  public closeAddModelModal(): void {
    this.isModelModalOpen.set(false);
  }

  /**
   * Opens the Add Category modal
   */
  public openAddCategoryModal(): void {
    this.categoryErrorMessage.set('');
    this.categoryForm.reset({
      name: '',
      fuelEfficiencyThreshold: 0
    });
    this.isCategoryModalOpen.set(true);
  }

  /**
   * Closes the Add Category modal
   */
  public closeAddCategoryModal(): void {
    this.isCategoryModalOpen.set(false);
  }

  /**
   * Submits a request to create a new vehicle model
   */
  public onSubmitModel(): void {
    if (this.modelForm.invalid) {
      this.modelForm.markAllAsTouched();
      return;
    }

    this.modelErrorMessage.set('');
    const val = this.modelForm.value;
    const request: VehicleModelRequest = {
      manufacturer: val.manufacturer.trim(),
      modelName: val.modelName.trim(),
      expectedLifeTimeYears: Number(val.expectedLifeTimeYears),
      expectedLifeTimeKms: Number(val.expectedLifeTimeKms),
      categoryId: val.categoryId
    };

    this.vehicleService.createVehicleModel(request).subscribe({
      next: () => {
        this.closeAddModelModal();
        this.store.dispatch(VehiclesActions.loadVehicleModels());
      },
      error: (err) => {
        this.modelErrorMessage.set(this.extractErrorMessage(err, 'Failed to create vehicle model. Please try again.'));
      }
    });
  }

  /**
   * Submits a request to create a new category
   */
  public onSubmitCategory(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    this.categoryErrorMessage.set('');
    const val = this.categoryForm.value;
    const request: VehicleCategoryRequest = {
      name: val.name.trim(),
      fuelEfficiencyThreshold: Number(val.fuelEfficiencyThreshold)
    };

    this.vehicleService.createVehicleCategory(request).subscribe({
      next: () => {
        this.closeAddCategoryModal();
        this.loadCategories();
      },
      error: (err) => {
        this.categoryErrorMessage.set(this.extractErrorMessage(err, 'Failed to create category. Please try again.'));
      }
    });
  }

  /**
   * Selects an inventory row
   */
  public selectRow(id: string): void {
    const currentSelected = this.selectedRowId();
    if (currentSelected === id) {
      this.closeDetailsModal();
    } else {
      this.selectedRowId.set(id);
      this.openDetailsModal(id);
    }
  }

  /**
   * Opens the vehicle details modal and loads the data
   */
  public openDetailsModal(id: string): void {
    this.detailsLoading.set(true);
    this.detailsError.set('');
    this.selectedVehicleDetails.set(null);
    this.isDetailsModalOpen.set(true);

    this.vehicleService.getVehicleById(id).subscribe({
      next: (details) => {
        this.selectedVehicleDetails.set(details);
        this.detailsLoading.set(false);
      },
      error: (err) => {
        this.detailsError.set('Failed to load vehicle details. Please try again.');
        this.detailsLoading.set(false);
      }
    });
  }

  /**
   * Closes the vehicle details modal and resets selection state
   */
  public closeDetailsModal(): void {
    this.isDetailsModalOpen.set(false);
    this.selectedVehicleDetails.set(null);
    this.selectedRowId.set(null);
  }

  /**
   * Formats the username based on email
   */
  public getUserName(): string {
    const email = this.authService.userEmail();
    if (!email) return 'Guest Operator';
    const parts = email.split('@');
    return parts[0]
      .split(/[\._-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  /**
   * Formats user role
   */
  public getFormattedRole(): string {
    const role = this.authService.userRole();
    if (role === 'FleetManager') return 'Fleet Manager';
    return role || 'Operator';
  }

  /**
   * Form submission for creating a new vehicle
   */
  public onSubmit(): void {
    if (this.vehicleForm.invalid) {
      this.vehicleForm.markAllAsTouched();
      return;
    }

    const val = this.vehicleForm.getRawValue();
    const request: VehicleRequest = {
      regNo: val.regNo.trim().toUpperCase(),
      chassisNumber: val.chassisNumber.trim().toUpperCase(),
      currentOdometerReading: Number(val.currentOdometerReading),
      vehicleModelId: val.vehicleModelId,
      routeLocationId: val.routeLocationId || null
    };

    // Dispatch action to NgRx Store
    this.store.dispatch(VehiclesActions.addVehicle({ request }));
  }

  public changePage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
  }

  public toggleDropdown(id: string, event: Event): void {
    event.stopPropagation();
    if (this.activeDropdownVehicleId() === id) {
      this.activeDropdownVehicleId.set(null);
    } else {
      this.activeDropdownVehicleId.set(id);
    }
  }

  public onDeleteVehicle(id: string): void {
    if (confirm('Are you sure you want to delete this vehicle?')) {
      this.vehicleService.deleteVehicle(id).subscribe({
        next: () => {
          this.store.dispatch(VehiclesActions.loadVehicles({ filters: { PageSize: 1000 } }));
          this.closeDetailsModal();
        },
        error: (err) => {
          alert('Failed to delete vehicle. ' + this.extractErrorMessage(err, ''));
        }
      });
    }
  }

  /**
   * Extracts clean error messages from the backend response body
   */
  private extractErrorMessage(err: any, defaultMsg: string): string {
    if (!err) return defaultMsg;

    let isRegNoDuplicate = false;
    let isChassisDuplicate = false;
    let isCategoryDuplicate = false;

    const messagesToCheck: string[] = [];
    if (typeof err.error === 'string') {
      messagesToCheck.push(err.error);
    } else if (err.error && typeof err.error === 'object') {
      if (typeof err.error.message === 'string') messagesToCheck.push(err.error.message);
      if (typeof err.error.Message === 'string') messagesToCheck.push(err.error.Message);
      if (typeof err.error.error === 'string') messagesToCheck.push(err.error.error);
      if (err.error.errors && typeof err.error.errors === 'object') {
        try {
          const flatErrors = Object.values(err.error.errors).flat();
          flatErrors.forEach((e: any) => {
            if (typeof e === 'string') messagesToCheck.push(e);
          });
        } catch {}
      }
    }
    if (typeof err.message === 'string') {
      messagesToCheck.push(err.message);
    }

    for (const msg of messagesToCheck) {
      if (typeof msg === 'string') {
        const lower = msg.toLowerCase();
        if (
          lower.includes('ix_vehicles_regno') ||
          lower.includes('ix_vehicle_regno') ||
          (lower.includes('duplicate') && lower.includes('regno'))
        ) {
          isRegNoDuplicate = true;
        }
        if (
          lower.includes('ix_vehicles_chassisnumber') ||
          lower.includes('ix_vehicle_chassisnumber') ||
          lower.includes('chassisnumber') ||
          (lower.includes('duplicate') && lower.includes('chassis'))
        ) {
          isChassisDuplicate = true;
        }
        if (
          lower.includes('ix_categories_name') ||
          lower.includes('ix_category_name') ||
          lower.includes('categories_name') ||
          (lower.includes('duplicate') && lower.includes('category') && lower.includes('name'))
        ) {
          isCategoryDuplicate = true;
        }
      }
    }

    if (isRegNoDuplicate) {
      return 'Registration Number already registered';
    }
    if (isChassisDuplicate) {
      return 'Chassis Number already registered';
    }
    if (isCategoryDuplicate) {
      return 'Category Name already exists';
    }

    // 1. If backend returns a plain string
    if (typeof err.error === 'string' && err.error.trim().length > 0) {
      return err.error;
    }

    // 2. If backend returns an object with nested details
    if (err.error && typeof err.error === 'object') {
      if (typeof err.error.message === 'string' && err.error.message.trim().length > 0) {
        return err.error.message;
      }
      if (typeof err.error.Message === 'string' && err.error.Message.trim().length > 0) {
        return err.error.Message;
      }
      if (typeof err.error.error === 'string' && err.error.error.trim().length > 0) {
        return err.error.error;
      }
      // ASP.NET Core Validation Problem dictionary extractor
      if (err.error.errors && typeof err.error.errors === 'object') {
        const errorList = Object.values(err.error.errors).flat();
        if (errorList.length > 0) {
          return errorList.join(' ');
        }
      }
    }

    // 3. HTTP status-code based defaults
    if (err.status === 400) {
      return 'Invalid vehicle details. Please check your entries.';
    }
    if (err.status === 500) {
      return 'Internal server error. Please try again later.';
    }
    if (err.status === 0) {
      return 'Cannot connect to the server. Please check your internet connection and verify the API is running.';
    }
    if (err.statusText && err.statusText.trim().length > 0 && err.statusText.toLowerCase() !== 'ok') {
      return `Error: ${err.statusText}`;
    }
    return defaultMsg;
  }
}
