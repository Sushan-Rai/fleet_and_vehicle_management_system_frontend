import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AlertsService } from '../../services/alerts.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  public readonly authService = inject(AuthService);
  public readonly alertsService = inject(AlertsService);
  private readonly router = inject(Router);

  /**
   * Logs out the user and routes back to login
   */
  public onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  /**
   * Helper to format and display user name based on email username
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
   * Formats the role for presentation
   */
  public getFormattedRole(): string {
    const role = this.authService.userRole();
    if (role === 'FleetManager') return 'Fleet Manager';
    return role || 'Operator';
  }
}
