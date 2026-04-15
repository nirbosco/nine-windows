'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { WINDOWS } from '@/lib/windows-data'
import { Challenge, Group, NoteType, NOTE_TYPE_CONFIG } from '@/lib/types'

const GRID_ROWS = [
  { label: 'מערכת-על', windows: [4, 3, 7] },
  { label: 'מערכת', windows: [5, 1, 9] },
  { label: 'תת-מערכת', windows: [6, 2, 8] },
]
const COL_HEADERS = ['עבר', 'הווה', 'עתיד']

const TIME_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  past: { bg: 'rgba(217, 119, 6, 0.08)', text: '#92400E', border: 'rgba(217, 119, 6, 0.25)', badge: '#D97706' },
  present: { bg: 'rgba(13, 148, 136, 0.08)', text: '#134E4A', border: 'rgba(13, 148, 136, 0.25)', badge: '#0D9488' },
  future: { bg: 'rgba(99, 102, 241, 0.08)', text: '#312E81', border: 'rgba(99, 102, 241, 0.25)', badge: '#6366F1' },
}

type WindowCounts = Record<number, Record<NoteType | 'total', number>>

export default function WorkshopGrid() {
  const { groupId } = useParams<{ groupId: string }>()
  const router = useRouter()
  const [group, setGroup] = useState<Group | null>(null)
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [counts, setCounts] = useState<WindowCounts>({})
  const [loading, setLoading] = useState(true)

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
        if (c) setChallenge(c)
      }

      const { data: notes } = await supabase
        .from('notes')
        .select('window_number, note_type')
        .eq('group_id', groupId)

      if (notes) {
        const c: WindowCounts = {}
        notes.forEach((n: { window_number: number; note_type: NoteType }) => {
          if (!c[n.window_number]) {
            c[n.window_number] = { question: 0, knowledge: 0, thought: 0, total: 0 }
          }
          c[n.window_number][n.note_type]++
          c[n.window_number].total++
        })
        setCounts(c)
      }

      setLoading(false)
    }
    load()
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
          <h1 className="text-2xl font-bold text-gray-900">
            {group?.name}
          </h1>
          {challenge && (
            <p className="text-sm text-gray-500 mt-1">{challenge.name}</p>
          )}
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer"
        >
          ייצוא לטקסט
        </button>
      </div>

      {/* Pool status bar */}
      <div className="bg-gradient-to-r from-cyan-50 to-teal-50 rounded-2xl p-5 mb-6 border border-teal-200/40 relative">
        <div className="flex items-center justify-between relative z-10">
          <div>
            <p className="text-sm text-teal-800 font-bold mb-1">
              בריכת הידע
            </p>
            <p className="text-xs text-teal-600/70">
              {filledWindows}/9 חלונות מלאים &middot; {totalNotes} פתקים
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-36 h-3 bg-white/60 rounded-full overflow-hidden border border-teal-200/30">
              <div
                className="h-full depth-fill rounded-full"
                style={{ width: `${Math.round((filledWindows / 9) * 100)}%` }}
              />
            </div>
            <span className="text-xs font-bold text-teal-700">
              {Math.round((filledWindows / 9) * 100)}%
            </span>
          </div>
        </div>
        {/* Subtle wave */}
        <div className="wave-bottom absolute inset-0 pointer-events-none" />
      </div>

      {/* Instruction */}
      <p className="text-sm text-gray-500 mb-6 text-center">
        <strong className="text-gray-700">התחילו מחלון 1</strong> במרכז והתרחבו החוצה לפי המספרים. לחצו על חלון כדי לצלול פנימה.
      </p>

      {/* THE POOL — 3x3 grid inside a pool container */}
      <div className="pool-container p-4 sm:p-6 mb-8 relative">
        <div className="min-w-[560px]">
          {/* Column headers */}
          <div className="grid grid-cols-[70px_1fr_1fr_1fr] gap-3 mb-3">
            <div />
            {COL_HEADERS.map((h, i) => {
              const timeKey = ['past', 'present', 'future'][i]
              return (
                <div
                  key={h}
                  className="text-center text-sm font-bold rounded-lg py-1.5"
                  style={{ color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
                >
                  {h}
                </div>
              )
            })}
          </div>

          {/* Grid rows */}
          {GRID_ROWS.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[70px_1fr_1fr_1fr] gap-3 mb-3"
            >
              <div className="flex items-center justify-center text-xs font-bold text-white/80 text-center leading-tight"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>
                {row.label}
              </div>

              {row.windows.map((wNum) => {
                const win = WINDOWS.find((w) => w.number === wNum)!
                const wCounts = counts[wNum]
                const total = wCounts?.total || 0
                const isNext = wNum === nextStep
                const isCenter = wNum === 1
                const timeColors = TIME_COLORS[win.timeFrame]

                return (
                  <button
                    key={wNum}
                    onClick={() =>
                      router.push(`/workshop/${groupId}/window/${wNum}`)
                    }
                    className={`pool-tile rounded-2xl p-4 cursor-pointer text-right ${
                      isCenter ? 'ring-2 ring-white/40 shadow-lg' : ''
                    } ${isNext ? 'ripple-active' : ''}`}
                    style={{
                      background: total > 0
                        ? `linear-gradient(145deg, rgba(255,255,255,0.9), ${timeColors.bg})`
                        : 'rgba(255,255,255,0.75)',
                    }}
                  >
                    {/* Step number badge */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all"
                        style={{
                          background: total > 0 ? timeColors.badge : 'rgba(255,255,255,0.8)',
                          color: total > 0 ? 'white' : '#9CA3AF',
                          boxShadow: total > 0 ? `0 2px 8px ${timeColors.badge}40` : 'none',
                          border: total > 0 ? 'none' : '1px solid rgba(0,0,0,0.1)',
                        }}
                      >
                        {wNum}
                      </span>
                      {total > 0 && (
                        <span className="text-[10px] font-medium" style={{ color: timeColors.text }}>
                          {total} פתקים
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-xs font-semibold mb-1 line-clamp-1" style={{ color: total > 0 ? timeColors.text : '#6B7280' }}>
                      {win.subtitle}
                    </h3>

                    {/* Type breakdown mini badges */}
                    {total > 0 && wCounts && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {(['question', 'knowledge', 'thought'] as NoteType[]).map(
                          (type) =>
                            wCounts[type] > 0 && (
                              <span
                                key={type}
                                className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${NOTE_TYPE_CONFIG[type].bgClass} ${NOTE_TYPE_CONFIG[type].textClass}`}
                              >
                                {wCounts[type]}
                              </span>
                            )
                        )}
                      </div>
                    )}

                    {/* Next step indicator */}
                    {isNext && total === 0 && (
                      <p className="text-[10px] mt-2 font-bold animate-pulse" style={{ color: timeColors.badge }}>
                        צללו לכאן
                      </p>
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
        {(['question', 'knowledge', 'thought'] as NoteType[]).map((type) => (
          <div key={type} className="flex items-center gap-2 text-xs text-gray-500">
            <span className={`w-3 h-3 rounded-full ${NOTE_TYPE_CONFIG[type].dotClass}`} />
            {NOTE_TYPE_CONFIG[type].label}
          </div>
        ))}
      </div>

      {/* Time frame legend */}
      <div className="flex flex-wrap gap-4 justify-center text-[10px] text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: TIME_COLORS.past.badge }} /> עבר</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: TIME_COLORS.present.badge }} /> הווה</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: TIME_COLORS.future.badge }} /> עתיד</span>
      </div>
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

    const windowNotes = notes?.filter(
      (n: { window_number: number }) => n.window_number === win.number
    ) || []

    const byType = {
      question: windowNotes.filter((n: { note_type: string }) => n.note_type === 'question'),
      knowledge: windowNotes.filter((n: { note_type: string }) => n.note_type === 'knowledge'),
      thought: windowNotes.filter((n: { note_type: string }) => n.note_type === 'thought'),
    }

    if (byType.question.length > 0) {
      text += 'שאלות שעולות:\n'
      byType.question.forEach((n: { content: string }) => {
        text += `  * ${n.content}\n`
      })
      text += '\n'
    }

    if (byType.knowledge.length > 0) {
      text += 'דברים שאנחנו יודעים:\n'
      byType.knowledge.forEach((n: { content: string }) => {
        text += `  * ${n.content}\n`
      })
      text += '\n'
    }

    if (byType.thought.length > 0) {
      text += 'מחשבות כלליות:\n'
      byType.thought.forEach((n: { content: string }) => {
        text += `  * ${n.content}\n`
      })
      text += '\n'
    }

    if (windowNotes.length === 0) {
      text += '(אין פתקים בחלון זה)\n\n'
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
