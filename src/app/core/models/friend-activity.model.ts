export interface FriendActivity {
  id: string;
  type: 'review' | 'rating';
  userId: string;
  userName: string;
  userAvatar: string | null;
  movieId: number;
  movieTitle: string;
  moviePosterPath: string | null;
  rating: number;
  content?: string;
  createdAt: string;
}
