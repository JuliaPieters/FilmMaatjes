import { Injectable } from '@angular/core';
import { Achievement, AchievementTier } from '../models/achievement.model';

export interface AchievementStats {
  watchedCount: number;
  ratedCount: number;
  fiveStarCount: number;
  hasOneStarRating: boolean;
  reviewCount: number;
  hasLateNightReview: boolean;
  friendCount: number;
  streakWeeks: number;
  distinctGenreCount: number;
}

interface TieredAchievementDef {
  key: string;
  icon: string;
  titles: [string, string, string];
  unit: string;
  thresholds: [number, number, number];
  value: (stats: AchievementStats) => number;
}

interface SpecialAchievementDef {
  key: string;
  icon: string;
  title: string;
  description: string;
  unlocked: (stats: AchievementStats) => boolean;
}

const TIER_LABELS: Exclude<AchievementTier, 'special'>[] = ['brons', 'zilver', 'goud'];

const TIERED_ACHIEVEMENTS: TieredAchievementDef[] = [
  { key: 'cinefiel', icon: 'movie', titles: ['Filmkijker', 'Cinefiel', 'Filmfanaat'], unit: 'films gezien', thresholds: [10, 50, 100], value: s => s.watchedCount },
  { key: 'criticus', icon: 'star', titles: ['Beoordelaar', 'Criticus', 'Sterrenrechter'], unit: 'films beoordeeld', thresholds: [5, 25, 100], value: s => s.ratedCount },
  { key: 'recensent', icon: 'rate_review', titles: ['Eerste indruk', 'Recensent', 'Veelschrijver'], unit: 'reviews geschreven', thresholds: [1, 10, 50], value: s => s.reviewCount },
  { key: 'sociale-vlinder', icon: 'people', titles: ['Eerste vriend', 'Sociale vlinder', 'Populair'], unit: 'vrienden', thresholds: [1, 5, 15], value: s => s.friendCount },
  { key: 'volhouder', icon: 'local_fire_department', titles: ['Op dreef', 'Volhouder', 'Onstuitbaar'], unit: 'weken film-streak', thresholds: [4, 12, 26], value: s => s.streakWeeks },
  { key: 'genre-avonturier', icon: 'explore', titles: ['Nieuwsgierig', 'Genre-avonturier', 'Genre-meester'], unit: 'verschillende genres gezien', thresholds: [5, 10, 15], value: s => s.distinctGenreCount },
  { key: 'verliefd', icon: 'favorite', titles: ['Fan', 'Verliefd', 'Onvoorwaardelijk'], unit: 'keer 5 sterren gegeven', thresholds: [5, 20, 50], value: s => s.fiveStarCount },
];

const SPECIAL_ACHIEVEMENTS: SpecialAchievementDef[] = [
  { key: 'eerste-film', icon: 'flag', title: 'Eerste film', description: 'Je eerste film als Gezien afgevinkt', unlocked: s => s.watchedCount >= 1 },
  { key: 'streng-maar-eerlijk', icon: 'thumb_down', title: 'Streng maar eerlijk', description: 'Minstens één film 1 ster gegeven', unlocked: s => s.hasOneStarRating },
  { key: 'nachtuil', icon: 'bedtime', title: 'Nachtuil', description: 'Een review geschreven tussen middernacht en 5 uur \'s ochtends', unlocked: s => s.hasLateNightReview },
];

@Injectable({ providedIn: 'root' })
export class AchievementsService {
  getAchievements(stats: AchievementStats): Achievement[] {
    const tiered = TIERED_ACHIEVEMENTS.flatMap(def =>
      def.thresholds.map((threshold, i) => ({
        id: `${def.key}-${TIER_LABELS[i]}`,
        icon: def.icon,
        tier: TIER_LABELS[i],
        title: def.titles[i],
        description: `${threshold}+ ${def.unit}`,
        unlocked: def.value(stats) >= threshold,
      })),
    );

    const special = SPECIAL_ACHIEVEMENTS.map(def => ({
      id: def.key,
      icon: def.icon,
      tier: 'special' as const,
      title: def.title,
      description: def.description,
      unlocked: def.unlocked(stats),
    }));

    return [...tiered, ...special];
  }
}
