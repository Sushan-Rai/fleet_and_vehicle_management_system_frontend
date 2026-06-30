import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { guestGuard } from './guest.guard';
import { AuthService } from '../services/auth.service';
import { signal } from '@angular/core';
import { vi } from 'vitest';

describe('guestGuard', () => {
  let authServiceMock: any;
  let routerMock: any;

  beforeEach(() => {
    authServiceMock = {
      isAuthenticated: signal(false)
    };
    routerMock = {
      navigate: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });
  });

  it('should allow activation when not authenticated', () => {
    authServiceMock.isAuthenticated.set(false);
    const result = TestBed.runInInjectionContext(() => guestGuard(null as any, null as any));
    expect(result).toBe(true);
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('should deny activation and redirect to /vehicles when authenticated', () => {
    authServiceMock.isAuthenticated.set(true);
    const result = TestBed.runInInjectionContext(() => guestGuard(null as any, null as any));
    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/vehicles']);
  });
});
