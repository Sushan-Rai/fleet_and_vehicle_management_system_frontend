import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { FuelService } from './fuel.service';
import { AuthService } from './auth.service';

describe('FuelService', () => {
  let service: FuelService;
  let httpClientMock: any;
  let authServiceMock: any;

  beforeEach(() => {
    httpClientMock = {
      get: vi.fn().mockReturnValue(of({ data: [], totalCount: 0 })),
      post: vi.fn().mockReturnValue(of({}))
    };

    authServiceMock = {
      apiUrl: () => 'https://localhost:7136/api/v1'
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: HttpClient, useValue: httpClientMock },
        { provide: AuthService, useValue: authServiceMock }
      ]
    });
    service = TestBed.inject(FuelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
