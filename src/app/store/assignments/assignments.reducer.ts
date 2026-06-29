import { createReducer, on } from '@ngrx/store';
import { VehicleAssignment } from '../../models/assignment.model';
import * as AssignmentsActions from './assignments.actions';

export interface AssignmentsState {
  assignments: VehicleAssignment[];
  filter: 'All' | 'Scheduled' | 'InTransit';
  loading: boolean;
  error: any;
}

export const initialAssignmentsState: AssignmentsState = {
  assignments: [],
  filter: 'All',
  loading: false,
  error: null
};

export const assignmentsReducer = createReducer(
  initialAssignmentsState,

  // Load Assignments
  on(AssignmentsActions.loadAssignments, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  on(AssignmentsActions.loadAssignmentsSuccess, (state, { assignments }) => ({
    ...state,
    assignments: assignments || [],
    loading: false
  })),
  on(AssignmentsActions.loadAssignmentsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Create Assignment
  on(AssignmentsActions.createAssignment, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  on(AssignmentsActions.createAssignmentSuccess, (state, { assignment }) => ({
    ...state,
    assignments: [assignment, ...state.assignments],
    loading: false
  })),
  on(AssignmentsActions.createAssignmentFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Accept Assignment
  on(AssignmentsActions.acceptAssignment, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  on(AssignmentsActions.acceptAssignmentSuccess, (state, { assignment }) => ({
    ...state,
    assignments: state.assignments.map((a) => a.id === assignment.id ? assignment : a),
    loading: false
  })),
  on(AssignmentsActions.acceptAssignmentFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Reject Assignment
  on(AssignmentsActions.rejectAssignment, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  on(AssignmentsActions.rejectAssignmentSuccess, (state, { assignment }) => ({
    ...state,
    assignments: state.assignments.map((a) => a.id === assignment.id ? assignment : a),
    loading: false
  })),
  on(AssignmentsActions.rejectAssignmentFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Arrive Assignment
  on(AssignmentsActions.arriveAssignment, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  on(AssignmentsActions.arriveAssignmentSuccess, (state, { assignment }) => ({
    ...state,
    assignments: state.assignments.map((a) => a.id === assignment.id ? assignment : a),
    loading: false
  })),
  on(AssignmentsActions.arriveAssignmentFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Set Filter
  on(AssignmentsActions.setAssignmentFilter, (state, { filter }) => ({
    ...state,
    filter
  }))
);
