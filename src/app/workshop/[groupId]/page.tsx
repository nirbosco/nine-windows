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

  return (
    <main className="min-h-screen px-4 py-6 max-w-5xl mx-auto page-enter relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <button
            onClick={() =>
              router.push(challenge ? `/challenge/${challenge.id}` : '/')
            }
            className="text-teal-600/60 hover:text-teal-700 text-sm mb-2 flex items-center gap-1 cursor-pointer"
          >
            <span>&rarr;</span>
            <span>חזרה</span>
          </button>
          <h1 className="text-2xl font-bold text-teal-900">
            {group?.name}
          </h1>
          {challenge && (
            <p className="text-sm text-teal-600/60 mt-1">{challenge.name}</p>
          )}
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-teal-200/50 rounded-xl text-sm font-medium text-teal-700 hover:bg-teal-50 hover:border-teal-300 transition-colors cursor-pointer"
        >
          ייצוא לטקסט
        </button>
      </div>

      {/* Pool metaphor instruction */}
      <div className="bg-gradient-to-l from-teal-50/80 to-teal-100/40 rounded-2xl p-5 mb-8 border border-teal-200/30 backdrop-blur-sm">
        <p className="text-sm text-teal-800 leading-relaxed">
          <strong>מלאו את בריכת הידע:</strong>{' '}
          התחילו מחלון 1 במרכז והתרחבו החוצה לפי המספרים.
          כל חלון מוסיף שכבה חדשה של הבנה.
          לחצו על חלון כדי לצלול פנימה.
        </p>
      </div>

      {/* RTL Grid - natural reading direction */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Column headers */}
          <div className="grid grid-cols-[80px_1fr_1fr_1fr] gap-3 mb-3">
            <div />
            {COL_HEADERS.map((h) => (
              <div
                key={h}
                className="text-center text-sm font-semibold text-teal-600/70"
              >
                {h}
              </div>
            ))}
          </div>

          {/* Grid rows */}
          {GRID_ROWS.map((row, rowIdx) => (
            <div
              key={row.label}
              className="grid grid-cols-[80px_1fr_1fr_1fr] gap-3 mb-3"
            >
              <div className="flex items-center justify-center text-sm font-semibold text-teal-600/70">
                {row.label}
              </div>

              {row.windows.map((wNum, colIdx) => {
                const win = WINDOWS.find((w) => w.number === wNum)!
                const wCounts = counts[wNum]
                const total = wCounts?.total || 0
                const isNext = wNum === nextStep
                const isCenter = wNum === 1

                // Pool depth: center is deepest, edges are lighter
                const depthLevel = isCenter ? 3 : (rowIdx === 1 || colIdx === 1) ? 2 : 1
                const depthStyles = [
                  'from-white to-teal-50/30',
                  'from-white to-teal-50/50',
                  'from-teal-50/30 to-teal-100/40',
                ][depthLevel - 1]

                return (
                  <button
                    key={wNum}
                    onClick={() =>
                      router.push(`/workshop/${groupId}/window/${wNum}`)
                    }
                    className={`grid-cell relative bg-gradient-to-br ${depthStyles} rounded-2xl p-4 border cursor-pointer text-right ${
                      isCenter
                        ? 'border-teal-300/60 shadow-md shadow-teal-100/50'
                        : 'border-teal-200/40 shadow-sm'
                    } ${isNext ? 'ripple-active' : ''}`}
                  >
                    {/* Step number */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all ${
                          total > 0
                            ? 'bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-sm'
                            : isNext
                              ? 'bg-teal-100 text-teal-700 border border-teal-300'
                              : 'bg-teal-50 text-teal-500 border border-teal-200/50'
                        }`}
                      >
                        {wNum}
                      </span>
                      {total > 0 && (
                        <span className="text-[10px] text-teal-500/60">
                          {total} פתקים
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-xs font-semibold text-teal-800 mb-1 line-clamp-1">
                      {win.subtitle}
                    </h3>

                    {/* Type breakdown */}
                    {total > 0 && wCounts && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {(['question', 'knowledge', 'thought'] as NoteType[]).map(
                          (type) =>
                            wCounts[type] > 0 && (
                              <span
                                key={type}
                                className={`text-[9px] px-1.5 py-0.5 rounded-full ${NOTE_TYPE_CONFIG[type].bgClass} ${NOTE_TYPE_CONFIG[type].textClass}`}
                              >
                                {wCounts[type]}
                              </span>
                            )
                        )}
                      </div>
                    )}

                    {/* Next indicator */}
                    {isNext && total === 0 && (
                      <p className="text-[10px] text-teal-500 mt-2 font-medium">
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
      <div className="mt-8 flex flex-wrap gap-5 justify-center">
        {(['question', 'knowledge', 'thought'] as NoteType[]).map((type) => (
          <div key={type} className="flex items-center gap-2 text-xs text-teal-700/60">
            <span
              className={`w-3 h-3 rounded-full ${NOTE_TYPE_CONFIG[type].dotClass}`}
            />
            {NOTE_TYPE_CONFIG[type].label}
          </div>
        ))}
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
