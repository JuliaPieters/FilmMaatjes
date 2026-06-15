import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { LandingComponent } from './pages/landing/landing.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then(r => r.authRoutes),
  },
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        component: LandingComponent,
      },
      {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [authGuard],
      },
      {
        path: 'movies',
        loadChildren: () =>
          import('./features/movies/movies.routes').then(r => r.moviesRoutes),
      },
      {
        path: 'watchlists',
        loadChildren: () =>
          import('./features/watchlists/watchlists.routes').then(r => r.watchlistsRoutes),
        canActivate: [authGuard],
      },
      {
        path: 'friends',
        loadChildren: () =>
          import('./features/friends/friends.routes').then(r => r.friendsRoutes),
        canActivate: [authGuard],
      },
      {
        path: 'roulette',
        loadChildren: () =>
          import('./features/movie-roulette/movie-roulette.routes').then(r => r.rouletteRoutes),
      },
      {
        path: 'profile',
        loadChildren: () =>
          import('./features/profile/profile.routes').then(r => r.profileRoutes),
        canActivate: [authGuard],
      },
      {
        path: 'recommendations',
        loadChildren: () =>
          import('./features/recommendations/recommendations.routes').then(r => r.recommendationsRoutes),
        canActivate: [authGuard],
      },
      {
        path: 'matcher',
        loadChildren: () =>
          import('./features/matcher/matcher.routes').then(r => r.matcherRoutes),
        canActivate: [authGuard],
      },
      {
        path: '**',
        component: NotFoundComponent,
      },
    ],
  },
];
