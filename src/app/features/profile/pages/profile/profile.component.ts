import { Component, computed, effect, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
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
              @if (isOwnProfile() && editMode()) {
                <button
                  type="button"
                  class="avatar-upload-btn"
                  [disabled]="uploadingAvatar()"
                  (click)="avatarInput.click()"
                >
                  @if (uploadingAvatar()) {
                    <mat-icon class="animate-spin">refresh</mat-icon>
                  } @else {
                    <mat-icon>photo_camera</mat-icon>
                  }
                </button>
                <input #avatarInput type="file" accept="image/*" hidden (change)="onAvatarSelected($event)" />
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

            <!-- E-mail wijzigen -->
            <div class="edit-form glass-card p-6 mt-4">
              <h3 class="settings-section-title">
                <mat-icon>email</mat-icon>
                E-mailadres wijzigen
              </h3>
              <p class="settings-section-desc">Je ontvangt een bevestigingsmail op het nieuwe adres.</p>
              @if (emailChangeSuccess()) {
                <div class="settings-success">
                  <mat-icon>check_circle</mat-icon>
                  Bevestigingsmail verstuurd naar {{ editNewEmail }}. Klik op de link om de wijziging door te voeren.
                </div>
              } @else {
                <div class="edit-fields">
                  <div class="field-group">
                    <label class="field-label">Huidig wachtwoord</label>
                    <input class="field-input" type="password" [(ngModel)]="emailCurrentPassword" placeholder="Ter bevestiging" />
                  </div>
                  <div class="field-group">
                    <label class="field-label">Nieuw e-mailadres</label>
                    <input class="field-input" type="email" [(ngModel)]="editNewEmail" placeholder="nieuw@email.nl" />
                  </div>
                </div>
                @if (emailChangeError()) {
                  <p class="settings-error">{{ emailChangeError() }}</p>
                }
                <div class="flex gap-2 mt-4">
                  <button mat-flat-button color="primary" [disabled]="savingEmail()" (click)="saveEmail()">
                    @if (savingEmail()) { Versturen... } @else { Bevestigingsmail sturen }
                  </button>
                </div>
              }
            </div>

            <!-- Wachtwoord wijzigen -->
            <div class="edit-form glass-card p-6 mt-4">
              <h3 class="settings-section-title">
                <mat-icon>lock</mat-icon>
                Wachtwoord wijzigen
              </h3>
              @if (passwordChangeSuccess()) {
                <div class="settings-success">
                  <mat-icon>check_circle</mat-icon>
                  Wachtwoord succesvol gewijzigd.
                </div>
              } @else {
                <div class="edit-fields">
                  <div class="field-group">
                    <label class="field-label">Huidig wachtwoord</label>
                    <input class="field-input" type="password" [(ngModel)]="passwordCurrent" placeholder="Huidig wachtwoord" />
                  </div>
                  <div class="field-group">
                    <label class="field-label">Nieuw wachtwoord</label>
                    <input class="field-input" type="password" [(ngModel)]="passwordNew" placeholder="Minimaal 8 tekens" />
                  </div>
                  <div class="field-group">
                    <label class="field-label">Herhaal nieuw wachtwoord</label>
                    <input class="field-input" type="password" [(ngModel)]="passwordConfirm" placeholder="Nogmaals nieuw wachtwoord" />
                  </div>
                </div>
                @if (passwordChangeError()) {
                  <p class="settings-error">{{ passwordChangeError() }}</p>
                }
                <div class="flex gap-2 mt-4">
                  <button mat-flat-button color="primary" [disabled]="savingPassword()" (click)="savePassword()">
                    @if (savingPassword()) { Opslaan... } @else { Wachtwoord wijzigen }
                  </button>
                </div>
              }
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
      background: linear-gradient(135deg, var(--color-violet-deep) 0%, var(--color-surface-200) 40%, var(--color-surface) 100%);
      position: relative;
      &::after {
        content: '';
        position: absolute;
        inset: 0;
        background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%237c3aed' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
      }
      @media (max-width: 767px) {
        height: 150px;
        &::after { display: none; }
      }
    }

    .profile-header {
      display: flex; flex-direction: column; gap: 1.25rem; margin-top: -48px; position: relative;
      @media (min-width: 768px) { flex-direction: row; align-items: flex-end; gap: 1.5rem; }
    }

    .profile-avatar {
      width: 96px; height: 96px; border-radius: 50%; border: 4px solid var(--color-surface);
      background: linear-gradient(135deg, var(--color-accent), var(--color-accent-light));
      display: flex; align-items: center; justify-content: center;
      font-size: 2.5rem; font-weight: 700; color: white; flex-shrink: 0; overflow: hidden;
      position: relative;
      img { width: 100%; height: 100%; object-fit: cover; }
    }

    .avatar-upload-btn {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      background: rgba(var(--color-black-rgb), 0.5); border: none; border-radius: 50%;
      color: white; cursor: pointer; opacity: 0; transition: opacity 0.15s ease;
      mat-icon { font-size: 1.5rem; width: 1.5rem; height: 1.5rem; }
      &:hover, &:focus-visible { opacity: 1; }
      &:disabled { opacity: 1; cursor: default; }
    }

    .profile-info { flex: 1; }
    .profile-name { font-size: 1.75rem; font-weight: 800; color: var(--color-text-primary); letter-spacing: -0.03em; margin: 0; }
    .profile-username { font-size: 0.875rem; color: var(--color-text-meta); margin: 0.25rem 0; }
    .profile-bio { font-size: 0.875rem; color: var(--color-text-secondary); margin: 0.5rem 0; }

    .profile-stats {
      display: flex; gap: 1.5rem; margin-top: 0.75rem; flex-wrap: wrap;
      @media (min-width: 768px) { gap: 2rem; }
      .stat { display: flex; flex-direction: column; align-items: center; gap: 0.125rem; }
      .stat-value { font-size: 1.25rem; font-weight: 700; color: var(--color-text-primary); }
      .stat-label { font-size: 0.75rem; color: var(--color-text-meta); }
    }

    .profile-actions {
      flex-shrink: 0;
      @media (max-width: 767px) {
        button { height: 44px; }
      }
    }

    .profile-tabs {
      display: flex; gap: 0.5rem; overflow-x: auto;
      scrollbar-width: none; &::-webkit-scrollbar { display: none; }
      border-bottom: 1px solid rgba(var(--color-white-rgb),0.06); padding-bottom: 0;
    }

    .profile-tab {
      display: inline-flex; align-items: center; gap: 0.375rem;
      padding: 0.625rem 1rem; border: none; background: transparent;
      color: var(--color-text-meta); font-size: 0.875rem; font-weight: 500; cursor: pointer;
      border-bottom: 2px solid transparent; margin-bottom: -1px; white-space: nowrap;
      transition: all 0.15s ease;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
      &:hover { color: var(--color-text-secondary); }
      &.active { color: var(--color-accent-light); border-bottom-color: var(--color-accent); }
      @media (max-width: 767px) { padding: 0.5rem 0.75rem; font-size: 0.8125rem; }
    }

    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      gap: 1rem; padding: 5rem 1.5rem; color: var(--color-text-muted); text-align: center;
      mat-icon { font-size: 2.5rem; width: 2.5rem; height: 2.5rem; }
      p { font-size: 0.875rem; }
    }

    .rated-grid {
      display: grid; gap: 1rem;
      grid-template-columns: 1fr;
      @media (min-width: 640px) { grid-template-columns: repeat(2, 1fr); }
      @media (min-width: 1024px) { grid-template-columns: repeat(3, 1fr); }
    }

    .rated-item {
      display: flex; align-items: center; gap: 0.875rem; padding: 0.75rem;
      background: rgba(var(--color-surface-50-rgb),0.6); border: 1px solid rgba(var(--color-white-rgb),0.06);
      border-radius: 10px; text-decoration: none; transition: border-color 0.15s;
      &:hover { border-color: rgba(var(--color-accent-rgb),0.3); }
    }

    .rated-poster {
      width: 48px; height: 72px; border-radius: 8px; overflow: hidden; flex-shrink: 0;
      img { width: 100%; height: 100%; object-fit: cover; }
    }

    .rated-info { flex: 1; min-width: 0; }
    .rated-title { font-size: 0.875rem; font-weight: 600; color: var(--color-text-primary); margin: 0 0 0.375rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .wl-grid {
      display: grid; gap: 1rem;
      grid-template-columns: 1fr;
      @media (min-width: 640px) { grid-template-columns: repeat(2, 1fr); }
      @media (min-width: 1024px) { grid-template-columns: repeat(3, 1fr); }
    }

    .wl-card {
      display: flex; align-items: center; gap: 1rem; padding: 1rem;
      text-decoration: none; cursor: pointer;
      &:hover { border-color: rgba(var(--color-accent-rgb),0.3) !important; }
      @media (max-width: 767px) { padding: 0.75rem 0.875rem; gap: 0.75rem; }
    }

    .wl-icon {
      width: 44px; height: 44px; border-radius: 10px; background: rgba(var(--color-accent-rgb),0.2);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      mat-icon { color: var(--color-accent-light); }
    }

    .wl-name { font-size: 0.9375rem; font-weight: 600; color: var(--color-text-primary); margin: 0; }
    .wl-count { font-size: 0.8125rem; color: var(--color-text-meta); margin: 0.125rem 0 0; }

    .public-wl-list { display: flex; flex-direction: column; gap: 0.625rem; }

    .public-wl-section { display: flex; flex-direction: column; }

    .public-wl-header {
      display: flex; align-items: center; gap: 0.875rem; padding: 0.875rem 1rem;
      width: 100%; border: none; cursor: pointer; text-align: left;
      transition: border-color 0.15s;
      &:hover { border-color: rgba(var(--color-accent-rgb),0.3) !important; }
      @media (max-width: 767px) { padding: 0.75rem 0.875rem; gap: 0.75rem; }
    }

    .wl-chevron {
      color: var(--color-text-meta); font-size: 1.25rem; width: 1.25rem; height: 1.25rem;
      flex-shrink: 0; transition: transform 0.2s ease;
      &.rotated { transform: rotate(180deg); color: var(--color-accent-light); }
    }

    .reviews-list {
      display: flex; flex-direction: column; gap: 0.75rem;
    }

    .review-card {
      display: flex; flex-direction: row; gap: 0.875rem; padding: 1rem;
      text-decoration: none; transition: border-color 0.15s; align-items: flex-start;
      &:hover { border-color: rgba(var(--color-accent-rgb),0.3) !important; }
    }

    .review-poster {
      width: 56px; height: 84px; border-radius: 8px; overflow: hidden; flex-shrink: 0;
      background: rgba(var(--color-white-rgb),0.05);
      img { width: 100%; height: 100%; object-fit: cover; display: block; }
    }

    .review-poster-placeholder {
      width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
      mat-icon { color: var(--color-text-muted); font-size: 1.5rem; width: 1.5rem; height: 1.5rem; }
    }

    .review-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.375rem; }

    .review-movie-title {
      font-size: 0.9375rem; font-weight: 600; color: var(--color-text-primary); margin: 0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    .review-top {
      display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;
    }

    .review-date { font-size: 0.8125rem; color: var(--color-text-meta); }

    .review-content {
      font-size: 0.875rem; color: var(--color-text-secondary); line-height: 1.6; margin: 0;
      display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
    }

    .edit-form { border: 1px solid rgba(var(--color-accent-rgb),0.3); }
    .edit-fields { display: flex; flex-direction: column; gap: 1rem; }
    .field-group { display: flex; flex-direction: column; gap: 0.375rem; }
    .field-label { font-size: 0.8125rem; font-weight: 600; color: var(--color-text-meta); }
    .field-input {
      background: rgba(var(--color-white-rgb),0.04); border: 1px solid rgba(var(--color-white-rgb),0.1);
      border-radius: 8px; color: var(--color-text-primary); padding: 0.625rem 0.875rem;
      font-size: 0.9375rem; outline: none; font-family: inherit; width: 100%; box-sizing: border-box;
      &:focus { border-color: rgba(var(--color-accent-rgb),0.5); }
      &::placeholder { color: var(--color-text-muted); }
    }
    .field-textarea { resize: vertical; line-height: 1.5; }
    .settings-section-title {
      display: flex; align-items: center; gap: 0.5rem;
      font-size: 1rem; font-weight: 600; color: var(--color-text-primary); margin: 0 0 0.375rem;
      mat-icon { font-size: 1.125rem; width: 1.125rem; height: 1.125rem; color: var(--color-accent-light); }
    }
    .settings-section-desc { font-size: 0.8125rem; color: var(--color-text-meta); margin: 0 0 1.25rem; }
    .settings-error { font-size: 0.8125rem; color: var(--color-danger-strong); margin: 0.75rem 0 0; }
    .settings-success {
      display: flex; align-items: flex-start; gap: 0.5rem;
      font-size: 0.875rem; color: var(--color-success); line-height: 1.5;
      mat-icon { font-size: 1.125rem; width: 1.125rem; height: 1.125rem; flex-shrink: 0; margin-top: 1px; }
    }
  `],
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

  protected readonly user = signal<User | null>(null);
  protected readonly isOwnProfile = signal(false);
  protected readonly loading = signal(false);
  protected readonly activeTab = signal<'watched' | 'rated' | 'watchlists'>('watched');
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

    Promise.all([
      firstValueFrom(this.friendsService.getAcceptedFriendCount(userId)),
      firstValueFrom(this.watchlistService.loadFriendWatchlists(userId)),
      firstValueFrom(this.reviewService.getUserReviews(userId)),
    ]).then(async ([friendCount, watchlists, reviews]) => {
      this.friendActualCount.set(friendCount);
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
