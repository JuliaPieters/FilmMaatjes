import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MovieService } from '../../../movies/services/movie.service';
import { UserLibraryService } from '../../../../core/services/user-library.service';
import { TmdbMovie } from '../../../../core/models/movie.model';
import { MovieCardComponent } from '../../../../shared/components/movie-card/movie-card.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

interface RecommendationGroup {
  reason: string;
  icon: string;
  movies: TmdbMovie[];
}

@Component({
  selector: 'app-recommendations',
  imports: [MatIcon, MovieCardComponent, LoadingSpinnerComponent, EmptyStateComponent],
  template: `
    <div class="page-container">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-text-primary tracking-tight">Aanbevolen voor jou</h1>
        <p class="text-text-muted mt-1 rec-subtitle">
          @if (topGenres().length > 0) {
            Op basis van jouw kijkgeschiedenis en beoordelingen
          } @else {
            Populair onder filmliefhebbers
          }
        </p>
      </div>

      @if (loading()) {
        <app-loading-spinner message="Aanbevelingen laden..." />
      } @else if (groups().length === 0) {
        <app-empty-state
          icon="auto_awesome"
          title="Nog geen aanbevelingen"
          description="Beoordeel een paar films om gepersonaliseerde aanbevelingen te krijgen."
          actionLabel="Films ontdekken"
          actionRoute="/movies"
        />
      } @else {
        @for (group of groups(); track group.reason) {
          @if (group.movies.length > 0) {
            <section class="mb-10">
              <div class="flex items-center gap-2 mb-4">
                <mat-icon class="text-accent-light">{{ group.icon }}</mat-icon>
                <div>
                  <h2 class="section-title mb-0">{{ group.reason }}</h2>
                </div>
              </div>
              <div class="horizontal-scroll">
                @for (movie of group.movies; track movie.id) {
                  <app-movie-card [movie]="movie" [showActions]="true" />
                }
              </div>
            </section>
          }
        }
      }
    </div>
  `,
  styles: [`
    @media (max-width: 767px) {
      .rec-subtitle {
        font-size: 14px;
        color: var(--color-text-meta);
      }
    }
  `],
})
export class RecommendationsComponent {
  private readonly movieService = inject(MovieService);
  private readonly library = inject(UserLibraryService);

  protected readonly loading = signal(true);
  protected readonly groups = signal<RecommendationGroup[]>([]);

  protected readonly topGenres = computed(() =>
    this.library.getTopGenres({ minRating: 4, limit: 3 }),
  );

  constructor() {
    // Reactive: re-runs when Firestore ratings finish loading (ratedMovies changes)
    let lastGenreKey = '';
    effect(() => {
      const genres = this.topGenres();
      const key = genres.join(',');
      if (key === lastGenreKey) return; // no change, skip
      lastGenreKey = key;
      this.loadGroups(genres);
    });
  }

  private loadGroups(genres: number[]): void {
    this.loading.set(true);
    const watchedIds = new Set(this.library.watchedMovies().map(e => e.movieId));

    if (genres.length === 0) {
      this.movieService.getTopRated().subscribe({
        next: page => {
          this.groups.set([{
            reason: 'Hoog gewaardeerde films',
            icon: 'star',
            movies: page.results.filter(m => !watchedIds.has(m.id)).slice(0, 10),
          }]);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
      return;
    }

    let pending = genres.length;
    const result: RecommendationGroup[] = genres.map(() => ({ reason: '', icon: 'movie', movies: [] }));

    genres.forEach((genreId, i) => {
      this.movieService.discoverMovies({ with_genres: String(genreId), 'vote_average.gte': 6.5 }).subscribe({
        next: page => {
          result[i] = {
            reason: `Omdat je van ${this.movieService.getGenreName(genreId) ?? 'dit genre'} houdt`,
            icon: 'favorite',
            movies: page.results.filter(m => !watchedIds.has(m.id)).slice(0, 10),
          };
          pending--;
          if (pending === 0) {
            this.groups.set(result.filter(g => g.movies.length > 0));
            this.loading.set(false);
          }
        },
        error: () => {
          pending--;
          if (pending === 0) this.loading.set(false);
        },
      });
    });
  }
}
