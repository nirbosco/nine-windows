'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { EditorialChrome } from '@/components/EditorialChrome'
import { DEFAULT_LABELS } from '@/lib/content'

interface WindowRow {
  number: number
  title: string
  subtitle: string
  description: string
  questions: string[]
}

interface LabelRow {
  key: string
  value: string
}

const LABEL_LABELS: Record<string, string> = {
  // workshop/window
  depth_floating_label: 'תווית — צף',
  depth_floating_tagline: 'תת-תווית — צף',
  depth_deep_label: 'תווית — שקוע',
  depth_deep_tagline: 'תת-תווית — שקוע',
  cta_dive_here: 'CTA חלון ריק',
  cta_add_point: 'כותרת טופס הוספה',
  lane_float_kicker: 'Kicker — צף',
  lane_deep_kicker: 'Kicker — שקוע',
  placeholder_floating: 'Placeholder — צף',
  placeholder_deep: 'Placeholder — שקוע',
  empty_floating: 'ריק — צף',
  empty_deep: 'ריק — שקוע',
  pool_of_knowledge: 'ביטוי "בריכת הידע"',
  session_cycle_label: 'תווית מחזור',
  // landing — hero
  landing_kicker: 'Kicker עליון',
  landing_title_line1: 'כותרת — שורה 1',
  landing_title_line2: 'כותרת — שורה 2',
  landing_title_em_line1: 'כותרת איטלית — שורה 1',
  landing_title_em_line2: 'כותרת איטלית — שורה 2',
  landing_lead: 'פסקת lead',
  landing_meta_1_b: 'Meta 1 — מספר',
  landing_meta_1_text: 'Meta 1 — טקסט',
  landing_meta_2_text: 'Meta 2 — טקסט (מספר דינמי)',
  landing_meta_3_b: 'Meta 3 — מספר',
  landing_meta_3_text: 'Meta 3 — טקסט',
  landing_meta_4_b: 'Meta 4 — מספר',
  landing_meta_4_text: 'Meta 4 — טקסט',
  landing_pool_label_top: 'תווית בריכה — עליונה',
  landing_pool_label_bottom: 'תווית בריכה — תחתונה',
  // landing — method
  landing_method_label: 'Label',
  landing_method_h1: 'כותרת — שורה 1',
  landing_method_em: 'כותרת איטלית',
  landing_method_intro: 'פסקת פתיחה',
  landing_method_col1_h3: 'עמודה 1 — כותרת',
  landing_method_col1_p1: 'עמודה 1 — פסקה 1',
  landing_method_col1_p2: 'עמודה 1 — פסקה 2',
  landing_method_col2_h3: 'עמודה 2 — כותרת',
  landing_method_col2_p1: 'עמודה 2 — פסקה 1',
  landing_method_col2_p2: 'עמודה 2 — פסקה 2',
  // landing — principles
  landing_principles_label: 'Label',
  landing_principles_h1: 'כותרת',
  landing_principles_em: 'כותרת איטלית',
  landing_principle_1_title: 'עיקרון 1 — כותרת',
  landing_principle_1_body: 'עיקרון 1 — תוכן',
  landing_principle_2_title: 'עיקרון 2 — כותרת',
  landing_principle_2_body: 'עיקרון 2 — תוכן',
  landing_principle_3_title: 'עיקרון 3 — כותרת',
  landing_principle_3_body: 'עיקרון 3 — תוכן',
  // landing — grid
  landing_grid_label: 'Label',
  landing_grid_h1: 'כותרת — שורה 1',
  landing_grid_em: 'כותרת איטלית',
  landing_grid_body: 'גוף הטקסט',
  landing_grid_col_past: 'עמודה — עבר',
  landing_grid_col_present: 'עמודה — הווה',
  landing_grid_col_future: 'עמודה — עתיד',
  // landing — process
  landing_process_label: 'Label',
  landing_process_h1: 'כותרת',
  landing_process_em: 'כותרת איטלית',
  landing_process_step_1_time: 'שלב 1 — זמן',
  landing_process_step_1_title: 'שלב 1 — כותרת',
  landing_process_step_1_body: 'שלב 1 — תוכן',
  landing_process_step_2_time: 'שלב 2 — זמן',
  landing_process_step_2_title: 'שלב 2 — כותרת',
  landing_process_step_2_body: 'שלב 2 — תוכן',
  landing_process_step_3_time: 'שלב 3 — זמן',
  landing_process_step_3_title: 'שלב 3 — כותרת',
  landing_process_step_3_body: 'שלב 3 — תוכן',
  landing_process_step_4_time: 'שלב 4 — זמן',
  landing_process_step_4_title: 'שלב 4 — כותרת',
  landing_process_step_4_body: 'שלב 4 — תוכן',
  // landing — cases
  landing_cases_label: 'Label',
  landing_cases_em: 'כותרת איטלית',
  landing_cases_body: 'גוף הטקסט',
  // landing — CTA
  landing_cta_h1: 'כותרת',
  landing_cta_em: 'כותרת איטלית',
  landing_cta_body: 'גוף הטקסט',
  landing_cta_btn_primary: 'כפתור ראשי',
  landing_cta_btn_secondary: 'כפתור משני',
  // footer
  footer_credit_1: 'קרדיט פוטר',
  footer_credit_2: 'קרדיט משני (אופציונלי)',
}

const LABEL_GROUPS: { title: string; keys: string[] }[] = [
  {
    title: 'תוויות עומק',
    keys: [
      'depth_floating_label',
      'depth_floating_tagline',
      'depth_deep_label',
      'depth_deep_tagline',
    ],
  },
  {
    title: 'Kickers וכותרות סקשנים',
    keys: ['lane_float_kicker', 'lane_deep_kicker'],
  },
  {
    title: 'טופס הוספת נקודה',
    keys: [
      'cta_add_point',
      'placeholder_floating',
      'placeholder_deep',
    ],
  },
  {
    title: 'מצבים (ריק, הפנייה, ועוד)',
    keys: ['cta_dive_here', 'empty_floating', 'empty_deep'],
  },
  {
    title: 'מיתוג',
    keys: ['pool_of_knowledge', 'session_cycle_label'],
  },
]

const LANDING_GROUPS: { title: string; keys: string[] }[] = [
  {
    title: 'Hero — כותרת ראשית',
    keys: [
      'landing_kicker',
      'landing_title_line1',
      'landing_title_line2',
      'landing_title_em_line1',
      'landing_title_em_line2',
      'landing_lead',
    ],
  },
  {
    title: 'Hero — Meta (נתונים)',
    keys: [
      'landing_meta_1_b',
      'landing_meta_1_text',
      'landing_meta_2_text',
      'landing_meta_3_b',
      'landing_meta_3_text',
      'landing_meta_4_b',
      'landing_meta_4_text',
    ],
  },
  {
    title: 'תוויות הבריכה (Side-cutaway)',
    keys: ['landing_pool_label_top', 'landing_pool_label_bottom'],
  },
  {
    title: '01 · שיטה',
    keys: [
      'landing_method_label',
      'landing_method_h1',
      'landing_method_em',
      'landing_method_intro',
      'landing_method_col1_h3',
      'landing_method_col1_p1',
      'landing_method_col1_p2',
      'landing_method_col2_h3',
      'landing_method_col2_p1',
      'landing_method_col2_p2',
    ],
  },
  {
    title: '02 · עקרונות',
    keys: [
      'landing_principles_label',
      'landing_principles_h1',
      'landing_principles_em',
      'landing_principle_1_title',
      'landing_principle_1_body',
      'landing_principle_2_title',
      'landing_principle_2_body',
      'landing_principle_3_title',
      'landing_principle_3_body',
    ],
  },
  {
    title: '03 · המטריצה',
    keys: [
      'landing_grid_label',
      'landing_grid_h1',
      'landing_grid_em',
      'landing_grid_body',
      'landing_grid_col_past',
      'landing_grid_col_present',
      'landing_grid_col_future',
    ],
  },
  {
    title: '04 · תהליך',
    keys: [
      'landing_process_label',
      'landing_process_h1',
      'landing_process_em',
      'landing_process_step_1_time',
      'landing_process_step_1_title',
      'landing_process_step_1_body',
      'landing_process_step_2_time',
      'landing_process_step_2_title',
      'landing_process_step_2_body',
      'landing_process_step_3_time',
      'landing_process_step_3_title',
      'landing_process_step_3_body',
      'landing_process_step_4_time',
      'landing_process_step_4_title',
      'landing_process_step_4_body',
    ],
  },
  {
    title: '05 · אתגרים',
    keys: [
      'landing_cases_label',
      'landing_cases_em',
      'landing_cases_body',
    ],
  },
  {
    title: 'CTA תחתון',
    keys: [
      'landing_cta_h1',
      'landing_cta_em',
      'landing_cta_body',
      'landing_cta_btn_primary',
      'landing_cta_btn_secondary',
    ],
  },
  {
    title: 'פוטר',
    keys: ['footer_credit_1', 'footer_credit_2'],
  },
]

export default function ContentEditor() {
  const [windows, setWindows] = useState<WindowRow[]>([])
  const [labels, setLabels] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<
    'windows' | 'labels' | 'landing'
  >('windows')

  useEffect(() => {
    async function load() {
      const [{ data: wd }, { data: ld }] = await Promise.all([
        supabase.from('window_content').select('*').order('number'),
        supabase.from('site_labels').select('*'),
      ])
      if (wd) setWindows(wd as WindowRow[])
      if (ld) {
        const m: Record<string, string> = {}
        ;(ld as LabelRow[]).forEach((r) => (m[r.key] = r.value))
        setLabels(m)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function saveWindow(w: WindowRow) {
    setSaving(`win-${w.number}`)
    await supabase
      .from('window_content')
      .update({
        title: w.title,
        subtitle: w.subtitle,
        description: w.description,
        questions: w.questions,
        updated_at: new Date().toISOString(),
      })
      .eq('number', w.number)
    setSaving(null)
    setSaved(`win-${w.number}`)
    setTimeout(() => setSaved(null), 1500)
  }

  async function saveLabel(key: string, value: string) {
    setSaving(`lbl-${key}`)
    await supabase.from('site_labels').upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )
    setSaving(null)
    setSaved(`lbl-${key}`)
    setTimeout(() => setSaved(null), 1500)
  }

  function updateWin(idx: number, patch: Partial<WindowRow>) {
    setWindows((prev) =>
      prev.map((w, i) => (i === idx ? { ...w, ...patch } : w)),
    )
  }

  function updateQuestion(idx: number, qi: number, value: string) {
    setWindows((prev) =>
      prev.map((w, i) => {
        if (i !== idx) return w
        const qs = [...w.questions]
        qs[qi] = value
        return { ...w, questions: qs }
      }),
    )
  }

  function addQuestion(idx: number) {
    setWindows((prev) =>
      prev.map((w, i) =>
        i === idx ? { ...w, questions: [...w.questions, ''] } : w,
      ),
    )
  }

  function removeQuestion(idx: number, qi: number) {
    setWindows((prev) =>
      prev.map((w, i) =>
        i === idx
          ? { ...w, questions: w.questions.filter((_, j) => j !== qi) }
          : w,
      ),
    )
  }

  if (loading) {
    return (
      <EditorialChrome
        activePage="admin"
        breadcrumb={[
          { label: 'תשעת החלונות', href: '/' },
          { label: 'ניהול', href: '/admin' },
          { label: 'עריכת תוכן' },
        ]}
      >
        <main
          style={{
            padding: 80,
            textAlign: 'center',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
          }}
        >
          טוען...
        </main>
      </EditorialChrome>
    )
  }

  return (
    <EditorialChrome
      activePage="admin"
      breadcrumb={[
        { label: 'תשעת החלונות', href: '/' },
        { label: 'ניהול', href: '/admin' },
        { label: 'עריכת תוכן' },
      ]}
    >
      <section className="ed-ad-hero">
        <div className="ed-container">
          <div className="ed-kicker ed-reveal">ניהול · עריכת תוכן</div>
          <h1 className="ed-h-display ed-reveal ed-reveal-d1 ed-serif">
            טקסטים.
            <br />
            <em className="ed-em">שלך לערוך.</em>
          </h1>
          <p
            className="ed-body-lg ed-reveal ed-reveal-d2"
            style={{ color: 'var(--muted-ink)', maxWidth: 620 }}
          >
            כל טקסט שמופיע למשתתפים עובר מכאן. שינויים נכנסים לתוקף מיד,
            ברענון הדף הבא.
          </p>
        </div>
      </section>

      <div className="ed-switcher">
        <button
          className={activeTab === 'windows' ? 'on' : ''}
          onClick={() => setActiveTab('windows')}
        >
          תשעת החלונות
        </button>
        <button
          className={activeTab === 'landing' ? 'on' : ''}
          onClick={() => setActiveTab('landing')}
        >
          דף הבית
        </button>
        <button
          className={activeTab === 'labels' ? 'on' : ''}
          onClick={() => setActiveTab('labels')}
        >
          טקסטי מערכת
        </button>
      </div>

      {activeTab === 'windows' && (
        <section
          style={{
            padding: '60px 48px 160px',
            background: 'var(--paper-2)',
          }}
        >
          <div
            style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 40 }}
          >
            {windows.map((w, idx) => {
              const isSaving = saving === `win-${w.number}`
              const justSaved = saved === `win-${w.number}`
              return (
                <div
                  key={w.number}
                  style={{
                    background: 'var(--paper)',
                    border: '1px solid var(--line)',
                    padding: 32,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 20,
                      marginBottom: 24,
                      paddingBottom: 20,
                      borderBottom: '1px solid var(--line-soft)',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Frank Ruhl Libre', serif",
                        fontSize: 48,
                        fontWeight: 500,
                        color: 'var(--water-500)',
                        lineHeight: 1,
                      }}
                    >
                      {String(w.number).padStart(2, '0')}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 10,
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          color: 'var(--muted-ink)',
                          fontFamily: "'IBM Plex Mono', monospace",
                        }}
                      >
                        חלון {w.number}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      {justSaved && (
                        <span
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 11,
                            color: '#2E7D3A',
                            letterSpacing: '0.08em',
                          }}
                        >
                          ✓ נשמר
                        </span>
                      )}
                      <button
                        onClick={() => saveWindow(w)}
                        disabled={isSaving}
                        className="wm-btn primary"
                        style={{ fontSize: 12 }}
                      >
                        {isSaving ? 'שומר...' : 'שמור חלון'}
                      </button>
                    </div>
                  </div>

                  <FieldGroup label="כותרת (שאלה קצרה)">
                    <input
                      type="text"
                      value={w.title}
                      onChange={(e) => updateWin(idx, { title: e.target.value })}
                      style={inputStyle}
                    />
                  </FieldGroup>

                  <FieldGroup label="תת-כותרת">
                    <input
                      type="text"
                      value={w.subtitle}
                      onChange={(e) => updateWin(idx, { subtitle: e.target.value })}
                      style={inputStyle}
                    />
                  </FieldGroup>

                  <FieldGroup label="תיאור">
                    <textarea
                      value={w.description}
                      onChange={(e) => updateWin(idx, { description: e.target.value })}
                      rows={3}
                      style={{ ...inputStyle, resize: 'vertical', fontFamily: "'Frank Ruhl Libre', serif", fontStyle: 'italic' }}
                    />
                  </FieldGroup>

                  <FieldGroup label={`שאלות מכוונות (${w.questions.length})`}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {w.questions.map((q, qi) => (
                        <div
                          key={qi}
                          style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}
                        >
                          <span
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: 11,
                              color: 'var(--water-500)',
                              paddingTop: 14,
                              minWidth: 22,
                            }}
                          >
                            {String(qi + 1).padStart(2, '0')}
                          </span>
                          <textarea
                            value={q}
                            onChange={(e) => updateQuestion(idx, qi, e.target.value)}
                            rows={2}
                            style={{ ...inputStyle, flex: 1, resize: 'vertical', fontFamily: "'Frank Ruhl Libre', serif" }}
                          />
                          <button
                            onClick={() => removeQuestion(idx, qi)}
                            style={{
                              width: 30,
                              height: 30,
                              background: 'transparent',
                              border: '1px solid var(--line)',
                              cursor: 'pointer',
                              color: 'var(--muted-ink)',
                              marginTop: 8,
                            }}
                            title="מחיקת שאלה"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addQuestion(idx)}
                        style={{
                          padding: '8px 14px',
                          background: 'transparent',
                          border: '1px dashed var(--line)',
                          cursor: 'pointer',
                          color: 'var(--water-700)',
                          fontSize: 12,
                          alignSelf: 'flex-start',
                          marginRight: 30,
                        }}
                      >
                        + הוסף שאלה
                      </button>
                    </div>
                  </FieldGroup>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {activeTab === 'landing' && (
        <section
          style={{ padding: '60px 48px 160px', background: 'var(--paper-2)' }}
        >
          <div
            style={{
              maxWidth: 900,
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 32,
            }}
          >
            <div
              style={{
                background: 'var(--water-050)',
                border: '1px solid var(--water-300)',
                padding: 20,
                color: 'var(--water-800)',
                fontFamily: "'Frank Ruhl Libre', serif",
                fontStyle: 'italic',
                fontSize: 15,
              }}
            >
              כל טקסטי דף הבית שמציג את השיטה. השינויים נכנסים לתוקף מיד ברענון
              הדף של המבקרים.
            </div>
            {LANDING_GROUPS.map((group) => (
              <LabelGroupCard
                key={group.title}
                group={group}
                labels={labels}
                setLabels={setLabels}
                saving={saving}
                saved={saved}
                onSave={saveLabel}
              />
            ))}
          </div>
        </section>
      )}

      {activeTab === 'labels' && (
        <section
          style={{ padding: '60px 48px 160px', background: 'var(--paper-2)' }}
        >
          <div
            style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}
          >
            {LABEL_GROUPS.map((group) => (
              <LabelGroupCard
                key={group.title}
                group={group}
                labels={labels}
                setLabels={setLabels}
                saving={saving}
                saved={saved}
                onSave={saveLabel}
              />
            ))}
          </div>
        </section>
      )}
    </EditorialChrome>
  )
}

function LabelGroupCard({
  group,
  labels,
  setLabels,
  saving,
  saved,
  onSave,
}: {
  group: { title: string; keys: string[] }
  labels: Record<string, string>
  setLabels: (v: Record<string, string>) => void
  saving: string | null
  saved: string | null
  onSave: (key: string, value: string) => void
}) {
  return (
    <div
      style={{
        background: 'var(--paper)',
        border: '1px solid var(--line)',
        padding: 32,
      }}
    >
      <h3
        style={{
          fontFamily: "'Frank Ruhl Libre', serif",
          fontSize: 22,
          fontWeight: 500,
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: '1px solid var(--line-soft)',
        }}
      >
        {group.title}
      </h3>
      {group.keys.map((key) => {
        const current = labels[key] ?? DEFAULT_LABELS[key] ?? ''
        const isSaving = saving === `lbl-${key}`
        const justSaved = saved === `lbl-${key}`
        const isLong = current.length > 60
        return (
          <div
            key={key}
            style={{
              marginBottom: 18,
              display: 'grid',
              gridTemplateColumns: '180px 1fr auto',
              gap: 12,
              alignItems: isLong ? 'flex-start' : 'center',
            }}
          >
            <label
              style={{
                fontSize: 12,
                color: 'var(--muted-ink)',
                fontFamily: "'IBM Plex Mono', monospace",
                letterSpacing: '0.04em',
                paddingTop: isLong ? 12 : 0,
              }}
            >
              {LABEL_LABELS[key] || key}
            </label>
            {isLong ? (
              <textarea
                value={current}
                onChange={(e) =>
                  setLabels({ ...labels, [key]: e.target.value })
                }
                rows={3}
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                  fontFamily: "'Frank Ruhl Libre', serif",
                  fontSize: 15,
                  lineHeight: 1.5,
                }}
              />
            ) : (
              <input
                type="text"
                value={current}
                onChange={(e) =>
                  setLabels({ ...labels, [key]: e.target.value })
                }
                style={inputStyle}
              />
            )}
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                paddingTop: isLong ? 8 : 0,
              }}
            >
              {justSaved && (
                <span
                  style={{
                    fontSize: 11,
                    color: '#2E7D3A',
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  ✓
                </span>
              )}
              <button
                onClick={() => onSave(key, current)}
                disabled={isSaving}
                className="wm-btn"
                style={{ fontSize: 11, padding: '6px 12px' }}
              >
                {isSaving ? '...' : 'שמור'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function FieldGroup({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--water-700)',
          marginBottom: 6,
          fontFamily: "'IBM Plex Mono', monospace",
        }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  fontFamily: "'Heebo', sans-serif",
  fontSize: 14,
  border: '1px solid var(--line)',
  background: 'var(--paper)',
  color: 'var(--ink)',
  lineHeight: 1.5,
}
