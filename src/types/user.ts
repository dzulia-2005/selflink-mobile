export interface UserSettings {
  privacy: string;
  dm_policy: string;
  language: string;
  quiet_hours: Record<string, unknown>;
  push_enabled: boolean;
  email_enabled: boolean;
  digest_enabled: boolean;
}

export interface User {
  id: number;
  email: string;
  handle: string;
  name: string;
  bio: string;
  photo: string;
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string;
  locale: string;
  flags: Record<string, unknown>;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  is_following?: boolean;
  created_at: string;
  updated_at: string;
  settings?: UserSettings;
}

export interface ProfileUpdateInput {
  name?: string;
  bio?: string;
  photo?: string;
  birth_date?: string | null;
  birth_time?: string | null;
  birth_place?: string;
  locale?: string;
  settings?: Partial<UserSettings>;
}

export interface PersonalMapProfile {
  email: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  birth_time: string | null;
  birth_place_country: string;
  birth_place_city: string;
  avatar_image: string | null;
  is_complete: boolean;
}

export type PersonalMapInput = Partial<Omit<PersonalMapProfile, 'email' | 'is_complete'>>;
