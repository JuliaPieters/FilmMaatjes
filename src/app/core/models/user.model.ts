export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar: string | null;
  bio: string | null;
  createdAt: string;
  _count?: {
    watchlists: number;
    reviews: number;
    friends: number;
  };
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  username: string;
  password: string;
  displayName: string;
}

export interface UpdateProfileDto {
  displayName?: string;
  bio?: string;
  avatar?: string;
}
