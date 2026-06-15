import { Component, computed, DestroyRef, inject, NgZone, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { MovieCardComponent } from '../../../../shared/components/movie-card/movie-card.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { MovieService } from '../../services/movie.service';
import { TmdbMovie, MovieCategory } from '../../../../core/models/movie.model';

interface CategoryTab {
  label: string;
  category: MovieCategory;
  icon: string;
}

@Component({
  selector: 'app-movie-list',
  imports: [MatIcon, RouterLink, MovieCardComponent, LoadingSpinnerComponent],
  templateUrl: './movie-list.component.html',
  styleUrl: './movie-list.component.scss',
})
export class MovieListComponent {
  private readonly movieService = inject(MovieService);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tabs: CategoryTab[] = [
    { label: 'Trending', category: 'trending', icon: 'trending_up' },
    { label: 'Populair', category: 'popular', icon: 'whatshot' },
    { label: 'Hoogst gewaardeerd', category: 'top_rated', icon: 'star' },
    { label: 'Binnenkort', category: 'upcoming', icon: 'schedule' },
    { label: 'Nu te zien', category: 'now_playing', icon: 'play_circle' },
  ];

  protected readonly selectedTab = signal(0);
  private readonly _movies = signal<TmdbMovie[]>([]);
  protected readonly movies = computed(() => this._movies());
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly hasApiKey = this.movieService.hasApiKey();

  constructor() {
    this.loadMovies();
    this.setupScrollListener();
  }

  private setupScrollListener(): void {
    let ticking = false;

    const handler = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrolled = window.scrollY + window.innerHeight;
        const total = document.documentElement.scrollHeight;
        if (total - scrolled < 600) {
          this.zone.run(() => this.loadMoreIfPossible());
        }
        ticking = false;
      });
    };

    this.zone.runOutsideAngular(() => {
      window.addEventListener('scroll', handler, { passive: true });
      this.destroyRef.onDestroy(() => window.removeEventListener('scroll', handler));
    });
  }

  protected onTabChange(index: number): void {
    this.selectedTab.set(index);
    this.page.set(1);
    this._movies.set([]);
    this.loadMovies();
  }

  private loadMoreIfPossible(): void {
    if (this.loading() || this.page() >= this.totalPages()) return;
    this.page.update(p => p + 1);
    this.loadMovies();
  }

  protected loadMovies(): void {
    if (!this.hasApiKey) return;

    const category = this.tabs[this.selectedTab()].category;
    this.loading.set(true);
    this.error.set(null);

    this.movieService.getMoviesByCategory(category, this.page()).subscribe({
      next: result => {
        const existingIds = new Set(this._movies().map(m => m.id));
        const fresh = result.results.filter(m => !existingIds.has(m.id));
        if (fresh.length > 0) {
          this._movies.update(prev => [...prev, ...fresh]);
        }
        this.totalPages.set(result.total_pages);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Films konden niet worden geladen.');
        this.loading.set(false);
      },
    });
  }
}
