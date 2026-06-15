import { Routes } from '@angular/router';

export const watchlistsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/watchlist-overview/watchlist-overview.component').then(
        c => c.WatchlistOverviewComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/watchlist-detail/watchlist-detail.component').then(
        c => c.WatchlistDetailComponent,
      ),
  },
];
