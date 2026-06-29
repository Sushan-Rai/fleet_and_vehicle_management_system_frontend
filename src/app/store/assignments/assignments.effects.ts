import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { AssignmentsService } from '../../services/assignments.service';
import * as AssignmentsActions from './assignments.actions';

@Injectable()
export class AssignmentsEffects {
  private readonly actions$ = inject(Actions);
  private readonly assignmentsService = inject(AssignmentsService);

  public readonly loadAssignments$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssignmentsActions.loadAssignments),
      mergeMap(({ searchTerm }) =>
        this.assignmentsService.getAssignments({ searchTerm }).pipe(
          map((assignments) => AssignmentsActions.loadAssignmentsSuccess({ assignments })),
          catchError((error) => of(AssignmentsActions.loadAssignmentsFailure({ error })))
        )
      )
    )
  );

  public readonly createAssignment$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssignmentsActions.createAssignment),
      mergeMap(({ request }) =>
        this.assignmentsService.createAssignment(request).pipe(
          map((assignment) => AssignmentsActions.createAssignmentSuccess({ assignment })),
          catchError((error) => of(AssignmentsActions.createAssignmentFailure({ error })))
        )
      )
    )
  );

  public readonly acceptAssignment$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssignmentsActions.acceptAssignment),
      mergeMap(({ request }) =>
        this.assignmentsService.acceptAssignment(request).pipe(
          map((assignment) => AssignmentsActions.acceptAssignmentSuccess({ assignment })),
          catchError((error) => of(AssignmentsActions.acceptAssignmentFailure({ error })))
        )
      )
    )
  );

  public readonly rejectAssignment$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssignmentsActions.rejectAssignment),
      mergeMap(({ request }) =>
        this.assignmentsService.rejectAssignment(request).pipe(
          map((assignment) => AssignmentsActions.rejectAssignmentSuccess({ assignment })),
          catchError((error) => of(AssignmentsActions.rejectAssignmentFailure({ error })))
        )
      )
    )
  );

  public readonly arriveAssignment$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssignmentsActions.arriveAssignment),
      mergeMap(({ request }) =>
        this.assignmentsService.arriveAssignment(request).pipe(
          map((assignment) => AssignmentsActions.arriveAssignmentSuccess({ assignment })),
          catchError((error) => of(AssignmentsActions.arriveAssignmentFailure({ error })))
        )
      )
    )
  );
}
