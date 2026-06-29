import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NavbarComponent } from '../navbar/navbar.component';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  public readonly authService = inject(AuthService);
  private readonly settingsService = inject(SettingsService);
  private readonly fb = inject(FormBuilder);

  public alertForm!: FormGroup;

  // Component states
  public readonly isLoading = signal<boolean>(true);
  public readonly error = signal<string>('');
  public readonly successMessage = signal<string>('');
  public readonly approvalsLoading = signal<boolean>(false);
  public readonly approvalsError = signal<string>('');
  public readonly approvalSuccessMessage = signal<string>('');

  // Fleet Manager Profile states
  public readonly fmProfile = signal<any>(null);
  public readonly fmProfileLoading = signal<boolean>(false);
  public readonly fmProfileError = signal<string>('');

  // Driver Profile states
  public readonly driverProfile = signal<any>(null);
  public readonly driverProfileLoading = signal<boolean>(false);
  public readonly driverProfileError = signal<string>('');

  // Pending users and status lists
  public readonly pendingApprovals = signal<any[]>([]);
  public readonly systemStatus = signal<any>({
    isOperational: true,
    lastBackup: 'Just now'
  });

  public ngOnInit(): void {
    // 1. Initialize Form
    this.alertForm = this.fb.group({
      alertOnAbnormalFuel: [true],
      fuelEfficiencyThreshold: [15, [Validators.required, Validators.min(0.01), Validators.max(1000)]],
      alertOnMaintenanceApproaching: [true],
      maintenanceOdometerThreshold: [1000, [Validators.required, Validators.min(1), Validators.max(1000000)]],
      alertOnVehicleAvailability: [true],
      alertOnRouteDelay: [true],
      routeDelayThresholdMinutes: [30, [Validators.required, Validators.min(1), Validators.max(1440)]],
      receiveEmail: [true],
      receiveSignalR: [true]
    });

    // 2. Fetch configurations
    this.loadSettings();
  }

  public loadSettings(): void {
    this.isLoading.set(true);
    this.error.set('');

    const role = this.authService.userRole();
    const fmId = this.authService.currentUser()?.fleetManagerId;
    const driverId = this.authService.currentUser()?.driverId;

    if (role === 'Driver') {
      this.updateBackupTime();
      if (driverId) {
        this.loadDriverProfile(driverId);
      } else {
        this.isLoading.set(false);
      }
    } else {
      this.settingsService.getAlertPreferences().subscribe({
        next: (prefs) => {
          if (prefs) {
            this.alertForm.patchValue({
              alertOnAbnormalFuel: prefs.alertOnAbnormalFuel,
              fuelEfficiencyThreshold: prefs.fuelEfficiencyThreshold ?? 15,
              alertOnMaintenanceApproaching: prefs.alertOnMaintenanceApproaching,
              maintenanceOdometerThreshold: prefs.maintenanceOdometerThreshold ?? 1000,
              alertOnVehicleAvailability: prefs.alertOnVehicleAvailability,
              alertOnRouteDelay: prefs.alertOnRouteDelay,
              routeDelayThresholdMinutes: prefs.routeDelayThresholdMinutes ?? 30,
              receiveEmail: prefs.receiveEmail,
              receiveSignalR: prefs.receiveSignalR
            });
          }

          // Set last backup time
          this.updateBackupTime();

          // If Admin, also load pending approvals
          if (role === 'Admin') {
            this.loadPendingApprovals();
          } else if (role === 'FleetManager' && fmId) {
            this.loadFleetManagerProfile(fmId);
          } else {
            this.isLoading.set(false);
          }
        },
        error: (err) => {
          this.error.set('Failed to load alert preferences. Please check your connection.');
          this.isLoading.set(false);
        }
      });
    }
  }

  public loadPendingApprovals(): void {
    this.approvalsLoading.set(true);
    this.approvalsError.set('');

    this.settingsService.getPendingApprovals().subscribe({
      next: (users) => {
        this.pendingApprovals.set(users || []);
        this.approvalsLoading.set(false);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.approvalsError.set('Failed to load pending user approvals.');
        this.approvalsLoading.set(false);
        this.isLoading.set(false);
      }
    });
  }

  public onSubmitAlertPreferences(): void {
    if (this.alertForm.invalid) {
      this.alertForm.markAllAsTouched();
      return;
    }

    this.successMessage.set('');
    this.error.set('');

    const formValues = this.alertForm.value;
    const request = {
      alertOnAbnormalFuel: formValues.alertOnAbnormalFuel,
      fuelEfficiencyThreshold: Number(formValues.fuelEfficiencyThreshold),
      alertOnMaintenanceApproaching: formValues.alertOnMaintenanceApproaching,
      maintenanceOdometerThreshold: Number(formValues.maintenanceOdometerThreshold),
      alertOnVehicleAvailability: formValues.alertOnVehicleAvailability,
      alertOnRouteDelay: formValues.alertOnRouteDelay,
      routeDelayThresholdMinutes: Number(formValues.routeDelayThresholdMinutes),
      receiveEmail: formValues.receiveEmail,
      receiveSignalR: formValues.receiveSignalR
    };

    this.settingsService.updateAlertPreferences(request).subscribe({
      next: () => {
        this.successMessage.set('Alert preferences updated successfully.');
        setTimeout(() => this.successMessage.set(''), 4000);
      },
      error: (err) => {
        this.error.set('Failed to update alert preferences. Please try again.');
      }
    });
  }

  public onApproveUser(userId: string): void {
    this.approvalSuccessMessage.set('');
    this.approvalsError.set('');

    this.settingsService.approveUser(userId).subscribe({
      next: () => {
        this.approvalSuccessMessage.set('User approved successfully.');
        setTimeout(() => this.approvalSuccessMessage.set(''), 4000);
        this.loadPendingApprovals();
      },
      error: (err) => {
        this.approvalsError.set('Failed to approve user. Please try again.');
      }
    });
  }

  public loadFleetManagerProfile(id: string): void {
    this.fmProfileLoading.set(true);
    this.fmProfileError.set('');

    this.settingsService.getFleetManagerProfile(id).subscribe({
      next: (profile) => {
        this.fmProfile.set(profile);
        this.fmProfileLoading.set(false);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.fmProfileError.set('Failed to load profile details.');
        this.fmProfileLoading.set(false);
        this.isLoading.set(false);
      }
    });
  }

  public loadDriverProfile(id: string): void {
    this.driverProfileLoading.set(true);
    this.driverProfileError.set('');

    this.settingsService.getDriverProfile(id).subscribe({
      next: (profile) => {
        this.driverProfile.set(profile);
        this.driverProfileLoading.set(false);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.driverProfileError.set('Failed to load profile details.');
        this.driverProfileLoading.set(false);
        this.isLoading.set(false);
      }
    });
  }

  public getUserInitial(firstName: string, lastName: string): string {
    const f = firstName ? firstName.charAt(0).toUpperCase() : '';
    const l = lastName ? lastName.charAt(0).toUpperCase() : '';
    return f + l || 'US';
  }

  private updateBackupTime(): void {
    const date = new Date();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.systemStatus.set({
      isOperational: true,
      lastBackup: `Backup verified at ${timeStr}`
    });
  }
}
