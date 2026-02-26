-- Fix for UUID type mismatch error
-- Run this to fix the takeaway_id column type mismatch

-- First, drop the existing foreign key constraint
ALTER TABLE public.user_scrum_progress 
DROP CONSTRAINT IF EXISTS user_scrum_progress_takeaway_id_fkey;

-- Change takeaway_id column to INTEGER to match the actual data
ALTER TABLE public.user_scrum_progress 
ALTER COLUMN takeaway_id TYPE INTEGER USING takeaway_id::text::integer;

-- Also change the takeaways table id to INTEGER if needed
ALTER TABLE public.scrum_chapter_takeaways 
ALTER COLUMN id TYPE INTEGER USING ROW_NUMBER() OVER (ORDER BY chapter_number, takeaway);

-- Recreate the foreign key constraint
ALTER TABLE public.user_scrum_progress 
ADD CONSTRAINT user_scrum_progress_takeaway_id_fkey 
FOREIGN KEY (takeaway_id) REFERENCES public.scrum_chapter_takeaways(id) ON DELETE CASCADE;