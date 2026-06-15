import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { WatchlistService } from '../../services/watchlist.service';
import { Watchlist } from '../../../../core/models/watchlist.model';
import { MovieCardComponent } from '../../../../shared/components/movie-card/movie-card.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-watchlist-detail',
  imports: [RouterLink, MatIcon, MatButton, MatIconButton, MovieCardComponent, EmptyStateComponent],
  template: `
    <div class="page-container">
      <div class="flex items-center gap-3 mb-6">
        <a mat-icon-button routerLink="/watchlists">
          <mat-icon>arrow_back</mat-icon>
        </a>
        <div class="flex-1 min-w-0">
          <h1 class="text-3xl font-bold text-text-primary tracking-tight truncate">
            {{ watchlist()?.name ?? 'Watchlist' }}
          </h1>
          @if (watchlist()?.description) {
            <p class="text-text-secondary text-sm mt-1">{{ watchlist()!.description }}</p>
          }
        </div>
        <span class="text-text-muted text-sm whitespace-nowrap">
          {{ movies().length }} film{{ movies().length === 1 ? '' : 's' }}
        </span>
      </div>

      @if (!watchlist()) {
        <div class="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <mat-icon class="text-text-muted" style="font-size: 4rem; width: 4rem; height: 4rem;">bookmark_border</mat-icon>
          <p class="text-text-secondary">Watchlist niet gevonden.</p>
          <a mat-stroked-button routerLink="/watchlists">Terug naar watchlists</a>
        </div>
      } @else if (movies().length === 0) {
        <app-empty-state
          icon="movie"
          title="Nog geen films"
          description="Voeg films toe via de filmdetailpagina of de filmkaarten op de overzichtspagina."
          actionLabel="Films bladeren"
          actionLink="/movies"
        />
      } @else {
        <div class="card-grid">
          @for (entry of movies(); track entry.movieId) {
            @if (entry.movie) {
              <div class="relative group">
                <app-movie-card [movie]="entry.movie" />
                <button
                  class="remove-btn"
                  (click)="removeMovie(entry.movieId)"
                  title="Verwijderen uit lijst"
                >
                  <mat-icon style="font-size: 1rem; width: 1rem; height: 1rem;">close</mat-icon>
                </button>
              </div>
            }
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .remove-btn {
      position: absolute;
      top: 6px;
      left: 6px;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: none;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      color: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.15s;
      z-index: 2;
    }

    .group:hover .remove-btn {
      opacity: 1;
    }
  `],
})
export class WatchlistDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly watchlistService = inject(WatchlistService);
  private readonly notifications = inject(NotificationService);

  private readonly id = signal<string>('');

  protected readonly watchlist = computed<Watchlist | undefined>(() =>
    this.watchlistService.watchlists().find(wl => wl.id === this.id()),
  );

  protected readonly movies = computed(() => this.watchlist()?.movies ?? []);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/watchlists']);
      return;
    }
    this.id.set(id);
  }

  protected removeMovie(movieId: number): void {
    const wl = this.watchlist();
    if (!wl) return;
    this.watchlistService.removeMovie(wl.id, movieId).subscribe({
      next: () => this.notifications.success('Film verwijderd uit watchlist'),
    });
  }
}
