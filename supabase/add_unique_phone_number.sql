-- Add UNIQUE constraint to phone_number in call_history table
-- This migration will fail if there are duplicate phone numbers in the table
-- You may need to clean up duplicates first before running this

-- First, remove duplicates keeping only the most recent entry for each phone number
DELETE FROM public.call_history a
USING public.call_history b
WHERE a.id < b.id
AND a.phone_number = b.phone_number;

-- Now add the unique constraint
ALTER TABLE public.call_history 
ADD CONSTRAINT call_history_phone_number_unique 
UNIQUE (phone_number);
