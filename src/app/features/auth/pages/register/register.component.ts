import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormField, MatLabel, MatError, MatHint } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';

function passwordMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
  const password = control.get('password');
  const confirm = control.get('confirmPassword');
  if (password && confirm && password.value !== confirm.value) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-register',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormField,
    MatLabel,
    MatError,
    MatHint,
    MatInput,
    MatButton,
    MatIconButton,
    MatIcon,
    MatProgressSpinner,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  protected readonly showPassword = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group(
    {
      displayName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      username: [
        '',
        [Validators.required, Validators.minLength(3), Validators.maxLength(30), Validators.pattern(/^[a-zA-Z0-9_]+$/)],
      ],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator },
  );

  protected get isLoading(): boolean {
    return this.authService.isLoading();
  }

  protected togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.error.set(null);
    const { displayName, username, email, password } = this.form.getRawValue();

    this.authService.register({ displayName, username, email, password }).subscribe({
      next: () => {
        this.notifications.success('Account aangemaakt! Welkom bij FilmMaatjes 🎬');
        this.router.navigate(['/dashboard']);
      },
      error: err => {
        const message = err?.error?.message ?? 'Aanmelden mislukt. Probeer het opnieuw.';
        this.error.set(message);
      },
    });
  }
}
