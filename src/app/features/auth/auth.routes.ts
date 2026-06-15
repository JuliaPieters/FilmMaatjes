import { Routes } from '@angular/router';
import { guestGuard } from '../../core/guards/guest.guard';

export const authRoutes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/login/login.component').then(c => c.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/register/register.component').then(c => c.RegisterComponent),
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
