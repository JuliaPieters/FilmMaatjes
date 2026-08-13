import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { collection, collectionGroup, query, where, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase';
import { AuthService } from '../../features/auth/services/auth.service';
import { FriendsService } from '../../features/friends/services/friends.service';
import { StorageService } from './storage.service';
import { FriendActivity } from '../models/friend-activity.model';

const CHUNK_SIZE = 10;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

@Injectable({ providedIn: 'root' })
export class FriendActivityService {
  private readonly authService = inject(AuthService);
  private readonly friendsService = inject(FriendsService);
  private readonly storage = inject(StorageService);

  private readonly items = new Map<string, FriendActivity>();
  private readonly _activity = signal<FriendActivity[]>([]);
  private readonly _lastSeenAt = signal<string>('');
  private readonly _dismissedIds = signal<Set<string>>(new Set());
  private unsubscribers: Unsubscribe[] = [];
  private lastFriendIdsKey = '';

  readonly activity = computed(() => {
    const dismissed = this._dismissedIds();
    return this._activity().filter(a => !dismissed.has(a.id));
  });

  readonly unreadCount = computed(() => {
    const seen = this._lastSeenAt();
    return this.activity().filter(a => a.createdAt > seen).length;
  });

  constructor() {
    effect(() => {
      const user = this.authService.user();
      if (!user) {
        this._lastSeenAt.set('');
        this._dismissedIds.set(new Set());
        this.lastFriendIdsKey = '';
        this.teardown();
        return;
      }
      this._lastSeenAt.set(this.storage.get<string>(this.seenKey(user.id)) ?? '');
      const dismissed = this.storage.get<string[]>(this.dismissedKey(user.id)) ?? [];
      this._dismissedIds.set(new Set(dismissed));
    });

    effect(() => {
      const user = this.authService.user();
      const friends = this.friendsService.friends();
      if (!user) return;

      const friendIds = friends.map(f => f.id).sort();
      const key = friendIds.join(',');
      if (key === this.lastFriendIdsKey) {
        // Friend names/avatars may still have changed; keep the list fresh.
        this.rebuild();
        return;
      }
      this.lastFriendIdsKey = key;

      this.teardown();
      if (friendIds.length === 0) return;

      for (const ids of chunk(friendIds, CHUNK_SIZE)) {
        this.attachReviews(ids);
        this.attachRatings(ids);
      }
    });
  }

  markAllSeen(): void {
    const user = this.authService.user();
    if (!user) return;
    const now = new Date().toISOString();
    this._lastSeenAt.set(now);
    this.storage.set(this.seenKey(user.id), now);
  }

  isUnread(item: FriendActivity): boolean {
    return item.createdAt > this._lastSeenAt();
  }

  dismiss(id: string): void {
    const next = new Set(this._dismissedIds());
    next.add(id);
    this.persistDismissed(next);
  }

  clearAll(): void {
    const next = new Set(this._dismissedIds());
    for (const item of this._activity()) next.add(item.id);
    this.persistDismissed(next);
    this.markAllSeen();
  }

  private persistDismissed(ids: Set<string>): void {
    this._dismissedIds.set(ids);
    const user = this.authService.user();
    if (!user) return;
    this.storage.set(this.dismissedKey(user.id), Array.from(ids));
  }

  private seenKey(userId: string): string {
    return `friend_activity_seen_${userId}`;
  }

  private dismissedKey(userId: string): string {
    return `friend_activity_dismissed_${userId}`;
  }

  private teardown(): void {
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
    this.items.clear();
    this.rebuild();
  }

  private rebuild(): void {
    const friendsById = new Map(this.friendsService.friends().map(f => [f.id, f]));
    const list = Array.from(this.items.values())
      .map(item => {
        const friend = friendsById.get(item.userId);
        return {
          ...item,
          userName: friend?.displayName ?? item.userName ?? 'Een vriend',
          userAvatar: friend?.avatar ?? null,
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    this._activity.set(list.slice(0, 50));
  }

  private attachReviews(friendIds: string[]): void {
    const q = query(collection(db, 'reviews'), where('userId', 'in', friendIds));
    let prevIds = new Set<string>();
    const unsub = onSnapshot(
      q,
      snap => {
        const newIds = new Set(snap.docs.map(d => `review:${d.id}`));
        for (const id of prevIds) if (!newIds.has(id)) this.items.delete(id);
        for (const d of snap.docs) {
          const data = d.data();
          const id = `review:${d.id}`;
          this.items.set(id, {
            id,
            type: 'review',
            userId: data['userId'],
            userName: data['displayName'] ?? '',
            userAvatar: null,
            movieId: data['movieId'],
            movieTitle: data['movieTitle'] ?? 'een film',
            moviePosterPath: data['moviePosterPath'] ?? null,
            rating: data['rating'],
            content: data['content'],
            createdAt: data['createdAt'],
          });
        }
        prevIds = newIds;
        this.rebuild();
      },
      () => {
        // Firestore unavailable or read denied — keep prior state.
      },
    );
    this.unsubscribers.push(unsub);
  }

  private attachRatings(friendIds: string[]): void {
    const q = query(collectionGroup(db, 'ratings'), where('userId', 'in', friendIds));
    let prevIds = new Set<string>();
    const unsub = onSnapshot(
      q,
      snap => {
        const newIds = new Set(snap.docs.map(d => `rating:${d.data()['userId']}:${d.id}`));
        for (const id of prevIds) if (!newIds.has(id)) this.items.delete(id);
        for (const d of snap.docs) {
          const data = d.data();
          const id = `rating:${data['userId']}:${d.id}`;
          this.items.set(id, {
            id,
            type: 'rating',
            userId: data['userId'],
            userName: '',
            userAvatar: null,
            movieId: data['movieId'],
            movieTitle: data['movie']?.title ?? 'een film',
            moviePosterPath: data['movie']?.poster_path ?? null,
            rating: data['rating'],
            createdAt: data['ratedAt'] ?? '',
          });
        }
        prevIds = newIds;
        this.rebuild();
      },
      () => {
        // Firestore unavailable or read denied — keep prior state.
      },
    );
    this.unsubscribers.push(unsub);
  }
}
