import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { AuthService } from '../../services/auth.service';
import { VehicleService } from '../../services/vehicle.service';
import { DamageService } from '../../services/damage.service';
import { Vehicle } from '../../models/vehicle.model';

@Component({
  selector: 'app-damage',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NavbarComponent],
  templateUrl: './damage.component.html',
  styleUrl: './damage.component.css'
})
export class DamageComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly vehicleService = inject(VehicleService);
  private readonly damageService = inject(DamageService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  public damageForm!: FormGroup;
  public readonly isSubmitting = signal<boolean>(false);
  public readonly errorMessage = signal<string>('');
  public readonly successMessage = signal<string>('');
  public readonly vehicles = signal<Vehicle[]>([]);

  public readonly isDriver = computed(() => this.authService.userRole() === 'Driver');

  public ngOnInit(): void {
    const userRole = this.authService.userRole();
    const currentDriverId = userRole === 'Driver' ? (this.authService.currentUser()?.driverId || '') : '';

    this.damageForm = this.fb.group({
      vehicleId: ['', Validators.required],
      driverId: [currentDriverId],
      reportDate: [new Date().toISOString().substring(0, 10), Validators.required],
      description: ['', [Validators.required, Validators.minLength(5)]],
      estimatedRepairCost: [0, [Validators.required, Validators.min(0)]],
      driverDeductionScore: [0, [Validators.required, Validators.min(0), Validators.max(100)]]
    }, { validators: [this.reportDateValidator] });

    // Lock driverId for Driver roles
    if (userRole === 'Driver') {
      this.damageForm.get('driverId')?.disable();
      // Hide deduction score input from driver by disabling it or setting to 0
      this.damageForm.get('driverDeductionScore')?.disable();
    }

    // Load available active vehicles
    this.vehicleService.getVehicles({ PageSize: 1000 }).subscribe({
      next: (res) => {
        this.vehicles.set(res.data || []);
        // Check for query parameter
        this.route.queryParams.subscribe(params => {
          if (params['vehicleId']) {
            this.damageForm.patchValue({ vehicleId: params['vehicleId'] });
          }
        });
      },
      error: () => this.vehicles.set([])
    });
  }

  private reportDateValidator = (group: FormGroup): { [key: string]: boolean } | null => {
    const reportDate = group.get('reportDate')?.value;
    if (reportDate) {
      const inputDate = new Date(reportDate);
      const today = new Date();
      // Reset hours to compare only date
      inputDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      if (inputDate > today) {
        return { 'futureDate': true };
      }
    }
    return null;
  };

  public onSubmit(): void {
    if (this.damageForm.invalid) {
      this.damageForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const formValues = this.damageForm.getRawValue();
    const request = {
      vehicleId: formValues.vehicleId,
      driverId: formValues.driverId || null,
      reportDate: new Date(formValues.reportDate).toISOString(),
      description: formValues.description.trim(),
      estimatedRepairCost: Number(formValues.estimatedRepairCost),
      driverDeductionScore: Number(formValues.driverDeductionScore)
    };

    this.damageService.createDamage(request).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.successMessage.set('Damage reported successfully. Vehicle placed in Maintenance.');
        this.damageForm.reset({
          vehicleId: '',
          driverId: this.isDriver() ? (this.authService.currentUser()?.driverId || '') : '',
          reportDate: new Date().toISOString().substring(0, 10),
          description: '',
          estimatedRepairCost: 0,
          driverDeductionScore: 0
        });
        setTimeout(() => {
          this.router.navigate(['/vehicles']);
        }, 2000);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to report vehicle damage. Please check inputs.');
      }
    });
  }
}
