import { createReducer, on } from '@ngrx/store';
import { Vehicle, VehicleModel } from '../../models/vehicle.model';
import * as VehiclesActions from './vehicles.actions';

export interface VehiclesState {
  vehicles: Vehicle[];
  models: VehicleModel[];
  totalCount: number;
  loading: boolean;
  error: any;
  searchTerm: string;
  selectedStatus: string;
  selectedCategory: string;
}

export const initialVehiclesState: VehiclesState = {
  vehicles: [],
  models: [],
  totalCount: 0,
  loading: false,
  error: null,
  searchTerm: '',
  selectedStatus: '',
  selectedCategory: '',
};

export const vehiclesReducer = createReducer(
  initialVehiclesState,

  // Load Vehicles
  on(VehiclesActions.loadVehicles, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(VehiclesActions.loadVehiclesSuccess, (state, { response }) => ({
    ...state,
    vehicles: response.data || [],
    totalCount: response.totalCount || 0,
    loading: false,
  })),
  on(VehiclesActions.loadVehiclesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // Load Models
  on(VehiclesActions.loadVehicleModels, (state) => ({
    ...state,
    error: null,
  })),
  on(VehiclesActions.loadVehicleModelsSuccess, (state, { response }) => ({
    ...state,
    models: response.data || [],
  })),
  on(VehiclesActions.loadVehicleModelsFailure, (state, { error }) => ({
    ...state,
    error,
  })),

  // Add Vehicle
  on(VehiclesActions.addVehicle, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(VehiclesActions.addVehicleSuccess, (state, { vehicle }) => ({
    ...state,
    vehicles: [vehicle, ...state.vehicles],
    totalCount: state.totalCount + 1,
    loading: false,
  })),
  on(VehiclesActions.addVehicleFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  // Filter Updates
  on(VehiclesActions.updateSearchTerm, (state, { searchTerm }) => ({
    ...state,
    searchTerm
  })),
  on(VehiclesActions.updateSelectedStatus, (state, { selectedStatus }) => ({
    ...state,
    selectedStatus
  })),
  on(VehiclesActions.updateSelectedCategory, (state, { selectedCategory }) => ({
    ...state,
    selectedCategory
  }))
);
