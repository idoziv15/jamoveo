export type Instrument = 'drums' | 'guitar' | 'bass' | 'saxophone' | 'keyboard' | 'vocals'

export interface User {
  id: string;
  username: string;
  isAdmin: boolean;
  instrument?: Instrument;
}

export interface Song {
  _id: string;
  title: string;
  artist: string;
  lyrics: string;
  chords: string;
  content?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface SearchResponse {
  songs: Song[];
} 