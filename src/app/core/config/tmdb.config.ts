import { InjectionToken } from '@angular/core';

export interface TmdbConfig {
  apiKey: string;
  readAccessToken: string;
  baseUrl: string;
  imageBaseUrl: string;
}

export const TMDB_CONFIG = new InjectionToken<TmdbConfig>('tmdb.config');

export type ImageSize =
  | 'w92'
  | 'w154'
  | 'w185'
  | 'w342'
  | 'w500'
  | 'w780'
  | 'original';

export type BackdropSize = 'w300' | 'w780' | 'w1280' | 'original';

export type ProfileSize = 'w45' | 'w185' | 'h632' | 'original';
