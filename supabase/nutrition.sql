-- Nutrition+ (fiber/sodium/added sugar/saturated fat), micronutrients, and
-- 80/20 component classification. Additive columns on the existing food_logs
-- table — no new tables needed.
-- Run this in your Supabase SQL editor.

alter table food_logs
  add column if not exists fiber numeric(6,1) not null default 0,          -- grams, total for the log
  add column if not exists sodium numeric(7,1) not null default 0,         -- mg, total for the log
  add column if not exists sugar_added numeric(6,1) not null default 0,    -- grams, total for the log
  add column if not exists saturated_fat numeric(6,1) not null default 0,  -- grams, total for the log
  add column if not exists micronutrients jsonb not null default '{}'::jsonb,
  -- Per-component breakdown: [{ name, calories, protein, carbs, fats, fiber, sodium,
  -- saturated_fat, sugar_added, classification, classification_confidence, classifier_version }, ...]
  -- classification: 'everyday' | 'treat' | 'neutral' | 'uncertain'
  add column if not exists items jsonb not null default '[]'::jsonb;
