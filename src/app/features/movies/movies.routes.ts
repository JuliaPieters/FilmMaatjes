import { Routes } from '@angular/router';

export const moviesRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/movie-list/movie-list.component').then(c => c.MovieListComponent),
  },
  {
    path: 'search',
    loadComponent: () =>
      import('./pages/search/search.component').then(c => c.SearchComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/movie-detail/movie-detail.component').then(c => c.MovieDetailComponent),
  },
];
