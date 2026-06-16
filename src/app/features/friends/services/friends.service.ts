import { effect, inject, Injectable, signal } from '@angular/core';
import { from, Observable, of, forkJoin } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import {
  collection, query, where, getDocs, addDoc, updateDoc,
  doc, limit, getDoc,
} from 'firebase/firestore';
import { User } from '../../../core/models/user.model';
import { AuthService } from '../../auth/services/auth.service';
import { db } from '../../../core/firebase';

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
  private readonly authService = inject(AuthService);

  private readonly _friends = signal<User[]>([]);
  private readonly _pendingRequests = signal<FriendRequest[]>([]);
  private readonly _sentRequests = signal<FriendRequest[]>([]);

  readonly friends = this._friends.asReadonly();
  readonly pendingRequests = this._pendingRequests.asReadonly();
  readonly sentRequests = this._sentRequests.asReadonly();

  constructor() {
    effect(() => {
      const user = this.authService.user();
      if (user) {
        this.loadAll(user.id);
      } else {
        this._friends.set([]);
        this._pendingRequests.set([]);
        this._sentRequests.set([]);
      }
    }, { allowSignalWrites: true });
  }

  private async loadAll(userId: string): Promise<void> {
    try {
      const [sentSnap, receivedSnap] = await Promise.all([
        getDocs(query(collection(db, 'friendRequests'), where('senderId', '==', userId))),
        getDocs(query(collection(db, 'friendRequests'), where('receiverId', '==', userId))),
      ]);

      const allRequests: FriendRequest[] = [
        ...sentSnap.docs.map(d => ({ id: d.id, ...d.data() } as FriendRequest)),
        ...receivedSnap.docs.map(d => ({ id: d.id, ...d.data() } as FriendRequest)),
      ];

      const accepted = allRequests.filter(r => r.status === 'accepted');
      const pending = allRequests.filter(r => r.status === 'pending' && r.receiverId === userId);
      const sent = allRequests.filter(r => r.status === 'pending' && r.senderId === userId);

      const friendIds = accepted.map(r => r.senderId === userId ? r.receiverId : r.senderId);
      const friends = await this.fetchUsers(friendIds);

      const pendingWithSenders = await Promise.all(
        pending.map(async req => {
          const senderSnap = await getDoc(doc(db, 'users', req.senderId));
          return {
            ...req,
            sender: senderSnap.exists() ? ({ id: senderSnap.id, ...senderSnap.data() } as User) : undefined,
          };
        })
      );

      this._friends.set(friends);
      this._pendingRequests.set(pendingWithSenders);
      this._sentRequests.set(sent);
    } catch {
      // Firestore unavailable, keep empty state
    }
  }

  private async fetchUsers(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const snaps = await Promise.all(ids.map(id => getDoc(doc(db, 'users', id))));
    return snaps
      .filter(s => s.exists())
      .map(s => ({ id: s.id, ...s.data() } as User));
  }

  reloadFromStorage(): void {
    const user = this.authService.user();
    if (user) this.loadAll(user.id);
  }

  getMyFriends(): Observable<User[]> {
    return of(this._friends());
  }

  getPendingRequests(): Observable<FriendRequest[]> {
    return of(this._pendingRequests());
  }

  sendRequest(userId: string): Observable<FriendRequest> {
    const currentUser = this.authService.user();
    if (!currentUser) return of({} as FriendRequest);

    const request = {
      senderId: currentUser.id,
      receiverId: userId,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    };

    return from(addDoc(collection(db, 'friendRequests'), request)).pipe(
      map(docRef => ({ id: docRef.id, ...request })),
      tap(req => this._sentRequests.update(prev => [...prev, req])),
      catchError(() => of({} as FriendRequest)),
    );
  }

  acceptRequest(requestId: string): Observable<void> {
    return from(updateDoc(doc(db, 'friendRequests', requestId), { status: 'accepted' })).pipe(
      tap(() => {
        const req = this._pendingRequests().find(r => r.id === requestId);
        if (req) {
          this._pendingRequests.update(prev => prev.filter(r => r.id !== requestId));
          const user = this.authService.user();
          if (user) this.loadAll(user.id);
        }
      }),
      catchError(() => of(undefined as void)),
    );
  }

  declineRequest(requestId: string): Observable<void> {
    return from(updateDoc(doc(db, 'friendRequests', requestId), { status: 'declined' })).pipe(
      tap(() => this._pendingRequests.update(prev => prev.filter(r => r.id !== requestId))),
      catchError(() => of(undefined as void)),
    );
  }

  searchUsers(searchQuery: string): Observable<User[]> {
    if (!searchQuery.trim()) return of([]);
    const currentUser = this.authService.user();
    const lower = searchQuery.toLowerCase();

    const usernameQuery = query(
      collection(db, 'users'),
      where('username', '>=', lower),
      where('username', '<=', lower + ''),
      limit(10),
    );

    return from(getDocs(usernameQuery)).pipe(
      map(snap => snap.docs
        .map(d => ({ id: d.id, ...d.data() } as User))
        .filter(u => u.id !== currentUser?.id)
      ),
      catchError(err => { console.error('[Friends] searchUsers mislukt:', err); return of([]); }),
    );
  }
}
