import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Review, CreateReviewDto, UpdateReviewDto } from '../models/review.model';
import { StorageService } from './storage.service';
import { AuthService } from '../../features/auth/services/auth.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _movieReviews = signal<Review[]>([]);
  readonly movieReviews = this._movieReviews.asReadonly();

  private get storageKey(): string { return 'demo_reviews'; }

  getMovieReviews(movieId: number): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.apiUrl}/reviews/movie/${movieId}`).pipe(
      tap(reviews => this._movieReviews.set(reviews)),
      catchError(err => {
        if (this.isNetworkError(err)) {
          const all = this.storage.get<Review[]>(this.storageKey) ?? [];
          const reviews = all.filter(r => r.movieId === movieId);
          this._movieReviews.set(reviews);
          return of(reviews);
        }
        return throwError(() => err);
      }),
    );
  }

  createReview(dto: CreateReviewDto): Observable<Review> {
    return this.http.post<Review>(`${this.apiUrl}/reviews`, dto).pipe(
      tap(review => this._movieReviews.update(prev => [...prev, review])),
      catchError(err => {
        if (this.isNetworkError(err)) {
          const user = this.authService.user();
          if (!user) return throwError(() => err);
          const review: Review = {
            id: 'review-' + Date.now(),
            userId: user.id,
            movieId: dto.movieId,
            rating: dto.rating,
            content: dto.content,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            user,
            likesCount: 0,
            likedByCurrentUser: false,
          };
          const all = this.storage.get<Review[]>(this.storageKey) ?? [];
          this.storage.set(this.storageKey, [...all, review]);
          this._movieReviews.update(prev => [...prev, review]);
          return of(review);
        }
        return throwError(() => err);
      }),
    );
  }

  updateReview(id: string, dto: UpdateReviewDto): Observable<Review> {
    return this.http.patch<Review>(`${this.apiUrl}/reviews/${id}`, dto).pipe(
      tap(updated => this._movieReviews.update(prev => prev.map(r => r.id === id ? updated : r))),
      catchError(err => {
        if (this.isNetworkError(err)) {
          const all = this.storage.get<Review[]>(this.storageKey) ?? [];
          const updated = all.map(r =>
            r.id === id ? { ...r, ...dto, updatedAt: new Date().toISOString() } : r,
          );
          this.storage.set(this.storageKey, updated);
          this._movieReviews.update(prev =>
            prev.map(r => r.id === id ? { ...r, ...dto, updatedAt: new Date().toISOString() } : r),
          );
          return of(updated.find(r => r.id === id)!);
        }
        return throwError(() => err);
      }),
    );
  }

  deleteReview(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/reviews/${id}`).pipe(
      tap(() => this._movieReviews.update(prev => prev.filter(r => r.id !== id))),
      catchError(err => {
        if (this.isNetworkError(err)) {
          const all = this.storage.get<Review[]>(this.storageKey) ?? [];
          this.storage.set(this.storageKey, all.filter(r => r.id !== id));
          this._movieReviews.update(prev => prev.filter(r => r.id !== id));
          return of(undefined as void);
        }
        return throwError(() => err);
      }),
    );
  }

  getUserReviewForMovie(movieId: number): Review | null {
    const user = this.authService.user();
    if (!user) return null;
    return this._movieReviews().find(r => r.movieId === movieId && r.userId === user.id) ?? null;
  }

  private isNetworkError(err: unknown): boolean {
    const status = (err as { status?: number })?.status;
    return status === 0 || status === undefined;
  }
}
