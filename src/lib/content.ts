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
// These prevent English key names from flashing before DB loads.
export const DEFAULT_LABELS: Record<string, string> = {
  // Workshop + window
  depth_floating_label: 'צפים על פני המים',
  depth_floating_tagline: 'מה שכבר גלוי לנו',
  depth_deep_label: 'צוללים לעמוקים',
  depth_deep_tagline: 'מה שצריך לחקור',
  cta_dive_here: 'כאן מתחילים ←',
  cta_add_point: 'הוסיפו נקודה',
  lane_float_kicker: '01 · צפים על פני המים',
  lane_deep_kicker: '02 · צוללים לעמוקים',
  placeholder_floating: 'מה אתם יודעים? מה עולה?',
  placeholder_deep: 'מה השאלה? מה לחקור?',
  empty_floating: 'פני המים שקטים. התחילו מצד ימין.',
  empty_deep: 'עדיין לא צללנו. החליפו את הבורר כדי להוסיף נקודה עמוקה.',
  pool_of_knowledge: 'בריכת הידע',
  session_cycle_label: 'אדוות · מחזור ז׳',

  // Landing — Hero
  landing_kicker: 'אדוות · מחזור ז׳ · אפריל 2026',
  landing_title_line1: 'מודל',
  landing_title_line2: 'תשעת החלונות.',
  landing_title_em_line1: 'קופצים ראש',
  landing_title_em_line2: 'לבריכת האתגר.',
  landing_lead: 'תהליך מובנה להנחת התשתית לפיצוח האתגר הקבוצתי.',
  landing_meta_1_b: '9',
  landing_meta_1_text: 'חלונות להתבוננות מזוויות שונות',
  landing_meta_2_text: 'אתגרים',
  landing_meta_3_b: '2',
  landing_meta_3_text: 'רבדים — צפים על המים, צוללים לעומק',
  landing_meta_4_b: '',
  landing_meta_4_text: '',
  landing_pool_label_top: 'צפים על פני המים',
  landing_pool_label_bottom: 'צוללים לעמוקים',

  // Landing — Method
  landing_method_label: '01 · המודל',
  landing_method_h1: 'שיטה.',
  landing_method_em: 'ומנגנון.',
  landing_method_intro: '',
  landing_method_col1_h3: 'השיטה',
  landing_method_col1_p1: '',
  landing_method_col1_p2: '',
  landing_method_col2_h3: 'המנגנון: מטריצה של זמן ומרחב',
  landing_method_col2_p1: '',
  landing_method_col2_p2: '',

  // Landing — Principles (legacy — section removed but keys still editable)
  landing_principles_label: '',
  landing_principles_h1: '',
  landing_principles_em: '',
  landing_principle_1_title: '',
  landing_principle_1_body: '',
  landing_principle_2_title: '',
  landing_principle_2_body: '',
  landing_principle_3_title: '',
  landing_principle_3_body: '',

  // Landing — Grid
  landing_grid_label: '03 · המטריצה',
  landing_grid_h1: 'תשעה חלונות.',
  landing_grid_em: 'שלוש רמות כפול שלושה זמנים.',
  landing_grid_body: '',
  landing_grid_col_past: 'עבר · שורש',
  landing_grid_col_present: 'הווה · עוגן',
  landing_grid_col_future: 'עתיד · יעד',

  // Landing — Process
  landing_process_label: '02 · תהליך',
  landing_process_h1: 'מה שקורה',
  landing_process_em: 'במהלך מפגש הפיצוח.',
  landing_process_step_1_time: '00:00 — 00:20',
  landing_process_step_1_title: 'חלוקה לקבוצות',
  landing_process_step_1_body: '',
  landing_process_step_2_time: '10 דקות לחלון · 9 חלונות',
  landing_process_step_2_title: 'תשעה חלונות · שני רבדים',
  landing_process_step_2_body: '',
  landing_process_step_3_time: '',
  landing_process_step_3_title: 'בריכה משותפת',
  landing_process_step_3_body: '',
  landing_process_step_4_time: '',
  landing_process_step_4_title: 'החלטות',
  landing_process_step_4_body: '',

  // Landing — Cases
  landing_cases_label: '04 · אתגרי מחזור ז׳',
  landing_cases_em: 'אותו מפגש.',
  landing_cases_body: '',

  // Landing — CTA
  landing_cta_h1: 'קופצים',
  landing_cta_em: 'למים.',
  landing_cta_body: '',
  landing_cta_btn_primary: 'פתחו את האתגר',
  landing_cta_btn_secondary: '',

  // Footer
  footer_credit_1: 'פיתוח, בנייה ועיצוב — ארגון חותם, אחריות לחינוך בישראל',
  footer_credit_2: '',
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
