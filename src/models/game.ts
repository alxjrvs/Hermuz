import { supabase } from '../utils/supabase';
import type { Game } from '../utils/supabase';
import { logger } from 'robo.js';

export const getGame = async (id: string): Promise<Game | null> => {
  try {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      logger.error('Error fetching game:', error);
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Error in getGame:', error);
    return null;
  }
};

export const getGameByRoleId = async (discordRoleId: string): Promise<Game | null> => {
  try {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('discord_role_id', discordRoleId)
      .single();

    if (error) {
      logger.error('Error fetching game by role ID:', error);
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Error in getGameByRoleId:', error);
    return null;
  }
};

export const getAllGames = async (): Promise<Game[]> => {
  try {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .order('name');

    if (error) {
      logger.error('Error fetching all games:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Error in getAllGames:', error);
    return [];
  }
};

export const createGame = async (game: Omit<Game, 'id'>): Promise<Game | null> => {
  try {
    const { data, error } = await supabase
      .from('games')
      .insert(game)
      .select()
      .single();

    if (error) {
      logger.error('Error creating game:', error);
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Error in createGame:', error);
    return null;
  }
};

export const updateGame = async (id: string, updates: Partial<Game>): Promise<Game | null> => {
  try {
    const { data, error } = await supabase
      .from('games')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating game:', error);
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Error in updateGame:', error);
    return null;
  }
};

export const deleteGame = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('games')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting game:', error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error in deleteGame:', error);
    return false;
  }
};
