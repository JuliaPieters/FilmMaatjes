import { Component, computed, DestroyRef, effect, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { DecimalPipe, DatePipe, Location } from '@angular/common';
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
import { MovieActionsService } from '../../../../core/services/movie-actions.service';
import { ReviewService } from '../../../../core/services/review.service';
import { Review } from '../../../../core/models/review.model';
import { FriendsService } from '../../../friends/services/friends.service';

@Component({
  selector: 'app-movie-detail',
  imports: [
    RouterLink,
    MatIcon,
    MatButton,
    MatIconButton,
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly location = inject(Location);
  protected readonly movieService = inject(MovieService);
  protected readonly authService = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  protected readonly libraryService = inject(UserLibraryService);
  protected readonly watchlistService = inject(WatchlistService);
  protected readonly reviewService = inject(ReviewService);
  private readonly movieActions = inject(MovieActionsService);
  private readonly friendsService = inject(FriendsService);

  private readonly ratingLabels = ['Slecht', 'Matig', 'Goed', 'Heel goed', 'Uitstekend'];

  protected readonly movie = signal<TmdbMovieDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly userRating = signal(0);

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

  protected readonly watched = computed(() => {
    const m = this.movie();
    return m ? this.libraryService.isWatched(m.id) : false;
  });

  protected readonly friendsWithMovieOnWatchlist = computed(() => {
    const m = this.movie();
    if (!m) return [];
    const friendIds = this.friendsService.friends().map(f => f.id);
    const matchingIds = new Set(this.watchlistService.getFriendIdsWithMovieInWatchlist(m.id, friendIds));
    return this.friendsService.friends().filter(f => matchingIds.has(f.id));
  });

  protected readonly friendsWithMovieLabel = computed(() => {
    const friends = this.friendsWithMovieOnWatchlist();
    if (friends.length === 0) return null;
    if (friends.length === 1) return `Ook op ${friends[0].displayName}'s watchlist`;
    return `Ook op de watchlist van ${friends[0].displayName} en ${friends.length - 1} anderen`;
  });

  constructor() {
    effect(() => {
      for (const friend of this.friendsService.friends()) {
        this.watchlistService.loadFriendWatchlists(friend.id).subscribe();
      }
    });
  }

  ngOnInit(): void {
    this.friendsService.getMyFriends().subscribe();
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const id = Number(params.get('id'));
        if (!id || isNaN(id)) {
          this.router.navigate(['/movies']);
          return;
        }
        this.loadMovie(id);
      });
  }

  private loadMovie(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.movie.set(null);
    this.showReviewForm.set(false);
    this.editingReview.set(null);
    this.movieService.getMovieDetail(id).subscribe({
      next: movie => {
        this.movie.set(movie);
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
    const movieId = this.movie()?.id ?? 0;
    this.reviewService.getUserReviewForMovieRemote(movieId).subscribe(existing => {
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
    });
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
    if (rating < 1) {
      this.notifications.error('Kies een aantal sterren voor je review.');
      return;
    }
    this.reviewSubmitting.set(true);

    const editing = this.editingReview();
    const obs = editing
      ? this.reviewService.updateReview(editing.id, { content: text, rating })
      : this.reviewService.createReview({ movieId, rating, content: text, movieTitle: this.movie()?.title, moviePosterPath: this.movie()?.poster_path });

    const movie = this.movie();
    obs.subscribe({
      next: () => {
        if (movie && rating !== this.userRating()) {
          this.libraryService.setRating(movie as unknown as TmdbMovie, rating);
          this.userRating.set(rating);
        }
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
    const m = this.movie();
    if (!m) return;
    this.movieActions.toggleWatchlist(m as unknown as TmdbMovie);
  }

  protected ratingLabelFor(rating: number): string {
    return this.ratingLabels[rating - 1] ?? '';
  }

  protected toggleWatched(): void {
    const m = this.movie();
    if (!m) return;
    this.movieActions.toggleWatched(m as unknown as TmdbMovie);
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

    if (rating > 0) {
      this.reviewService.getUserReviewForMovieRemote(m.id).subscribe(existing => {
        if (existing && existing.rating !== rating) {
          this.reviewService.updateReview(existing.id, { rating }).subscribe();
          if (this.editingReview()?.id === existing.id) {
            this.reviewRating.set(rating);
          }
        }
      });
    }
  }

  protected goBack(): void {
    const state = this.location.getState() as { navigationId?: number };
    if (state?.navigationId && state.navigationId > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/movies']);
    }
  }

  protected openTrailer(): void {
    const key = this.trailerKey();
    if (key) {
      window.open(`https://www.youtube.com/watch?v=${key}`, '_blank', 'noopener,noreferrer');
    }
  }
}
