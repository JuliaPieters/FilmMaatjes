import { Component, DestroyRef, ElementRef, inject, NgZone, signal, viewChild, viewChildren } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { NgTemplateOutlet } from '@angular/common';
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

const MIN_QUERY_LENGTH = 2;

@Component({
  selector: 'app-movie-list',
  imports: [MatIcon, MatButton, NgTemplateOutlet, MovieCardComponent, LoadingSpinnerComponent, EmptyStateComponent],
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

  protected readonly hasApiKey = this.movieService.hasApiKey();

  // Categorieweergave
  protected readonly selectedTab = signal(0);
  protected readonly movies = signal<TmdbMovie[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly page = signal(1);
  private readonly totalPages = signal(1);
  private categorySub?: Subscription;

  // Zoekweergave
  protected readonly searchQuery = signal('');
  /** De query waarvoor de huidige resultaten gelden (los van wat er nog getypt wordt). */
  protected readonly activeQuery = signal('');
  protected readonly searchResults = signal<TmdbMovie[]>([]);
  protected readonly searchTotalResults = signal(0);
  protected readonly searchLoading = signal(false);
  protected readonly searchError = signal<string | null>(null);
  private readonly searchPage = signal(1);
  private readonly searchTotalPages = signal(1);
  private searchSub?: Subscription;
  private searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private readonly tabBarEl = viewChild<ElementRef<HTMLElement>>('tabBar');
  private readonly tabButtonEls = viewChildren<ElementRef<HTMLButtonElement>>('tabBtn');

  constructor() {
    const initialQuery = (this.route.snapshot.queryParamMap.get('q') ?? '').trim();
    if (initialQuery.length >= MIN_QUERY_LENGTH) {
      this.searchQuery.set(initialQuery);
      this.startSearch(initialQuery);
    } else {
      this.loadMovies();
    }
    this.setupScrollListener();
    this.destroyRef.onDestroy(() => {
      clearTimeout(this.searchDebounceTimer);
      this.categorySub?.unsubscribe();
      this.searchSub?.unsubscribe();
    });
  }

  protected isSearching(): boolean {
    return this.searchQuery().trim().length >= MIN_QUERY_LENGTH;
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

  private loadMoreIfPossible(): void {
    if (this.isSearching()) {
      if (this.searchLoading() || this.searchError() || this.searchPage() >= this.searchTotalPages()) return;
      if (this.activeQuery() !== this.searchQuery().trim()) return;
      this.searchPage.update(p => p + 1);
      this.fetchSearchPage();
      return;
    }
    if (this.loading() || this.error() || this.page() >= this.totalPages()) return;
    this.page.update(p => p + 1);
    this.loadMovies();
  }

  // ---- Categorieën ----

  protected onTabChange(index: number): void {
    if (index === this.selectedTab() && this.movies().length > 0) return;
    this.selectedTab.set(index);
    this.resetCategory();
    this.loadMovies();
    this.scrollActiveTabIntoView(index);
  }

  private resetCategory(): void {
    this.categorySub?.unsubscribe();
    this.page.set(1);
    this.totalPages.set(1);
    this.movies.set([]);
    this.error.set(null);
  }

  private scrollActiveTabIntoView(index: number): void {
    const container = this.tabBarEl()?.nativeElement;
    const button = this.tabButtonEls()[index]?.nativeElement;
    if (!container || !button) return;

    const targetLeft = button.offsetLeft - (container.clientWidth - button.offsetWidth) / 2;
    container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
  }

  protected loadMovies(): void {
    if (!this.hasApiKey) return;

    const category = this.tabs[this.selectedTab()].category;
    this.categorySub?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);

    this.categorySub = this.movieService.getMoviesByCategory(category, this.page()).subscribe({
      next: result => {
        const existingIds = new Set(this.movies().map(m => m.id));
        const fresh = result.results.filter(m => !existingIds.has(m.id));
        if (fresh.length > 0) {
          this.movies.update(prev => [...prev, ...fresh]);
        }
        this.totalPages.set(result.total_pages);
        this.loading.set(false);
      },
      error: () => {
        // Pagina terugzetten zodat "opnieuw proberen" dezelfde pagina ophaalt
        if (this.page() > 1) this.page.update(p => p - 1);
        this.error.set('De films wilden even niet laden. Probeer het nog eens.');
        this.loading.set(false);
      },
    });
  }

  protected retryCategory(): void {
    if (this.movies().length > 0) {
      this.error.set(null);
      this.page.update(p => p + 1);
    }
    this.loadMovies();
  }

  // ---- Zoeken ----

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.updateQueryParam(value);
    clearTimeout(this.searchDebounceTimer);

    const query = value.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      this.resetSearch();
      this.ensureCategoryLoaded();
      return;
    }

    this.searchLoading.set(true);
    this.searchDebounceTimer = setTimeout(() => this.startSearch(query), 400);
  }

  protected onSearchSubmit(event: Event): void {
    event.preventDefault();
    const query = this.searchQuery().trim();
    if (query.length < MIN_QUERY_LENGTH) return;
    clearTimeout(this.searchDebounceTimer);
    this.startSearch(query);
    this.searchInput()?.nativeElement.blur();
  }

  private startSearch(query: string): void {
    this.activeQuery.set(query);
    this.searchPage.set(1);
    this.searchTotalPages.set(1);
    this.searchResults.set([]);
    this.fetchSearchPage();
  }

  private fetchSearchPage(): void {
    const query = this.activeQuery();
    const page = this.searchPage();
    this.searchSub?.unsubscribe();
    this.searchLoading.set(true);
    this.searchError.set(null);

    this.searchSub = this.movieService.search(query, page).subscribe({
      next: result => {
        const existingIds = new Set(this.searchResults().map(m => m.id));
        const fresh = result.results.filter(m => !existingIds.has(m.id));
        this.searchResults.update(prev => (page === 1 ? result.results : [...prev, ...fresh]));
        this.searchTotalResults.set(result.total_results);
        this.searchTotalPages.set(result.total_pages);
        this.searchLoading.set(false);
      },
      error: () => {
        if (page > 1) this.searchPage.update(p => p - 1);
        this.searchError.set('Zoeken lukte niet. Check je verbinding en probeer opnieuw.');
        this.searchLoading.set(false);
      },
    });
  }

  protected retrySearch(): void {
    if (this.searchResults().length > 0) this.searchPage.update(p => p + 1);
    this.fetchSearchPage();
  }

  private resetSearch(): void {
    this.searchSub?.unsubscribe();
    this.activeQuery.set('');
    this.searchResults.set([]);
    this.searchTotalResults.set(0);
    this.searchLoading.set(false);
    this.searchError.set(null);
  }

  /** Bij openen via ?q= is de categorie nog nooit geladen; na wissen alsnog ophalen. */
  private ensureCategoryLoaded(): void {
    if (this.movies().length === 0 && !this.loading()) {
      this.resetCategory();
      this.loadMovies();
    }
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
    clearTimeout(this.searchDebounceTimer);
    this.searchQuery.set('');
    this.resetSearch();
    this.updateQueryParam('');
    this.ensureCategoryLoaded();
    this.searchInput()?.nativeElement.focus();
  }
}
