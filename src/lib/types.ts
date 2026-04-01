export type GoalMode = 'cut' | 'bulk' | 'maintain'

export interface Goals {
  id: string
  user_id: string
  mode: GoalMode
  calories: number
  carbs: number
  protein: number
  fats: number
  updated_at: string
}

export interface FoodLog {
  id: string
  user_id: string
  date: string
  raw_text: string
  calories: number
  carbs: number
  protein: number
  fats: number
  meal_name: string | null
  created_at: string
}

export interface SavedMeal {
  id: string
  user_id: string
  name: string
  calories: number
  carbs: number
  protein: number
  fats: number
  use_count: number
}

export interface WeightLog {
  id: string
  user_id: string
  date: string
  weight_lbs: number
  created_at: string
}

export interface WeeklyCheckin {
  id: string
  user_id: string
  week_start: string
  strength: 'up' | 'same' | 'down'
  gym_consistency: 'consistent' | 'missed_some' | 'didnt_go'
  sleep: 'good' | 'alright' | 'poor'
  tracking_quality: 'tracked_everything' | 'missed_some' | 'didnt_track'
  created_at: string
}

export interface WeeklyReport {
  id: string
  user_id: string
  week_start: string
  week_end: string
  report_text: string
  avg_calories: number | null
  avg_carbs: number | null
  avg_protein: number | null
  avg_fats: number | null
  weight_start: number | null
  weight_end: number | null
  days_logged: number
  generated_at: string
}

export interface DailySummary {
  calories: number
  carbs: number
  protein: number
  fats: number
}
