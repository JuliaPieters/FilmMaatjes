import { Component, computed, effect, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { AuthService } from '../../../auth/services/auth.service';
import { UserLibraryService } from '../../../../core/services/user-library.service';
import { WatchlistService } from '../../../watchlists/services/watchlist.service';
import { FriendsService } from '../../../friends/services/friends.service';
import { ReviewService } from '../../../../core/services/review.service';
import { MovieService } from '../../../movies/services/movie.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { MovieCardComponent } from '../../../../shared/components/movie-card/movie-card.component';
import { StarRatingComponent } from '../../../../shared/components/star-rating/star-rating.component';
import { User } from '../../../../core/models/user.model';
import { Watchlist } from '../../../../core/models/watchlist.model';
import { Review } from '../../../../core/models/review.model';
import { db } from '../../../../core/firebase';

@Component({
  selector: 'app-profile',
  imports: [RouterLink, MatIcon, MatButton, FormsModule, DatePipe, MovieCardComponent, StarRatingComponent],
  template: `
    <div class="profile-page">
      <div class="profile-banner"></div>

      <div class="page-container">
        @if (loading()) {
          <div class="flex items-center justify-center py-16 text-text-muted">
            <mat-icon class="animate-spin mr-2">refresh</mat-icon> Laden...
          </div>
        } @else if (!user()) {
          <div class="flex flex-col items-center justify-center py-16 gap-3 text-text-muted">
            <mat-icon style="font-size:3rem;width:3rem;height:3rem">person_off</mat-icon>
            <p>Gebruiker niet gevonden.</p>
            <a mat-stroked-button routerLink="/friends">Terug</a>
          </div>
        } @else {
          <div class="profile-header">
            <div class="profile-avatar">
              @if (user()?.avatar) {
                <img [src]="user()!.avatar!" [alt]="user()!.displayName" />
              } @else {
                <span>{{ user()?.displayName?.charAt(0)?.toUpperCase() }}</span>
              }
            </div>

            <div class="profile-info">
              <h1 class="profile-name">{{ user()?.displayName }}</h1>
              <p class="profile-username">&#64;{{ user()?.username }}</p>
              @if (user()?.bio) {
                <p class="profile-bio">{{ user()!.bio }}</p>
              }

              <div class="profile-stats">
                @if (!isOwnProfile()) {
                  <div class="stat">
                    <span class="stat-value">{{ friendWatchedCount() }}</span>
                    <span class="stat-label">Gezien</span>
                  </div>
                }
                <div class="stat">
                  <span class="stat-value">{{ displayWatchlistCount() }}</span>
                  <span class="stat-label">Watchlists</span>
                </div>
                @if (isOwnProfile()) {
                  <div class="stat">
                    <span class="stat-value">{{ ownReviewCount() }}</span>
                    <span class="stat-label">Reviews</span>
                  </div>
                }
                <div class="stat">
                  <span class="stat-value">{{ isOwnProfile() ? friendsService.friends().length : (friendActualCount() ?? user()?._count?.friends ?? 0) }}</span>
                  <span class="stat-label">Vrienden</span>
                </div>
              </div>
            </div>

            <div class="profile-actions">
              @if (isOwnProfile()) {
                @if (!editMode()) {
                  <button mat-stroked-button (click)="startEdit()">
                    <mat-icon>edit</mat-icon>
                    Profiel bewerken
                  </button>
                }
              } @else {
                @if (isFriend()) {
                  <button mat-stroked-button disabled>
                    <mat-icon>people</mat-icon>
                    Vrienden
                  </button>
                } @else if (requestSent()) {
                  <button mat-stroked-button disabled>
                    <mat-icon>hourglass_empty</mat-icon>
                    Verzoek verstuurd
                  </button>
                } @else {
                  <button mat-flat-button color="primary" (click)="sendFriendRequest()">
                    <mat-icon>person_add</mat-icon>
                    Toevoegen als vriend
                  </button>
                }
              }
            </div>
          </div>

          <!-- Edit form (own profile only) -->
          @if (editMode()) {
            <div class="edit-form glass-card p-6 mt-6">
              <h3 class="text-lg font-semibold text-text-primary mb-4">Profiel bewerken</h3>
              <div class="edit-fields">
                <div class="field-group">
                  <label class="field-label">Weergavenaam</label>
                  <input class="field-input" [(ngModel)]="editDisplayName" placeholder="Jouw naam" />
                </div>
                <div class="field-group">
                  <label class="field-label">Bio</label>
                  <textarea class="field-input field-textarea" [(ngModel)]="editBio" placeholder="Vertel iets over jezelf..." rows="3"></textarea>
                </div>
              </div>
              <div class="flex gap-2 mt-4">
                <button mat-flat-button color="primary" (click)="saveEdit()">Opslaan</button>
                <button mat-stroked-button (click)="cancelEdit()">Annuleren</button>
              </div>
            </div>
          }

          <!-- Public profile tabs (friend view) -->
          @if (!isOwnProfile()) {
            <div class="profile-tabs mt-8">
              <button class="profile-tab" [class.active]="publicActiveTab() === 'watchlists'" (click)="publicActiveTab.set('watchlists')">
                <mat-icon>bookmark</mat-icon>
                Watchlists ({{ publicWatchlists().length }})
              </button>
              <button class="profile-tab" [class.active]="publicActiveTab() === 'reviews'" (click)="publicActiveTab.set('reviews')">
                <mat-icon>rate_review</mat-icon>
                Reviews ({{ friendReviews().length }})
              </button>
            </div>
            <div class="tab-content mt-6">
              @if (loadingFriendData()) {
                <div class="empty-state">
                  <mat-icon class="animate-spin">refresh</mat-icon>
                  <p>Laden...</p>
                </div>
              } @else if (publicActiveTab() === 'watchlists') {
                @if (publicWatchlists().length === 0) {
                  <div class="empty-state">
                    <mat-icon>bookmark_border</mat-icon>
                    <p>Geen watchlists om weer te geven.</p>
                  </div>
                } @else {
                  <div class="public-wl-list">
                    @for (wl of publicWatchlists(); track wl.id) {
                      <div class="public-wl-section">
                        <button class="public-wl-header glass-card" (click)="toggleWatchlist(wl.id)">
                          <div class="wl-icon"><mat-icon>bookmark</mat-icon></div>
                          <div class="flex-1 min-w-0 text-left">
                            <p class="wl-name">{{ wl.name }}</p>
                            <p class="wl-count">{{ wl.movies.length || wl._count?.movies || 0 }} films</p>
                          </div>
                          <mat-icon class="wl-chevron" [class.rotated]="expandedWatchlistId() === wl.id">
                            expand_more
                          </mat-icon>
                        </button>

                        @if (expandedWatchlistId() === wl.id) {
                          @if (wl.movies.length === 0) {
                            <div class="empty-state py-8">
                              <mat-icon>movie_off</mat-icon>
                              <p>Geen films in deze watchlist.</p>
                            </div>
                          } @else {
                            <div class="card-grid mt-4 pb-4">
                              @for (entry of wl.movies; track entry.movieId) {
                                @if (entry.movie) {
                                  <app-movie-card [movie]="entry.movie" />
                                }
                              }
                            </div>
                          }
                        }
                      </div>
                    }
                  </div>
                }
              } @else {
                @if (friendReviews().length === 0) {
                  <div class="empty-state">
                    <mat-icon>rate_review</mat-icon>
                    <p>Nog geen reviews geschreven.</p>
                  </div>
                } @else {
                  <div class="reviews-list">
                    @for (review of friendReviews(); track review.id) {
                      <a class="review-card glass-card" [routerLink]="['/movies', review.movieId]">
                        <div class="review-poster">
                          @if (review.moviePosterPath) {
                            <img [src]="'https://image.tmdb.org/t/p/w92' + review.moviePosterPath" [alt]="review.movieTitle" loading="lazy" />
                          } @else {
                            <div class="review-poster-placeholder"><mat-icon>movie</mat-icon></div>
                          }
                        </div>
                        <div class="review-body">
                          @if (review.movieTitle) {
                            <p class="review-movie-title">{{ review.movieTitle }}</p>
                          }
                          <div class="review-top">
                            <app-star-rating [value]="review.rating" [readonly]="true" [size]="16" />
                            <span class="review-date">{{ review.createdAt | date: 'd MMM yyyy' }}</span>
                          </div>
                          @if (review.content) {
                            <p class="review-content">{{ review.content }}</p>
                          }
                        </div>
                      </a>
                    }
                  </div>
                }
              }
            </div>
          }

          <!-- Own profile tabs -->
          @if (isOwnProfile()) {
            <div class="profile-tabs mt-8">
              <button class="profile-tab" [class.active]="activeTab() === 'watched'" (click)="activeTab.set('watched')">
                <mat-icon>visibility</mat-icon>
                Gezien ({{ watchedCount() }})
              </button>
              <button class="profile-tab" [class.active]="activeTab() === 'rated'" (click)="activeTab.set('rated')">
                <mat-icon>star</mat-icon>
                Beoordeeld ({{ ratedCount() }})
              </button>
              <button class="profile-tab" [class.active]="activeTab() === 'watchlists'" (click)="activeTab.set('watchlists')">
                <mat-icon>bookmark</mat-icon>
                Watchlists ({{ watchlistCount() }})
              </button>
            </div>

            <div class="tab-content mt-6">
              @if (activeTab() === 'watched') {
                @if (library.watchedMovies().length === 0) {
                  <div class="empty-state">
                    <mat-icon>visibility_off</mat-icon>
                    <p>Nog niets als gezien gemarkeerd.</p>
                    <a mat-stroked-button routerLink="/movies">Films bekijken</a>
                  </div>
                } @else {
                  <div class="card-grid">
                    @for (entry of library.watchedMovies(); track entry.movieId) {
                      <app-movie-card [movie]="entry.movie" />
                    }
                  </div>
                }
              }

              @if (activeTab() === 'rated') {
                @if (library.ratedMovies().length === 0) {
                  <div class="empty-state">
                    <mat-icon>star_border</mat-icon>
                    <p>Nog geen films beoordeeld.</p>
                    <a mat-stroked-button routerLink="/movies">Films beoordelen</a>
                  </div>
                } @else {
                  <div class="rated-grid">
                    @for (entry of library.ratedMovies(); track entry.movieId) {
                      <a class="rated-item" [routerLink]="['/movies', entry.movieId]">
                        <div class="rated-poster">
                          <img [src]="entry.movie.poster_path ? 'https://image.tmdb.org/t/p/w185' + entry.movie.poster_path : '/assets/movie-placeholder.svg'"
                               [alt]="entry.movie.title" loading="lazy" />
                        </div>
                        <div class="rated-info">
                          <p class="rated-title">{{ entry.movie.title }}</p>
                          <app-star-rating [value]="entry.rating" [readonly]="true" [size]="16" />
                        </div>
                      </a>
                    }
                  </div>
                }
              }

              @if (activeTab() === 'watchlists') {
                @if (watchlistService.watchlists().length === 0) {
                  <div class="empty-state">
                    <mat-icon>bookmark_border</mat-icon>
                    <p>Nog geen watchlists aangemaakt.</p>
                    <a mat-stroked-button routerLink="/watchlists">Watchlists beheren</a>
                  </div>
                } @else {
                  <div class="wl-grid">
                    @for (wl of watchlistService.watchlists(); track wl.id) {
                      <a class="wl-card glass-card" routerLink="/watchlists">
                        <div class="wl-icon"><mat-icon>bookmark</mat-icon></div>
                        <div>
                          <p class="wl-name">{{ wl.name }}</p>
                          <p class="wl-count">{{ wl._count?.movies ?? wl.movies.length }} films</p>
                        </div>
                      </a>
                    }
                  </div>
                }
              }
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .profile-page { min-height: calc(100vh - 90px); }

    .profile-banner {
      height: 200px;
      background: linear-gradient(135deg, #1a0533 0%, #12121a 40%, #0f0f13 100%);
      position: relative;
      &::after {
        content: '';
        position: absolute;
        inset: 0;
        background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%237c3aed' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
      }
    }

    .profile-header {
      display: flex; flex-direction: column; gap: 1.25rem; margin-top: -48px; position: relative;
      @media (min-width: 640px) { flex-direction: row; align-items: flex-end; gap: 1.5rem; }
    }

    .profile-avatar {
      width: 96px; height: 96px; border-radius: 50%; border: 4px solid #0f0f13;
      background: linear-gradient(135deg, #7c3aed, #a78bfa);
      display: flex; align-items: center; justify-content: center;
      font-size: 2.5rem; font-weight: 700; color: white; flex-shrink: 0; overflow: hidden;
      position: relative;
      img { width: 100%; height: 100%; object-fit: cover; }
    }

    .profile-info { flex: 1; }
    .profile-name { font-size: 1.75rem; font-weight: 800; color: #f1f5f9; letter-spacing: -0.03em; margin: 0; }
    .profile-username { font-size: 0.875rem; color: #64748b; margin: 0.25rem 0; }
    .profile-bio { font-size: 0.875rem; color: #94a3b8; margin: 0.5rem 0; }

    .profile-stats {
      display: flex; gap: 1rem; margin-top: 0.75rem; flex-wrap: wrap;
      @media (min-width: 640px) { gap: 2rem; }
      .stat { display: flex; flex-direction: column; align-items: center; gap: 0.125rem; }
      .stat-value { font-size: 1.25rem; font-weight: 700; color: #f1f5f9; }
      .stat-label { font-size: 0.75rem; color: #64748b; }
    }

    .profile-actions { flex-shrink: 0; }

    .profile-tabs {
      display: flex; gap: 0.5rem; overflow-x: auto;
      scrollbar-width: none; &::-webkit-scrollbar { display: none; }
      border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 0;
    }

    .profile-tab {
      display: inline-flex; align-items: center; gap: 0.375rem;
      padding: 0.625rem 1rem; border: none; background: transparent;
      color: #64748b; font-size: 0.875rem; font-weight: 500; cursor: pointer;
      border-bottom: 2px solid transparent; margin-bottom: -1px; white-space: nowrap;
      transition: all 0.15s ease;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
      &:hover { color: #94a3b8; }
      &.active { color: #a78bfa; border-bottom-color: #7c3aed; }
    }

    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      gap: 1rem; padding: 4rem 2rem; color: #475569; text-align: center;
      mat-icon { font-size: 3rem; width: 3rem; height: 3rem; }
      p { font-size: 0.875rem; }
    }

    .rated-grid {
      display: grid; gap: 0.75rem;
      grid-template-columns: 1fr;
      @media (min-width: 640px) { grid-template-columns: repeat(2, 1fr); }
      @media (min-width: 1024px) { grid-template-columns: repeat(3, 1fr); }
    }

    .rated-item {
      display: flex; align-items: center; gap: 0.875rem; padding: 0.75rem;
      background: rgba(26,26,36,0.6); border: 1px solid rgba(255,255,255,0.06);
      border-radius: 10px; text-decoration: none; transition: border-color 0.15s;
      &:hover { border-color: rgba(124,58,237,0.3); }
    }

    .rated-poster {
      width: 48px; height: 72px; border-radius: 6px; overflow: hidden; flex-shrink: 0;
      img { width: 100%; height: 100%; object-fit: cover; }
    }

    .rated-info { flex: 1; min-width: 0; }
    .rated-title { font-size: 0.875rem; font-weight: 600; color: #f1f5f9; margin: 0 0 0.375rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .wl-grid {
      display: grid; gap: 1rem;
      grid-template-columns: 1fr;
      @media (min-width: 640px) { grid-template-columns: repeat(2, 1fr); }
      @media (min-width: 1024px) { grid-template-columns: repeat(3, 1fr); }
    }

    .wl-card {
      display: flex; align-items: center; gap: 1rem; padding: 1rem;
      text-decoration: none; cursor: pointer;
      &:hover { border-color: rgba(124,58,237,0.3) !important; }
    }

    .wl-icon {
      width: 44px; height: 44px; border-radius: 10px; background: rgba(124,58,237,0.2);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      mat-icon { color: #a78bfa; }
    }

    .wl-name { font-size: 0.9375rem; font-weight: 600; color: #f1f5f9; margin: 0; }
    .wl-count { font-size: 0.8125rem; color: #64748b; margin: 0.125rem 0 0; }

    .public-wl-list { display: flex; flex-direction: column; gap: 0.625rem; }

    .public-wl-section { display: flex; flex-direction: column; }

    .public-wl-header {
      display: flex; align-items: center; gap: 0.875rem; padding: 0.875rem 1rem;
      width: 100%; border: none; cursor: pointer; text-align: left;
      transition: border-color 0.15s;
      &:hover { border-color: rgba(124,58,237,0.3) !important; }
    }

    .wl-chevron {
      color: #64748b; flex-shrink: 0; transition: transform 0.2s ease;
      &.rotated { transform: rotate(180deg); color: #a78bfa; }
    }

    .reviews-list {
      display: flex; flex-direction: column; gap: 0.75rem;
    }

    .review-card {
      display: flex; flex-direction: row; gap: 0.875rem; padding: 0.75rem;
      text-decoration: none; transition: border-color 0.15s; align-items: flex-start;
      &:hover { border-color: rgba(124,58,237,0.3) !important; }
    }

    .review-poster {
      width: 56px; height: 84px; border-radius: 6px; overflow: hidden; flex-shrink: 0;
      background: rgba(255,255,255,0.05);
      img { width: 100%; height: 100%; object-fit: cover; display: block; }
    }

    .review-poster-placeholder {
      width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
      mat-icon { color: #475569; font-size: 1.5rem; width: 1.5rem; height: 1.5rem; }
    }

    .review-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.375rem; }

    .review-movie-title {
      font-size: 0.9375rem; font-weight: 600; color: #f1f5f9; margin: 0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    .review-top {
      display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;
    }

    .review-date { font-size: 0.8125rem; color: #64748b; }

    .review-content {
      font-size: 0.875rem; color: #94a3b8; line-height: 1.6; margin: 0;
      display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
    }

    .edit-form { border: 1px solid rgba(124,58,237,0.3); }
    .edit-fields { display: flex; flex-direction: column; gap: 1rem; }
    .field-group { display: flex; flex-direction: column; gap: 0.375rem; }
    .field-label { font-size: 0.8125rem; font-weight: 600; color: #64748b; }
    .field-input {
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px; color: #f1f5f9; padding: 0.625rem 0.875rem;
      font-size: 0.9375rem; outline: none; font-family: inherit; width: 100%; box-sizing: border-box;
      &:focus { border-color: rgba(124,58,237,0.5); }
      &::placeholder { color: #475569; }
    }
    .field-textarea { resize: vertical; line-height: 1.5; }
  `],
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notifications = inject(NotificationService);
  protected readonly friendsService = inject(FriendsService);

  protected readonly library = inject(UserLibraryService);
  protected readonly watchlistService = inject(WatchlistService);
  private readonly reviewService = inject(ReviewService);
  private readonly movieService = inject(MovieService);

  protected readonly user = signal<User | null>(null);
  protected readonly isOwnProfile = signal(false);
  protected readonly loading = signal(false);
  protected readonly activeTab = signal<'watched' | 'rated' | 'watchlists'>('watched');
  protected readonly editMode = signal(false);
  protected editDisplayName = '';
  protected editBio = '';

  // Friend profile data
  protected readonly friendProfileWatchlists = signal<Watchlist[]>([]);
  protected readonly friendReviews = signal<Review[]>([]);
  protected readonly friendActualCount = signal<number | null>(null);
  protected readonly loadingFriendData = signal(false);
  protected readonly expandedWatchlistId = signal<string | null>(null);
  protected readonly publicActiveTab = signal<'watchlists' | 'reviews'>('watchlists');

  protected readonly watchedCount = computed(() => this.library.watchedMovies().length);
  protected readonly ratedCount = computed(() => this.library.ratedMovies().length);
  protected readonly watchlistCount = computed(() => this.watchlistService.watchlists().length);
  protected readonly ownReviewCount = signal(0);

  protected readonly publicWatchlists = computed(() =>
    this.friendProfileWatchlists()
  );

  protected readonly friendWatchedCount = computed(() => {
    const gezien = this.friendProfileWatchlists().find(wl => wl.name === 'Gezien');
    return gezien?.movies?.length ?? gezien?._count?.movies ?? 0;
  });

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
          this.reviewService.getUserReviews(u.id).subscribe(reviews => this.ownReviewCount.set(reviews.length));
        }
      }
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
          getDocs(query(collection(db, 'users'), where('username', '==', username)))
            .then(snap => {
              if (snap.empty) {
                this.user.set(null);
              } else {
                const userDoc = snap.docs[0];
                this.user.set({ id: userDoc.id, ...userDoc.data() } as User);
                this.loadFriendData(userDoc.id);
              }
              this.loading.set(false);
            })
            .catch(err => {
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

    Promise.all([
      getDocs(query(collection(db, 'friendRequests'), where('senderId', '==', userId), where('status', '==', 'accepted'))),
      getDocs(query(collection(db, 'friendRequests'), where('receiverId', '==', userId), where('status', '==', 'accepted'))),
      firstValueFrom(this.watchlistService.loadFriendWatchlists(userId)),
      firstValueFrom(this.reviewService.getUserReviews(userId)),
    ]).then(async ([sentSnap, receivedSnap, watchlists, reviews]) => {
      this.friendActualCount.set(sentSnap.size + receivedSnap.size);
      this.friendProfileWatchlists.set(watchlists);

      const missing = reviews.filter(r => !r.moviePosterPath);
      if (missing.length > 0) {
        const details = await Promise.allSettled(
          missing.map(r => firstValueFrom(this.movieService.getMovieDetail(r.movieId)))
        );
        const enriched = reviews.map(r => {
          if (r.moviePosterPath) return r;
          const idx = missing.findIndex(m => m.id === r.id);
          const result = details[idx];
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
    this.editMode.set(true);
  }

  protected cancelEdit(): void {
    this.editMode.set(false);
  }

  protected saveEdit(): void {
    const u = this.user();
    if (!u) return;
    this.authService.updateProfileData({
      displayName: this.editDisplayName.trim() || u.displayName,
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
