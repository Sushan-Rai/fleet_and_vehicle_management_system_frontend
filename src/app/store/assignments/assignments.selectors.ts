import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AssignmentsState } from './assignments.reducer';

export const selectAssignmentsState = createFeatureSelector<AssignmentsState>('assignments');

export const selectAssignmentsList = createSelector(
  selectAssignmentsState,
  (state) => state.assignments
);

export const selectAssignmentsFilter = createSelector(
  selectAssignmentsState,
  (state) => state.filter
);

export const selectAssignmentsLoading = createSelector(
  selectAssignmentsState,
  (state) => state.loading
);

export const selectAssignmentsError = createSelector(
  selectAssignmentsState,
  (state) => state.error
);

// Active Assignments: filters only active trips (Scheduled & In Transit)
export const selectActiveAssignments = createSelector(
  selectAssignmentsList,
  selectAssignmentsFilter,
  (assignments, filter) => {
    const isScheduled = (s: string) => s.toLowerCase() === 'scheduled';
    const isInTransit = (s: string) => {
      const lower = s.toLowerCase();
      return lower === 'in transit' || lower === 'intransit' || lower === 'accepted';
    };

    let active = assignments.filter((a) => isScheduled(a.status) || isInTransit(a.status));

    if (filter === 'Scheduled') {
      active = active.filter((a) => isScheduled(a.status));
    } else if (filter === 'InTransit') {
      active = active.filter((a) => isInTransit(a.status));
    }

    return active;
  }
);

// History Assignments: completed & rejected
export const selectHistoryAssignments = createSelector(
  selectAssignmentsList,
  (assignments) => {
    return assignments.filter((a) => {
      const lower = a.status.toLowerCase();
      return lower === 'completed' || lower === 'rejected';
    });
  }
);
