import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { NavbarComponent } from './navbar.component';

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('helper methods', () => {
    it('should format user email into user name', () => {
      component.authService.currentUser.set({
        token: 'token',
        email: 'alex.rivera-ops@example.com',
        role: 'FleetManager'
      });
      expect(component.getUserName()).toBe('Alex Rivera Ops');
    });

    it('should fall back to Guest Operator if email is missing', () => {
      component.authService.currentUser.set(null);
      expect(component.getUserName()).toBe('Guest Operator');
    });

    it('should format user role', () => {
      component.authService.currentUser.set({
        token: 'token',
        email: 'alex.rivera@example.com',
        role: 'FleetManager'
      });
      expect(component.getFormattedRole()).toBe('Fleet Manager');

      component.authService.currentUser.set({
        token: 'token',
        email: 'driver@example.com',
        role: 'Driver'
      });
      expect(component.getFormattedRole()).toBe('Driver');
    });

    it('should navigate on logout', () => {
      const navigateSpy = vi.spyOn(router, 'navigate');
      component.onLogout();
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });
  });
});
