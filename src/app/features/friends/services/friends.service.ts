import { effect, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError } from 'rxjs';
import { User } from '../../../core/models/user.model';
import { AuthService } from '../../auth/services/auth.service';
import { environment } from '../../../../environments/environment';

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'declined';
  sender?: User;
  receiver?: User;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class FriendsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly _friends = signal<User[]>([]);
  private readonly _pendingRequests = signal<FriendRequest[]>([]);
  private readonly _sentRequests = signal<FriendRequest[]>([]);

  readonly friends = this._friends.asReadonly();
  readonly pendingRequests = this._pendingRequests.asReadonly();
  readonly sentRequests = this._sentRequests.asReadonly();

  constructor() {
    const authService = inject(AuthService);
    effect(() => {
      const user = authService.user();
      if (user) {
        this.loadAll();
      } else {
        this._friends.set([]);
        this._pendingRequests.set([]);
        this._sentRequests.set([]);
      }
    });
  }

  private loadAll(): void {
    this.http.get<User[]>(`${this.apiUrl}/friends`).subscribe({
      next: friends => this._friends.set(friends),
      error: () => {},
    });
    this.http.get<FriendRequest[]>(`${this.apiUrl}/friends/requests`).subscribe({
      next: requests => this._pendingRequests.set(requests),
      error: () => {},
    });
    this.http.get<FriendRequest[]>(`${this.apiUrl}/friends/requests/sent`).subscribe({
      next: requests => this._sentRequests.set(requests),
      error: () => {},
    });
  }

  reloadFromStorage(): void {
    this.loadAll();
  }

  getMyFriends(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/friends`).pipe(
      tap(friends => this._friends.set(friends)),
      catchError(() => of(this._friends())),
    );
  }

  getPendingRequests(): Observable<FriendRequest[]> {
    return this.http.get<FriendRequest[]>(`${this.apiUrl}/friends/requests`).pipe(
      tap(requests => this._pendingRequests.set(requests)),
      catchError(() => of(this._pendingRequests())),
    );
  }

  sendRequest(userId: string): Observable<FriendRequest> {
    return this.http.post<FriendRequest>(`${this.apiUrl}/friends/requests`, { userId }).pipe(
      tap(req => this._sentRequests.update(prev =>
        prev.some(r => r.id === req.id) ? prev : [...prev, req],
      )),
    );
  }

  acceptRequest(requestId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/friends/requests/${requestId}/accept`, {}).pipe(
      tap(() => {
        this._pendingRequests.update(prev => prev.filter(r => r.id !== requestId));
        this.getMyFriends().subscribe();
      }),
    );
  }

  declineRequest(requestId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/friends/requests/${requestId}/decline`, {}).pipe(
      tap(() => this._pendingRequests.update(prev => prev.filter(r => r.id !== requestId))),
    );
  }

  searchUsers(query: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users/search`, {
      params: { q: query },
    });
  }
}
