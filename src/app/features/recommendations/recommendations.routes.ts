import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const recommendationsRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/recommendations/recommendations.component').then(
        m => m.RecommendationsComponent,
      ),
  },
];
