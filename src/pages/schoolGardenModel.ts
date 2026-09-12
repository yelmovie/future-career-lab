export const SCHOOL_CHOICES = ['trees', 'water', 'quiet'] as const;
export type SchoolChoice = typeof SCHOOL_CHOICES[number];
export interface SchoolGardenState { choice: SchoolChoice | null; attempts: SchoolChoice[]; water: number; completed: boolean }
const isChoice = (v: unknown): v is SchoolChoice => SCHOOL_CHOICES.includes(v as SchoolChoice);
export function restoreSchoolGarden(raw: unknown): SchoolGardenState {
  const r = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const choice = isChoice(r.choice) ? r.choice : null;
  const water = choice === 'water' && typeof r.water === 'number' && Number.isFinite(r.water) ? Math.max(0, Math.min(100, Math.round(r.water))) : 0;
  return { choice, attempts: Array.isArray(r.attempts) ? r.attempts.filter(isChoice).slice(-30) : [], water, completed: choice === 'water' && water === 100 };
}
export function chooseSchoolHelp(s: SchoolGardenState, choice: SchoolChoice): SchoolGardenState {
  if (s.completed || !isChoice(choice) || s.choice === choice) return s;
  return { choice, attempts: [...s.attempts, choice].slice(-30), water: 0, completed: false };
}
export function fillSchoolWater(s: SchoolGardenState, water: number): SchoolGardenState {
  if (s.completed || s.choice !== 'water' || !Number.isFinite(water)) return s;
  return restoreSchoolGarden({ ...s, water });
}
