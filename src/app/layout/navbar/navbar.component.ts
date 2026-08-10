import { Component, DestroyRef, inject, signal } from '@angular/core';
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
import { MovieService } from '../../features/movies/services/movie.service';
import { TmdbMovie } from '../../core/models/movie.model';

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
  protected readonly movieService = inject(MovieService);
  private readonly datePipe = inject(DatePipe);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly searchOpen = signal(false);
  protected readonly searchQuery = signal('');
  protected readonly searchResults = signal<TmdbMovie[]>([]);
  protected readonly searchTotalResults = signal(0);
  protected readonly searchLoading = signal(false);
  private searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.searchDebounceTimer));
  }

  protected toggleSearch(): void {
    this.searchOpen() ? this.closeSearch() : this.searchOpen.set(true);
  }

  protected closeSearch(): void {
    this.searchOpen.set(false);
    this.searchQuery.set('');
    this.searchResults.set([]);
  }

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    clearTimeout(this.searchDebounceTimer);

    const query = value.trim();
    if (query.length < 2) {
      this.searchResults.set([]);
      this.searchLoading.set(false);
      return;
    }

    this.searchLoading.set(true);
    this.searchDebounceTimer = setTimeout(() => {
      this.movieService.search(query).subscribe({
        next: result => {
          this.searchResults.set(result.results.slice(0, 5));
          this.searchTotalResults.set(result.total_results);
          this.searchLoading.set(false);
        },
        error: () => {
          this.searchResults.set([]);
          this.searchLoading.set(false);
        },
      });
    }, 350);
  }

  protected onPosterError(event: Event): void {
    (event.target as HTMLImageElement).src = '/assets/movie-placeholder.svg';
  }

  protected goToResult(movieId: number): void {
    this.router.navigate(['/movies', movieId]);
    this.closeSearch();
  }

  protected submitSearch(): void {
    const query = this.searchQuery().trim();
    if (!query) return;
    this.router.navigate(['/movies/search'], { queryParams: { q: query } });
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
