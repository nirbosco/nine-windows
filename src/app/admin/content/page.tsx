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

export default function ContentEditor() {
  const [windows, setWindows] = useState<WindowRow[]>([])
  const [labels, setLabels] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'windows' | 'labels'>('windows')

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
          className={activeTab === 'labels' ? 'on' : ''}
          onClick={() => setActiveTab('labels')}
        >
          תוויות וכותרות
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

      {activeTab === 'labels' && (
        <section
          style={{ padding: '60px 48px 160px', background: 'var(--paper-2)' }}
        >
          <div
            style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}
          >
            {LABEL_GROUPS.map((group) => (
              <div
                key={group.title}
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
                  return (
                    <div
                      key={key}
                      style={{
                        marginBottom: 18,
                        display: 'grid',
                        gridTemplateColumns: '200px 1fr auto',
                        gap: 12,
                        alignItems: 'center',
                      }}
                    >
                      <label
                        style={{
                          fontSize: 12,
                          color: 'var(--muted-ink)',
                          fontFamily: "'IBM Plex Mono', monospace",
                          letterSpacing: '0.04em',
                        }}
                      >
                        {LABEL_LABELS[key] || key}
                      </label>
                      <input
                        type="text"
                        value={current}
                        onChange={(e) =>
                          setLabels({ ...labels, [key]: e.target.value })
                        }
                        style={inputStyle}
                      />
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
                          onClick={() => saveLabel(key, current)}
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
            ))}
          </div>
        </section>
      )}
    </EditorialChrome>
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
