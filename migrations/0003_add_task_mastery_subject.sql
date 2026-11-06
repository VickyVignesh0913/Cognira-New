-- Add optional mastery subject column to tasks table
-- NULL value means: use category (if it matches a mastery subject) or no mastery link
ALTER TABLE tasks ADD COLUMN master_subject TEXT DEFAULT '';