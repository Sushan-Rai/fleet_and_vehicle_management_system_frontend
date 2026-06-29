import { createAction, props } from '@ngrx/store';
import { 
  Vehicle, 
  VehicleModel, 
  VehicleRequest, 
  VehicleResponsePagedResponse, 
  VehicleModelResponsePagedResponse 
} from '../../models/vehicle.model';

// Load Vehicles Actions
export const loadVehicles = createAction(
  '[Vehicles] Load Vehicles',
  props<{ filters?: any }>()
);

export const loadVehiclesSuccess = createAction(
  '[Vehicles] Load Vehicles Success',
  props<{ response: VehicleResponsePagedResponse }>()
);

export const loadVehiclesFailure = createAction(
  '[Vehicles] Load Vehicles Failure',
  props<{ error: any }>()
);

// Load Vehicle Models Actions
export const loadVehicleModels = createAction(
  '[Vehicles] Load Vehicle Models'
);

export const loadVehicleModelsSuccess = createAction(
  '[Vehicles] Load Vehicle Models Success',
  props<{ response: VehicleModelResponsePagedResponse }>()
);

export const loadVehicleModelsFailure = createAction(
  '[Vehicles] Load Vehicle Models Failure',
  props<{ error: any }>()
);

// Add Vehicle Actions
export const addVehicle = createAction(
  '[Vehicles] Add Vehicle',
  props<{ request: VehicleRequest }>()
);

export const addVehicleSuccess = createAction(
  '[Vehicles] Add Vehicle Success',
  props<{ vehicle: Vehicle }>()
);

export const addVehicleFailure = createAction(
  '[Vehicles] Add Vehicle Failure',
  props<{ error: any }>()
);

// Filter Actions
export const updateSearchTerm = createAction(
  '[Vehicles] Update Search Term',
  props<{ searchTerm: string }>()
);

export const updateSelectedStatus = createAction(
  '[Vehicles] Update Selected Status',
  props<{ selectedStatus: string }>()
);

export const updateSelectedCategory = createAction(
  '[Vehicles] Update Selected Category',
  props<{ selectedCategory: string }>()
);
