import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../features/auth/services/auth.service';
import { auth } from '../firebase';

export const guestGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await auth.authStateReady();

  if (!authService.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/dashboard']);
};
