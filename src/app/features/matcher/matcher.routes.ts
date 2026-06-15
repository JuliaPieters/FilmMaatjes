import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const matcherRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/matcher/matcher.component').then(m => m.MatcherComponent),
  },
];
