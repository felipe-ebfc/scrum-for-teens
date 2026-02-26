-- Script to create profile for existing user
-- Run this in Supabase SQL Editor to fix the existing test user

-- First, let's see what users exist in auth.users
-- SELECT id, email, raw_user_meta_data->>'full_name' as full_name FROM auth.users;

-- Create profile for existing users who don't have one
INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', '') as full_name,
  u.created_at,
  NOW() as updated_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Verify the profiles were created
-- SELECT * FROM public.profiles;