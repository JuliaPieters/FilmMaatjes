import { inject, Injectable, signal } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import {
  collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc,
} from 'firebase/firestore';
import { Review, CreateReviewDto, UpdateReviewDto } from '../models/review.model';
import { AuthService } from '../../features/auth/services/auth.service';
import { db } from '../firebase';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly authService = inject(AuthService);

  private readonly _movieReviews = signal<Review[]>([]);
  readonly movieReviews = this._movieReviews.asReadonly();

  getMovieReviews(movieId: number): Observable<Review[]> {
    return from(
      getDocs(query(collection(db, 'reviews'), where('movieId', '==', movieId)))
        .then(snap => snap.docs
          .map(d => {
            const data = d.data();
            return {
              id: d.id,
              movieId: data['movieId'],
              userId: data['userId'],
              rating: data['rating'],
              content: data['content'],
              createdAt: data['createdAt'],
              updatedAt: data['updatedAt'],
              user: {
                id: data['userId'],
                username: data['username'] ?? 'gebruiker',
                displayName: data['displayName'] ?? 'Gebruiker',
                email: '',
                avatar: null,
                bio: null,
                createdAt: '',
                _count: { watchlists: 0, reviews: 0, friends: 0 },
              },
              likesCount: 0,
              likedByCurrentUser: false,
            } as Review;
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        )
    ).pipe(
      tap(reviews => this._movieReviews.set(reviews)),
      catchError(() => {
        this._movieReviews.set([]);
        return of([]);
      }),
    );
  }

  createReview(dto: CreateReviewDto): Observable<Review> {
    const user = this.authService.user();
    if (!user) return throwError(() => new Error('Niet ingelogd'));

    const now = new Date().toISOString();
    const data = {
      movieId: dto.movieId,
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      rating: dto.rating,
      content: dto.content,
      createdAt: now,
      updatedAt: now,
    };

    return from(addDoc(collection(db, 'reviews'), data)).pipe(
      map(ref => ({
        id: ref.id,
        ...data,
        user,
        likesCount: 0,
        likedByCurrentUser: false,
      } as Review)),
      tap(review => this._movieReviews.update(prev => [review, ...prev])),
      catchError(() => throwError(() => new Error('Review opslaan mislukt'))),
    );
  }

  updateReview(id: string, dto: UpdateReviewDto): Observable<Review> {
    const updatedAt = new Date().toISOString();
    return from(updateDoc(doc(db, 'reviews', id), { ...dto, updatedAt })).pipe(
      map(() => {
        const existing = this._movieReviews().find(r => r.id === id)!;
        return { ...existing, ...dto, updatedAt };
      }),
      tap(updated => this._movieReviews.update(prev => prev.map(r => r.id === id ? updated : r))),
      catchError(() => throwError(() => new Error('Review bijwerken mislukt'))),
    );
  }

  deleteReview(id: string): Observable<void> {
    return from(deleteDoc(doc(db, 'reviews', id))).pipe(
      tap(() => this._movieReviews.update(prev => prev.filter(r => r.id !== id))),
      catchError(() => throwError(() => new Error('Review verwijderen mislukt'))),
    );
  }

  getUserReviews(userId: string): Observable<Review[]> {
    return from(
      getDocs(query(collection(db, 'reviews'), where('userId', '==', userId)))
        .then(snap => snap.docs
          .map(d => {
            const data = d.data();
            return {
              id: d.id,
              movieId: data['movieId'],
              userId: data['userId'],
              rating: data['rating'],
              content: data['content'],
              createdAt: data['createdAt'],
              updatedAt: data['updatedAt'],
              user: {
                id: data['userId'],
                username: data['username'] ?? 'gebruiker',
                displayName: data['displayName'] ?? 'Gebruiker',
                email: '',
                avatar: null,
                bio: null,
                createdAt: '',
                _count: { watchlists: 0, reviews: 0, friends: 0 },
              },
              likesCount: 0,
              likedByCurrentUser: false,
            } as Review;
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        )
    ).pipe(catchError(() => of([])));
  }

  getUserReviewForMovie(movieId: number): Review | null {
    const user = this.authService.user();
    if (!user) return null;
    return this._movieReviews().find(r => r.movieId === movieId && r.userId === user.id) ?? null;
  }
}
