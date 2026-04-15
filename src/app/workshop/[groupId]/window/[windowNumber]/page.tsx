'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { WINDOWS } from '@/lib/windows-data'
import { Note, NoteType, NOTE_TYPE_CONFIG, GroupMember } from '@/lib/types'

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
  const [questionsOpen, setQuestionsOpen] = useState(true)

  // Form state
  const [noteType, setNoteType] = useState<NoteType>('thought')
  const [noteContent, setNoteContent] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

  // Depth indicator based on window number progression
  const depthPercent = Math.round((winNum / 9) * 100)

  return (
    <main className="min-h-screen px-4 py-6 max-w-4xl mx-auto page-enter">
      {/* Navigation bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push(`/workshop/${groupId}`)}
          className="text-teal-600/60 hover:text-teal-700 text-sm flex items-center gap-1 cursor-pointer"
        >
          <span>&rarr;</span>
          <span>חזרה לטבלה</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-teal-600/70">
            שלב {winNum} מתוך 9
          </span>
          {/* Mini depth bar */}
          <div className="w-20 h-1.5 bg-teal-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-l from-teal-500 to-teal-400 rounded-full transition-all duration-500"
              style={{ width: `${depthPercent}%` }}
            />
          </div>
        </div>

        <div className="flex gap-2">
          {winNum > 1 && (
            <button
              onClick={() =>
                router.push(`/workshop/${groupId}/window/${winNum - 1}`)
              }
              className="px-3 py-1.5 text-sm border border-teal-200/50 rounded-lg hover:bg-teal-50 transition-colors cursor-pointer text-teal-700"
            >
              הקודם &rarr;
            </button>
          )}
          {winNum < 9 && (
            <button
              onClick={() =>
                router.push(`/workshop/${groupId}/window/${winNum + 1}`)
              }
              className="px-3 py-1.5 text-sm btn-pool rounded-lg cursor-pointer"
            >
              &larr; הבא
            </button>
          )}
        </div>
      </div>

      {/* Window header - pool depth card */}
      <div className="bg-gradient-to-bl from-teal-50/80 via-white to-teal-100/30 rounded-2xl p-6 shadow-sm border border-teal-200/40 mb-6 relative overflow-hidden">
        {/* Subtle water pattern */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-l from-teal-400 via-teal-300 to-teal-500" />

        <div className="flex items-center gap-3 mb-3">
          <span className="flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 text-white font-bold text-lg shadow-sm">
            {winNum}
          </span>
          <div>
            <h1 className="text-xl font-bold text-teal-900">{win.title}</h1>
            <p className="text-sm text-teal-600 font-medium">{win.subtitle}</p>
          </div>
        </div>
        <p className="text-sm text-teal-700/70 leading-relaxed">
          {win.description}
        </p>
      </div>

      {/* Guiding questions */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-teal-200/40 mb-6 overflow-hidden">
        <button
          onClick={() => setQuestionsOpen(!questionsOpen)}
          className="w-full px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-teal-50/30 transition-colors"
        >
          <h2 className="text-sm font-bold text-teal-800">
            שאלות מכוונות ({win.questions.length})
          </h2>
          <span
            className={`text-teal-400 transition-transform duration-200 text-xs ${questionsOpen ? 'rotate-180' : ''}`}
          >
            &#x25BC;
          </span>
        </button>
        {questionsOpen && (
          <div className="px-6 pb-5 border-t border-teal-100/50">
            <ul className="mt-4 space-y-3">
              {win.questions.map((q, i) => (
                <li key={i} className="flex gap-3 text-sm text-teal-800/80">
                  <span className="text-teal-400 shrink-0 mt-0.5">&#x25CF;</span>
                  <span className="leading-relaxed">{q}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Add note form */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-teal-200/40 mb-6">
        <h2 className="text-sm font-bold text-teal-800 mb-4">השליכו פתק לבריכה</h2>

        {/* Note type selector */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {(['question', 'knowledge', 'thought'] as NoteType[]).map((type) => (
            <button
              key={type}
              onClick={() => setNoteType(type)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
                noteType === type
                  ? `${NOTE_TYPE_CONFIG[type].bgClass} ${NOTE_TYPE_CONFIG[type].borderClass} ${NOTE_TYPE_CONFIG[type].textClass} shadow-sm`
                  : 'bg-white border-teal-200/50 text-teal-600/60 hover:bg-teal-50/50'
              }`}
            >
              {NOTE_TYPE_CONFIG[type].label}
            </button>
          ))}
        </div>

        {/* Content */}
        <textarea
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          placeholder="מה עולה לכם? כתבו כאן..."
          rows={3}
          className="w-full px-4 py-3 border border-teal-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none bg-white/60 mb-3"
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
              className="px-3 py-2 border border-teal-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white/60"
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
              className="px-3 py-2 border border-teal-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white/60"
            />
          )}

          <button
            onClick={handleSubmit}
            disabled={!noteContent.trim() || submitting}
            className="px-6 py-2 btn-pool font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mr-auto"
          >
            {submitting ? 'שומר...' : 'הוסף'}
          </button>
        </div>

        <p className="text-[10px] text-teal-500/50 mt-2">
          Ctrl+Enter לשליחה מהירה
        </p>
      </div>

      {/* Notes board */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-teal-800">
            פתקים בבריכה ({notes.length})
          </h2>
        </div>

        {notes.length === 0 ? (
          <div className="bg-gradient-to-br from-teal-50/30 to-teal-100/20 rounded-2xl p-12 text-center text-teal-500/50 text-sm border border-dashed border-teal-300/30">
            הבריכה ריקה. השליכו את הפתק הראשון!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {notes.map((note, idx) => {
              const config = NOTE_TYPE_CONFIG[note.note_type]
              const rotation = ((idx % 5) - 2) * 0.8

              return (
                <div
                  key={note.id}
                  className={`note-card relative rounded-xl p-4 border-2 ${config.bgClass} ${config.borderClass}`}
                  style={{ transform: `rotate(${rotation}deg)` }}
                >
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="absolute top-2 left-2 w-5 h-5 rounded-full bg-white/70 text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center text-xs opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                    title="מחיקה"
                  >
                    X
                  </button>

                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${config.dotClass}`}
                    />
                    <span className={`text-[10px] font-medium ${config.textClass}`}>
                      {config.label}
                    </span>
                  </div>

                  <p className={`text-sm leading-relaxed ${config.textClass}`}>
                    {note.content}
                  </p>

                  {note.author_name && (
                    <p className="text-[10px] text-slate-400 mt-3">
                      {note.author_name}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <div className="flex items-center justify-between border-t border-teal-200/30 pt-6">
        {winNum > 1 ? (
          <button
            onClick={() =>
              router.push(`/workshop/${groupId}/window/${winNum - 1}`)
            }
            className="px-4 py-2 text-sm border border-teal-200/50 rounded-lg hover:bg-teal-50 transition-colors cursor-pointer text-teal-700"
          >
            הקודם &rarr;
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={() => router.push(`/workshop/${groupId}`)}
          className="px-4 py-2 text-sm text-teal-600/60 hover:text-teal-700 cursor-pointer"
        >
          חזרה לטבלה
        </button>

        {winNum < 9 ? (
          <button
            onClick={() =>
              router.push(`/workshop/${groupId}/window/${winNum + 1}`)
            }
            className="px-4 py-2 text-sm btn-pool rounded-lg cursor-pointer"
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
    </main>
  )
}
