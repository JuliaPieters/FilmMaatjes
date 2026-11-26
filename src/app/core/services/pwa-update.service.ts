import { inject, Injectable } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { MatSnackBar } from '@angular/material/snack-bar';
import { filter } from 'rxjs/operators';

/**
 * Houdt de geïnstalleerde PWA up-to-date: zodra er een nieuwe versie klaarstaat
 * krijgt de gebruiker één melding met een knop om te herladen, in plaats van
 * ongemerkt op een oude build te blijven hangen.
 */
@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly snackBar = inject(MatSnackBar);

  init(): void {
    if (!this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates
      .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
      .subscribe(() => {
        this.snackBar
          .open('Er is een nieuwe versie van FilmMaatjes', 'Vernieuwen')
          .onAction()
          .subscribe(() => document.location.reload());
      });

    this.swUpdate.unrecoverable.subscribe(() => document.location.reload());

    // Een geïnstalleerde app wordt zelden echt herstart; check daarom bij terugkeren.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.swUpdate.checkForUpdate().catch(() => {});
      }
    });
  }
}
