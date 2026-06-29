import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { signal } from '@angular/core';
import { AlertsService } from './alerts.service';
import { AuthService } from './auth.service';

describe('AlertsService', () => {
  let service: AlertsService;
  let httpClientMock: any;
  let authServiceMock: any;

  beforeEach(() => {
    httpClientMock = {
      get: vi.fn().mockReturnValue(of([])),
      put: vi.fn().mockReturnValue(of({}))
    };

    authServiceMock = {
      apiUrl: () => 'https://localhost:7136/api/v1',
      currentUser: signal({ token: 'mock-token', email: 'manager@example.com', role: 'FleetManager' })
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: HttpClient, useValue: httpClientMock },
        { provide: AuthService, useValue: authServiceMock }
      ]
    });
    service = TestBed.inject(AlertsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
