import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, MatButton, MatIcon],
  template: `
    <div class="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-6 text-center">
      <div class="not-found-container">
        <div class="error-code gradient-text">404</div>
        <div class="error-icon">
          <mat-icon>movie_off</mat-icon>
        </div>
        <h1 class="text-2xl font-bold text-text-primary mb-2">Pagina niet gevonden</h1>
        <p class="text-text-secondary max-w-sm mb-8">
          De pagina die je zoekt bestaat niet of is verplaatst.
          Ga terug naar de homepage.
        </p>
        <div class="flex gap-3 justify-center">
          <a mat-flat-button color="primary" routerLink="/">
            <mat-icon>home</mat-icon>
            Naar Homepage
          </a>
          <a mat-stroked-button routerLink="/movies">
            <mat-icon>movie</mat-icon>
            Films ontdekken
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .not-found-container {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .error-code {
      font-size: 8rem;
      font-weight: 900;
      letter-spacing: -0.05em;
      line-height: 1;
      margin-bottom: 0.5rem;
      opacity: 0.8;
    }

    .error-icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(26, 26, 36, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.5rem;

      mat-icon {
        color: #475569;
        font-size: 2rem;
        width: 2rem;
        height: 2rem;
      }
    }
  `],
})
export class NotFoundComponent {}
