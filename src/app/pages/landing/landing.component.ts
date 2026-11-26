import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MovieService } from '../../features/movies/services/movie.service';
import { TmdbMovie } from '../../core/models/movie.model';
import { MovieCardComponent } from '../../shared/components/movie-card/movie-card.component';
import { MascotComponent } from '../../shared/components/mascot/mascot.component';

interface Feature {
  icon: string;
  title: string;
  description: string;
  color: string;
  /** CSS-var met `r, g, b` voor de getinte tegelachtergrond */
  rgbVar: string;
}

@Component({
  selector: 'app-landing',
  imports: [RouterLink, MatIcon, MatButton, MovieCardComponent, MascotComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements OnInit {
  private readonly movieService = inject(MovieService);

  protected readonly trendingMovies = signal<TmdbMovie[]>([]);
  protected readonly hasApiKey = this.movieService.hasApiKey();

  protected readonly features: Feature[] = [
    {
      icon: 'star',
      title: 'Beoordeel films',
      description: 'Deel sterren uit (halve mogen ook) en schrijf erbij wat je ervan vond.',
      color: 'var(--color-gold)',
      rgbVar: '--color-gold-rgb',
    },
    {
      icon: 'bookmark',
      title: 'Watchlists',
      description: 'Nooit meer vergeten welke film je nog wilde zien. Maak lijsten voor elke stemming.',
      color: 'var(--color-accent-light)',
      rgbVar: '--color-accent-rgb',
    },
    {
      icon: 'people',
      title: 'Vrienden',
      description: 'Zie wat je maatjes kijken en goed vinden, en kies samen je volgende film.',
      color: 'var(--color-info)',
      rgbVar: '--color-info-rgb',
    },
    {
      icon: 'casino',
      title: 'Film Roulette',
      description: 'Geen idee wat je wilt kijken? Draai aan het rad en laat het lot beslissen.',
      color: 'var(--color-pink)',
      rgbVar: '--color-pink-rgb',
    },
  ];

  ngOnInit(): void {
    if (this.hasApiKey) {
      this.movieService.getTrending().subscribe({
        next: page => this.trendingMovies.set(page.results.slice(0, 12)),
        error: () => {},
      });
    }
  }
}
