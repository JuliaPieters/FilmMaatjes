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
  templateUrl: './friends-overview.component.html',
  styleUrl: './friends-overview.component.scss',
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
