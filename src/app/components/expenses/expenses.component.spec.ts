import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ExpensesComponent } from './expenses.component';
import { AuthService } from '../../services/auth.service';
import { VehicleService } from '../../services/vehicle.service';
import { ExpenseService } from '../../services/expense.service';

describe('ExpensesComponent', () => {
  let component: ExpensesComponent;
  let fixture: ComponentFixture<ExpensesComponent>;
  let expenseServiceMock: any;
  let vehicleServiceMock: any;

  const authServiceMock = {
    apiUrl: () => 'https://localhost:7136/api/v1',
    userRole: () => 'Admin',
    userEmail: () => 'admin@example.com'
  };

  const mockExpensesPaged = {
    totalCount: 2,
    pageNumber: 1,
    pageSize: 10,
    data: [
      { id: 'e1', vehicleId: 'v1', vehicleRegNo: 'TX01-1111', vehicleModelName: 'Ford Transit', expenseType: 'Fuel', amount: 150.50, validFrom: '2026-06-01T00:00:00Z', validTo: '2026-06-02T00:00:00Z', referenceNumber: 'REF-111', createdAt: '2026-06-22T10:00:00Z' },
      { id: 'e2', vehicleId: 'v2', vehicleRegNo: 'TX02-2222', vehicleModelName: 'Freightliner', expenseType: 'Insurance', amount: 1200.00, validFrom: '2026-06-01T00:00:00Z', validTo: '2026-06-30T00:00:00Z', referenceNumber: 'REF-222', createdAt: '2026-06-22T11:00:00Z' }
    ]
  };

  const mockVehicles = {
    totalCount: 2,
    pageNumber: 1,
    pageSize: 10,
    data: [
      { id: 'v1', regNo: 'TX01-1111', status: 'Active', routeLocationId: 'loc1', modelName: 'Ford Transit' },
      { id: 'v2', regNo: 'TX02-2222', status: 'Active', routeLocationId: 'loc2', modelName: 'Freightliner' }
    ]
  };

  beforeEach(async () => {
    expenseServiceMock = {
      getExpenses: vi.fn().mockReturnValue(of(mockExpensesPaged)),
      getExpenseById: vi.fn().mockReturnValue(of(mockExpensesPaged.data[0])),
      createExpense: vi.fn().mockReturnValue(of(mockExpensesPaged.data[0])),
      getExpenseReportCsv: vi.fn().mockReturnValue(of(new Blob(['csv,content'], { type: 'text/csv' })))
    };

    vehicleServiceMock = {
      getVehicles: vi.fn().mockReturnValue(of(mockVehicles))
    };

    await TestBed.configureTestingModule({
      imports: [ExpensesComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: VehicleService, useValue: vehicleServiceMock },
        { provide: ExpenseService, useValue: expenseServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ExpensesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load initial expenses and vehicles on init', () => {
    expect(component).toBeTruthy();
    expect(component.isLoading()).toBe(false);
    expect(expenseServiceMock.getExpenses).toHaveBeenCalled();
    expect(vehicleServiceMock.getVehicles).toHaveBeenCalled();

    expect(component.expenses().length).toBe(2);
    expect(component.vehicles().length).toBe(2);
    expect(component.totalCount()).toBe(2);
    expect(component.totalExpensesAmount()).toBe(1350.5);
  });

  it('should filter expenses on search', () => {
    const event = { target: { value: 'Fuel' } } as unknown as Event;
    component.onSearch(event);

    expect(component.searchTerm()).toBe('Fuel');
    expect(component.pageNumber()).toBe(1);
    expect(expenseServiceMock.getExpenses).toHaveBeenLastCalledWith({
      PageNumber: 1,
      PageSize: 10,
      SearchTerm: 'Fuel',
      SortBy: 'CreatedAt',
      SortOrder: 'desc'
    });
  });

  it('should paginate properly', () => {
    component.totalCount.set(25); // 3 pages total
    fixture.detectChanges();

    component.changePage(2);
    expect(component.pageNumber()).toBe(2);
    expect(expenseServiceMock.getExpenses).toHaveBeenCalled();

    // Out of bounds page change
    component.changePage(5);
    expect(component.pageNumber()).toBe(2);
  });

  it('should toggle sort correctly', () => {
    component.changeSort('Amount');
    expect(component.sortBy()).toBe('Amount');
    expect(component.sortOrder()).toBe('asc');

    component.changeSort('Amount');
    expect(component.sortOrder()).toBe('desc');
  });

  it('should validate and create new expense', () => {
    component.openAddModal();
    expect(component.isAddModalOpen()).toBe(true);

    const todayStr = new Date().toISOString().substring(0, 10);
    const futureStr = new Date(Date.now() + 86400000 * 4).toISOString().substring(0, 10);

    component.expenseForm.setValue({
      vehicleId: 'v1',
      expenseType: 'Maintenance',
      amount: 450,
      validFrom: todayStr,
      validTo: futureStr,
      referenceNumber: 'REC-333'
    });

    component.onSubmit();

    expect(expenseServiceMock.createExpense).toHaveBeenCalledWith({
      vehicleId: 'v1',
      expenseType: 'Maintenance',
      amount: 450,
      validFrom: new Date(todayStr).toISOString(),
      validTo: new Date(futureStr).toISOString(),
      referenceNumber: 'REC-333'
    });

    expect(component.isAddModalOpen()).toBe(false);
  });

  it('should fail validation if dates are reversed', () => {
    component.openAddModal();

    const todayStr = new Date().toISOString().substring(0, 10);
    const futureStr = new Date(Date.now() + 86400000 * 4).toISOString().substring(0, 10);

    component.expenseForm.setValue({
      vehicleId: 'v1',
      expenseType: 'Maintenance',
      amount: 450,
      validFrom: futureStr,
      validTo: todayStr, // Before validFrom
      referenceNumber: 'REC-333'
    });

    expect(component.expenseForm.invalid).toBe(true);
    expect(component.expenseForm.hasError('invalidDateRange')).toBe(true);
  });

  it('should open details modal on row selection', () => {
    component.selectRow('e1');
    expect(component.isDetailsModalOpen()).toBe(true);
    expect(expenseServiceMock.getExpenseById).toHaveBeenCalledWith('e1');
    expect(component.selectedExpenseDetails()?.id).toBe('e1');

    component.closeDetailsModal();
    expect(component.isDetailsModalOpen()).toBe(false);
    expect(component.selectedExpenseDetails()).toBeNull();
  });

  it('should download report csv', () => {
    component.exportReport();
    expect(expenseServiceMock.getExpenseReportCsv).toHaveBeenCalled();
  });
});

describe('ExpensesComponent - Driver role', () => {
  let component: ExpensesComponent;
  let fixture: ComponentFixture<ExpensesComponent>;
  let expenseServiceMock: any;
  let vehicleServiceMock: any;

  const authServiceMock = {
    apiUrl: () => 'https://localhost:7136/api/v1',
    userRole: () => 'Driver',
    userEmail: () => 'driver@example.com'
  };

  beforeEach(async () => {
    expenseServiceMock = {
      getExpenses: vi.fn(),
      getExpenseById: vi.fn(),
      createExpense: vi.fn(),
      getExpenseReportCsv: vi.fn()
    };

    vehicleServiceMock = {
      getVehicles: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ExpensesComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: VehicleService, useValue: vehicleServiceMock },
        { provide: ExpenseService, useValue: expenseServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ExpensesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should verify driver has isDriver true and does not fetch lists on init', () => {
    expect(component.isDriver()).toBe(true);
    expect(expenseServiceMock.getExpenses).not.toHaveBeenCalled();
    expect(vehicleServiceMock.getVehicles).not.toHaveBeenCalled();
  });
});
