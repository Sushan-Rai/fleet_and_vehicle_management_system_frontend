import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  public readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Form fields
  public readonly email = signal('');
  public readonly password = signal('');

  // UI state
  public readonly isLoading = signal(false);
  public readonly showPassword = signal(false);
  public readonly errorMessage = signal('');
  public readonly successMessage = signal('');

  // API Config drawer state
  public readonly showApiConfig = signal(false);
  public readonly tempApiUrl = signal(this.authService.apiUrl());

  // Password reset modal state
  public readonly showResetModal = signal(false);
  public readonly resetEmail = signal('');
  public readonly resetOldPassword = signal('');
  public readonly resetNewPassword = signal('');
  public readonly resetIsLoading = signal(false);
  public readonly resetError = signal('');
  public readonly resetSuccess = signal('');

  /**
   * Performs authentication request
   */
  public onLogin(): void {
    if (!this.email() || !this.password()) {
      this.errorMessage.set('Please fill out both email and password fields.');
      this.successMessage.set('');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService
      .login({
        email: this.email(),
        password: this.password(),
      })
      .subscribe({
        next: (response) => {
          this.isLoading.set(false);
          const role = this.authService.userRole();
          if (role === 'Driver') {
            this.successMessage.set('Sign in successful! Redirecting to assignments...');
            setTimeout(() => {
              this.router.navigate(['/assignments']);
            }, 1500);
          } else {
            this.successMessage.set('Sign in successful! Redirecting to dashboard...');
            setTimeout(() => {
              this.router.navigate(['/dashboard']);
            }, 1500);
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(this.extractErrorMessage(err, 'Invalid credentials. Please verify your email and password.'));
        },
      });
  }

  /**
   * Applies base URL configuration changes
   */
  public saveApiConfig(): void {
    if (!this.tempApiUrl().trim()) return;
    this.authService.setApiUrl(this.tempApiUrl().trim());
    this.showApiConfig.set(false);
    this.successMessage.set(`API base URL updated to: ${this.authService.apiUrl()}`);
    setTimeout(() => this.successMessage.set(''), 3000);
  }

  /**
   * Resets the API base URL to its default value
   */
  public resetApiUrl(): void {
    this.authService.setApiUrl('');
    this.tempApiUrl.set(this.authService.apiUrl());
    this.showApiConfig.set(false);
    this.successMessage.set('API base URL reset to default configuration.');
    setTimeout(() => this.successMessage.set(''), 3000);
  }

  /**
   * Submits a password reset request
   */
  public onResetPassword(): void {
    if (!this.resetEmail() || !this.resetOldPassword() || !this.resetNewPassword()) {
      this.resetError.set('Please fill out all password reset fields.');
      this.resetSuccess.set('');
      return;
    }

    // Basic password validation
    const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,32}$/;
    if (!pwdRegex.test(this.resetNewPassword())) {
      this.resetError.set('New password must have 8-32 chars, 1 uppercase, 1 lowercase, 1 digit, and 1 special symbol.');
      return;
    }

    this.resetIsLoading.set(true);
    this.resetError.set('');
    this.resetSuccess.set('');

    this.authService
      .resetPassword({
        email: this.resetEmail(),
        oldPassword: this.resetOldPassword(),
        newPassword: this.resetNewPassword(),
      })
      .subscribe({
        next: () => {
          this.resetIsLoading.set(false);
          this.resetSuccess.set('Password successfully updated! You can now log in.');
          this.clearResetForm(true);
        },
        error: (err) => {
          this.resetIsLoading.set(false);
          this.resetError.set(this.extractErrorMessage(err, 'Failed to reset password. Please check your credentials.'));
        },
      });
  }

  /**
   * Opens the password reset modal
   */
  public openResetModal(): void {
    this.showResetModal.set(true);
    this.clearResetForm(false);
  }

  /**
   * Closes the password reset modal
   */
  public closeResetModal(): void {
    this.showResetModal.set(false);
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
   * Helper to clear reset form state
   */
  private clearResetForm(keepSuccess = false): void {
    this.resetEmail.set('');
    this.resetOldPassword.set('');
    this.resetNewPassword.set('');
    if (!keepSuccess) {
      this.resetSuccess.set('');
    }
    this.resetError.set('');
  }
}
