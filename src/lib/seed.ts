// Demo weekly reports seeded for new users on first login
// These give the Reports page content before the user has their own data

export const SEED_REPORTS = [
  {
    week_start: '2026-02-23',
    week_end: '2026-03-01',
    avg_calories: 2350,
    avg_carbs: 245,
    avg_protein: 172,
    avg_fats: 78,
    weight_start: 183.4,
    weight_end: 182.8,
    days_logged: 6,
    report_text: `**What happened**
Averaged 2,350 calories/day against a 2,200 goal — slightly over, but the trend is moving in the right direction. Weight dropped 0.6 lbs over the week. Protein hit 172g on most days, which is solid.

**Why**
Sleep was good and consistent, which means cortisol stayed low and recovery was on point. The extra calories mostly came from weekend eating — not a problem at this scale. Gym attendance was consistent, so the slight surplus went toward muscle rather than fat.

**What to change**
Tighten up dinner portions — that's likely where the extra 150 calories are coming from. Everything else is working. Don't change what's working.`,
  },
  {
    week_start: '2026-03-02',
    week_end: '2026-03-08',
    avg_calories: 2100,
    avg_carbs: 210,
    avg_protein: 148,
    avg_fats: 71,
    weight_start: 182.8,
    weight_end: 183.2,
    days_logged: 4,
    report_text: `**What happened**
Only 4 days of food data this week — hard to draw strong conclusions. On the days you did log, calories averaged 2,100 which is actually under goal. Weight ticked up 0.4 lbs.

**Why**
The weight uptick is almost certainly water retention from poor sleep and inconsistent gym schedule — not true fat gain. When sleep suffers, the body holds onto glycogen and water. The low protein average (148g) on logged days suggests some days were likely higher carb, lower protein meals.

**What to change**
Priority this week: just log every day. Even rough estimates. You can't steer a ship you can't see. Get sleep back on track — it's the highest-leverage variable right now.`,
  },
  {
    week_start: '2026-03-09',
    week_end: '2026-03-15',
    avg_calories: 2180,
    avg_carbs: 228,
    avg_protein: 179,
    avg_fats: 69,
    weight_start: 183.2,
    weight_end: 182.1,
    days_logged: 7,
    report_text: `**What happened**
Strong week. Calories averaged 2,180 — right on target. Protein hit 179g, the highest in three weeks. Weight dropped 1.1 lbs over the two-week period, confirming the cut is working. Seven days of food logs — full picture.

**Why**
All four signals aligned this week: calories on target, protein high, sleep good, gym consistent. When those line up, the body responds. The strength increase is a good sign that muscle is being preserved despite the deficit.

**What to change**
Nothing. This is exactly what a good cut week looks like. Keep the same approach. If weight stalls for two consecutive weeks, reduce calories by 100-150 — but don't touch anything yet.`,
  },
]
