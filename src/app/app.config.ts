import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { idempotencyInterceptor } from './interceptors/idempotency.interceptor';
import { vehiclesReducer } from './store/vehicles/vehicles.reducer';
import { VehiclesEffects } from './store/vehicles/vehicles.effects';
import { assignmentsReducer } from './store/assignments/assignments.reducer';
import { AssignmentsEffects } from './store/assignments/assignments.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, idempotencyInterceptor])),
    provideStore({ vehicles: vehiclesReducer, assignments: assignmentsReducer }),
    provideEffects([VehiclesEffects, AssignmentsEffects])
  ]
};

