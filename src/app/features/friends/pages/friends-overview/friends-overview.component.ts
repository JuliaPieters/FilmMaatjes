import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatTab, MatTabGroup } from '@angular/material/tabs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FriendsService } from '../../services/friends.service';
import { User } from '../../../../core/models/user.model';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-friends-overview',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatIcon,
    MatButton,
    MatIconButton,
    MatFormField,
    MatLabel,
    MatSuffix,
    MatInput,
    MatTab,
    MatTabGroup,
    LoadingSpinnerComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="page-container">
      <h1 class="text-3xl font-bold text-text-primary tracking-tight mb-6">Vrienden</h1>

      <mat-tab-group animationDuration="200ms" class="friends-tabs">
        <mat-tab label="Mijn vrienden">
          @if (loadingFriends()) {
            <app-loading-spinner message="Vrienden laden..." />
          } @else if (friends().length === 0) {
            <app-empty-state
              icon="people_outline"
              title="Nog geen vrienden"
              description="Zoek gebruikers om hen als vriend toe te voegen."
            />
          } @else {
            <div class="friends-grid mt-6">
              @for (friend of friends(); track friend.id) {
                <a class="friend-card glass-card p-4 flex items-center gap-3 no-underline" [routerLink]="['/profile', friend.username]">
                  <div class="friend-avatar">
                    @if (friend.avatar) {
                      <img [src]="friend.avatar" [alt]="friend.displayName" />
                    } @else {
                      <span>{{ friend.displayName.charAt(0).toUpperCase() }}</span>
                    }
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="friend-name text-text-primary font-semibold truncate">{{ friend.displayName }}</p>
                    <p class="friend-username text-text-muted text-sm truncate">&#64;{{ friend.username }}</p>
                  </div>
                  <mat-icon class="text-text-muted">chevron_right</mat-icon>
                </a>
              }
            </div>
          }
        </mat-tab>

        <mat-tab [label]="pendingRequests().length > 0 ? 'Vriendverzoeken (' + pendingRequests().length + ')' : 'Vriendverzoeken'">

          <div class="mt-6">
            <div class="flex items-center justify-between mb-4">
              <p class="text-text-muted text-sm">{{ pendingRequests().length }} openstaand{{ pendingRequests().length === 1 ? '' : 'e' }} verzoek{{ pendingRequests().length === 1 ? '' : 'en' }}</p>
              <button mat-stroked-button (click)="refreshRequests()">
                <mat-icon>refresh</mat-icon> Vernieuwen
              </button>
            </div>
            @if (pendingRequests().length === 0) {
              <app-empty-state
                icon="person_add_disabled"
                title="Geen openstaande verzoeken"
                description="Je hebt geen openstaande vriendschapsverzoeken."
              />
            } @else {
              <div class="friends-grid">
                @for (req of pendingRequests(); track req.id) {
                  <div class="friend-card glass-card p-4 flex items-center gap-3">
                    <div class="friend-avatar">
                      <span>{{ req.sender?.displayName?.charAt(0)?.toUpperCase() }}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="friend-name text-text-primary font-semibold">{{ req.sender?.displayName }}</p>
                      <p class="friend-username text-text-muted text-sm">&#64;{{ req.sender?.username }}</p>
                    </div>
                    <div class="flex gap-2">
                      <button mat-icon-button color="primary" class="request-accept-btn" (click)="acceptRequest(req.id)" title="Accepteren">
                        <mat-icon>check</mat-icon>
                      </button>
                      <button mat-icon-button class="request-decline-btn" (click)="declineRequest(req.id)" title="Weigeren">
                        <mat-icon>close</mat-icon>
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </mat-tab>

        <mat-tab label="Gebruikers zoeken">
          <div class="mt-6">
            <mat-form-field appearance="fill" class="friends-search-field w-full max-w-md">
              <mat-label>Zoek op naam of gebruikersnaam</mat-label>
              <input matInput [formControl]="searchControl" placeholder="Bijv. filmfan123" />
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>

            @if (searchLoading()) {
              <app-loading-spinner [diameter]="32" />
            } @else if (searchResults().length === 0 && searchControl.value?.trim()) {
              <app-empty-state
                icon="person_search"
                title="Geen gebruikers gevonden"
                description="Probeer een andere gebruikersnaam."
              />
            } @else if (searchResults().length > 0) {
              <div class="friends-grid mt-4">
                @for (user of searchResults(); track user.id) {
                  <div class="friend-card glass-card p-4 flex items-center gap-3">
                    <a class="flex items-center gap-3 flex-1 min-w-0 no-underline" [routerLink]="['/profile', user.username]">
                      <div class="friend-avatar">
                        <span>{{ user.displayName.charAt(0).toUpperCase() }}</span>
                      </div>
                      <div class="min-w-0">
                        <p class="friend-name text-text-primary font-semibold truncate">{{ user.displayName }}</p>
                        <p class="friend-username text-text-muted text-sm truncate">&#64;{{ user.username }}</p>
                      </div>
                    </a>
                    @if (friendIds().has(user.id)) {
                      <button mat-icon-button disabled class="status-btn" title="Al vrienden">
                        <mat-icon style="color: var(--color-success)">people</mat-icon>
                      </button>
                    } @else if (sentRequestIds().has(user.id)) {
                      <button mat-icon-button disabled class="status-btn" title="Verzoek verstuurd">
                        <mat-icon style="color: var(--color-accent-light)">hourglass_empty</mat-icon>
                      </button>
                    } @else {
                      <button mat-icon-button color="primary" class="status-btn" (click)="sendRequest(user.id)" title="Vriendschapsverzoek sturen">
                        <mat-icon class="status-icon-add">person_add</mat-icon>
                      </button>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .friends-grid {
      display: grid;
      grid-template-columns: repeat(1, 1fr);
      gap: 1rem;

      @media (min-width: 768px) {
        grid-template-columns: repeat(2, 1fr);
      }

      @media (min-width: 1024px) {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    .friend-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--color-accent), var(--color-accent-light));
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-weight: 700;
      color: white;
      font-size: 1.125rem;
      overflow: hidden;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    /* Mobile (<768px) — scrollable tab row, list-style cards, larger touch targets.
       Desktop (>=768px) styling above is left untouched. */
    @media (max-width: 767px) {
      /* noinspection CssUnusedSymbol */
      ::ng-deep .friends-tabs .mat-mdc-tab-header {
        border-bottom: 1px solid rgba(var(--color-white-rgb), 0.06);
      }

      /* noinspection CssUnusedSymbol */
      ::ng-deep .friends-tabs .mat-mdc-tab-labels {
        overflow-x: auto;
        scrollbar-width: none;
      }

      /* noinspection CssUnusedSymbol */
      ::ng-deep .friends-tabs .mat-mdc-tab-labels::-webkit-scrollbar {
        display: none;
      }

      /* noinspection CssUnusedSymbol */
      ::ng-deep .friends-tabs .mdc-tab {
        min-width: auto;
        padding: 0 12px;
        height: auto;
      }

      /* noinspection CssUnusedSymbol */
      ::ng-deep .friends-tabs .mdc-tab__content {
        padding: 14px 0;
      }

      /* noinspection CssUnusedSymbol */
      ::ng-deep .friends-tabs .mdc-tab__text-label {
        font-size: 14px !important;
        font-weight: 500 !important;
        color: var(--color-text-meta) !important;
        letter-spacing: normal !important;
      }

      /* noinspection CssUnusedSymbol */
      ::ng-deep .friends-tabs .mdc-tab--active .mdc-tab__text-label {
        color: var(--color-accent-light) !important;
      }

      /* noinspection CssUnusedSymbol */
      ::ng-deep .friends-tabs .mdc-tab-indicator__content--underline {
        border-color: var(--color-accent) !important;
        border-top-width: 2px !important;
      }

      .friend-name {
        font-size: 15px;
        font-weight: 600;
      }

      .friend-username {
        font-size: 13px;
        color: var(--color-text-muted);
      }

      .request-accept-btn,
      .request-decline-btn,
      .status-btn {
        width: 44px !important;
        height: 44px !important;
        line-height: 44px !important;
        padding: 0 !important;
      }

      .request-accept-btn {
        background: rgba(var(--color-accent-rgb), 0.15) !important;
        border-radius: 50%;
      }

      .request-accept-btn mat-icon {
        color: var(--color-accent-light) !important;
      }

      .request-decline-btn mat-icon {
        color: var(--color-text-secondary) !important;
      }

      .status-icon-add {
        color: var(--color-accent-light) !important;
      }

      /* noinspection CssUnusedSymbol */
      ::ng-deep .friends-search-field .mdc-text-field--filled {
        border-radius: 8px 8px 0 0;
      }

      /* noinspection CssUnusedSymbol */
      ::ng-deep .friends-search-field .mat-mdc-form-field-flex {
        height: 52px;
        align-items: center;
      }

      /* noinspection CssUnusedSymbol */
      ::ng-deep .friends-search-field .mat-mdc-form-field-infix {
        min-height: 52px;
        padding-top: 0;
        padding-bottom: 0;
        display: flex;
        align-items: center;
      }
    }
  `],
})
export class FriendsOverviewComponent implements OnInit {
  private readonly friendsService = inject(FriendsService);
  private readonly notifications = inject(NotificationService);

  protected readonly friends = this.friendsService.friends;
  protected readonly pendingRequests = this.friendsService.pendingRequests;
  protected readonly loadingFriends = signal(true);
  protected readonly searchLoading = signal(false);
  protected readonly searchResults = signal<User[]>([]);
  protected readonly searchControl = new FormControl('');

  protected readonly friendIds = computed(() => new Set(this.friendsService.friends().map(f => f.id)));
  protected readonly sentRequestIds = computed(() => new Set(this.friendsService.sentRequests().map(r => r.receiverId)));

  ngOnInit(): void {
    this.friendsService.reloadFromStorage();
    this.friendsService.getMyFriends().subscribe({ next: () => this.loadingFriends.set(false), error: () => this.loadingFriends.set(false) });
    this.friendsService.getPendingRequests().subscribe();

    this.searchControl.valueChanges.pipe(debounceTime(400), distinctUntilChanged()).subscribe(query => {
      if (!query?.trim()) { this.searchResults.set([]); return; }
      this.searchLoading.set(true);
      this.friendsService.searchUsers(query).subscribe({
        next: users => { this.searchResults.set(users); this.searchLoading.set(false); },
        error: () => this.searchLoading.set(false),
      });
    });
  }

  protected sendRequest(userId: string): void {
    this.friendsService.sendRequest(userId).subscribe({
      next: () => this.notifications.success('Vriendschapsverzoek verstuurd!'),
      error: () => this.notifications.error('Versturen mislukt.'),
    });
  }

  protected acceptRequest(id: string): void {
    this.friendsService.acceptRequest(id).subscribe({
      next: () => this.notifications.success('Vriendschap geaccepteerd!'),
    });
  }

  protected declineRequest(id: string): void {
    this.friendsService.declineRequest(id).subscribe();
  }

  protected refreshRequests(): void {
    this.friendsService.getPendingRequests().subscribe({
      next: () => this.notifications.success('Verzoeken vernieuwd'),
      error: () => this.notifications.error('Vernieuwen mislukt'),
    });
  }
}
