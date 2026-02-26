-- Scrum Learning Hub Database Setup
-- Run this in your Supabase SQL Editor after the main database-setup.sql

-- Create scrum_chapter_takeaways table
CREATE TABLE IF NOT EXISTS public.scrum_chapter_takeaways (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_number INTEGER NOT NULL,
  chapter_title TEXT NOT NULL,
  takeaway TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_scrum_progress table
CREATE TABLE IF NOT EXISTS public.user_scrum_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  chapter_number INTEGER NOT NULL,
  takeaway_id UUID REFERENCES public.scrum_chapter_takeaways(id) ON DELETE CASCADE NOT NULL,
  practiced_count INTEGER DEFAULT 0,
  success_count NUMERIC DEFAULT 0,
  last_practiced_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, takeaway_id)
);

-- Create user_scrum_streaks table
CREATE TABLE IF NOT EXISTS public.user_scrum_streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_practice_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.scrum_chapter_takeaways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_scrum_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_scrum_streaks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scrum_chapter_takeaways (readable by all authenticated users)
CREATE POLICY "Anyone can view scrum takeaways" 
ON public.scrum_chapter_takeaways 
FOR SELECT 
TO authenticated 
USING (true);

-- RLS Policies for user_scrum_progress
CREATE POLICY "Users can view their own scrum progress" 
ON public.user_scrum_progress 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scrum progress" 
ON public.user_scrum_progress 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scrum progress" 
ON public.user_scrum_progress 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- RLS Policies for user_scrum_streaks
CREATE POLICY "Users can view their own scrum streaks" 
ON public.user_scrum_streaks 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scrum streaks" 
ON public.user_scrum_streaks 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scrum streaks" 
ON public.user_scrum_streaks 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- Add updated_at triggers
CREATE TRIGGER scrum_takeaways_updated_at
  BEFORE UPDATE ON public.scrum_chapter_takeaways
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER user_scrum_progress_updated_at
  BEFORE UPDATE ON public.user_scrum_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER user_scrum_streaks_updated_at
  BEFORE UPDATE ON public.user_scrum_streaks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.scrum_chapter_takeaways;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_scrum_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_scrum_streaks;