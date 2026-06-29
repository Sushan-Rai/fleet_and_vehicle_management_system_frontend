import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
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
import { AssignmentsService } from '../../services/assignments.service';
import { RouteLocation } from '../../models/route-location.model';
import { VehicleAssignment, Driver } from '../../models/assignment.model';
import { Vehicle } from '../../models/vehicle.model';
import * as AssignmentsActions from '../../store/assignments/assignments.actions';
import {
  selectActiveAssignments,
  selectHistoryAssignments,
  selectAssignmentsFilter,
  selectAssignmentsLoading,
  selectAssignmentsError
} from '../../store/assignments/assignments.selectors';

@Component({
  selector: 'app-assignments',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NavbarComponent, RouterLink],
  templateUrl: './assignments.component.html',
  styleUrl: './assignments.component.css'
})
export class AssignmentsComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  public readonly authService = inject(AuthService);
  private readonly vehicleService = inject(VehicleService);
  private readonly assignmentsService = inject(AssignmentsService);
  private readonly fb = inject(FormBuilder);
  private readonly actions$ = inject(Actions);
  private readonly destroy$ = new Subject<void>();

  // Dispatch Form
  public dispatchForm!: FormGroup;

  // Local component states
  public readonly isDispatchModalOpen = signal<boolean>(false);
  public readonly dispatchErrorMessage = signal<string>('');
  public readonly selectedRowId = signal<string | null>(null);

  // Details Modal States
  public readonly isDetailsModalOpen = signal<boolean>(false);
  public readonly selectedAssignmentDetails = signal<VehicleAssignment | null>(null);
  public readonly detailsLoading = signal<boolean>(false);
  public readonly detailsError = signal<string>('');

  // Loaded metadata lists
  public readonly drivers = signal<Driver[]>([]);
  public readonly vehicles = signal<Vehicle[]>([]);
  public readonly routeLocations = signal<RouteLocation[]>([]);

  // Selection states for dynamic list filtering
  public readonly selectedStartLocationId = signal<string>('');

  // Selectors from NgRx store converted to signals
  public readonly loading = toSignal(this.store.select(selectAssignmentsLoading), { initialValue: false });
  public readonly error = toSignal(this.store.select(selectAssignmentsError), { initialValue: null as any });
  public readonly activeAssignments = toSignal(this.store.select(selectActiveAssignments), { initialValue: [] as VehicleAssignment[] });
  public readonly historyAssignments = toSignal(this.store.select(selectHistoryAssignments), { initialValue: [] as VehicleAssignment[] });
  public readonly activeFilter = toSignal(this.store.select(selectAssignmentsFilter), { initialValue: 'All' as 'All' | 'Scheduled' | 'InTransit' });

  public readonly isDriver = computed(() => this.authService.userRole() === 'Driver');
  public readonly isFleetManager = computed(() => this.authService.userRole() === 'FleetManager');

  // Computed lists restricted by selected start location
  public readonly availableDrivers = computed(() => {
    const startLoc = this.selectedStartLocationId();
    if (!startLoc) return [];
    return this.drivers().filter(d => d.isActive && !d.isOnTrip && d.currentLocationId === startLoc);
  });

  public readonly availableVehicles = computed(() => {
    const startLoc = this.selectedStartLocationId();
    if (!startLoc) return [];
    return this.vehicles().filter(v => v.status === 'Active' && v.routeLocationId?.toLowerCase() === startLoc.toLowerCase());
  });

  public readonly transitVehiclesCount = computed(() => {
    return this.vehicles().filter(v => v.status === 'InTransit').length;
  });

  public readonly activeDriversCount = computed(() => {
    return this.drivers().filter(d => d.isOnTrip).length;
  });

  public ngOnInit(): void {
    // Dispatch store loading actions
    this.store.dispatch(AssignmentsActions.loadAssignments({}));

    // Initialize Form
    this.dispatchForm = this.fb.group({
      startLocationId: ['', Validators.required],
      destinationLocationId: ['', Validators.required],
      driverId: ['', Validators.required],
      vehicleId: ['', Validators.required],
      scheduledDeparture: ['', Validators.required],
      scheduledArrival: ['', Validators.required]
    }, { validators: [this.assignmentDateValidator] });

    // Reset Driver & Vehicle lists when Start Location changes
    this.dispatchForm.get('startLocationId')?.valueChanges.subscribe(val => {
      this.selectedStartLocationId.set(val || '');
      this.dispatchForm.patchValue({ driverId: '', vehicleId: '' });
    });

    // Fetch lists
    if (!this.isDriver()) {
      this.assignmentsService.getActiveDrivers().subscribe({
        next: (drivers) => this.drivers.set(drivers),
        error: () => this.drivers.set([])
      });
    }

    this.vehicleService.getVehicles({ PageSize: 1000 }).subscribe({
      next: (res) => this.vehicles.set(res.data || []),
      error: () => this.vehicles.set([])
    });

    this.authService.getRouteLocations().subscribe({
      next: (locations) => this.routeLocations.set(locations),
      error: () => this.routeLocations.set([])
    });

    // Handle create actions success & failure
    this.actions$.pipe(
      ofType(AssignmentsActions.createAssignmentSuccess),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.closeDispatchModal();
      this.refreshAllocationLists();
    });

    this.actions$.pipe(
      ofType(AssignmentsActions.createAssignmentFailure),
      takeUntil(this.destroy$)
    ).subscribe(({ error }) => {
      this.dispatchErrorMessage.set(this.extractErrorMessage(error, 'Failed to create assignment.'));
    });

    // Also reload lists when accept/reject/arrive successes occur, to update locations, drivers, vehicle availability
    this.actions$.pipe(
      ofType(
        AssignmentsActions.acceptAssignmentSuccess,
        AssignmentsActions.rejectAssignmentSuccess,
        AssignmentsActions.arriveAssignmentSuccess
      ),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.refreshAllocationLists();
    });
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public refreshAllocationLists(): void {
    if (!this.isDriver()) {
      this.assignmentsService.getActiveDrivers().subscribe({
        next: (drivers) => this.drivers.set(drivers),
        error: () => this.drivers.set([])
      });
    }

    this.vehicleService.getVehicles({ PageSize: 1000 }).subscribe({
      next: (res) => this.vehicles.set(res.data || []),
      error: () => this.vehicles.set([])
    });
  }

  public openDispatchModal(): void {
    this.dispatchErrorMessage.set('');
    const fmLocId = this.isFleetManager() ? (this.authService.currentUser()?.routeLocationId || '') : '';
    this.selectedStartLocationId.set(fmLocId);
    this.dispatchForm.reset({
      startLocationId: fmLocId,
      destinationLocationId: '',
      driverId: '',
      vehicleId: '',
      scheduledDeparture: '',
      scheduledArrival: ''
    });
    if (this.isFleetManager()) {
      this.dispatchForm.get('startLocationId')?.disable();
    } else {
      this.dispatchForm.get('startLocationId')?.enable();
    }
    this.isDispatchModalOpen.set(true);
  }

  public closeDispatchModal(): void {
    this.isDispatchModalOpen.set(false);
  }

  public setFilter(filter: 'All' | 'Scheduled' | 'InTransit'): void {
    this.store.dispatch(AssignmentsActions.setAssignmentFilter({ filter }));
  }

  public accept(assignment: VehicleAssignment): void {
    this.store.dispatch(AssignmentsActions.acceptAssignment({
      request: {
        id: assignment.id,
        vehicleId: assignment.vehicleId,
        driverId: this.authService.currentUser()?.driverId || assignment.driverId
      }
    }));
  }

  public reject(assignment: VehicleAssignment): void {
    this.store.dispatch(AssignmentsActions.rejectAssignment({
      request: {
        id: assignment.id,
        vehicleId: assignment.vehicleId,
        driverId: this.authService.currentUser()?.driverId || assignment.driverId
      }
    }));
  }

  public arrive(assignment: VehicleAssignment): void {
    this.store.dispatch(AssignmentsActions.arriveAssignment({
      request: {
        id: assignment.id,
        vehicleId: assignment.vehicleId,
        driverId: this.authService.currentUser()?.driverId || assignment.driverId
      }
    }));
  }

  public selectRow(id: string): void {
    const currentSelected = this.selectedRowId();
    if (currentSelected === id) {
      this.closeDetailsModal();
    } else {
      this.selectedRowId.set(id);
      this.openDetailsModal(id);
    }
  }

  public openDetailsModal(id: string): void {
    this.detailsLoading.set(true);
    this.detailsError.set('');
    this.selectedAssignmentDetails.set(null);
    this.isDetailsModalOpen.set(true);

    this.assignmentsService.getAssignmentById(id).subscribe({
      next: (details) => {
        this.selectedAssignmentDetails.set(details);
        this.detailsLoading.set(false);
      },
      error: (err) => {
        this.detailsError.set('Failed to load assignment details. Please try again.');
        this.detailsLoading.set(false);
      }
    });
  }

  public closeDetailsModal(): void {
    this.isDetailsModalOpen.set(false);
    this.selectedAssignmentDetails.set(null);
    this.selectedRowId.set(null);
  }

  private assignmentDateValidator = (group: FormGroup): { [key: string]: boolean } | null => {
    const departure = group.get('scheduledDeparture')?.value;
    const arrival = group.get('scheduledArrival')?.value;
    const errors: { [key: string]: boolean } = {};

    if (departure) {
      const depDate = new Date(departure);
      const today = new Date();
      const depMidnight = new Date(depDate.getFullYear(), depDate.getMonth(), depDate.getDate());
      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      if (depMidnight.getTime() < todayMidnight.getTime()) {
        errors['departureInPast'] = true;
      }
    }

    if (departure && arrival) {
      const depDate = new Date(departure);
      const arrDate = new Date(arrival);

      if (arrDate.getTime() <= depDate.getTime()) {
        errors['arrivalBeforeDeparture'] = true;
      }
    }

    return Object.keys(errors).length > 0 ? errors : null;
  };

  public onSubmit(): void {
    if (this.dispatchForm.invalid) {
      this.dispatchForm.markAllAsTouched();
      return;
    }

    const val = this.dispatchForm.getRawValue();
    const request = {
      vehicleId: val.vehicleId,
      driverId: val.driverId,
      destinationLocationId: val.destinationLocationId,
      scheduledDeparture: new Date(val.scheduledDeparture).toISOString(),
      scheduledArrival: new Date(val.scheduledArrival).toISOString()
    };

    this.store.dispatch(AssignmentsActions.createAssignment({ request }));
  }

  public getLocationName(locationId: string): string {
    const loc = this.routeLocations().find(l => l.id === locationId);
    return loc ? loc.location : 'Unknown Location';
  }

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
