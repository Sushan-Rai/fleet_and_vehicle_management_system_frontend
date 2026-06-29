import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
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

    it('should extract custom message from err.error.Message if present', () => {
      const err = {
        error: {
          StatusCode: 400,
          Message: 'Password must contain uppercase letters.'
        }
      };
      const msg = (component as any).extractErrorMessage(err, 'Default message');
      expect(msg).toBe('Password must contain uppercase letters.');
    });
  });
});
