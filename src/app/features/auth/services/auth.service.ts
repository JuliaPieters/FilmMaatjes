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
  sendEmailVerification,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
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
        this._user.set({
          id: fbUser.uid,
          email: fbUser.email ?? '',
          username: fbUser.email?.split('@')[0] ?? fbUser.uid,
          displayName: fbUser.displayName ?? 'Gebruiker',
          avatar: fbUser.photoURL,
          bio: null,
          createdAt: fbUser.metadata.creationTime ?? new Date().toISOString(),
          _count: { watchlists: 0, reviews: 0, friends: 0 },
        });
        this._loading.set(false);
        const profileSnap = await getDoc(doc(db, 'users', fbUser.uid));
        const profile = profileSnap.data();
        if (profile) {
          this._user.update(u => u ? ({
            ...u,
            username: profile['username'] ?? u.username,
            displayName: profile['displayName'] ?? u.displayName,
            bio: profile['bio'] ?? null,
            createdAt: profile['createdAt'] ?? u.createdAt,
            _count: profile['_count'] ?? u._count,
          }) : null);
        }
      } else {
        this._user.set(null);
        this._loading.set(false);
      }
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
        await sendEmailVerification(cred.user);
        const createdAt = new Date().toISOString();
        await setDoc(doc(db, 'users', cred.user.uid), {
          username: data.username,
          displayName: data.displayName,
          email: data.email,
          bio: null,
          createdAt,
          _count: { watchlists: 0, reviews: 0, friends: 0 },
        });
        this._user.set({
          id: cred.user.uid,
          email: data.email,
          username: data.username,
          displayName: data.displayName,
          avatar: null,
          bio: null,
          createdAt,
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

  async updateProfileData(updates: { displayName?: string; bio?: string }): Promise<void> {
    const fbUser = auth.currentUser;
    const current = this._user();
    if (!fbUser || !current) throw new Error('Niet ingelogd');

    await updateProfile(fbUser, {
      displayName: updates.displayName ?? current.displayName,
    });

    await updateDoc(doc(db, 'users', fbUser.uid), {
      ...(updates.displayName !== undefined && { displayName: updates.displayName }),
      ...(updates.bio !== undefined && { bio: updates.bio }),
    });

    this._user.set({
      ...current,
      displayName: updates.displayName ?? current.displayName,
      bio: updates.bio !== undefined ? updates.bio : current.bio,
    });
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
