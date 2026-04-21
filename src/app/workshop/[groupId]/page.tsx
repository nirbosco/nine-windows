'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { WINDOWS } from '@/lib/windows-data'
import { Challenge, Group, Depth } from '@/lib/types'
import { EditorialChrome } from '@/components/EditorialChrome'

type WindowCounts = Record<number, { floating: number; deep: number; total: number }>
type WindowNotes = Record<number, { content: string; depth: Depth }[]>

export default function WorkshopGrid() {
  const { groupId } = useParams<{ groupId: string }>()
  const router = useRouter()
  const [group, setGroup] = useState<Group | null>(null)
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [counts, setCounts] = useState<WindowCounts>({})
  const [windowNotes, setWindowNotes] = useState<WindowNotes>({})
  const [memberNames, setMemberNames] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [notebookUrl, setNotebookUrl] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<{
    success?: boolean
    notebook_url?: string
    error?: string
  } | null>(null)

  useEffect(() => {
    async function load() {
      const { data: g } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single()

      if (g) {
        setGroup(g as Group)
        const { data: c } = await supabase
          .from('challenges')
          .select('*')
          .eq('id', (g as Group).challenge_id)
          .single()
        if (c) setChallenge(c as Challenge)

        const { data: members } = await supabase
          .from('group_members')
          .select('name')
          .eq('group_id', groupId)
        if (members) setMemberNames(members.map((m) => m.name))
      }

      const { data: notes } = await supabase
        .from('notes')
        .select('window_number, depth, content, created_at')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })

      if (notes) {
        const c: WindowCounts = {}
        const wn: WindowNotes = {}
        for (let i = 1; i <= 9; i++) {
          c[i] = { floating: 0, deep: 0, total: 0 }
          wn[i] = []
        }
        notes.forEach(
          (n: { window_number: number; depth: Depth; content: string }) => {
            c[n.window_number][n.depth]++
            c[n.window_number].total++
            wn[n.window_number].push({ content: n.content, depth: n.depth })
          },
        )
        setCounts(c)
        setWindowNotes(wn)
      }

      setLoading(false)
    }
    load()
  }, [groupId])

  useEffect(() => {
    fetch(`/api/notebooklm-sync?groupId=${groupId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.found) setNotebookUrl(data.notebook_url)
      })
      .catch(() => {})
  }, [groupId])

  function getNextStep(): number {
    for (let i = 1; i <= 9; i++) {
      if (!counts[i] || counts[i].total === 0) return i
    }
    return 0
  }

  async function handleExport() {
    const { data: notes } = await supabase
      .from('notes')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at')

    let text = '===========================================\n'
    text += 'תשעת החלונות - ניתוח אתגר\n'
    text += "אדוות | מחזור ז'\n"
    text += '===========================================\n\n'
    text += `אתגר: ${challenge?.name || ''}\n`
    text += `קבוצה: ${group?.name || ''}\n`
    text += `משתתפים: ${memberNames.join(', ')}\n`
    text += `תאריך: ${new Date().toLocaleDateString('he-IL')}\n\n`

    for (const win of WINDOWS) {
      text += '-------------------------------------------\n'
      text += `חלון ${win.number}: ${win.title}\n`
      text += `${win.subtitle}\n`
      text += '-------------------------------------------\n\n'
      const wn =
        notes?.filter(
          (n: { window_number: number }) => n.window_number === win.number,
        ) || []
      const floating = wn.filter(
        (n: { depth: string }) => n.depth === 'floating',
      )
      const deep = wn.filter((n: { depth: string }) => n.depth === 'deep')

      if (floating.length > 0) {
        text += 'צף (דברים שאנחנו יודעים):\n'
        floating.forEach((n: { content: string; author_name?: string }) => {
          text += `  * ${n.content}${n.author_name ? ` (${n.author_name})` : ''}\n`
        })
        text += '\n'
      }
      if (deep.length > 0) {
        text += 'צולל (שאלות לחקור):\n'
        deep.forEach((n: { content: string; author_name?: string }) => {
          text += `  * ${n.content}${n.author_name ? ` (${n.author_name})` : ''}\n`
        })
        text += '\n'
      }
      if (wn.length === 0) text += '(אין נקודות בחלון זה)\n\n'
    }

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nine-windows-${group?.name || 'export'}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/notebooklm-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId }),
      })
      const data = await res.json()
      setSyncResult(data)
      if (data.success && data.notebook_url) {
        setNotebookUrl(data.notebook_url)
      }
    } catch {
      setSyncResult({ error: 'שגיאה בחיבור לשרת' })
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <main className="ed-root min-h-screen flex items-center justify-center">
        <div className="text-sm ed-mono">טוען...</div>
      </main>
    )
  }

  const nextStep = getNextStep()
  const totalNotes = Object.values(counts).reduce(
    (s, c) => s + (c?.total || 0),
    0,
  )
  const filledWindows = Object.values(counts).filter((c) => c.total > 0).length
  const totalFloating = Object.values(counts).reduce(
    (s, c) => s + c.floating,
    0,
  )
  const totalDeep = Object.values(counts).reduce((s, c) => s + c.deep, 0)

  const r = (a: number, b: number) => a + Math.random() * (b - a)

  return (
    <EditorialChrome
      activePage="window"
      breadcrumb={[
        { label: 'תשעת החלונות', href: '/' },
        {
          label: challenge?.name || 'אתגר',
          href: challenge ? `/challenge/${challenge.id}` : undefined,
        },
        { label: group?.name || 'קבוצה' },
      ]}
    >
      {/* Hero */}
      <section className="ed-ch-hero">
        <div className="ed-container">
          <div className="ed-kicker ed-reveal">
            {challenge?.name} · קבוצה
          </div>
          <h1 className="ed-h-display ed-reveal ed-reveal-d1 ed-serif">
            {group?.name}.
          </h1>
          {memberNames.length > 0 && (
            <p className="ed-lead-ch ed-reveal ed-reveal-d2">
              {memberNames.join(' · ')}
            </p>
          )}
          <div className="ed-ch-stats ed-reveal ed-reveal-d3">
            <div>
              <div className="ed-num">{totalNotes}</div>
              <div className="ed-lbl">נקודות בבריכה</div>
            </div>
            <div>
              <div className="ed-num">{totalFloating}</div>
              <div className="ed-lbl">צף</div>
            </div>
            <div>
              <div className="ed-num">{totalDeep}</div>
              <div className="ed-lbl">צולל</div>
            </div>
            <div>
              <div className="ed-num">{filledWindows}/9</div>
              <div className="ed-lbl">חלונות פתוחים</div>
            </div>
          </div>
        </div>
      </section>

      {/* Mega pool — click to open window */}
      <section className="ed-mega-pool ed-caustics-after">
        <div
          className="ed-container"
          style={{ position: 'relative', zIndex: 1 }}
        >
          <div className="ed-label ed-reveal">01 · הבריכה שלכם</div>
          <h2 className="ed-h-xl ed-reveal ed-reveal-d1 ed-serif">
            תשעה חלונות.{' '}
            <em className="ed-em">
              {nextStep > 0
                ? `התחילו מחלון ${String(nextStep).padStart(2, '0')}.`
                : 'הכל מלא.'}
            </em>
          </h2>
          <p className="ed-mp-sub ed-reveal ed-reveal-d2">
            לחצו על חלון כדי לצלול פנימה. כל חלון — שני רבדים: מה שאתם יודעים,
            ומה שנרצה לחקור.
          </p>
          <div className="ed-col-legend ed-reveal ed-reveal-d2">
            <div></div>
            <div>עבר · שורש</div>
            <div>הווה · עוגן</div>
            <div>עתיד · יעד</div>
          </div>
          <div className="ed-pool-wrap ed-reveal ed-reveal-d3">
            <div className="ed-pool-grid">
              {/* TRIZ matrix: rows × cols (in RTL: row label on right, then past/present/future) */}
              {[
                {
                  label: challenge?.super_system_name || 'מערכת-על',
                  wins: [4, 3, 7],
                },
                {
                  label: challenge?.system_name || 'מערכת',
                  wins: [5, 1, 9],
                },
                {
                  label: challenge?.sub_system_name || 'תת-מערכת',
                  wins: [6, 2, 8],
                },
              ].flatMap((row) => [
                <div key={`label-${row.label}`} className="ed-row-label">
                  {row.label}
                </div>,
                ...row.wins.map((n) => n),
              ]).map((item) => {
                if (typeof item !== 'number') return item
                const n = item
                const win = WINDOWS.find((w) => w.number === n)!
                const c = counts[n] || { floating: 0, deep: 0, total: 0 }
                const maxF = Math.min(c.floating, 8)
                const maxD = Math.min(c.deep, 8)
                const isNext = n === nextStep
                const isActive = c.total > 0
                return (
                  <div
                    key={n}
                    className={`ed-win ${isActive || isNext ? 'active' : ''}`}
                    onClick={() =>
                      router.push(`/workshop/${groupId}/window/${n}`)
                    }
                    role="button"
                    tabIndex={0}
                    style={
                      isNext && !isActive
                        ? { boxShadow: 'inset 0 0 0 2px var(--water-300)' }
                        : undefined
                    }
                  >
                    <div className="ed-win-waterline"></div>
                    <span className="ed-w-num">
                      {String(n).padStart(2, '0')}
                    </span>
                    <span className="ed-w-label">
                      {win.timeFrame === 'past'
                        ? 'עבר'
                        : win.timeFrame === 'present'
                          ? 'הווה'
                          : 'עתיד'}
                    </span>
                    <span className="ed-w-title">{win.title}</span>
                    <span className="ed-w-count">
                      {isNext && !isActive
                        ? 'צללו לכאן →'
                        : `${c.floating}↑  ${c.deep}↓`}
                    </span>
                    <div className="ed-win-floor"></div>
                    <div className="ed-stones">
                      {Array.from({ length: maxF }).map((_, i) => {
                        const sz = 7 + Math.random() * 5
                        return (
                          <div
                            key={`f-${i}`}
                            className="ed-stone float"
                            style={{
                              left: r(8, 92) + '%',
                              top: r(22, 32) + '%',
                              width: sz,
                              height: sz,
                              animationDelay: r(0, 2) + 's',
                            }}
                          />
                        )
                      })}
                      {Array.from({ length: maxD }).map((_, i) => {
                        const sz = 9 + Math.random() * 8
                        return (
                          <div
                            key={`d-${i}`}
                            className="ed-stone deep"
                            style={{
                              left: r(8, 92) + '%',
                              top: r(48, 85) + '%',
                              width: sz,
                              height: sz,
                            }}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Actions section */}
      <section
        className="ed-section"
        style={{ padding: '100px 48px', background: 'var(--paper-2)' }}
      >
        <div className="ed-container">
          <div className="ed-section-head ed-reveal">
            <div
              className="ed-label"
              style={{ color: 'var(--water-700)' }}
            >
              02 · פעולות
            </div>
            <h2 className="ed-h-xl ed-serif">
              סיימתם? <em className="ed-em">יצאו החוצה.</em>
            </h2>
            <p
              className="ed-body-lg"
              style={{ color: 'var(--muted-ink)', maxWidth: 620 }}
            >
              הורידו את כל הנקודות כקובץ טקסט, או סנכרנו אותן ל-Google
              NotebookLM כדי לשוחח עם ה-AI על מה שגיליתם.
            </p>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              maxWidth: 1440,
              margin: '0 auto',
            }}
          >
            <button onClick={handleExport} className="ed-btn-line dark">
              ייצוא לטקסט
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M12 3v12m-4-4l4 4 4-4M4 21h16" />
              </svg>
            </button>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="ed-btn-line dark"
              style={syncing ? { opacity: 0.6, cursor: 'wait' } : undefined}
            >
              {syncing ? 'מסנכרן...' : 'סנכרן ל-NotebookLM'}
            </button>
            {notebookUrl && (
              <a
                href={notebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ed-btn-line dark"
              >
                פתח מחברת
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                </svg>
              </a>
            )}
          </div>
          {syncResult && (
            <div
              style={{
                marginTop: 40,
                padding: 24,
                background: syncResult.success ? '#EFF8EE' : '#FCEDEC',
                border: `1px solid ${syncResult.success ? '#2E7D3A' : '#C44D3A'}`,
                color: syncResult.success ? '#1A5224' : '#7A2A1E',
                fontSize: 14,
                maxWidth: 1440,
                margin: '40px auto 0',
              }}
            >
              {syncResult.success
                ? `כל הקבוצות סונכרנו בהצלחה למחברת NotebookLM.`
                : `שגיאה: ${syncResult.error}`}
              {syncResult.success && syncResult.notebook_url && (
                <a
                  href={syncResult.notebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    marginRight: 16,
                    textDecoration: 'underline',
                  }}
                >
                  פתח מחברת ←
                </a>
              )}
            </div>
          )}
        </div>
      </section>
    </EditorialChrome>
  )
}
