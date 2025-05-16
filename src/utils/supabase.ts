import { createClient } from '@supabase/supabase-js';
import { logger } from 'robo.js';

// Define the database schema types
export interface User {
  discord_id: string;
  username: string;
}

export interface Game {
  id: string;
  name: string;
  description: string;
  discord_role_id: string;
  min_players: number;
  max_players: number;
  duration: number;
  complexity_rating: number;
}

export interface GameDay {
  id: string;
  game_id: string;
  host_user_id: string;
  title: string;
  description: string;
  date_time: string;
  location: string;
  status: 'scheduled' | 'canceled' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  game_day_id: string;
  user_id: string;
  status: 'interested' | 'confirmed' | 'declined' | 'waitlisted';
}

// Define the database schema
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id'>;
        Update: Partial<User>;
      };
      games: {
        Row: Game;
        Insert: Omit<Game, 'id'>;
        Update: Partial<Game>;
      };
      game_days: {
        Row: GameDay;
        Insert: Omit<GameDay, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<GameDay, 'id' | 'created_at' | 'updated_at'>>;
      };
      attendances: {
        Row: Attendance;
        Insert: Omit<Attendance, 'id'>;
        Update: Partial<Omit<Attendance, 'id'>>;
      };
    };
  };
}

// Get Supabase URL and key from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Create Supabase client
export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseKey || ''
);

// Initialize function to check connection
export const initSupabase = async (): Promise<boolean> => {
  if (!supabaseUrl || !supabaseKey) {
    logger.error('Supabase URL or key not found in environment variables');
    return false;
  }

  try {
    const { data, error } = await supabase.from('users').select('*').limit(1);
    
    if (error) {
      logger.error('Error connecting to Supabase:', error);
      return false;
    }
    
    logger.info('Successfully connected to Supabase');
    return true;
  } catch (error) {
    logger.error('Error initializing Supabase:', error);
    return false;
  }
};
