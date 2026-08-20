import { Component, computed, effect, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { UserLibraryService, LibraryEntry } from '../../../../core/services/user-library.service';
import { WatchlistService } from '../../../watchlists/services/watchlist.service';
import { FriendsService } from '../../../friends/services/friends.service';
import { ReviewService } from '../../../../core/services/review.service';
import { MovieService } from '../../../movies/services/movie.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { WatchStreakService } from '../../../../core/services/watch-streak.service';
import { AchievementsService, AchievementStats } from '../../../../core/services/achievements.service';
import { MovieCardComponent } from '../../../../shared/components/movie-card/movie-card.component';
import { StarRatingComponent } from '../../../../shared/components/star-rating/star-rating.component';
import { User } from '../../../../core/models/user.model';
import { Watchlist } from '../../../../core/models/watchlist.model';
import { Review } from '../../../../core/models/review.model';
import { TmdbMovie } from '../../../../core/models/movie.model';

@Component({
  selector: 'app-profile',
  imports: [RouterLink, MatIcon, MatButton, FormsModule, DatePipe, MovieCardComponent, StarRatingComponent, NgTemplateOutlet],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notifications = inject(NotificationService);
  protected readonly friendsService = inject(FriendsService);

  protected readonly library = inject(UserLibraryService);
  protected readonly watchlistService = inject(WatchlistService);
  private readonly reviewService = inject(ReviewService);
  private readonly movieService = inject(MovieService);
  private readonly watchStreak = inject(WatchStreakService);
  private readonly achievementsService = inject(AchievementsService);

  protected readonly user = signal<User | null>(null);
  protected readonly isOwnProfile = signal(false);
  protected readonly loading = signal(false);
  protected readonly activeTab = signal<'watched' | 'rated' | 'watchlists' | 'reviews' | 'badges'>('watched');
  protected readonly editMode = signal(false);
  protected editDisplayName = '';
  protected editBio = '';
  protected readonly uploadingAvatar = signal(false);

  // Email change
  protected emailCurrentPassword = '';
  protected editNewEmail = '';
  protected readonly savingEmail = signal(false);
  protected readonly emailChangeError = signal('');
  protected readonly emailChangeSuccess = signal(false);

  // Password change
  protected passwordCurrent = '';
  protected passwordNew = '';
  protected passwordConfirm = '';
  protected readonly savingPassword = signal(false);
  protected readonly passwordChangeError = signal('');
  protected readonly passwordChangeSuccess = signal(false);

  // Friend profile data
  protected readonly friendProfileWatchlists = signal<Watchlist[]>([]);
  protected readonly friendReviews = signal<Review[]>([]);
  protected readonly friendRatedMovies = signal<LibraryEntry[]>([]);
  protected readonly friendActualCount = signal<number | null>(null);
  protected readonly loadingFriendData = signal(false);
  protected readonly expandedWatchlistId = signal<string | null>(null);
  protected readonly publicActiveTab = signal<'watchlists' | 'reviews' | 'rated' | 'badges'>('watchlists');

  protected readonly watchedCount = computed(() => this.library.watchedMovies().length);
  protected readonly ratedCount = computed(() => this.library.ratedMovies().length);
  protected readonly watchlistCount = computed(() => this.watchlistService.watchlists().length);
  protected readonly ownReviewCount = signal(0);
  protected readonly ownReviews = signal<Review[]>([]);

  protected readonly publicWatchlists = computed(() =>
    this.friendProfileWatchlists()
  );

  protected readonly friendWatchedCount = computed(() => {
    const gezien = this.friendProfileWatchlists().find(watchlist => watchlist.name === 'Gezien');
    return gezien?.movies?.length ?? gezien?._count?.movies ?? 0;
  });

  protected readonly streakWeeks = computed(() => {
    const dates = this.isOwnProfile()
      ? this.library.watchedMovies().map(e => e.watchedAt)
      : (this.friendProfileWatchlists().find(watchlist => watchlist.name === 'Gezien')?.movies ?? []).map(m => m.addedAt);
    return this.watchStreak.getStreakWeeks(dates);
  });

  protected readonly achievements = computed(() => {
    const own = this.isOwnProfile();
    const ratedMovies = own ? this.library.ratedMovies() : this.friendRatedMovies();
    const reviews = own ? this.ownReviews() : this.friendReviews();
    const watchedMovies: TmdbMovie[] = own
      ? this.library.watchedMovies().map(e => e.movie)
      : (this.friendProfileWatchlists().find(watchlist => watchlist.name === 'Gezien')?.movies ?? [])
          .map(m => m.movie)
          .filter((m): m is TmdbMovie => !!m);

    const stats: AchievementStats = {
      watchedCount: own ? this.watchedCount() : this.friendWatchedCount(),
      ratedCount: ratedMovies.length,
      fiveStarCount: ratedMovies.filter(e => e.rating === 5).length,
      hasOneStarRating: ratedMovies.some(e => e.rating === 1),
      reviewCount: reviews.length,
      hasLateNightReview: reviews.some(r => new Date(r.createdAt).getHours() < 5),
      friendCount: own ? this.friendsService.friends().length : (this.friendActualCount() ?? this.user()?._count?.friends ?? 0),
      streakWeeks: this.streakWeeks(),
      distinctGenreCount: new Set(watchedMovies.flatMap(m => m.genre_ids ?? [])).size,
    };

    return this.achievementsService.getAchievements(stats);
  });

  protected readonly unlockedAchievementCount = computed(() => this.achievements().filter(a => a.unlocked).length);
  private seenAchievementIds: Set<string> | null = null;
  private readonly seenAchievementIdsLoaded = signal(false);

  protected readonly displayWatchlistCount = computed(() => {
    if (this.isOwnProfile()) return this.watchlistService.watchlists().length;
    if (!this.loadingFriendData() && this.friendProfileWatchlists().length > 0) return this.publicWatchlists().length;
    return this.user()?._count?.watchlists ?? 0;
  });

  protected readonly isFriend = computed(() => {
    const u = this.user();
    return u ? this.friendsService.friends().some(f => f.id === u.id) : false;
  });

  protected readonly requestSent = computed(() => {
    const u = this.user();
    return u ? this.friendsService.sentRequests().some(r => r.receiverId === u.id) : false;
  });

  constructor() {
    effect(() => {
      if (this.isOwnProfile()) {
        const u = this.authService.user();
        this.user.set(u);
        if (u) {
          this.achievementsService.getSeenAchievementIds(u.id).then(ids => {
            this.seenAchievementIds = ids;
            this.seenAchievementIdsLoaded.set(true);
          });

          this.reviewService.getUserReviews(u.id).subscribe(async reviews => {
            this.ownReviewCount.set(reviews.length);

            const missing = reviews.filter(r => !r.moviePosterPath);
            if (missing.length === 0) {
              this.ownReviews.set(reviews);
              return;
            }
            const details = await Promise.allSettled(
              missing.map(r => firstValueFrom(this.movieService.getMovieDetail(r.movieId)))
            );
            this.ownReviews.set(reviews.map(r => {
              if (r.moviePosterPath) return r;
              const index = missing.findIndex(m => m.id === r.id);
              const result = details[index];
              if (result?.status === 'fulfilled') {
                return { ...r, movieTitle: result.value.title, moviePosterPath: result.value.poster_path };
              }
              return r;
            }));
          });
        }
      }
    });

    effect(() => {
      if (!this.isOwnProfile() || !this.seenAchievementIdsLoaded()) return;
      const unlocked = this.achievements().filter(a => a.unlocked);
      const newlyUnlocked = unlocked.filter(a => !this.seenAchievementIds!.has(a.id));
      if (newlyUnlocked.length === 0) return;

      for (const badge of newlyUnlocked) {
        this.notifications.success(`Nieuwe badge behaald: ${badge.title}!`);
      }
      this.seenAchievementIds = new Set(unlocked.map(a => a.id));
      const uid = this.user()?.id;
      if (uid) this.achievementsService.markAchievementsSeen(uid, [...this.seenAchievementIds]);
    });
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const username = params.get('username');
        const currentUser = this.authService.user();

        if (!username || username === currentUser?.username) {
          this.isOwnProfile.set(true);
          this.user.set(currentUser);
        } else {
          this.isOwnProfile.set(false);
          this.loading.set(true);
          this.friendProfileWatchlists.set([]);
          this.publicActiveTab.set('watchlists');
          firstValueFrom(this.authService.getUserByUsername(username))
            .then(foundUser => {
              this.user.set(foundUser);
              if (foundUser) this.loadFriendData(foundUser.id);
              this.loading.set(false);
            })
            .catch(() => {
              this.user.set(null);
              this.loading.set(false);
            });
        }
      });
  }

  protected toggleWatchlist(id: string): void {
    this.expandedWatchlistId.update(current => current === id ? null : id);
  }

  private loadFriendData(userId: string): void {
    this.loadingFriendData.set(true);
    this.friendActualCount.set(null);
    this.friendReviews.set([]);
    this.friendProfileWatchlists.set([]);
    this.friendRatedMovies.set([]);

    Promise.all([
      firstValueFrom(this.friendsService.getAcceptedFriendCount(userId)),
      firstValueFrom(this.watchlistService.loadFriendWatchlists(userId)),
      firstValueFrom(this.reviewService.getUserReviews(userId)),
      firstValueFrom(this.library.getRatedMoviesForUser(userId)),
    ]).then(async ([friendCount, watchlists, reviews, ratedMovies]) => {
      this.friendActualCount.set(friendCount);
      this.friendProfileWatchlists.set(watchlists);
      this.friendRatedMovies.set(ratedMovies);

      const missing = reviews.filter(r => !r.moviePosterPath);
      if (missing.length > 0) {
        const details = await Promise.allSettled(
          missing.map(r => firstValueFrom(this.movieService.getMovieDetail(r.movieId)))
        );
        const enriched = reviews.map(r => {
          if (r.moviePosterPath) return r;
          const index = missing.findIndex(m => m.id === r.id);
          const result = details[index];
          if (result?.status === 'fulfilled') {
            return { ...r, movieTitle: result.value.title, moviePosterPath: result.value.poster_path };
          }
          return r;
        });
        this.friendReviews.set(enriched);
      } else {
        this.friendReviews.set(reviews);
      }

      this.loadingFriendData.set(false);
    }).catch(() => {
      this.loadingFriendData.set(false);
    });
  }

  protected sendFriendRequest(): void {
    const u = this.user();
    if (!u) return;
    this.friendsService.sendRequest(u.id).subscribe({
      next: () => this.notifications.success('Vriendschapsverzoek verstuurd!'),
      error: () => this.notifications.error('Versturen mislukt.'),
    });
  }

  protected startEdit(): void {
    const u = this.user();
    this.editDisplayName = u?.displayName ?? '';
    this.editBio = u?.bio ?? '';
    this.emailCurrentPassword = '';
    this.editNewEmail = '';
    this.passwordCurrent = '';
    this.passwordNew = '';
    this.passwordConfirm = '';
    this.emailChangeError.set('');
    this.emailChangeSuccess.set(false);
    this.passwordChangeError.set('');
    this.passwordChangeSuccess.set(false);
    this.editMode.set(true);
  }

  protected cancelEdit(): void {
    this.editMode.set(false);
  }

  protected async onAvatarSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.notifications.error('Kies een afbeeldingsbestand.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.notifications.error('Afbeelding mag maximaal 5MB zijn.');
      return;
    }

    this.uploadingAvatar.set(true);
    try {
      await this.authService.uploadAvatar(file);
      this.user.set(this.authService.user());
      this.notifications.success('Profielfoto bijgewerkt!');
    } catch {
      this.notifications.error('Uploaden mislukt. Probeer het opnieuw.');
    } finally {
      this.uploadingAvatar.set(false);
    }
  }

  protected async saveEmail(): Promise<void> {
    if (!this.emailCurrentPassword || !this.editNewEmail) {
      this.emailChangeError.set('Vul alle velden in.');
      return;
    }
    this.savingEmail.set(true);
    this.emailChangeError.set('');
    try {
      await this.authService.changeEmail(this.emailCurrentPassword, this.editNewEmail);
      this.emailChangeSuccess.set(true);
      this.emailCurrentPassword = '';
    } catch (e: unknown) {
      this.emailChangeError.set(e instanceof Error ? e.message : 'Er is iets misgegaan.');
    } finally {
      this.savingEmail.set(false);
    }
  }

  protected async savePassword(): Promise<void> {
    if (!this.passwordCurrent || !this.passwordNew || !this.passwordConfirm) {
      this.passwordChangeError.set('Vul alle velden in.');
      return;
    }
    if (this.passwordNew !== this.passwordConfirm) {
      this.passwordChangeError.set('Wachtwoorden komen niet overeen.');
      return;
    }
    if (this.passwordNew.length < 8) {
      this.passwordChangeError.set('Nieuw wachtwoord moet minimaal 8 tekens zijn.');
      return;
    }
    this.savingPassword.set(true);
    this.passwordChangeError.set('');
    try {
      await this.authService.changePassword(this.passwordCurrent, this.passwordNew);
      this.passwordChangeSuccess.set(true);
      this.passwordCurrent = '';
      this.passwordNew = '';
      this.passwordConfirm = '';
    } catch (e: unknown) {
      this.passwordChangeError.set(e instanceof Error ? e.message : 'Er is iets misgegaan.');
    } finally {
      this.savingPassword.set(false);
    }
  }

  protected saveEdit(): void {
    const u = this.user();
    if (!u) return;
    if (!this.editDisplayName.trim()) {
      this.notifications.error('Naam mag niet leeg zijn.');
      return;
    }
    this.authService.updateProfileData({
      displayName: this.editDisplayName.trim(),
      bio: this.editBio.trim() || undefined,
    }).then(() => {
      this.user.set(this.authService.user());
      this.editMode.set(false);
      this.notifications.success('Profiel bijgewerkt!');
    }).catch(() => {
      this.notifications.error('Opslaan mislukt. Probeer het opnieuw.');
    });
  }
}
