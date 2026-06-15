import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  MovieCategory,
  TmdbCredits,
  TmdbMovie,
  TmdbMovieDetail,
  TmdbPage,
  TmdbVideos,
} from '../../../core/models/movie.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MovieService {
  private readonly http = inject(HttpClient);
  private readonly config = environment.tmdb;

  private buildOptions(extra: Record<string, string | number> = {}): {
    params: HttpParams;
    headers: { Authorization: string };
  } {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(extra)) {
      params = params.set(key, String(value));
    }
    return {
      params,
      headers: { Authorization: `Bearer ${this.config.readAccessToken}` },
    };
  }

  private get base(): string {
    return this.config.baseUrl;
  }

  getTrending(timeWindow: 'day' | 'week' = 'week', page = 1): Observable<TmdbPage<TmdbMovie>> {
    return this.http.get<TmdbPage<TmdbMovie>>(
      `${this.base}/trending/movie/${timeWindow}`,
      this.buildOptions({ page }),
    );
  }

  getPopular(page = 1): Observable<TmdbPage<TmdbMovie>> {
    return this.http.get<TmdbPage<TmdbMovie>>(
      `${this.base}/movie/popular`,
      this.buildOptions({ page }),
    );
  }

  getTopRated(page = 1): Observable<TmdbPage<TmdbMovie>> {
    return this.http.get<TmdbPage<TmdbMovie>>(
      `${this.base}/movie/top_rated`,
      this.buildOptions({ page }),
    );
  }

  getUpcoming(page = 1): Observable<TmdbPage<TmdbMovie>> {
    return this.http.get<TmdbPage<TmdbMovie>>(
      `${this.base}/movie/upcoming`,
      this.buildOptions({ page }),
    );
  }

  getNowPlaying(page = 1): Observable<TmdbPage<TmdbMovie>> {
    return this.http.get<TmdbPage<TmdbMovie>>(
      `${this.base}/movie/now_playing`,
      this.buildOptions({ page }),
    );
  }

  getMoviesByCategory(category: MovieCategory, page = 1): Observable<TmdbPage<TmdbMovie>> {
    if (category === 'trending') return this.getTrending('week', page);
    if (category === 'popular') return this.getPopular(page);
    if (category === 'top_rated') return this.getTopRated(page);
    if (category === 'upcoming') return this.getUpcoming(page);
    return this.getNowPlaying(page);
  }

  getMovieDetail(id: number): Observable<TmdbMovieDetail> {
    return this.http.get<TmdbMovieDetail>(
      `${this.base}/movie/${id}`,
      this.buildOptions({ append_to_response: 'credits,videos,similar,recommendations' }),
    );
  }

  getCredits(movieId: number): Observable<TmdbCredits> {
    return this.http.get<TmdbCredits>(
      `${this.base}/movie/${movieId}/credits`,
      this.buildOptions(),
    );
  }

  getVideos(movieId: number): Observable<TmdbVideos> {
    return this.http.get<TmdbVideos>(
      `${this.base}/movie/${movieId}/videos`,
      this.buildOptions(),
    );
  }

  getSimilar(movieId: number, page = 1): Observable<TmdbPage<TmdbMovie>> {
    return this.http.get<TmdbPage<TmdbMovie>>(
      `${this.base}/movie/${movieId}/similar`,
      this.buildOptions({ page }),
    );
  }

  search(query: string, page = 1): Observable<TmdbPage<TmdbMovie>> {
    return this.http.get<TmdbPage<TmdbMovie>>(
      `${this.base}/search/movie`,
      this.buildOptions({ query, page, include_adult: 'false' }),
    );
  }

  discoverMovies(params: Record<string, string | number>, page = 1): Observable<TmdbPage<TmdbMovie>> {
    return this.http.get<TmdbPage<TmdbMovie>>(
      `${this.base}/discover/movie`,
      this.buildOptions({ sort_by: 'popularity.desc', 'vote_count.gte': 100, page, ...params }),
    );
  }

  discoverByGenre(genreId: number, page = 1): Observable<TmdbPage<TmdbMovie>> {
    return this.http.get<TmdbPage<TmdbMovie>>(
      `${this.base}/discover/movie`,
      this.buildOptions({ with_genres: genreId, sort_by: 'popularity.desc', page }),
    );
  }

  discoverRandom(params: {
    genreIds?: number[];
    minRating?: number;
    yearFrom?: number;
    yearTo?: number;
  }): Observable<TmdbPage<TmdbMovie>> {
    const randomPage = Math.floor(Math.random() * 10) + 1;
    const extra: Record<string, string | number> = {
      sort_by: 'popularity.desc',
      page: randomPage,
      'vote_count.gte': 100,
    };

    if (params.genreIds?.length) {
      extra['with_genres'] = params.genreIds.join(',');
    }
    if (params.minRating) {
      extra['vote_average.gte'] = params.minRating;
    }
    if (params.yearFrom) {
      extra['primary_release_date.gte'] = `${params.yearFrom}-01-01`;
    }
    if (params.yearTo) {
      extra['primary_release_date.lte'] = `${params.yearTo}-12-31`;
    }

    return this.http.get<TmdbPage<TmdbMovie>>(
      `${this.base}/discover/movie`,
      this.buildOptions(extra),
    );
  }

  getPosterUrl(path: string | null, size: 'w185' | 'w342' | 'w500' | 'w780' = 'w500'): string {
    if (!path) return '/assets/movie-placeholder.svg';
    return `${this.config.imageBaseUrl}/${size}${path}`;
  }

  getBackdropUrl(path: string | null, size: 'w780' | 'w1280' | 'original' = 'w1280'): string {
    if (!path) return '/assets/backdrop-placeholder.svg';
    return `${this.config.imageBaseUrl}/${size}${path}`;
  }

  getProfileUrl(path: string | null, size: 'w185' | 'h632' = 'w185'): string {
    if (!path) return '/assets/person-placeholder.svg';
    return `${this.config.imageBaseUrl}/${size}${path}`;
  }

  formatRuntime(minutes: number | null): string {
    if (!minutes) return 'Onbekend';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}u ${m}m` : `${m}m`;
  }

  formatYear(dateString: string | null | undefined): string {
    if (!dateString) return '';
    return dateString.substring(0, 4);
  }

  hasApiKey(): boolean {
    return !!this.config.readAccessToken || !!this.config.apiKey;
  }
}
