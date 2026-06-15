import { Routes } from '@angular/router';

export const rouletteRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/roulette/roulette.component').then(c => c.RouletteComponent),
  },
];
