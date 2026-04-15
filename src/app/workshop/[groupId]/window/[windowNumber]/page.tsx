'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { WINDOWS } from '@/lib/windows-data'
import { Note, NoteType, NOTE_TYPE_CONFIG, GroupMember } from '@/lib/types'

const THEME_MAP: Record<string, string> = {
  present: 'theme-present',
  past: 'theme-past',
  future: 'theme-future',
}

const POSTIT_CLASSES: Record<NoteType, string> = {
  question: 'postit-question',
  knowledge: 'postit-knowledge',
  thought: 'postit-thought',
}

export default function WindowDetail() {
  const { groupId, windowNumber } = useParams<{
    groupId: string
    windowNumber: string
  }>()
  const router = useRouter()
  const winNum = parseInt(windowNumber, 10)
  const win = WINDOWS.find((w) => w.number === winNum)!

  const [notes, setNotes] = useState<Note[]>([])
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [noteType, setNoteType] = useState<NoteType>('thought')
  const [noteContent, setNoteContent] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [justAdded, setJustAdded] = useState<string | null>(null)

  const themeClass = THEME_MAP[win.timeFrame]

  const loadNotes = useCallback(async () => {
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('group_id', groupId)
      .eq('window_number', winNum)
      .order('created_at', { ascending: false })
    if (data) setNotes(data as Note[])
  }, [groupId, winNum])

  useEffect(() => {
    async function load() {
      await loadNotes()

      const { data: m } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
      if (m) setMembers(m as GroupMember[])

      const saved = localStorage.getItem(`nw-author-${groupId}`)
      if (saved) setAuthorName(saved)

      setLoading(false)
    }
    load()
  }, [groupId, winNum, loadNotes])

  async function handleSubmit() {
    if (!noteContent.trim()) return
    setSubmitting(true)

    if (authorName) {
      localStorage.setItem(`nw-author-${groupId}`, authorName)
    }

    const { data } = await supabase
      .from('notes')
      .insert({
        group_id: groupId,
        window_number: winNum,
        content: noteContent.trim(),
        note_type: noteType,
        author_name: authorName || null,
      })
      .select()
      .single()

    if (data) {
      setNotes((prev) => [data as Note, ...prev])
      setNoteContent('')
      setJustAdded(data.id)
      setTimeout(() => setJustAdded(null), 600)
    }

    setSubmitting(false)
  }

  async function handleDelete(noteId: string) {
    await supabase.from('notes').delete().eq('id', noteId)
    setNotes((prev) => prev.filter((n) => n.id !== noteId))
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full" />
      </main>
    )
  }

  const depthPercent = Math.round((winNum / 9) * 100)

  // Rotation patterns for post-its — each gets a slightly different angle
  const getRotation = (idx: number) => {
    const rotations = [-2.5, 1.2, -0.8, 2.1, -1.5, 0.6, -1.8, 2.8, -0.3, 1.7]
    return rotations[idx % rotations.length]
  }

  // Alternate between tape and pin
  const getAttachment = (idx: number) => (idx % 3 === 0 ? 'pin' : 'tape')

  return (
    <main className={`min-h-screen page-enter ${themeClass}`}>
      {/* Top navigation bar */}
      <div className="sticky top-0 z-30 backdrop-blur-md bg-white/70 border-b border-black/5">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push(`/workshop/${groupId}`)}
            className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1 cursor-pointer"
          >
            <span>&rarr;</span>
            <span>חזרה לטבלה</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium" style={{ color: 'var(--theme-primary)' }}>
              שלב {winNum} מתוך 9
            </span>
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full depth-fill rounded-full"
                style={{ width: `${depthPercent}%`, background: 'var(--theme-gradient)' }}
              />
            </div>
          </div>

          <div className="flex gap-2">
            {winNum > 1 && (
              <button
                onClick={() =>
                  router.push(`/workshop/${groupId}/window/${winNum - 1}`)
                }
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-gray-600"
              >
                הקודם &rarr;
              </button>
            )}
            {winNum < 9 && (
              <button
                onClick={() =>
                  router.push(`/workshop/${groupId}/window/${winNum + 1}`)
                }
                className="px-3 py-1.5 text-sm btn-theme rounded-lg cursor-pointer"
              >
                &larr; הבא
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Window header — unique gradient per time frame */}
      <div className="window-header relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 py-8 relative z-10">
          <div className="flex items-center gap-4 mb-3">
            <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm text-white font-bold text-2xl border border-white/20">
              {winNum}
            </span>
            <div>
              <h1 className="text-2xl font-bold">{win.title}</h1>
              <p className="text-white/80 font-medium">{win.subtitle}</p>
            </div>
          </div>
          <p className="text-white/70 leading-relaxed max-w-2xl text-sm mt-2">
            {win.description}
          </p>
        </div>
        {/* Decorative wave at bottom of header */}
        <svg className="absolute bottom-0 left-0 right-0 w-full" viewBox="0 0 1200 40" preserveAspectRatio="none" style={{ height: '30px' }}>
          <path d="M0,25 C200,40 400,10 600,25 C800,40 1000,10 1200,25 L1200,40 L0,40 Z" fill="var(--background)" />
        </svg>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
          {/* RTL: first column = right side = sidebar */}
          <div className="space-y-5">
            {/* Guiding questions card */}
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--theme-accent)', background: 'var(--theme-bg)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--theme-accent)' }}>
                <h3 className="text-sm font-bold" style={{ color: 'var(--theme-primary)' }}>
                  שאלות מכוונות
                </h3>
              </div>
              <ul className="px-5 py-4 space-y-3">
                {win.questions.map((q, i) => (
                  <li key={i} className="flex gap-2 text-sm" style={{ color: 'var(--theme-text)' }}>
                    <span style={{ color: 'var(--theme-accent)' }} className="shrink-0 mt-0.5">&#x25CF;</span>
                    <span className="leading-relaxed opacity-85">{q}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Add note form — styled like a post-it being written */}
            <div className="rounded-2xl p-5 border" style={{ background: 'var(--theme-bg)', borderColor: 'var(--theme-accent)' }}>
              <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--theme-primary)' }}>
                הדביקו פתק חדש
              </h3>

              {/* Note type selector */}
              <div className="flex gap-2 mb-4">
                {(['question', 'knowledge', 'thought'] as NoteType[]).map((type) => {
                  const colors: Record<NoteType, { bg: string; active: string; text: string }> = {
                    question: { bg: '#C5E8F7', active: '#A8D8EA', text: '#1A4971' },
                    knowledge: { bg: '#C5F0D5', active: '#A8E6C1', text: '#1A4A30' },
                    thought: { bg: '#FFFAA0', active: '#FFF176', text: '#5C4A00' },
                  }
                  const c = colors[type]
                  const isActive = noteType === type

                  return (
                    <button
                      key={type}
                      onClick={() => setNoteType(type)}
                      className="px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border-2"
                      style={{
                        background: isActive ? c.active : 'white',
                        borderColor: isActive ? c.text : 'transparent',
                        color: c.text,
                        boxShadow: isActive ? `0 2px 8px ${c.active}80` : 'none',
                      }}
                    >
                      {NOTE_TYPE_CONFIG[type].label}
                    </button>
                  )
                })}
              </div>

              {/* Textarea */}
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="מה עולה לכם? כתבו כאן..."
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[var(--theme-primary)] resize-none bg-white mb-3"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleSubmit()
                  }
                }}
              />

              <div className="flex items-center gap-3">
                {members.length > 0 ? (
                  <select
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 bg-white"
                    style={{ ['--tw-ring-color' as string]: 'var(--theme-primary)' }}
                  >
                    <option value="">בחרו שם</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="השם שלך"
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 bg-white"
                  />
                )}

                <button
                  onClick={handleSubmit}
                  disabled={!noteContent.trim() || submitting}
                  className="px-6 py-2 btn-theme font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ms-auto text-sm"
                >
                  {submitting ? 'מדביק...' : 'הדביקו!'}
                </button>
              </div>

              <p className="text-[10px] text-gray-400 mt-2">
                Ctrl+Enter לשליחה מהירה
              </p>
            </div>
          </div>

          {/* RTL: second column = left side = cork board */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--theme-text)' }}>
                פתקים על הלוח ({notes.length})
              </h2>
            </div>

            {notes.length === 0 ? (
              <div className="cork-board cork-frame rounded-2xl p-12 text-center min-h-[300px] flex items-center justify-center">
                <p className="text-white/70 text-lg font-medium">
                  הלוח ריק — הדביקו את הפתק הראשון!
                </p>
              </div>
            ) : (
              <div className="cork-board cork-frame rounded-2xl p-6 min-h-[400px]">
                <div className="notes-masonry">
                  {notes.map((note, idx) => {
                    const config = NOTE_TYPE_CONFIG[note.note_type]
                    const rotation = getRotation(idx)
                    const attachment = getAttachment(idx)
                    const isNew = note.id === justAdded

                    return (
                      <div
                        key={note.id}
                        className={`postit ${POSTIT_CLASSES[note.note_type]} rounded-sm ${isNew ? 'note-enter' : ''}`}
                        style={{
                          transform: `rotate(${rotation}deg)`,
                          ['--rotation' as string]: `${rotation}deg`,
                        }}
                      >
                        {/* Tape or pin */}
                        {attachment === 'tape' ? (
                          <div className="postit-tape" style={{ transform: `translateX(-50%) rotate(${rotation > 0 ? -3 : 3}deg)` }} />
                        ) : (
                          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full z-10"
                            style={{
                              background: 'radial-gradient(circle at 40% 35%, #FF6B6B, #CC3333)',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.3), inset 0 -2px 3px rgba(0,0,0,0.2), inset 0 1px 2px rgba(255,255,255,0.3)',
                            }}
                          />
                        )}

                        {/* Delete button */}
                        <button
                          onClick={() => handleDelete(note.id)}
                          className="absolute top-2 left-2 w-5 h-5 rounded-full bg-white/50 text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center text-xs opacity-0 hover:opacity-100 transition-opacity cursor-pointer z-20"
                          title="מחיקה"
                        >
                          X
                        </button>

                        {/* Type badge */}
                        <div className="flex items-center gap-2 mb-2 mt-1">
                          <span className={`w-2.5 h-2.5 rounded-full ${config.dotClass}`} />
                          <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                            {config.label}
                          </span>
                        </div>

                        {/* Content */}
                        <p className="text-sm leading-relaxed font-medium">
                          {note.content}
                        </p>

                        {/* Author */}
                        {note.author_name && (
                          <p className="text-[10px] opacity-50 mt-3 font-medium">
                            — {note.author_name}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        <div className="flex items-center justify-between border-t border-gray-200 pt-6">
          {winNum > 1 ? (
            <button
              onClick={() =>
                router.push(`/workshop/${groupId}/window/${winNum - 1}`)
              }
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-gray-600"
            >
              הקודם &rarr;
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={() => router.push(`/workshop/${groupId}`)}
            className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            חזרה לטבלה
          </button>

          {winNum < 9 ? (
            <button
              onClick={() =>
                router.push(`/workshop/${groupId}/window/${winNum + 1}`)
              }
              className="px-4 py-2 text-sm btn-theme rounded-lg cursor-pointer"
            >
              &larr; הבא
            </button>
          ) : (
            <button
              onClick={() => router.push(`/workshop/${groupId}`)}
              className="px-4 py-2 text-sm bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all cursor-pointer"
            >
              סיום - חזרה לטבלה
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
