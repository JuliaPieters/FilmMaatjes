export type AchievementTier = 'brons' | 'zilver' | 'goud' | 'special';

export interface Achievement {
  id: string;
  icon: string;
  tier: AchievementTier;
  title: string;
  description: string;
  unlocked: boolean;
}
