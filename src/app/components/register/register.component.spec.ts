import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { RegisterComponent } from './register.component';
import { of } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { vi } from 'vitest';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('extractErrorMessage', () => {
    it('should return "Email already registered." for status 409', () => {
      const err = { status: 409 };
      const msg = (component as any).extractErrorMessage(err, 'Default message');
      expect(msg).toBe('Email already registered.');
    });

    it('should return "Email already registered." when err.error contains IX_User_email', () => {
      const err = { error: 'Violation of UNIQUE KEY constraint IX_User_email.' };
      const msg = (component as any).extractErrorMessage(err, 'Default message');
      expect(msg).toBe('Email already registered.');
    });

    it('should return "Email already registered." when err.error.message contains duplicate records', () => {
      const err = { error: { message: 'Database returned duplicate records error.' } };
      const msg = (component as any).extractErrorMessage(err, 'Default message');
      expect(msg).toBe('Email already registered.');
    });

    it('should return "Email already registered." when err.error.errors has duplicate email message', () => {
      const err = {
        error: {
          errors: {
            Email: ['The Email field has duplicate values.']
          }
        }
      };
      const msg = (component as any).extractErrorMessage(err, 'Default message');
      expect(msg).toBe('Email already registered.');
    });

    it('should return "Email already registered." when err.message contains duplicate key', () => {
      const err = { message: 'Cannot insert duplicate key row.' };
      const msg = (component as any).extractErrorMessage(err, 'Default message');
      expect(msg).toBe('Email already registered.');
    });

    it('should return standard error when no duplicate matches are found', () => {
      const err = { error: 'Some regular validation failure' };
      const msg = (component as any).extractErrorMessage(err, 'Default message');
      expect(msg).toBe('Some regular validation failure');
    });

    it('should return "Drivers_LicenseNumber is already registered." when message contains IX_Drivers_LicenseNumber', () => {
      const err = { error: 'Violation of UNIQUE KEY constraint IX_Drivers_LicenseNumber.' };
      const msg = (component as any).extractErrorMessage(err, 'Default message');
      expect(msg).toBe('Drivers_LicenseNumber is already registered.');
    });

    it('should return "Email already registered." when message contains IX_User_email through the IX check', () => {
      const err = { error: 'Violation of UNIQUE KEY constraint IX_User_email.' };
      const msg = (component as any).extractErrorMessage(err, 'Default message');
      expect(msg).toBe('Email already registered.');
    });

    it('should return "Fleet manager already exists for this location." when message contains Fleet manager already exists', () => {
      const err = {
        error: {
          StatusCode: 409,
          Message: 'Fleet manager already exists for location Bangalore Terminal'
        }
      };
      const msg = (component as any).extractErrorMessage(err, 'Default message');
      expect(msg).toBe('Fleet manager already exists for this location.');
    });

    it('should extract custom error Message property directly if present', () => {
      const err = {
        error: {
          StatusCode: 400,
          Message: 'Custom error from backend'
        }
      };
      const msg = (component as any).extractErrorMessage(err, 'Default message');
      expect(msg).toBe('Custom error from backend');
    });

    it('should return "Internal server error. Please try again later." for status 500', () => {
      const err = { status: 500 };
      const msg = (component as any).extractErrorMessage(err, 'Default message');
      expect(msg).toBe('Internal server error. Please try again later.');
    });

    it('should return network connection error for status 0', () => {
      const err = { status: 0 };
      const msg = (component as any).extractErrorMessage(err, 'Default message');
      expect(msg).toContain('Cannot connect to the server');
    });

    it('should ignore statusText "OK" and fall back to the default message', () => {
      const err = { statusText: 'OK' };
      const msg = (component as any).extractErrorMessage(err, 'Default message');
      expect(msg).toBe('Default message');
    });
  });

  describe('Locations loading', () => {
    it('should filter inactive locations using activeLocations computed signal', () => {
      const mockLocations = [
        { id: '1', location: 'Active Loc 1', isActive: true },
        { id: '2', location: 'Inactive Loc', isActive: false },
        { id: '3', location: 'Active Loc 2', isActive: true }
      ];
      
      component.locations.set(mockLocations);
      
      expect(component.activeLocations()).toEqual([
        { id: '1', location: 'Active Loc 1', isActive: true },
        { id: '3', location: 'Active Loc 2', isActive: true }
      ]);
    });
  });

  describe('onRegister', () => {
    it('should include currentLocationId and null routeLocationId in the payload when role is Driver', () => {
      const authService = TestBed.inject(AuthService);
      const registerSpy = vi.spyOn(authService, 'register').mockReturnValue(of({}));

      component.firstName.set('John');
      component.lastName.set('Doe');
      component.email.set('john.doe@example.com');
      component.password.set('Test1234!');
      component.role.set('Driver');
      component.licenseNumber.set('AB12345');
      component.selectedLocationId.set('loc-driver-123');

      component.onRegister();

      expect(registerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'Driver',
          routeLocationId: null,
          currentLocationId: 'loc-driver-123',
          licenseNumber: 'AB12345'
        })
      );
    });

    it('should include routeLocationId and null currentLocationId in the payload when role is FleetManager', () => {
      const authService = TestBed.inject(AuthService);
      const registerSpy = vi.spyOn(authService, 'register').mockReturnValue(of({}));

      component.firstName.set('Jane');
      component.lastName.set('Doe');
      component.email.set('jane.doe@example.com');
      component.password.set('Test1234!');
      component.role.set('FleetManager');
      component.selectedLocationId.set('loc-mgr-123');

      component.onRegister();

      expect(registerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'FleetManager',
          routeLocationId: 'loc-mgr-123',
          currentLocationId: null,
          licenseNumber: null
        })
      );
    });
  });
});
