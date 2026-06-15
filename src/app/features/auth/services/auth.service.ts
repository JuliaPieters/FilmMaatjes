import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthResponse, LoginDto, RegisterDto, User } from '../../../core/models/user.model';
import { StorageService } from '../../../core/services/storage.service';
import { environment } from '../../../../environments/environment';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly storage = inject(StorageService);
  private readonly apiUrl = environment.apiUrl;

  private readonly _state = signal<AuthState>({
    user: null,
    token: null,
    loading: false,
  });

  readonly user = computed(() => this._state().user);
  readonly token = computed(() => this._state().token);
  readonly isAuthenticated = computed(() => !!this._state().token);
  readonly isLoading = computed(() => this._state().loading);

  constructor() {
    const token = this.storage.get<string>('auth_token');
    const user = this.storage.get<User>('auth_user');
    if (token && user) {
      this._state.set({ user, token, loading: false });
    }
  }

  login(credentials: LoginDto): Observable<AuthResponse> {
    this._state.update(s => ({ ...s, loading: true }));
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap(response => this.handleAuthSuccess(response)),
      catchError(err => {
        if (this.isNetworkError(err)) {
          return this.demoLogin(credentials);
        }
        this._state.update(s => ({ ...s, loading: false }));
        return throwError(() => err);
      }),
    );
  }

  register(data: RegisterDto): Observable<AuthResponse> {
    this._state.update(s => ({ ...s, loading: true }));
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, data).pipe(
      tap(response => this.handleAuthSuccess(response)),
      catchError(err => {
        if (this.isNetworkError(err)) {
          return this.demoRegister(data);
        }
        this._state.update(s => ({ ...s, loading: false }));
        return throwError(() => err);
      }),
    );
  }

  logout(): void {
    this._state.set({ user: null, token: null, loading: false });
    this.storage.remove('auth_token');
    this.storage.remove('auth_user');
    this.router.navigate(['/auth/login']);
  }

  updateUser(user: User): void {
    this._state.update(s => ({ ...s, user }));
    this.storage.set('auth_user', user);
  }

  private handleAuthSuccess(response: AuthResponse): void {
    this._state.set({ user: response.user, token: response.accessToken, loading: false });
    this.storage.set('auth_token', response.accessToken);
    this.storage.set('auth_user', response.user);
  }

  private isNetworkError(err: unknown): boolean {
    return (err as { status?: number })?.status === 0 || (err as { status?: number })?.status === undefined;
  }

  private demoRegister(data: RegisterDto): Observable<AuthResponse> {
    const users = this.storage.get<User[]>('demo_users') ?? [];

    if (users.find(u => u.email === data.email)) {
      this._state.update(s => ({ ...s, loading: false }));
      return throwError(() => ({ error: { message: 'E-mailadres is al in gebruik.' } }));
    }
    if (users.find(u => u.username === data.username)) {
      this._state.update(s => ({ ...s, loading: false }));
      return throwError(() => ({ error: { message: 'Gebruikersnaam is al in gebruik.' } }));
    }

    const user: User = {
      id: 'demo-' + Date.now(),
      email: data.email,
      username: data.username,
      displayName: data.displayName,
      avatar: null,
      bio: null,
      createdAt: new Date().toISOString(),
      _count: { watchlists: 0, reviews: 0, friends: 0 },
    };

    this.storage.set('demo_users', [...users, user]);

    const response: AuthResponse = { user, accessToken: 'demo-token-' + user.id };
    this.handleAuthSuccess(response);
    return of(response);
  }

  private demoLogin(credentials: LoginDto): Observable<AuthResponse> {
    const users = this.storage.get<User[]>('demo_users') ?? [];
    const user = users.find(u => u.email === credentials.email);

    if (!user) {
      this._state.update(s => ({ ...s, loading: false }));
      return throwError(() => ({ error: { message: 'E-mailadres niet gevonden. Maak eerst een account aan.' } }));
    }

    const response: AuthResponse = { user, accessToken: 'demo-token-' + user.id };
    this.handleAuthSuccess(response);
    return of(response);
  }
}
