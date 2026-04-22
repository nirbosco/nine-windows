import { supabase } from './supabase'
import { WINDOWS as DEFAULT_WINDOWS, WindowData } from './windows-data'

export interface WindowContentRow {
  number: number
  title: string
  subtitle: string
  description: string
  questions: string[]
}

/**
 * Fetch window content from DB, falling back to hardcoded defaults.
 * Merges with windows-data to preserve systemLevel, timeFrame, gridRow, gridCol.
 */
export async function loadWindows(): Promise<WindowData[]> {
  const { data, error } = await supabase
    .from('window_content')
    .select('*')
    .order('number')

  if (error || !data || data.length === 0) {
    return DEFAULT_WINDOWS
  }

  return DEFAULT_WINDOWS.map((def) => {
    const row = data.find(
      (r: Record<string, unknown>) => r.number === def.number,
    )
    if (!row) return def
    return {
      ...def,
      title: (row.title as string) || def.title,
      subtitle: (row.subtitle as string) || def.subtitle,
      description: (row.description as string) || def.description,
      questions: Array.isArray(row.questions)
        ? (row.questions as string[])
        : def.questions,
    }
  })
}

export async function loadLabels(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('site_labels').select('*')
  if (error || !data) return {}
  const map: Record<string, string> = {}
  data.forEach((r: { key: string; value: string }) => {
    map[r.key] = r.value
  })
  return map
}

// Defaults for labels — match DB seed values
export const DEFAULT_LABELS: Record<string, string> = {
  depth_floating_label: 'צף',
  depth_floating_tagline: 'מה שכבר גלוי לנו',
  depth_deep_label: 'שקוע',
  depth_deep_tagline: 'מה שצריך לחקור',
  cta_dive_here: 'כאן מתחילים ←',
  cta_add_point: 'הוסיפו נקודה',
  lane_float_kicker: '01 · פני המים',
  lane_deep_kicker: '02 · עומק הבריכה',
  placeholder_floating: 'מה אתם יודעים? מה עולה?',
  placeholder_deep: 'מה השאלה? מה לחקור?',
  empty_floating: 'פני המים שקטים. התחילו מצד ימין.',
  empty_deep: 'עדיין אין כאן נקודות שקועות. החליפו את הבורר ל"שקוע" כדי להוסיף.',
  pool_of_knowledge: 'בריכת הידע',
  session_cycle_label: 'אדוות · מחזור ז׳',
}

/**
 * Label lookup with empty-string awareness.
 * - If DB has the key (even as empty string) → use DB value.
 * - Otherwise fall back to hardcoded default.
 * - Last resort: return the key itself (helps spot unmigrated keys).
 */
export function L(labels: Record<string, string>, key: string): string {
  if (Object.prototype.hasOwnProperty.call(labels, key)) {
    return labels[key]
  }
  if (Object.prototype.hasOwnProperty.call(DEFAULT_LABELS, key)) {
    return DEFAULT_LABELS[key]
  }
  return key
}
