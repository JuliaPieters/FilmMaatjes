import { Routes } from '@angular/router';

export const friendsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/friends-overview/friends-overview.component').then(
        c => c.FriendsOverviewComponent,
      ),
  },
];
