import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { AuthService } from '../../features/auth/services/auth.service';

@Component({
  selector: 'app-bottom-tab-bar',
  imports: [RouterLink, RouterLinkActive, MatIcon],
  templateUrl: './bottom-tab-bar.component.html',
  styleUrl: './bottom-tab-bar.component.scss',
})
export class BottomTabBarComponent {
  protected readonly authService = inject(AuthService);

  protected readonly tabs = [
    { label: 'Films', icon: 'movie', route: '/movies' },
    { label: 'Roulette', icon: 'casino', route: '/roulette' },
    { label: 'Matcher', icon: 'favorite', route: '/matcher' },
    { label: 'Lijsten', icon: 'bookmark', route: '/watchlists' },
    { label: 'Vrienden', icon: 'people', route: '/friends' },
  ];
}
