import { Component, inject, signal, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormField, MatLabel, MatSuffix, MatPrefix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs/operators';
import { MovieService } from '../../services/movie.service';
import { TmdbMovie } from '../../../../core/models/movie.model';
import { MovieCardComponent } from '../../../../shared/components/movie-card/movie-card.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-search',
  imports: [
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatSuffix,
    MatPrefix,
    MatInput,
    MatIcon,
    MatIconButton,
    MovieCardComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="page-container">
      <h1 class="text-3xl font-bold text-text-primary tracking-tight mb-6">Zoeken</h1>

      <div class="search-field-wrapper">
        <mat-form-field appearance="fill" class="search-field">
          <mat-icon matPrefix class="text-text-muted ml-2">search</mat-icon>
          <mat-label>Zoek op filmtitel...</mat-label>
          <input
            matInput
            [formControl]="searchControl"
            autocomplete="off"
            autofocus
          />
          @if (searchControl.value) {
            <button mat-icon-button matSuffix (click)="clearSearch()">
              <mat-icon>close</mat-icon>
            </button>
          }
        </mat-form-field>
      </div>

      @if (loading()) {
        <app-loading-spinner message="Zoeken..." [minHeight]="'300px'" />
      } @else if (searched() && results().length === 0) {
        <app-empty-state
          icon="search_off"
          title="Geen resultaten gevonden"
          [description]="'Geen films gevonden voor &quot;' + searchControl.value + '&quot;. Probeer andere zoektermen.'"
        />
      } @else if (results().length > 0) {
        <div class="mt-6">
          <p class="text-text-muted text-sm mb-4">
            {{ totalResults() }} {{ totalResults() === 1 ? 'resultaat' : 'resultaten' }} voor
            <span class="text-text-secondary">"{{ searchControl.value }}"</span>
          </p>
          <div class="card-grid">
            @for (movie of results(); track movie.id) {
              <app-movie-card [movie]="movie" [showActions]="true" />
            }
          </div>
        </div>
      } @else {
        <div class="search-suggestions">
          <h2 class="section-title">Populaire zoekopdrachten</h2>
          <div class="suggestions-grid">
            @for (suggestion of popularSuggestions; track suggestion) {
              <button class="suggestion-chip" (click)="searchControl.setValue(suggestion)">
                {{ suggestion }}
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .search-field-wrapper {
      max-width: 640px;
    }
    .search-field {
      width: 100%;
    }
    .search-suggestions {
      margin-top: 2rem;
    }
    .suggestions-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .suggestion-chip {
      padding: 0.5rem 1rem;
      border-radius: 100px;
      background: rgba(26, 26, 36, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: rgba(124, 58, 237, 0.15);
        border-color: rgba(124, 58, 237, 0.3);
        color: #a78bfa;
      }
    }
  `],
})
export class SearchComponent implements OnInit {
  private readonly movieService = inject(MovieService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly searchControl = new FormControl('');
  protected readonly results = signal<TmdbMovie[]>([]);
  protected readonly loading = signal(false);
  protected readonly searched = signal(false);
  protected readonly totalResults = signal(0);

  protected readonly popularSuggestions = [
    'Marvel', 'Star Wars', 'Harry Potter', 'James Bond',
    'The Lord of the Rings', 'Disney', 'Pixar', 'Christopher Nolan',
  ];

  ngOnInit(): void {
    const query = this.route.snapshot.queryParamMap.get('q');
    if (query) {
      this.searchControl.setValue(query);
    }

    this.searchControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
    ).subscribe(query => {
      this.updateQueryParam(query ?? '');
      if (query && query.trim().length >= 2) {
        this.performSearch(query);
      } else {
        this.results.set([]);
        this.searched.set(false);
      }
    });

    if (query && query.trim().length >= 2) {
      this.performSearch(query);
    }
  }

  private performSearch(query: string): void {
    this.loading.set(true);
    this.searched.set(true);

    this.movieService.search(query).subscribe({
      next: result => {
        this.results.set(result.results);
        this.totalResults.set(result.total_results);
        this.loading.set(false);
      },
      error: () => {
        this.results.set([]);
        this.loading.set(false);
      },
    });
  }

  private updateQueryParam(query: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: query || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected clearSearch(): void {
    this.searchControl.setValue('');
    this.results.set([]);
    this.searched.set(false);
  }
}
