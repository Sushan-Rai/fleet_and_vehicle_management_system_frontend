import { createAction, props } from '@ngrx/store';
import { VehicleAssignment, VehicleAssignmentRequest, AcceptAssignmentRequest } from '../../models/assignment.model';

// Load Assignments
export const loadAssignments = createAction(
  '[Assignments] Load Assignments',
  props<{ searchTerm?: string }>()
);
export const loadAssignmentsSuccess = createAction(
  '[Assignments] Load Assignments Success',
  props<{ assignments: VehicleAssignment[] }>()
);
export const loadAssignmentsFailure = createAction(
  '[Assignments] Load Assignments Failure',
  props<{ error: any }>()
);

// Create Assignment
export const createAssignment = createAction(
  '[Assignments] Create Assignment',
  props<{ request: VehicleAssignmentRequest }>()
);
export const createAssignmentSuccess = createAction(
  '[Assignments] Create Assignment Success',
  props<{ assignment: VehicleAssignment }>()
);
export const createAssignmentFailure = createAction(
  '[Assignments] Create Assignment Failure',
  props<{ error: any }>()
);

// Accept Assignment
export const acceptAssignment = createAction(
  '[Assignments] Accept Assignment',
  props<{ request: AcceptAssignmentRequest }>()
);
export const acceptAssignmentSuccess = createAction(
  '[Assignments] Accept Assignment Success',
  props<{ assignment: VehicleAssignment }>()
);
export const acceptAssignmentFailure = createAction(
  '[Assignments] Accept Assignment Failure',
  props<{ error: any }>()
);

// Reject Assignment
export const rejectAssignment = createAction(
  '[Assignments] Reject Assignment',
  props<{ request: AcceptAssignmentRequest }>()
);
export const rejectAssignmentSuccess = createAction(
  '[Assignments] Reject Assignment Success',
  props<{ assignment: VehicleAssignment }>()
);
export const rejectAssignmentFailure = createAction(
  '[Assignments] Reject Assignment Failure',
  props<{ error: any }>()
);

// Arrive (Complete) Assignment
export const arriveAssignment = createAction(
  '[Assignments] Arrive Assignment',
  props<{ request: AcceptAssignmentRequest }>()
);
export const arriveAssignmentSuccess = createAction(
  '[Assignments] Arrive Assignment Success',
  props<{ assignment: VehicleAssignment }>()
);
export const arriveAssignmentFailure = createAction(
  '[Assignments] Arrive Assignment Failure',
  props<{ error: any }>()
);

// Filter
export const setAssignmentFilter = createAction(
  '[Assignments] Set Assignment Filter',
  props<{ filter: 'All' | 'Scheduled' | 'InTransit' }>()
);
