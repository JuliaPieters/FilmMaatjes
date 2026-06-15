import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MovieService } from '../../services/movie.service';
import { TmdbMovie, TmdbMovieDetail, TmdbCastMember } from '../../../../core/models/movie.model';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { StarRatingComponent } from '../../../../shared/components/star-rating/star-rating.component';
import { MovieCardComponent } from '../../../../shared/components/movie-card/movie-card.component';
import { AuthService } from '../../../auth/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { UserLibraryService } from '../../../../core/services/user-library.service';
import { WatchlistService } from '../../../watchlists/services/watchlist.service';
import { ReviewService } from '../../../../core/services/review.service';
import { Review } from '../../../../core/models/review.model';

@Component({
  selector: 'app-movie-detail',
  imports: [
    RouterLink,
    MatIcon,
    MatButton,
    MatIconButton,
    MatTooltip,
    DecimalPipe,
    DatePipe,
    FormsModule,
    LoadingSpinnerComponent,
    StarRatingComponent,
    MovieCardComponent,
  ],
  templateUrl: './movie-detail.component.html',
  styleUrl: './movie-detail.component.scss',
})
export class MovieDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly movieService = inject(MovieService);
  protected readonly authService = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  protected readonly libraryService = inject(UserLibraryService);
  protected readonly watchlistService = inject(WatchlistService);
  protected readonly reviewService = inject(ReviewService);

  protected readonly movie = signal<TmdbMovieDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly userRating = signal(0);
  protected readonly watched = signal(false);
  protected readonly showWatchlistPicker = signal(false);

  protected readonly reviewText = signal('');
  protected readonly reviewRating = signal(0);
  protected readonly editingReview = signal<Review | null>(null);
  protected readonly showReviewForm = signal(false);
  protected readonly reviewSubmitting = signal(false);

  protected readonly cast = computed<TmdbCastMember[]>(() => {
    const m = this.movie() as any;
    return m?.credits?.cast?.slice(0, 12) ?? [];
  });

  protected readonly similar = computed(() => {
    const m = this.movie() as any;
    return m?.similar?.results?.slice(0, 8) ?? [];
  });

  protected readonly trailerKey = computed(() => {
    const m = this.movie() as any;
    const videos: any[] = m?.videos?.results ?? [];
    const trailer = videos.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube' && v.official);
    return trailer?.key ?? videos.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube')?.key ?? null;
  });

  protected readonly isInAnyWatchlist = computed(() => {
    const m = this.movie();
    return m ? this.watchlistService.isMovieInAnyWatchlist(m.id) : false;
  });

  protected readonly userWatchlists = this.watchlistService.watchlists;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id || isNaN(id)) {
      this.router.navigate(['/movies']);
      return;
    }
    this.loadMovie(id);
  }

  private loadMovie(id: number): void {
    this.loading.set(true);
    this.movieService.getMovieDetail(id).subscribe({
      next: movie => {
        this.movie.set(movie);
        this.watched.set(this.libraryService.isWatched(movie.id));
        this.userRating.set(this.libraryService.getRating(movie.id));
        this.loading.set(false);
        this.reviewService.getMovieReviews(movie.id).subscribe();
      },
      error: () => {
        this.error.set('Film kon niet worden geladen.');
        this.loading.set(false);
      },
    });
  }

  protected openReviewForm(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return;
    }
    const existing = this.reviewService.getUserReviewForMovie(this.movie()?.id ?? 0);
    if (existing) {
      this.editingReview.set(existing);
      this.reviewText.set(existing.content);
      this.reviewRating.set(existing.rating);
    } else {
      this.editingReview.set(null);
      this.reviewText.set('');
      this.reviewRating.set(this.userRating());
    }
    this.showReviewForm.set(true);
  }

  protected cancelReview(): void {
    this.showReviewForm.set(false);
    this.editingReview.set(null);
  }

  protected submitReview(): void {
    const text = this.reviewText().trim();
    const rating = this.reviewRating();
    const movieId = this.movie()?.id;
    if (!text || !movieId) return;
    this.reviewSubmitting.set(true);

    const editing = this.editingReview();
    const obs = editing
      ? this.reviewService.updateReview(editing.id, { content: text, rating })
      : this.reviewService.createReview({ movieId, rating, content: text });

    obs.subscribe({
      next: () => {
        this.notifications.success(editing ? 'Review bijgewerkt!' : 'Review geplaatst!');
        this.showReviewForm.set(false);
        this.editingReview.set(null);
        this.reviewSubmitting.set(false);
      },
      error: () => {
        this.notifications.error('Review opslaan mislukt.');
        this.reviewSubmitting.set(false);
      },
    });
  }

  protected deleteReview(id: string): void {
    if (!confirm('Review verwijderen?')) return;
    this.reviewService.deleteReview(id).subscribe({
      next: () => this.notifications.success('Review verwijderd.'),
    });
  }

  protected isOwnReview(review: Review): boolean {
    return review.userId === this.authService.user()?.id;
  }

  get reviewTextModel(): string { return this.reviewText(); }
  set reviewTextModel(v: string) { this.reviewText.set(v); }

  protected openWatchlistPicker(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.showWatchlistPicker.update(v => !v);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showWatchlistPicker.set(false);
  }

  protected closeWatchlistPicker(): void {
    this.showWatchlistPicker.set(false);
  }

  protected toggleInWatchlist(watchlistId: string, event: MouseEvent): void {
    event.stopPropagation();
    const m = this.movie();
    if (!m) return;
    const movie = m as unknown as TmdbMovie;

    if (this.watchlistService.isMovieInWatchlist(watchlistId, m.id)) {
      this.watchlistService.removeMovie(watchlistId, m.id).subscribe();
      this.notifications.success('Verwijderd uit watchlist');
    } else {
      this.watchlistService.addMovie(watchlistId, movie).subscribe();
      this.notifications.success('Toegevoegd aan watchlist');
    }
  }

  protected isInWatchlist(watchlistId: string): boolean {
    return this.watchlistService.isMovieInWatchlist(watchlistId, this.movie()?.id ?? 0);
  }

  protected toggleWatched(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return;
    }
    const m = this.movie();
    if (!m) return;
    const newState = this.libraryService.toggleWatched(m as unknown as TmdbMovie);
    this.watched.set(newState);
    this.notifications.success(newState ? 'Gemarkeerd als gezien!' : 'Markering verwijderd');
  }

  protected onRate(rating: number): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return;
    }
    const m = this.movie();
    if (!m) return;
    this.libraryService.setRating(m as unknown as TmdbMovie, rating);
    this.notifications.success(rating > 0 ? `${rating} ster${rating === 1 ? '' : 'ren'} opgeslagen!` : 'Beoordeling verwijderd');
  }

  protected openTrailer(): void {
    const key = this.trailerKey();
    if (key) {
      window.open(`https://www.youtube.com/watch?v=${key}`, '_blank', 'noopener,noreferrer');
    }
  }
}
