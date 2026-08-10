import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-bottom-tab-bar',
  imports: [RouterLink, RouterLinkActive, MatIcon],
  template: `
    <nav class="tab-bar">
      @for (tab of tabs; track tab.route) {
        <a
          [routerLink]="tab.route"
          routerLinkActive="tab-active"
          [routerLinkActiveOptions]="{ exact: tab.exact }"
          class="tab-item"
        >
          <mat-icon class="tab-icon">{{ tab.icon }}</mat-icon>
          <span class="tab-label">{{ tab.label }}</span>
        </a>
      }
    </nav>
  `,
  styles: [`
    .tab-bar {
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 100;
      background: rgba(15, 15, 19, 0.94);
      backdrop-filter: blur(12px);
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding: 8px 8px calc(8px + env(safe-area-inset-bottom));
      grid-template-columns: repeat(5, 1fr);

      @media (max-width: 767px) {
        display: grid;
      }
    }

    .tab-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      min-height: 48px;
      border-radius: 10px;
      color: #64748b;
      text-decoration: none;
      transition: background 0.15s, color 0.15s;
    }

    .tab-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
      font-variation-settings: 'FILL' 0;
    }

    .tab-label {
      font-size: 10px;
      font-weight: 500;
    }

    .tab-active {
      color: #a78bfa;
      background: rgba(124, 58, 237, 0.12);

      .tab-icon {
        font-variation-settings: 'FILL' 1;
      }
    }
  `],
})
export class BottomTabBarComponent {
  protected readonly tabs = [
    { label: 'Films', icon: 'movie', route: '/movies', exact: false },
    { label: 'Zoeken', icon: 'search', route: '/movies/search', exact: false },
    { label: 'Lijsten', icon: 'bookmark', route: '/watchlists', exact: false },
    { label: 'Vrienden', icon: 'people', route: '/friends', exact: false },
    { label: 'Profiel', icon: 'person', route: '/profile', exact: false },
  ];
}
