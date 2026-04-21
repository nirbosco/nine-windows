'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { WINDOWS } from '@/lib/windows-data'
import { Challenge, Group, Depth, DEPTH_CONFIG } from '@/lib/types'

const TIME_COLORS: Record<
  string,
  { bg: string; text: string; border: string; badge: string }
> = {
  past: {
    bg: 'rgba(217, 119, 6, 0.08)',
    text: '#92400E',
    border: 'rgba(217, 119, 6, 0.25)',
    badge: '#D97706',
  },
  present: {
    bg: 'rgba(13, 148, 136, 0.08)',
    text: '#134E4A',
    border: 'rgba(13, 148, 136, 0.25)',
    badge: '#0D9488',
  },
  future: {
    bg: 'rgba(99, 102, 241, 0.08)',
    text: '#312E81',
    border: 'rgba(99, 102, 241, 0.25)',
    badge: '#6366F1',
  },
}

type WindowCounts = Record<number, Record<Depth | 'total', number>>
type WindowNotes = Record<number, { content: string; depth: Depth }[]>

const COL_HEADERS = ['עבר', 'הווה', 'עתיד']

export default function WorkshopGrid() {
  const { groupId } = useParams<{ groupId: string }>()
  const router = useRouter()
  const [group, setGroup] = useState<Group | null>(null)
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [counts, setCounts] = useState<WindowCounts>({})
  const [windowNotes, setWindowNotes] = useState<WindowNotes>({})
  const [loading, setLoading] = useState(true)
  const [guideOpen, setGuideOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [notebookUrl, setNotebookUrl] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<{
    success?: boolean
    notebook_url?: string
    error?: string
  } | null>(null)

  // Build grid rows dynamically from challenge system names
  const gridRows = challenge
    ? [
        { label: challenge.super_system_name, windows: [4, 3, 7] },
        { label: challenge.system_name, windows: [5, 1, 9] },
        { label: challenge.sub_system_name, windows: [6, 2, 8] },
      ]
    : [
        { label: 'מערכת-על', windows: [4, 3, 7] },
        { label: 'מערכת', windows: [5, 1, 9] },
        { label: 'תת-מערכת', windows: [6, 2, 8] },
      ]

  useEffect(() => {
    async function load() {
      const { data: g } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single()

      if (g) {
        setGroup(g)
        const { data: c } = await supabase
          .from('challenges')
          .select('*')
          .eq('id', g.challenge_id)
          .single()
        if (c) setChallenge(c as Challenge)
      }

      const { data: notes } = await supabase
        .from('notes')
        .select('window_number, depth, content, created_at')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })

      if (notes) {
        const c: WindowCounts = {}
        const wn: WindowNotes = {}
        notes.forEach(
          (n: { window_number: number; depth: Depth; content: string }) => {
            if (!c[n.window_number]) {
              c[n.window_number] = { floating: 0, deep: 0, total: 0 }
              wn[n.window_number] = []
            }
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

  function handleExport() {
    exportGroupData(groupId, group, challenge)
  }

  async function handleNotebookSync() {
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
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full" />
      </main>
    )
  }

  const nextStep = getNextStep()
  const totalNotes = Object.values(counts).reduce((s, c) => s + c.total, 0)
  const filledWindows = Object.keys(counts).length

  return (
    <main className="min-h-screen px-4 py-6 max-w-5xl mx-auto page-enter relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <button
            onClick={() =>
              router.push(challenge ? `/challenge/${challenge.id}` : '/')
            }
            className="text-gray-400 hover:text-gray-600 text-sm mb-2 flex items-center gap-1 cursor-pointer"
          >
            <span>&rarr;</span>
            <span>חזרה</span>
          </button>
          <div className="flex items-center gap-3">
            <img
              src="/eduvot-logo-light.jpeg"
              alt="אדוות"
              className="h-9"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {group?.name}
              </h1>
              {challenge && (
                <p className="text-sm text-gray-500">{challenge.name}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer"
          >
            ייצוא לטקסט
          </button>
          <button
            onClick={handleNotebookSync}
            disabled={syncing}
            className={`px-4 py-2 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl text-sm font-medium transition-all cursor-pointer ${
              syncing ? 'opacity-60 cursor-wait' : 'hover:brightness-110'
            }`}
          >
            {syncing ? 'מסנכרן...' : 'סנכרן NotebookLM'}
          </button>
          {notebookUrl && (
            <a
              href={notebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white border border-indigo-200 text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
            >
              פתח מחברת
            </a>
          )}
        </div>
      </div>

      {/* Sync result notification */}
      {syncResult && (
        <div
          className={`rounded-xl p-4 mb-4 text-sm ${
            syncResult.success
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>
              {syncResult.success
                ? 'כל הקבוצות סונכרנו בהצלחה למחברת NotebookLM'
                : `שגיאה: ${syncResult.error}`}
            </span>
            <button
              onClick={() => setSyncResult(null)}
              className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
            >
              &times;
            </button>
          </div>
          {syncResult.success && syncResult.notebook_url && (
            <a
              href={syncResult.notebook_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-lg text-sm font-medium hover:brightness-110 transition-all"
            >
              פתח מחברת NotebookLM &larr;
            </a>
          )}
        </div>
      )}

      {/* Pool status bar */}
      <div className="bg-gradient-to-r from-cyan-50 to-teal-50 rounded-2xl p-5 mb-6 border border-teal-200/40 relative">
        <div className="flex items-center justify-between relative z-10">
          <div>
            <p className="text-sm text-teal-800 font-bold mb-1">
              בריכת הידע
            </p>
            <p className="text-xs text-teal-600/70">
              {filledWindows}/9 חלונות מלאים &middot; {totalNotes} נקודות
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-36 h-3 bg-white/60 rounded-full overflow-hidden border border-teal-200/30">
              <div
                className="h-full depth-fill rounded-full"
                style={{
                  width: `${Math.round((filledWindows / 9) * 100)}%`,
                }}
              />
            </div>
            <span className="text-xs font-bold text-teal-700">
              {Math.round((filledWindows / 9) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Methodology guide - collapsible */}
      <div className="bg-white rounded-2xl border border-gray-200 mb-6 overflow-hidden">
        <button
          onClick={() => setGuideOpen(!guideOpen)}
          className="w-full px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors"
        >
          <h2 className="text-sm font-bold text-gray-800">
            איך עובדים עם תשעת החלונות?
          </h2>
          <span
            className={`text-gray-400 transition-transform duration-200 text-xs ${guideOpen ? 'rotate-180' : ''}`}
          >
            &#x25BC;
          </span>
        </button>

        {guideOpen && (
          <div className="px-5 pb-6 border-t border-gray-100 space-y-5">
            <div className="mt-4">
              <h3 className="text-sm font-bold text-teal-700 mb-2">
                מה זה תשעת החלונות?
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                טבלה של 3×3 — שלוש רמות מערכת כפול שלושה ממדי זמן. המטרה:
                להרחיב את בריכת הידע על האתגר לפני שקופצים לפתרונות.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-teal-700 mb-2">
                שני סוגי הנקודות
              </h3>
              <div className="space-y-2">
                <div className="flex gap-3 items-start">
                  <span className="shrink-0 text-xs font-bold text-cyan-700 bg-cyan-50 border border-cyan-200 rounded-lg px-3 py-1">
                    ~ צף
                  </span>
                  <p className="text-sm text-gray-600">
                    דברים שאנחנו יודעים — מה שכבר צף על פני השטח
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="shrink-0 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1">
                    // צולל
                  </span>
                  <p className="text-sm text-gray-600">
                    שאלות ודברים שנרצה לצלול אליהם — מה שדורש חקירה
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-teal-700 mb-2">
                סדר מילוי מומלץ
              </h3>
              <ol className="text-sm text-gray-600 space-y-1 list-none">
                <li className="flex gap-2">
                  <span className="font-bold text-teal-600 shrink-0">1-3</span>
                  מתחילים מההווה — עוגנים את הבעיה, צוללים פנימה, ואז התמונה
                  הרחבה.
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-amber-600 shrink-0">4-6</span>
                  חוזרים לעבר — מהמאקרו למיקרו, מבינים איך הגענו לכאן.
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-indigo-600 shrink-0">
                    7-9
                  </span>
                  מדמיינים את העתיד — מגמות-על, רכיבים חדשים, תמונת הניצחון.
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* THE POOL — 3x3 grid */}
      <div
        className="pool-container p-4 sm:p-6 mb-8 relative"
        style={{
          border: '8px solid #B0BEC5',
          borderRadius: '20px',
          boxShadow:
            'inset 0 0 40px rgba(0,100,120,0.15), 0 4px 20px rgba(0,0,0,0.12)',
        }}
      >
        <div className="min-w-[560px]">
          {/* Column headers */}
          <div className="grid grid-cols-[70px_1fr_1fr_1fr] gap-3 mb-3">
            <div />
            {COL_HEADERS.map((h, i) => {
              const colors = ['#92400E', '#134E4A', '#312E81']
              const bgs = [
                'rgba(217,119,6,0.15)',
                'rgba(13,148,136,0.15)',
                'rgba(99,102,241,0.15)',
              ]
              return (
                <div
                  key={h}
                  className="text-center text-sm font-extrabold rounded-lg py-2"
                  style={{
                    color: colors[i],
                    background: bgs[i],
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  {h}
                </div>
              )
            })}
          </div>

          {/* Grid rows */}
          {gridRows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[70px_1fr_1fr_1fr] gap-3 mb-3"
            >
              <div
                className="flex items-center justify-center text-[11px] font-extrabold text-center leading-tight rounded-lg py-2"
                style={{
                  color: '#0E4D45',
                  background: 'rgba(255,255,255,0.5)',
                  backdropFilter: 'blur(4px)',
                }}
              >
                {row.label}
              </div>

              {row.windows.map((wNum) => {
                const win = WINDOWS.find((w) => w.number === wNum)!
                const wCounts = counts[wNum]
                const total = wCounts?.total || 0
                const isNext = wNum === nextStep
                const timeColors = TIME_COLORS[win.timeFrame]
                const tileNotes = windowNotes[wNum] || []
                const snippets = tileNotes.slice(0, 3)

                return (
                  <button
                    key={wNum}
                    onClick={() =>
                      router.push(`/workshop/${groupId}/window/${wNum}`)
                    }
                    className={`pool-tile rounded-2xl p-4 cursor-pointer text-right min-h-[140px] flex flex-col ${
                      isNext ? 'next-tile' : ''
                    }`}
                    style={{
                      background:
                        total > 0
                          ? `linear-gradient(145deg, rgba(255,255,255,0.92), ${timeColors.bg})`
                          : 'rgba(255,255,255,0.75)',
                    }}
                  >
                    {/* Step number badge + count */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all shrink-0"
                        style={{
                          background:
                            total > 0
                              ? timeColors.badge
                              : 'rgba(255,255,255,0.8)',
                          color: total > 0 ? 'white' : '#9CA3AF',
                          boxShadow:
                            total > 0
                              ? `0 2px 8px ${timeColors.badge}40`
                              : 'none',
                          border:
                            total > 0 ? 'none' : '1px solid rgba(0,0,0,0.1)',
                        }}
                      >
                        {wNum}
                      </span>
                      {total > 0 && (
                        <div className="flex gap-1">
                          {wCounts.floating > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-cyan-100 text-cyan-800 border border-cyan-300">
                              ~ {wCounts.floating}
                            </span>
                          )}
                          {wCounts.deep > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                              // {wCounts.deep}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <h3
                      className="text-xs font-semibold mb-2 line-clamp-2"
                      style={{
                        color: total > 0 ? timeColors.text : '#6B7280',
                      }}
                    >
                      {win.title}
                    </h3>

                    {/* Note snippets preview */}
                    {snippets.length > 0 && (
                      <div className="space-y-1 mt-auto">
                        {snippets.map((n, i) => (
                          <div
                            key={i}
                            className={`text-[10px] leading-tight px-2 py-1 rounded-lg truncate ${
                              n.depth === 'floating'
                                ? 'bg-cyan-50/80 text-cyan-900 border border-cyan-200/60'
                                : 'bg-indigo-50/80 text-indigo-900 border border-indigo-200/60'
                            }`}
                            title={n.content}
                          >
                            {n.depth === 'floating' ? '~ ' : '// '}
                            {n.content}
                          </div>
                        ))}
                        {tileNotes.length > 3 && (
                          <p className="text-[9px] text-gray-500 px-2">
                            +{tileNotes.length - 3} נוספות
                          </p>
                        )}
                      </div>
                    )}

                    {/* Next step — BIG & CENTERED */}
                    {isNext && total === 0 && (
                      <div className="mt-auto flex items-center justify-center pt-3">
                        <span
                          className="text-base font-extrabold"
                          style={{ color: timeColors.badge }}
                        >
                          צללו לכאן &larr;
                        </span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-6 justify-center mb-4">
        {(['floating', 'deep'] as Depth[]).map((d) => (
          <div
            key={d}
            className="flex items-center gap-2 text-xs text-gray-500"
          >
            <span className={`w-3 h-3 rounded-full ${DEPTH_CONFIG[d].dotClass}`} />
            {DEPTH_CONFIG[d].label}
          </div>
        ))}
      </div>

      {/* Time frame legend */}
      <div className="flex flex-wrap gap-4 justify-center text-[10px] text-gray-400">
        <span className="flex items-center gap-1">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: TIME_COLORS.past.badge }}
          />{' '}
          עבר
        </span>
        <span className="flex items-center gap-1">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: TIME_COLORS.present.badge }}
          />{' '}
          הווה
        </span>
        <span className="flex items-center gap-1">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: TIME_COLORS.future.badge }}
          />{' '}
          עתיד
        </span>
      </div>

      <footer className="mt-12 mb-4 text-center text-xs text-gray-400">
        פיתוח ובנייה: ארגון חותם — אחריות על החינוך בישראל
      </footer>
    </main>
  )
}

async function exportGroupData(
  groupId: string,
  group: Group | null,
  challenge: Challenge | null,
) {
  const { data: members } = await supabase
    .from('group_members')
    .select('name')
    .eq('group_id', groupId)

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
  text += `משתתפים: ${members?.map((m: { name: string }) => m.name).join(', ') || ''}\n`
  text += `תאריך: ${new Date().toLocaleDateString('he-IL')}\n\n`

  for (const win of WINDOWS) {
    text += '-------------------------------------------\n'
    text += `חלון ${win.number}: ${win.title}\n`
    text += `${win.subtitle}\n`
    text += '-------------------------------------------\n\n'

    const windowNotes =
      notes?.filter(
        (n: { window_number: number }) => n.window_number === win.number,
      ) || []

    const floating = windowNotes.filter(
      (n: { depth: string }) => n.depth === 'floating',
    )
    const deep = windowNotes.filter(
      (n: { depth: string }) => n.depth === 'deep',
    )

    if (floating.length > 0) {
      text += 'צף (על פני השטח):\n'
      floating.forEach((n: { content: string; author_name?: string }) => {
        text += `  * ${n.content}${n.author_name ? ` (${n.author_name})` : ''}\n`
      })
      text += '\n'
    }

    if (deep.length > 0) {
      text += 'צולל (לעומק):\n'
      deep.forEach((n: { content: string; author_name?: string }) => {
        text += `  * ${n.content}${n.author_name ? ` (${n.author_name})` : ''}\n`
      })
      text += '\n'
    }

    if (windowNotes.length === 0) {
      text += '(אין נקודות בחלון זה)\n\n'
    }
  }

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `nine-windows-${group?.name || 'export'}.txt`
  a.click()
  URL.revokeObjectURL(url)
}
