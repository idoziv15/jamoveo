export type Instrument = 'drums' | 'guitar' | 'bass' | 'saxophone' | 'keyboard' | 'vocals'

export interface User {
  id: string;
  username: string;
  isAdmin: boolean;
  instrument?: Instrument;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  imageUrl?: string;
  lyrics: string;
  chords: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface SearchResponse {
  songs: Song[];
} 