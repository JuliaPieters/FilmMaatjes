import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { collection, collectionGroup, doc, query, where, onSnapshot, updateDoc, arrayUnion, Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase';
import { AuthService } from '../../features/auth/services/auth.service';
import { FriendsService } from '../../features/friends/services/friends.service';
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

  private readonly items = new Map<string, FriendActivity>();
  private readonly _activity = signal<FriendActivity[]>([]);
  private readonly _lastSeenAt = signal<string>('');
  private readonly _dismissedIds = signal<Set<string>>(new Set());
  private unsubscribers: Unsubscribe[] = [];
  private userDocUnsub: Unsubscribe | null = null;
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
      this.userDocUnsub?.();
      this.userDocUnsub = null;

      if (!user) {
        this._lastSeenAt.set('');
        this._dismissedIds.set(new Set());
        this.lastFriendIdsKey = '';
        this.teardown();
        return;
      }

      this.userDocUnsub = onSnapshot(
        doc(db, 'users', user.id),
        snap => {
          const data = snap.data();
          this._lastSeenAt.set(data?.['notificationsSeenAt'] ?? '');
          this._dismissedIds.set(new Set(data?.['notificationsDismissedIds'] ?? []));
        },
        () => {},
      );
    });

    effect(() => {
      const user = this.authService.user();
      const friends = this.friendsService.friends();
      if (!user) return;

      const friendIds = friends.map(f => f.id).sort();
      const key = friendIds.join(',');
      if (key === this.lastFriendIdsKey) {
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
    updateDoc(doc(db, 'users', user.id), { notificationsSeenAt: now }).catch(() => {});
  }

  isUnread(item: FriendActivity): boolean {
    return item.createdAt > this._lastSeenAt();
  }

  dismiss(id: string): void {
    const user = this.authService.user();
    if (!user) return;
    const next = new Set(this._dismissedIds());
    next.add(id);
    this._dismissedIds.set(next);
    updateDoc(doc(db, 'users', user.id), { notificationsDismissedIds: arrayUnion(id) }).catch(() => {});
  }

  clearAll(): void {
    const user = this.authService.user();
    if (!user) return;
    const ids = this._activity().map(item => item.id);
    const next = new Set(this._dismissedIds());
    for (const id of ids) next.add(id);
    this._dismissedIds.set(next);
    const now = new Date().toISOString();
    this._lastSeenAt.set(now);

    const updates: Record<string, unknown> = { notificationsSeenAt: now };
    if (ids.length) updates['notificationsDismissedIds'] = arrayUnion(...ids);
    updateDoc(doc(db, 'users', user.id), updates).catch(() => {});
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
      () => {},
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
      () => {},
    );
    this.unsubscribers.push(unsub);
  }
}
