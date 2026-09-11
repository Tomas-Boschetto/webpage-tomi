-- First publication / original release, separate from edition_published_at.
ALTER TABLE recommendations ADD COLUMN original_published_at TEXT;
