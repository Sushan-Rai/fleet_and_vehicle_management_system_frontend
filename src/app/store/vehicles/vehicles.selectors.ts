import { createFeatureSelector, createSelector } from '@ngrx/store';
import { VehiclesState } from './vehicles.reducer';
import { VehicleInventoryItem } from '../../models/vehicle.model';

export const selectVehiclesState = createFeatureSelector<VehiclesState>('vehicles');

export const selectVehiclesList = createSelector(
  selectVehiclesState,
  (state) => state.vehicles
);

export const selectVehicleModelsList = createSelector(
  selectVehiclesState,
  (state) => state.models
);

export const selectVehiclesLoading = createSelector(
  selectVehiclesState,
  (state) => state.loading
);

export const selectVehiclesError = createSelector(
  selectVehiclesState,
  (state) => state.error
);

export const selectVehiclesTotalCount = createSelector(
  selectVehiclesState,
  (state) => state.totalCount
);

/**
 * Maps vehicles to inventory items, joining model and category names from vehicle models list
 */
export const selectEnrichedVehicles = createSelector(
  selectVehiclesList,
  selectVehicleModelsList,
  (vehicles, models) => {
    return vehicles.map((vehicle): VehicleInventoryItem => {
      const model = models?.find((m) => m.id === vehicle.modelId);

      return {
        ...vehicle,
        modelName: model ? `${model.manufacturer} ${model.modelName}` : (vehicle.modelName || 'Not Available'),
        manufacturer: model ? model.manufacturer : 'Not Available',
        categoryName: model ? model.categoryName : (vehicle.categoryname || 'Not Available'),
      };
    });
  }
);

export const selectSearchTerm = createSelector(
  selectVehiclesState,
  (state) => state.searchTerm || ''
);

export const selectSelectedStatus = createSelector(
  selectVehiclesState,
  (state) => state.selectedStatus || ''
);

export const selectSelectedCategory = createSelector(
  selectVehiclesState,
  (state) => state.selectedCategory || ''
);
