import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { VehicleService } from '../../services/vehicle.service';
import * as VehiclesActions from './vehicles.actions';

@Injectable()
export class VehiclesEffects {
  private readonly actions$ = inject(Actions);
  private readonly vehicleService = inject(VehicleService);

  loadVehicles$ = createEffect(() =>
    this.actions$.pipe(
      ofType(VehiclesActions.loadVehicles),
      mergeMap((action) =>
        this.vehicleService.getVehicles(action.filters).pipe(
          map((response) => VehiclesActions.loadVehiclesSuccess({ response })),
          catchError((error) => of(VehiclesActions.loadVehiclesFailure({ error })))
        )
      )
    )
  );

  loadVehicleModels$ = createEffect(() =>
    this.actions$.pipe(
      ofType(VehiclesActions.loadVehicleModels),
      mergeMap(() =>
        this.vehicleService.getVehicleModels().pipe(
          map((response) => VehiclesActions.loadVehicleModelsSuccess({ response })),
          catchError((error) => of(VehiclesActions.loadVehicleModelsFailure({ error })))
        )
      )
    )
  );

  addVehicle$ = createEffect(() =>
    this.actions$.pipe(
      ofType(VehiclesActions.addVehicle),
      mergeMap((action) =>
        this.vehicleService.createVehicle(action.request).pipe(
          map((vehicle) => VehiclesActions.addVehicleSuccess({ vehicle })),
          catchError((error) => of(VehiclesActions.addVehicleFailure({ error })))
        )
      )
    )
  );
}
