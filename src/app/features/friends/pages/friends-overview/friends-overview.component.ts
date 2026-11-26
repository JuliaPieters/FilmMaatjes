import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
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
    LoadingSpinnerComponent,
    EmptyStateComponent,
  ],
  templateUrl: './friends-overview.component.html',
  styleUrl: './friends-overview.component.scss',
})
export class FriendsOverviewComponent implements OnInit {
  private readonly friendsService = inject(FriendsService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly activeTab = signal<'friends' | 'requests' | 'search'>('friends');
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

    // switchMap: een tragere, oudere zoekopdracht mag een nieuwere niet overschrijven.
    this.searchControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      tap(query => this.searchLoading.set(!!query?.trim())),
      switchMap(query => query?.trim()
        ? this.friendsService.searchUsers(query).pipe(catchError(() => of([] as User[])))
        : of([] as User[])),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(users => {
      this.searchResults.set(users);
      this.searchLoading.set(false);
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
