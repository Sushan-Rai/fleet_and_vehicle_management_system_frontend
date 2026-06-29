import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NavbarComponent } from '../navbar/navbar.component';
import { AuthService } from '../../services/auth.service';
import { VehicleService } from '../../services/vehicle.service';
import { ExpenseService } from '../../services/expense.service';
import { VehicleExpenseResponse, VehicleExpenseRequest } from '../../models/expense.model';
import { Vehicle } from '../../models/vehicle.model';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NavbarComponent],
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.css'
})
export class ExpensesComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly vehicleService = inject(VehicleService);
  private readonly expenseService = inject(ExpenseService);
  private readonly fb = inject(FormBuilder);

  // Forms
  public expenseForm!: FormGroup;

  // Role Checks
  public readonly isDriver = computed(() => this.authService.userRole() === 'Driver');
  public readonly isFleetManager = computed(() => this.authService.userRole() === 'FleetManager');
  public readonly isRestricted = computed(() => this.isDriver() || this.isFleetManager());

  // Main List States
  public readonly expenses = signal<VehicleExpenseResponse[]>([]);
  public readonly totalCount = signal<number>(0);
  public readonly pageNumber = signal<number>(1);
  public readonly pageSize = signal<number>(10);
  public readonly searchTerm = signal<string>('');
  public readonly sortBy = signal<string>('CreatedAt');
  public readonly sortOrder = signal<string>('desc');
  public readonly isLoading = signal<boolean>(false);
  public readonly errorMessage = signal<string>('');

  // Dropdown lists
  public readonly vehicles = signal<Vehicle[]>([]);

  // Add Expense Modal States
  public readonly isAddModalOpen = signal<boolean>(false);
  public readonly addErrorMessage = signal<string>('');

  // Details Modal States
  public readonly isDetailsModalOpen = signal<boolean>(false);
  public readonly selectedExpenseDetails = signal<VehicleExpenseResponse | null>(null);
  public readonly detailsLoading = signal<boolean>(false);
  public readonly detailsError = signal<string>('');

  // Computed metrics
  public readonly totalExpensesAmount = computed(() => {
    return this.expenses().reduce((sum, item) => sum + item.amount, 0);
  });

  public readonly totalPages = computed(() => {
    const total = this.totalCount();
    const size = this.pageSize();
    return Math.ceil(total / size) || 1;
  });

  public ngOnInit(): void {
    if (this.isRestricted()) {
      return; // Do not fetch data if driver or fleet manager
    }

    // Initialize Add Form
    this.expenseForm = this.fb.group({
      vehicleId: ['', Validators.required],
      expenseType: ['', [Validators.required, Validators.maxLength(30)]],
      amount: [0, [Validators.required, Validators.min(0)]],
      validFrom: ['', Validators.required],
      validTo: ['', Validators.required],
      referenceNumber: ['', [Validators.required, Validators.maxLength(50)]]
    }, { validators: this.dateRangeValidator });

    // Load Initial Data
    this.loadExpenses();
    this.loadVehicles();
  }

  public loadExpenses(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.expenseService.getExpenses({
      PageNumber: this.pageNumber(),
      PageSize: this.pageSize(),
      SearchTerm: this.searchTerm(),
      SortBy: this.sortBy(),
      SortOrder: this.sortOrder()
    }).subscribe({
      next: (res) => {
        this.expenses.set(res.data || []);
        this.totalCount.set(res.totalCount || 0);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load vehicle expenses. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  public loadVehicles(): void {
    this.vehicleService.getVehicles({ PageSize: 1000 }).subscribe({
      next: (res) => {
        this.vehicles.set(res.data || []);
      },
      error: () => {
        this.vehicles.set([]);
      }
    });
  }

  public onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value || '');
    this.pageNumber.set(1);
    this.loadExpenses();
  }

  public changePage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.pageNumber.set(page);
    this.loadExpenses();
  }

  public changeSort(field: string): void {
    if (this.sortBy() === field) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(field);
      this.sortOrder.set('asc');
    }
    this.pageNumber.set(1);
    this.loadExpenses();
  }

  public openAddModal(): void {
    this.addErrorMessage.set('');
    this.expenseForm.reset({
      vehicleId: '',
      expenseType: '',
      amount: 0,
      validFrom: '',
      validTo: '',
      referenceNumber: ''
    });
    this.isAddModalOpen.set(true);
  }

  public closeAddModal(): void {
    this.isAddModalOpen.set(false);
  }

  public onSubmit(): void {
    if (this.expenseForm.invalid) {
      this.expenseForm.markAllAsTouched();
      return;
    }

    this.addErrorMessage.set('');
    const formVal = this.expenseForm.value;
    const request: VehicleExpenseRequest = {
      vehicleId: formVal.vehicleId,
      expenseType: formVal.expenseType.trim(),
      amount: Number(formVal.amount),
      validFrom: new Date(formVal.validFrom).toISOString(),
      validTo: new Date(formVal.validTo).toISOString(),
      referenceNumber: formVal.referenceNumber.trim()
    };

    this.expenseService.createExpense(request).subscribe({
      next: () => {
        this.closeAddModal();
        this.pageNumber.set(1);
        this.loadExpenses();
      },
      error: (err) => {
        this.addErrorMessage.set(this.extractErrorMessage(err, 'Failed to record expense.'));
      }
    });
  }

  public selectRow(id: string): void {
    this.openDetailsModal(id);
  }

  public openDetailsModal(id: string): void {
    this.detailsLoading.set(true);
    this.detailsError.set('');
    this.selectedExpenseDetails.set(null);
    this.isDetailsModalOpen.set(true);

    this.expenseService.getExpenseById(id).subscribe({
      next: (details) => {
        this.selectedExpenseDetails.set(details);
        this.detailsLoading.set(false);
      },
      error: () => {
        this.detailsError.set('Failed to load expense details.');
        this.detailsLoading.set(false);
      }
    });
  }

  public closeDetailsModal(): void {
    this.isDetailsModalOpen.set(false);
    this.selectedExpenseDetails.set(null);
  }

  public exportReport(): void {
    this.expenseService.getExpenseReportCsv().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expense_report_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.errorMessage.set('Failed to download expense report.');
      }
    });
  }

  private dateRangeValidator = (group: FormGroup): { [key: string]: boolean } | null => {
    const from = group.get('validFrom')?.value;
    const to = group.get('validTo')?.value;
    const errors: { [key: string]: boolean } = {};

    if (from) {
      const fromDate = new Date(from);
      const today = new Date();
      const fromMidnight = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      if (fromMidnight.getTime() < todayMidnight.getTime()) {
        errors['validFromInPast'] = true;
      }
    }

    if (from && to && new Date(to) < new Date(from)) {
      errors['invalidDateRange'] = true;
    }

    return Object.keys(errors).length > 0 ? errors : null;
  };

  private extractErrorMessage(err: any, defaultMsg: string): string {
    if (!err) return defaultMsg;
    if (typeof err.error === 'string' && err.error.trim().length > 0) {
      return err.error;
    }
    if (err.error && typeof err.error === 'object') {
      if (typeof err.error.message === 'string') return err.error.message;
      if (typeof err.error.Message === 'string') return err.error.Message;
      if (err.error.errors && typeof err.error.errors === 'object') {
        const errorList = Object.values(err.error.errors).flat();
        if (errorList.length > 0) return errorList.join(' ');
      }
    }
    if (typeof err.message === 'string') return err.message;
    return defaultMsg;
  }
}
