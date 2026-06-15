import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MovieService } from '../../features/movies/services/movie.service';
import { TmdbMovie } from '../../core/models/movie.model';
import { MovieCardComponent } from '../../shared/components/movie-card/movie-card.component';
import { AuthService } from '../../features/auth/services/auth.service';

interface Feature {
  icon: string;
  title: string;
  description: string;
  color: string;
}

@Component({
  selector: 'app-landing',
  imports: [RouterLink, MatIcon, MatButton, MovieCardComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements OnInit {
  private readonly movieService = inject(MovieService);
  protected readonly authService = inject(AuthService);

  protected readonly trendingMovies = signal<TmdbMovie[]>([]);
  protected readonly hasApiKey = this.movieService.hasApiKey();

  protected readonly features: Feature[] = [
    {
      icon: 'star',
      title: 'Beoordeel films',
      description: 'Geef je mening met een beoordeling van 1 tot 5 sterren en schrijf uitgebreide reviews.',
      color: '#f59e0b',
    },
    {
      icon: 'bookmark',
      title: 'Watchlists',
      description: 'Maak persoonlijke lijsten aan voor films die je wilt kijken of al hebt gezien.',
      color: '#7c3aed',
    },
    {
      icon: 'people',
      title: 'Vrienden',
      description: 'Volg vrienden, bekijk hun beoordelingen en ontdek films samen.',
      color: '#06b6d4',
    },
    {
      icon: 'casino',
      title: 'Film Roulette',
      description: 'Geen idee wat je wilt kijken? Laat ons een willekeurige film voor je kiezen!',
      color: '#ec4899',
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
