export interface User {
  id: string;
  username: string;
  isAdmin: boolean;
  instrument: string;
}

export interface Song {
  _id: string;
  title: string;
  artist: string;
  content: string;
  chords: boolean;
  createdBy: {
    _id: string;
    username: string;
  };
  createdAt: string;
  lastPlayed?: string;
  playCount: number;
  tags: string[];
} 

export type Instrument = 'guitar' | 'drums' | 'vocals' | 'bass' | 'piano' | 'saxophone' | 'flute' | 'keyboard' | 'other';
