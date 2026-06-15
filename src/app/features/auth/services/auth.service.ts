import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { from, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../core/firebase';
import { LoginDto, RegisterDto, User } from '../../../core/models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);

  private readonly _user = signal<User | null>(null);
  private readonly _loading = signal(true);

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => !!this._user());
  readonly isLoading = this._loading.asReadonly();

  constructor() {
    onAuthStateChanged(auth, async fbUser => {
      if (fbUser) {
        const profileSnap = await getDoc(doc(db, 'users', fbUser.uid));
        const profile = profileSnap.data();
        this._user.set({
          id: fbUser.uid,
          email: fbUser.email ?? '',
          username: profile?.['username'] ?? fbUser.email?.split('@')[0] ?? fbUser.uid,
          displayName: fbUser.displayName ?? profile?.['displayName'] ?? 'Gebruiker',
          avatar: fbUser.photoURL,
          bio: profile?.['bio'] ?? null,
          createdAt: profile?.['createdAt'] ?? fbUser.metadata.creationTime ?? new Date().toISOString(),
          _count: profile?.['_count'] ?? { watchlists: 0, reviews: 0, friends: 0 },
        });
      } else {
        this._user.set(null);
      }
      this._loading.set(false);
    });
  }

  login(credentials: LoginDto): Observable<void> {
    this._loading.set(true);
    return from(
      signInWithEmailAndPassword(auth, credentials.email, credentials.password).then(() => undefined as void),
    ).pipe(
      catchError(err => {
        this._loading.set(false);
        return throwError(() => ({ error: { message: this.mapError(err.code) } }));
      }),
    );
  }

  register(data: RegisterDto): Observable<void> {
    this._loading.set(true);
    return from(
      createUserWithEmailAndPassword(auth, data.email, data.password).then(async cred => {
        await updateProfile(cred.user, { displayName: data.displayName });
        await setDoc(doc(db, 'users', cred.user.uid), {
          username: data.username,
          displayName: data.displayName,
          email: data.email,
          bio: null,
          createdAt: new Date().toISOString(),
          _count: { watchlists: 0, reviews: 0, friends: 0 },
        });
      }),
    ).pipe(
      catchError(err => {
        this._loading.set(false);
        return throwError(() => ({ error: { message: this.mapError(err.code) } }));
      }),
    );
  }

  logout(): void {
    signOut(auth).then(() => {
      this._user.set(null);
      this.router.navigate(['/auth/login']);
    });
  }

  updateUser(updates: Partial<User>): void {
    const current = this._user();
    if (current) {
      this._user.set({ ...current, ...updates });
    }
  }

  private mapError(code: string): string {
    const map: Record<string, string> = {
      'auth/user-not-found': 'E-mailadres niet gevonden.',
      'auth/wrong-password': 'Wachtwoord is onjuist.',
      'auth/invalid-credential': 'E-mailadres of wachtwoord is onjuist.',
      'auth/email-already-in-use': 'E-mailadres is al in gebruik.',
      'auth/weak-password': 'Wachtwoord is te zwak (minimaal 6 tekens).',
      'auth/invalid-email': 'Ongeldig e-mailadres.',
      'auth/too-many-requests': 'Te veel pogingen. Probeer het later opnieuw.',
      'auth/network-request-failed': 'Netwerkfout. Controleer je verbinding.',
      'auth/operation-not-allowed': 'Deze aanmeldmethode is niet ingeschakeld.',
    };
    return map[code] ?? 'Er is een fout opgetreden. Probeer het opnieuw.';
  }
}
