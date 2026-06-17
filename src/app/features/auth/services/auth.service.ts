import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { from, Observable, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
  verifyBeforeUpdateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
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
        const cachedUsername = localStorage.getItem(`username_${fbUser.uid}`);
        this._user.set({
          id: fbUser.uid,
          email: fbUser.email ?? '',
          username: cachedUsername ?? fbUser.email?.split('@')[0] ?? fbUser.uid,
          displayName: fbUser.displayName ?? 'Gebruiker',
          avatar: fbUser.photoURL,
          bio: null,
          createdAt: fbUser.metadata.creationTime ?? new Date().toISOString(),
          _count: { watchlists: 0, reviews: 0, friends: 0 },
        });
        this._loading.set(false);
        getDoc(doc(db, 'users', fbUser.uid)).then(profileSnap => {
          const profile = profileSnap.data();
          if (profile) {
            if (profile['username']) localStorage.setItem(`username_${fbUser.uid}`, profile['username']);
            // Backfill missing lowercase search fields
            const missingFields: Record<string, string> = {};
            if (profile['username'] && !profile['usernameLower']) missingFields['usernameLower'] = profile['username'].toLowerCase();
            if (profile['displayName'] && !profile['displayNameLower']) missingFields['displayNameLower'] = profile['displayName'].toLowerCase();
            if (Object.keys(missingFields).length) updateDoc(doc(db, 'users', fbUser.uid), missingFields);
            this._user.update(u => u ? ({
              ...u,
              username: profile['username'] ?? u.username,
              displayName: profile['displayName'] ?? u.displayName,
              bio: profile['bio'] ?? null,
              createdAt: profile['createdAt'] ?? u.createdAt,
              _count: profile['_count'] ?? u._count,
            }) : null);
          } else {
            const username = cachedUsername ?? fbUser.email?.split('@')[0] ?? fbUser.uid;
            const displayName = fbUser.displayName ?? username;
            setDoc(doc(db, 'users', fbUser.uid), {
              username,
              usernameLower: username.toLowerCase(),
              displayName,
              displayNameLower: displayName.toLowerCase(),
              email: fbUser.email ?? '',
              bio: null,
              createdAt: fbUser.metadata.creationTime ?? new Date().toISOString(),
              _count: { watchlists: 0, reviews: 0, friends: 0 },
            }).catch(() => {});
            this._user.update(u => u ? ({ ...u, username, displayName }) : null);
          }
        }).catch(() => {});
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
        return throwError(() => ({ error: { message: this.mapError(err.code) } }));
      }),
      finalize(() => this._loading.set(false)),
    );
  }

  register(data: RegisterDto): Observable<void> {
    this._loading.set(true);
    return from(
      createUserWithEmailAndPassword(auth, data.email, data.password).then(async cred => {
        const createdAt = new Date().toISOString();
        localStorage.setItem(`username_${cred.user.uid}`, data.username);
        localStorage.setItem(`displayName_${cred.user.uid}`, data.displayName);
        await updateProfile(cred.user, { displayName: data.displayName });
        sendEmailVerification(cred.user);
        // User doc wordt aangemaakt door onAuthStateChanged zodra auth token klaar is
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
        return throwError(() => ({ error: { message: this.mapError(err.code) } }));
      }),
      finalize(() => this._loading.set(false)),
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

  async changeEmail(currentPassword: string, newEmail: string): Promise<void> {
    const fbUser = auth.currentUser;
    if (!fbUser || !fbUser.email) throw new Error('Niet ingelogd');
    const credential = EmailAuthProvider.credential(fbUser.email, currentPassword);
    await reauthenticateWithCredential(fbUser, credential).catch(err => {
      throw new Error(this.mapError(err.code));
    });
    await verifyBeforeUpdateEmail(fbUser, newEmail).catch(err => {
      throw new Error(this.mapError(err.code));
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const fbUser = auth.currentUser;
    if (!fbUser || !fbUser.email) throw new Error('Niet ingelogd');
    const credential = EmailAuthProvider.credential(fbUser.email, currentPassword);
    await reauthenticateWithCredential(fbUser, credential).catch(err => {
      throw new Error(this.mapError(err.code));
    });
    await updatePassword(fbUser, newPassword).catch(err => {
      throw new Error(this.mapError(err.code));
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
