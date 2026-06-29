import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RouteLocation } from '../../models/route-location.model';
import { RegisterUserRequest } from '../../models/register-user-request.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Form inputs
  public readonly firstName = signal('');
  public readonly lastName = signal('');
  public readonly email = signal('');
  public readonly password = signal('');
  public readonly licenseNumber = signal('');
  public readonly role = signal<'Driver' | 'FleetManager'>('Driver');
  public readonly selectedLocationId = signal('');


  // UI state variables
  public readonly isLoading = signal(false);
  public readonly isLocationsLoading = signal(false);
  public readonly showPassword = signal(false);
  public readonly errorMessage = signal('');
  public readonly showSuccessModal = signal(false);

  // Locations list signals
  public readonly locations = signal<RouteLocation[]>([]);
  public readonly activeLocations = computed(() =>
    this.locations().filter((loc) => loc.isActive)
  );

  public ngOnInit(): void {
    this.loadLocations();
  }

  private loadLocations(): void {
    this.isLocationsLoading.set(true);
    this.authService.getRouteLocations().subscribe({
      next: (locs) => {
        this.locations.set(locs);
        this.isLocationsLoading.set(false);
      },
      error: (err) => {
        this.isLocationsLoading.set(false);
        this.errorMessage.set('Failed to load locations. Please try refreshing the page.');
      }
    });
  }

  // Password criteria computed signals (matching backend DTO regex validation)
  public readonly hasMinLength = computed(() => {
    const val = this.password();
    return val.length >= 8 && val.length <= 32;
  });

  public readonly hasUppercase = computed(() => {
    const val = this.password();
    return /[A-Z]/.test(val);
  });

  public readonly hasLowercase = computed(() => {
    const val = this.password();
    return /[a-z]/.test(val);
  });

  public readonly hasDigit = computed(() => {
    const val = this.password();
    return /\d/.test(val);
  });

  public readonly hasSpecial = computed(() => {
    const val = this.password();
    return /[@$!%*?&]/.test(val);
  });

  // Determines if all password criteria are satisfied
  public readonly isPasswordValid = computed(() => {
    return (
      this.hasMinLength() &&
      this.hasUppercase() &&
      this.hasLowercase() &&
      this.hasDigit() &&
      this.hasSpecial()
    );
  });

  /**
   * Sets the role for registration
   */
  public setRole(selectedRole: 'Driver' | 'FleetManager'): void {
    this.role.set(selectedRole);
    // Clear license number if switching to Manager
    if (selectedRole === 'FleetManager') {
      this.licenseNumber.set('');
    }
  }

  /**
   * Submits the registration form to the backend
   */
  public onRegister(): void {
    // Validate required fields
    if (!this.firstName() || !this.lastName() || !this.email() || !this.password() || !this.selectedLocationId()) {
      this.errorMessage.set('Please fill out all required fields.');
      return;
    }

    if (this.role() === 'Driver' && !this.licenseNumber()) {
      this.errorMessage.set('License number is required for Drivers.');
      return;
    }

    if (!this.isPasswordValid()) {
      this.errorMessage.set('Password does not satisfy all validation rules.');
      return;
    }



    this.isLoading.set(true);
    this.errorMessage.set('');

    const payload: RegisterUserRequest = {
      email: this.email().trim(),
      password: this.password(),
      role: this.role(),
      firstName: this.firstName().trim(),
      lastName: this.lastName().trim(),
      licenseNumber: this.role() === 'Driver' ? this.licenseNumber().trim() : null,
      currentLocationId: this.role() === 'Driver' ? this.selectedLocationId() : null,
      routeLocationId: this.role() === 'FleetManager' ? this.selectedLocationId() : null
    };

    this.authService.register(payload).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.showSuccessModal.set(true);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(this.extractErrorMessage(err, 'Registration failed. Please review your entries and try again.'));
      }
    });
  }

  /**
   * Navigates to the login route and resets registration modal
   */
  public navigateToLogin(): void {
    this.showSuccessModal.set(false);
    this.clearForm();
    this.router.navigate(['/login']);
  }

  /**
   * Extracts clean error messages from the backend response body
   */
  private extractErrorMessage(err: any, defaultMsg: string): string {
    if (!err) return defaultMsg;

    // Check if the error is a database conflict/duplicate record error
    const isDuplicate = (msg: any): boolean => {
      if (typeof msg !== 'string') return false;
      const lower = msg.toLowerCase();
      return (
        lower.includes('ix_user_email') ||
        lower.includes('duplicate records') ||
        lower.includes('duplicate key') ||
        (lower.includes('duplicate') && lower.includes('email'))
      );
    };

    const isFleetManagerConflict = (msg: any): boolean => {
      if (typeof msg !== 'string') return false;
      return msg.toLowerCase().includes('fleet manager already exists');
    };

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

    if (messagesToCheck.some(isFleetManagerConflict)) {
      return 'Fleet manager already exists for this location.';
    }

    const ixMatch = messagesToCheck.reduce((acc: string | null, msg) => {
      if (acc) return acc;
      if (typeof msg !== 'string') return null;
      const match = msg.match(/IX_?([a-zA-Z0-9_]+)/);
      return match ? match[1] : null;
    }, null);

    if (ixMatch) {
      if (ixMatch.toLowerCase().includes('email')) {
        return 'Email already registered.';
      }
      return `${ixMatch} is already registered.`;
    }

    if (err.status === 409 || messagesToCheck.some(isDuplicate)) {
      return 'Email already registered.';
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
      return 'Invalid request details. Please check your entries.';
    }
    if (err.status === 401) {
      return 'Invalid username or password.';
    }
    if (err.status === 403) {
      return 'Access Denied: Your account is pending administrator approval.';
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

  /**
   * Clears the registration form values
   */
  private clearForm(): void {
    this.firstName.set('');
    this.lastName.set('');
    this.email.set('');
    this.password.set('');
    this.licenseNumber.set('');
    this.selectedLocationId.set('');
    this.errorMessage.set('');
  }
}
