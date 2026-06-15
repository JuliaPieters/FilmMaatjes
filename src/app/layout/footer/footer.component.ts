import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, MatIcon],
  template: `
    <footer class="border-t border-border mt-16">
      <div class="max-w-[1400px] mx-auto px-4 md:px-8 py-10">
        <div class="flex flex-col md:flex-row justify-between gap-8">
          <div class="flex-shrink-0">
            <a routerLink="/" class="flex items-center gap-2 mb-3">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-light flex items-center justify-center">
                <mat-icon class="text-white" style="font-size: 1.125rem; width: 1.125rem; height: 1.125rem;">local_movies</mat-icon>
              </div>
              <span class="text-text-primary font-bold tracking-tight">FilmMaatjes</span>
            </a>
            <p class="text-text-muted text-sm max-w-xs">
              Jouw sociale filmplatform. Ontdek, beoordeel en deel films met vrienden.
            </p>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
            <div>
              <h4 class="text-text-secondary font-semibold mb-3">Platform</h4>
              <ul class="space-y-2">
                <li><a routerLink="/movies" class="text-text-muted hover:text-text-primary transition-colors">Films</a></li>
                <li><a routerLink="/roulette" class="text-text-muted hover:text-text-primary transition-colors">Roulette</a></li>
                <li><a routerLink="/watchlists" class="text-text-muted hover:text-text-primary transition-colors">Watchlists</a></li>
              </ul>
            </div>
            <div>
              <h4 class="text-text-secondary font-semibold mb-3">Account</h4>
              <ul class="space-y-2">
                <li><a routerLink="/auth/login" class="text-text-muted hover:text-text-primary transition-colors">Inloggen</a></li>
                <li><a routerLink="/auth/register" class="text-text-muted hover:text-text-primary transition-colors">Aanmelden</a></li>
                <li><a routerLink="/profile" class="text-text-muted hover:text-text-primary transition-colors">Profiel</a></li>
              </ul>
            </div>
            <div>
              <h4 class="text-text-secondary font-semibold mb-3">Info</h4>
              <ul class="space-y-2">
                <li>
                  <a
                    href="https://www.themoviedb.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-text-muted hover:text-text-primary transition-colors"
                  >TMDB API</a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="mt-8 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-3">
          <p class="text-text-muted text-xs">
            &copy; {{ year }} FilmMaatjes. Filmdata van
            <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" class="text-accent-light hover:underline">TMDB</a>.
          </p>
          <p class="text-text-muted text-xs">Gemaakt met ❤️ voor filmliefhebbers</p>
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent {
  protected readonly year = new Date().getFullYear();
}
