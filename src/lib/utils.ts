import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

export const CT_TIMEZONE = 'America/Chicago'

// Get today's date string in Central Time (YYYY-MM-DD)
export function todayCT(): string {
  const now = new Date()
  const ct = toZonedTime(now, CT_TIMEZONE)
  return format(ct, 'yyyy-MM-dd')
}

// Get the Monday of the current week in Central Time
export function currentWeekStartCT(): string {
  const now = new Date()
  const ct = toZonedTime(now, CT_TIMEZONE)
  const monday = startOfWeek(ct, { weekStartsOn: 1 })
  return format(monday, 'yyyy-MM-dd')
}

// Get the Sunday of the current week in Central Time
export function currentWeekEndCT(): string {
  const now = new Date()
  const ct = toZonedTime(now, CT_TIMEZONE)
  const sunday = endOfWeek(ct, { weekStartsOn: 1 })
  return format(sunday, 'yyyy-MM-dd')
}

// Check if today is Sunday in Central Time
export function isSundayCT(): boolean {
  const now = new Date()
  const ct = toZonedTime(now, CT_TIMEZONE)
  return ct.getDay() === 0
}

// Format a date string for display (e.g., "Mar 24, 2026")
export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return format(date, 'MMM d, yyyy')
}

// Format a date range for display (e.g., "Mar 9 – Mar 15")
export function formatWeekRange(startStr: string, endStr: string): string {
  const [sy, sm, sd] = startStr.split('-').map(Number)
  const [ey, em, ed] = endStr.split('-').map(Number)
  const start = new Date(sy, sm - 1, sd)
  const end = new Date(ey, em - 1, ed)
  if (start.getFullYear() === end.getFullYear()) {
    return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
  }
  return `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`
}

// Get last 8 weeks' Monday dates
export function last8WeekStarts(): string[] {
  const now = new Date()
  const ct = toZonedTime(now, CT_TIMEZONE)
  const mondays: string[] = []
  for (let i = 7; i >= 0; i--) {
    const week = subWeeks(ct, i)
    const monday = startOfWeek(week, { weekStartsOn: 1 })
    mondays.push(format(monday, 'yyyy-MM-dd'))
  }
  return mondays
}

export function clampPercent(value: number, goal: number): number {
  if (goal === 0) return 0
  return Math.min(100, Math.round((value / goal) * 100))
}
