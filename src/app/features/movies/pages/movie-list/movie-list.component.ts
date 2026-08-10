import { Component, computed, DestroyRef, ElementRef, inject, NgZone, signal, viewChild, viewChildren } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MovieCardComponent } from '../../../../shared/components/movie-card/movie-card.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { MovieService } from '../../services/movie.service';
import { TmdbMovie, MovieCategory } from '../../../../core/models/movie.model';

interface CategoryTab {
  label: string;
  category: MovieCategory;
  icon: string;
}

@Component({
  selector: 'app-movie-list',
  imports: [MatIcon, MovieCardComponent, LoadingSpinnerComponent, EmptyStateComponent],
  templateUrl: './movie-list.component.html',
  styleUrl: './movie-list.component.scss',
})
export class MovieListComponent {
  private readonly movieService = inject(MovieService);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

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

  protected readonly searchQuery = signal('');
  protected readonly isSearching = computed(() => this.searchQuery().trim().length >= 2);
  protected readonly searchResults = signal<TmdbMovie[]>([]);
  protected readonly searchTotalResults = signal(0);
  protected readonly searchLoading = signal(false);
  protected readonly hasSearched = signal(false);
  private searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  private readonly tabBarEl = viewChild<ElementRef<HTMLElement>>('tabBar');
  private readonly tabButtonEls = viewChildren<ElementRef<HTMLButtonElement>>('tabBtn');

  constructor() {
    const initialQuery = this.route.snapshot.queryParamMap.get('q');
    if (initialQuery && initialQuery.trim().length >= 2) {
      this.searchQuery.set(initialQuery);
      this.performSearch(initialQuery);
    } else {
      this.loadMovies();
    }
    this.setupScrollListener();
    this.destroyRef.onDestroy(() => clearTimeout(this.searchDebounceTimer));
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
    this.scrollActiveTabIntoView(index);
  }

  private scrollActiveTabIntoView(index: number): void {
    const container = this.tabBarEl()?.nativeElement;
    const button = this.tabButtonEls()[index]?.nativeElement;
    if (!container || !button) return;

    const targetLeft = button.offsetLeft - (container.clientWidth - button.clientWidth) / 2;
    container.scrollLeft = Math.max(0, targetLeft);
  }

  private loadMoreIfPossible(): void {
    if (this.isSearching() || this.loading() || this.page() >= this.totalPages()) return;
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

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.updateQueryParam(value);
    clearTimeout(this.searchDebounceTimer);

    const query = value.trim();
    if (query.length < 2) {
      this.searchResults.set([]);
      this.hasSearched.set(false);
      this.searchLoading.set(false);
      return;
    }

    this.searchDebounceTimer = setTimeout(() => this.performSearch(query), 400);
  }

  private performSearch(query: string): void {
    this.searchLoading.set(true);
    this.hasSearched.set(true);

    this.movieService.search(query).subscribe({
      next: result => {
        this.searchResults.set(result.results);
        this.searchTotalResults.set(result.total_results);
        this.searchLoading.set(false);
      },
      error: () => {
        this.searchResults.set([]);
        this.searchLoading.set(false);
      },
    });
  }

  private updateQueryParam(query: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: query.trim() || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.hasSearched.set(false);
    this.updateQueryParam('');
  }
}
