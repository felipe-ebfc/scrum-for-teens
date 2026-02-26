import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with custom configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  global: {
    headers: {
      'x-client-info': 'scrum-planner-teens',
    },
    // Add fetch options for better timeout handling
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        // Don't set a global timeout here - let the request queue handle it
      });
    },
  },
  // Realtime configuration - DISABLED FOR MVP to prevent rate limiting
  // The app uses optimistic updates and refetch after mutations instead
  realtime: {
    params: {
      eventsPerSecond: 1, // Minimal rate to prevent overwhelming
    },
  },

  // Database configuration
  db: {
    schema: 'public',
  },
});


// Database types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          full_name?: string | null;
          avatar_url?: string | null;
        };
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          status: 'todo' | 'in-progress' | 'done';
          priority: 'low' | 'medium' | 'high';
          estimated_hours: number | null;
          actual_hours: number | null;
          due_date: string | null;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          title: string;
          description?: string | null;
          status?: 'todo' | 'in-progress' | 'done';
          priority?: 'low' | 'medium' | 'high';
          estimated_hours?: number | null;
          actual_hours?: number | null;
          due_date?: string | null;
          user_id: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          status?: 'todo' | 'in-progress' | 'done';
          priority?: 'low' | 'medium' | 'high';
          estimated_hours?: number | null;
          actual_hours?: number | null;
          due_date?: string | null;
        };
      };
      goals: {
        Row: {
          id: string;
          title: string;
          description: string;
          category: 'learning' | 'skill' | 'project' | 'habit';
          type: 'sprint' | 'milestone' | 'ongoing';
          specific: string;
          measurable: string;
          achievable: string;
          relevant: string;
          time_bound: string;
          target_value: number;
          current_value: number;
          unit: string;
          start_date: string;
          target_date: string;
          completed_date: string | null;
          status: 'active' | 'completed' | 'paused' | 'cancelled';
          priority: 'low' | 'medium' | 'high';
          reward: string | null;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          title: string;
          description: string;
          category: 'learning' | 'skill' | 'project' | 'habit';
          type: 'sprint' | 'milestone' | 'ongoing';
          specific: string;
          measurable: string;
          achievable: string;
          relevant: string;
          time_bound: string;
          target_value?: number;
          current_value?: number;
          unit?: string;
          start_date?: string;
          target_date: string;
          status?: 'active' | 'completed' | 'paused' | 'cancelled';
          priority?: 'low' | 'medium' | 'high';
          reward?: string | null;
          user_id: string;
        };
        Update: {
          title?: string;
          description?: string;
          category?: 'learning' | 'skill' | 'project' | 'habit';
          type?: 'sprint' | 'milestone' | 'ongoing';
          specific?: string;
          measurable?: string;
          achievable?: string;
          relevant?: string;
          time_bound?: string;
          target_value?: number;
          current_value?: number;
          unit?: string;
          start_date?: string;
          target_date?: string;
          completed_date?: string | null;
          status?: 'active' | 'completed' | 'paused' | 'cancelled';
          priority?: 'low' | 'medium' | 'high';
          reward?: string | null;
        };
      };
      goal_milestones: {
        Row: {
          id: string;
          goal_id: string;
          title: string;
          description: string;
          target_value: number;
          reward: string;
          completed: boolean;
          completed_date: string | null;
          created_at: string;
        };
        Insert: {
          goal_id: string;
          title: string;
          description: string;
          target_value: number;
          reward: string;
          completed?: boolean;
          completed_date?: string | null;
        };
        Update: {
          title?: string;
          description?: string;
          target_value?: number;
          reward?: string;
          completed?: boolean;
          completed_date?: string | null;
        };
      };
    };
  };
}
