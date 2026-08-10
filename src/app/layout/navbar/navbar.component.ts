import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatMenu, MatMenuTrigger, MatMenuItem } from '@angular/material/menu';
import { MatDivider } from '@angular/material/divider';
import { MatTooltip } from '@angular/material/tooltip';
import { MatBadge } from '@angular/material/badge';
import { AuthService } from '../../features/auth/services/auth.service';
import { FriendActivityService } from '../../core/services/friend-activity.service';

@Component({
  selector: 'app-navbar',
  imports: [
    RouterLink,
    RouterLinkActive,
    MatIcon,
    MatIconButton,
    MatButton,
    MatMenu,
    MatMenuTrigger,
    MatMenuItem,
    MatDivider,
    MatTooltip,
    MatBadge,
  ],
  providers: [DatePipe],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  protected readonly authService = inject(AuthService);
  protected readonly activityService = inject(FriendActivityService);
  private readonly datePipe = inject(DatePipe);
  private readonly router = inject(Router);

  protected readonly searchOpen = signal(false);

  protected toggleSearch(): void {
    this.searchOpen() ? this.closeSearch() : this.searchOpen.set(true);
  }

  protected closeSearch(): void {
    this.searchOpen.set(false);
  }

  protected submitSearch(query: string): void {
    if (!query.trim()) return;
    this.router.navigate(['/movies/search'], { queryParams: { q: query.trim() } });
    this.closeSearch();
  }

  protected markNotificationsSeen(): void {
    this.activityService.markAllSeen();
  }

  protected formatActivityTime(createdAt: string): string {
    const date = new Date(createdAt);
    const now = new Date();
    const isToday = date.getFullYear() === now.getFullYear()
      && date.getMonth() === now.getMonth()
      && date.getDate() === now.getDate();

    return isToday
      ? `Vandaag, ${this.datePipe.transform(date, 'HH:mm')}`
      : this.datePipe.transform(date, 'd MMM yyyy') ?? '';
  }

  protected logout(): void {
    this.authService.logout();
  }

  protected readonly navLinks = [
    { label: 'Films', route: '/movies', icon: 'movie' },
    { label: 'Roulette', route: '/roulette', icon: 'casino' },
    { label: 'Matcher', route: '/matcher', icon: 'favorite' },
    { label: 'Vrienden', route: '/friends', icon: 'people' },
  ];
}
