'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { WINDOWS as DEFAULT_WINDOWS, WindowData } from '@/lib/windows-data'
import { Challenge, Group, Depth } from '@/lib/types'
import { loadWindows, loadLabels, L, DEFAULT_LABELS } from '@/lib/content'

type WindowCounts = Record<number, { floating: number; deep: number; total: number }>
type WindowNotes = Record<number, {
  floating: { content: string; author_name: string | null }[]
  deep: { content: string; author_name: string | null }[]
}>

export default function WorkshopGrid() {
  const { groupId } = useParams<{ groupId: string }>()
  const router = useRouter()
  const [group, setGroup] = useState<Group | null>(null)
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [counts, setCounts] = useState<WindowCounts>({})
  const [windowNotes, setWindowNotes] = useState<WindowNotes>({})
  const [WINDOWS, setWINDOWS] = useState<WindowData[]>(DEFAULT_WINDOWS)
  const [labels, setLabels] = useState<Record<string, string>>(DEFAULT_LABELS)
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
      // Load editable content in parallel
      const [ws, lbls] = await Promise.all([loadWindows(), loadLabels()])
      setWINDOWS(ws)
      setLabels(lbls)

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
      }

      const { data: notes } = await supabase
        .from('notes')
        .select('window_number, depth, content, author_name, created_at')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })

      if (notes) {
        const c: WindowCounts = {}
        const wn: WindowNotes = {}
        for (let i = 1; i <= 9; i++) {
          c[i] = { floating: 0, deep: 0, total: 0 }
          wn[i] = { floating: [], deep: [] }
        }
        notes.forEach(
          (n: {
            window_number: number
            depth: Depth
            content: string
            author_name: string | null
          }) => {
            c[n.window_number][n.depth]++
            c[n.window_number].total++
            wn[n.window_number][n.depth].push({
              content: n.content,
              author_name: n.author_name,
            })
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
    const { data: members } = await supabase
      .from('group_members')
      .select('name')
      .eq('group_id', groupId)

    let text = '===========================================\n'
    text += 'תשעת החלונות - ניתוח אתגר\n'
    text += "אדוות | מחזור ז'\n"
    text += '===========================================\n\n'
    text += `אתגר: ${challenge?.name || ''}\n`
    text += `קבוצה: ${group?.name || ''}\n`
    text += `משתתפים: ${(members || []).map((m) => m.name).join(', ')}\n\n`

    for (const win of WINDOWS) {
      text += `--- חלון ${win.number}: ${win.title} ---\n`
      const wn =
        notes?.filter(
          (n: { window_number: number }) => n.window_number === win.number,
        ) || []
      const floating = wn.filter((n: { depth: string }) => n.depth === 'floating')
      const deep = wn.filter((n: { depth: string }) => n.depth === 'deep')
      if (floating.length > 0) {
        text += 'צף:\n'
        floating.forEach((n: { content: string; author_name?: string }) => {
          text += `  * ${n.content}${n.author_name ? ` (${n.author_name})` : ''}\n`
        })
      }
      if (deep.length > 0) {
        text += 'שקוע (מה שצריך לחקור):\n'
        deep.forEach((n: { content: string; author_name?: string }) => {
          text += `  * ${n.content}${n.author_name ? ` (${n.author_name})` : ''}\n`
        })
      }
      text += '\n'
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
      if (data.success && data.notebook_url) setNotebookUrl(data.notebook_url)
    } catch {
      setSyncResult({ error: 'שגיאה' })
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <main className="wm-root flex items-center justify-center">
        <div className="text-sm ed-mono">טוען...</div>
      </main>
    )
  }

  const nextStep = getNextStep()
  const totalNotes = Object.values(counts).reduce((s, c) => s + c.total, 0)
  const filled = Object.values(counts).filter((c) => c.total > 0).length

  const r = (a: number, b: number) => a + Math.random() * (b - a)

  const rows = [
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
  ]

  return (
    <main className="wm-root">
      {/* Top bar — editorial, dense */}
      <div className="wm-topbar">
        <button
          className="wm-btn wm-btn-back"
          onClick={() =>
            router.push(challenge ? `/challenge/${challenge.id}` : '/')
          }
          title="חזרה לאתגר"
        >
          ← חזרה
        </button>

        <div className="wm-topbar-identity">
          {challenge && (
            <a
              href={`/challenge/${challenge.id}`}
              className="wm-kicker wm-kicker-link"
            >
              {challenge.name}
            </a>
          )}
          <span className="wm-title">
            קבוצת <em>{group?.name}.</em>
          </span>
        </div>

        <div className="wm-spacer" />

        <div className="wm-stat">
          <b>{totalNotes}</b>
          <span>נקודות</span>
        </div>
        <div className="wm-stat">
          <b>{filled}/9</b>
          <span>חלונות</span>
        </div>

        <button className="wm-btn" onClick={handleExport}>
          ייצוא
        </button>
        <button
          className="wm-btn primary"
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? 'מעלה...' : 'העלו ל-NotebookLM'}
        </button>
        {notebookUrl && (
          <a
            href={notebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="wm-btn"
          >
            פתח מחברת
          </a>
        )}
      </div>

      {/* Sync result notification (subtle) */}
      {syncResult && (
        <div
          style={{
            padding: '8px 24px',
            fontSize: 12,
            background: syncResult.success ? '#EFF8EE' : '#FCEDEC',
            color: syncResult.success ? '#1A5224' : '#7A2A1E',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span>
            {syncResult.success
              ? 'הועלה בהצלחה'
              : `שגיאה: ${syncResult.error}`}
          </span>
          {syncResult.success && syncResult.notebook_url && (
            <a
              href={syncResult.notebook_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'underline' }}
            >
              פתח מחברת ←
            </a>
          )}
          <button
            onClick={() => setSyncResult(null)}
            style={{
              marginRight: 'auto',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Full-viewport pool */}
      <div className="wm-grid-body">
        <div className="wm-col-legend">
          <div></div>
          <div>
            עבר
            <small>שורש</small>
          </div>
          <div>
            הווה
            <small>עוגן</small>
          </div>
          <div>
            עתיד
            <small>יעד</small>
          </div>
        </div>
        <div className="wm-pool">
          {rows.flatMap((row) => [
            <div key={`row-${row.label}`} className="wm-row-label">
              {row.label}
            </div>,
            ...row.wins.map((n) => {
              const win = WINDOWS.find((w) => w.number === n)!
              const c = counts[n] || { floating: 0, deep: 0, total: 0 }
              const wn = windowNotes[n] || { floating: [], deep: [] }
              const maxF = Math.min(c.floating, 8)
              const maxD = Math.min(c.deep, 8)
              const isNext = n === nextStep
              const isActive = c.total > 0
              return (
                <div
                  key={`tile-${n}`}
                  className={`wm-tile ${isActive ? 'active' : ''} ${isNext ? 'next' : ''}`}
                  onClick={() =>
                    router.push(`/workshop/${groupId}/window/${n}`)
                  }
                  role="button"
                  tabIndex={0}
                >
                  <div className="wm-tile-waterline"></div>
                  <div className="wm-tile-header">
                    <span className="wm-tile-num">
                      {String(n).padStart(2, '0')}
                    </span>
                    <span className="wm-tile-time">
                      {win.timeFrame === 'past'
                        ? 'עבר'
                        : win.timeFrame === 'present'
                          ? 'הווה'
                          : 'עתיד'}
                    </span>
                  </div>
                  <div className="wm-tile-title">{win.title}</div>
                  <div className="wm-tile-stones">
                    {Array.from({ length: maxF }).map((_, i) => {
                      const note = wn.floating[i]
                      const sz = 9 + Math.random() * 5
                      return (
                        <div
                          key={`f-${i}`}
                          className={`wm-stone float ${note ? 'has-content' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(
                              `/workshop/${groupId}/window/${n}`,
                            )
                          }}
                          style={{
                            left: r(8, 88) + '%',
                            top: r(5, 30) + '%',
                            width: sz,
                            height: sz,
                            animationDelay: r(0, 2) + 's',
                          }}
                        >
                          {note && (
                            <div className="wm-stone-tip">
                              <span className="wm-stone-tip-depth">
                                ~ {L(labels, 'depth_floating_label')} · חלון {n}
                              </span>
                              {note.content}
                              {note.author_name && (
                                <span className="wm-stone-tip-author">
                                  — {note.author_name}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {Array.from({ length: maxD }).map((_, i) => {
                      const note = wn.deep[i]
                      const sz = 11 + Math.random() * 7
                      return (
                        <div
                          key={`d-${i}`}
                          className={`wm-stone deep ${note ? 'has-content' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(
                              `/workshop/${groupId}/window/${n}`,
                            )
                          }}
                          style={{
                            left: r(8, 88) + '%',
                            top: r(55, 92) + '%',
                            width: sz,
                            height: sz,
                          }}
                        >
                          {note && (
                            <div className="wm-stone-tip">
                              <span className="wm-stone-tip-depth">
                                ↓ {L(labels, 'depth_deep_label')} · חלון {n}
                              </span>
                              {note.content}
                              {note.author_name && (
                                <span className="wm-stone-tip-author">
                                  — {note.author_name}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div className="wm-tile-footer">
                    {isNext && !isActive ? (
                      <span className="wm-dive-cta">
                        {L(labels, 'cta_dive_here')}
                      </span>
                    ) : (
                      <span>
                        {c.floating}↑ &nbsp; {c.deep}↓
                      </span>
                    )}
                  </div>
                </div>
              )
            }),
          ])}
        </div>
      </div>
    </main>
  )
}
