export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]
export type Database = {
  public: {
    Tables: {
      attendances: {
        Row: {
          game_day_id: string | null
          id: string
          status: Database['public']['Enums']['attendance_status']
          user_id: string | null
        }
        Insert: {
          game_day_id?: string | null
          id?: string
          status: Database['public']['Enums']['attendance_status']
          user_id?: string | null
        }
        Update: {
          game_day_id?: string | null
          id?: string
          status?: Database['public']['Enums']['attendance_status']
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'attendances_game_day_id_fkey'
            columns: ['game_day_id']
            isOneToOne: false
            referencedRelation: 'game_days'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'attendances_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['discord_id']
          }
        ]
      }
      campaigns: {
        Row: {
          announcement_message_id: string | null
          created_at: string | null
          description: string | null
          discord_role_id: string
          game_id: string | null
          game_name: string | null
          id: string
          regular_game_time: string
          server_id: string
          title: string
        }
        Insert: {
          announcement_message_id?: string | null
          created_at?: string | null
          description?: string | null
          discord_role_id: string
          game_id?: string | null
          game_name?: string | null
          id?: string
          regular_game_time: string
          server_id: string
          title: string
        }
        Update: {
          announcement_message_id?: string | null
          created_at?: string | null
          description?: string | null
          discord_role_id?: string
          game_id?: string | null
          game_name?: string | null
          id?: string
          regular_game_time?: string
          server_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: 'campaigns_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'campaigns_server_id_fkey'
            columns: ['server_id']
            isOneToOne: false
            referencedRelation: 'discord_servers'
            referencedColumns: ['id']
          }
        ]
      }
      discord_servers: {
        Row: {
          created_at: string
          discord_id: string
          id: string
          scheduling_channel_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          discord_id: string
          id?: string
          scheduling_channel_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          discord_id?: string
          id?: string
          scheduling_channel_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      game_days: {
        Row: {
          announcement_message_id: string | null
          created_at: string | null
          date_time: string
          description: string | null
          discord_category_id: string | null
          discord_event_id: string | null
          discord_role_id: string | null
          game_id: string | null
          host_user_id: string | null
          id: string
          location: string | null
          status: Database['public']['Enums']['game_day_status']
          title: string
          updated_at: string | null
        }
        Insert: {
          announcement_message_id?: string | null
          created_at?: string | null
          date_time: string
          description?: string | null
          discord_category_id?: string | null
          discord_event_id?: string | null
          discord_role_id?: string | null
          game_id?: string | null
          host_user_id?: string | null
          id?: string
          location?: string | null
          status: Database['public']['Enums']['game_day_status']
          title: string
          updated_at?: string | null
        }
        Update: {
          announcement_message_id?: string | null
          created_at?: string | null
          date_time?: string
          description?: string | null
          discord_category_id?: string | null
          discord_event_id?: string | null
          discord_role_id?: string | null
          game_id?: string | null
          host_user_id?: string | null
          id?: string
          location?: string | null
          status?: Database['public']['Enums']['game_day_status']
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'game_days_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_days_host_user_id_fkey'
            columns: ['host_user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['discord_id']
          }
        ]
      }
      games: {
        Row: {
          description: string | null
          discord_role_id: string | null
          id: string
          max_players: number | null
          min_players: number | null
          name: string
          server_id: string | null
          short_name: string
        }
        Insert: {
          description?: string | null
          discord_role_id?: string | null
          id?: string
          max_players?: number | null
          min_players?: number | null
          name: string
          server_id?: string | null
          short_name: string
        }
        Update: {
          description?: string | null
          discord_role_id?: string | null
          id?: string
          max_players?: number | null
          min_players?: number | null
          name?: string
          server_id?: string | null
          short_name?: string
        }
        Relationships: [
          {
            foreignKeyName: 'games_server_id_fkey'
            columns: ['server_id']
            isOneToOne: false
            referencedRelation: 'discord_servers'
            referencedColumns: ['id']
          }
        ]
      }
      players: {
        Row: {
          campaign_id: string
          character_name: string | null
          created_at: string | null
          id: string
          status: Database['public']['Enums']['player_status']
          user_id: string
        }
        Insert: {
          campaign_id: string
          character_name?: string | null
          created_at?: string | null
          id?: string
          status?: Database['public']['Enums']['player_status']
          user_id: string
        }
        Update: {
          campaign_id?: string
          character_name?: string | null
          created_at?: string | null
          id?: string
          status?: Database['public']['Enums']['player_status']
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'players_campaign_id_fkey'
            columns: ['campaign_id']
            isOneToOne: false
            referencedRelation: 'campaigns'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'players_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['discord_id']
          }
        ]
      }
      users: {
        Row: {
          discord_id: string
          server_id: string | null
          username: string
        }
        Insert: {
          discord_id: string
          server_id?: string | null
          username: string
        }
        Update: {
          discord_id?: string
          server_id?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: 'users_server_id_fkey'
            columns: ['server_id']
            isOneToOne: false
            referencedRelation: 'discord_servers'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      attendance_status: 'AVAILABLE' | 'INTERESTED' | 'NOT_AVAILABLE'
      game_day_status: 'CLOSED' | 'SCHEDULING' | 'CANCELLED'
      player_status: 'INTERESTED' | 'CONFIRMED'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
type DefaultSchema = Database[Extract<keyof Database, 'public'>]
export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never
export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never
export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never
export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never
export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never
export const Constants = {
  public: {
    Enums: {
      attendance_status: ['AVAILABLE', 'INTERESTED', 'NOT_AVAILABLE'],
      game_day_status: ['CLOSED', 'SCHEDULING', 'CANCELLED'],
      player_status: ['INTERESTED', 'CONFIRMED']
    }
  }
} as const
