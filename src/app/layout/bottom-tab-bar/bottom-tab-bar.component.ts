import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-bottom-tab-bar',
  imports: [RouterLink, RouterLinkActive, MatIcon],
  templateUrl: './bottom-tab-bar.component.html',
  styleUrl: './bottom-tab-bar.component.scss',
})
export class BottomTabBarComponent {
  protected readonly tabs = [
    { label: 'Films', icon: 'movie', route: '/movies', exact: false },
    { label: 'Roulette', icon: 'casino', route: '/roulette', exact: false },
    { label: 'Matcher', icon: 'favorite', route: '/matcher', exact: false },
    { label: 'Lijsten', icon: 'bookmark', route: '/watchlists', exact: false },
    { label: 'Vrienden', icon: 'people', route: '/friends', exact: false },
  ];
}
