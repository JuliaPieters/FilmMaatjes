import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.snackBar.open(message, undefined, {
      duration: 3000,
      panelClass: ['notification-success'],
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
    });
  }

  error(message: string): void {
    this.snackBar.open(message, 'Sluiten', {
      duration: 5000,
      panelClass: ['notification-error'],
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
    });
  }

  info(message: string): void {
    this.snackBar.open(message, undefined, {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
    });
  }
}
