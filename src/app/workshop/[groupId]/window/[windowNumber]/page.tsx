'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { WINDOWS } from '@/lib/windows-data'
import { Note, Depth, DEPTH_CONFIG, GroupMember } from '@/lib/types'

const THEME_MAP: Record<string, string> = {
  present: 'theme-present',
  past: 'theme-past',
  future: 'theme-future',
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

  const [depth, setDepth] = useState<Depth>('floating')
  const [noteContent, setNoteContent] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [justAdded, setJustAdded] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

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
        depth,
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

  async function handleToggleDepth(note: Note) {
    const newDepth: Depth = note.depth === 'floating' ? 'deep' : 'floating'
    await supabase.from('notes').update({ depth: newDepth }).eq('id', note.id)
    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, depth: newDepth } : n))
    )
  }

  async function handleEditSave(noteId: string) {
    if (!editContent.trim()) return
    await supabase
      .from('notes')
      .update({ content: editContent.trim() })
      .eq('id', noteId)
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId ? { ...n, content: editContent.trim() } : n
      )
    )
    setEditingId(null)
    setEditContent('')
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full" />
      </main>
    )
  }

  const floatingNotes = notes.filter((n) => n.depth === 'floating')
  const deepNotes = notes.filter((n) => n.depth === 'deep')
  const depthPercent = Math.round((winNum / 9) * 100)

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
            <span>חזרה לבריכה</span>
          </button>

          <div className="flex items-center gap-3">
            <span
              className="text-sm font-medium"
              style={{ color: 'var(--theme-primary)' }}
            >
              שלב {winNum} מתוך 9
            </span>
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full depth-fill rounded-full"
                style={{
                  width: `${depthPercent}%`,
                  background: 'var(--theme-gradient)',
                }}
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

      {/* Window header */}
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
        <svg
          className="absolute bottom-0 left-0 right-0 w-full"
          viewBox="0 0 1200 40"
          preserveAspectRatio="none"
          style={{ height: '30px' }}
        >
          <path
            d="M0,25 C200,40 400,10 600,25 C800,40 1000,10 1200,25 L1200,40 L0,40 Z"
            fill="var(--background)"
          />
        </svg>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
          {/* RTL: first column = right side = sidebar */}
          <div className="space-y-5">
            {/* Guiding questions card */}
            <div
              className="rounded-2xl border overflow-hidden"
              style={{
                borderColor: 'var(--theme-accent)',
                background: 'var(--theme-bg)',
              }}
            >
              <div
                className="px-5 py-4"
                style={{ borderBottom: '1px solid var(--theme-accent)' }}
              >
                <h3
                  className="text-sm font-bold"
                  style={{ color: 'var(--theme-primary)' }}
                >
                  שאלות מכוונות
                </h3>
              </div>
              <ul className="px-5 py-4 space-y-3">
                {win.questions.map((q, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-sm"
                    style={{ color: 'var(--theme-text)' }}
                  >
                    <span
                      style={{ color: 'var(--theme-accent)' }}
                      className="shrink-0 mt-0.5"
                    >
                      &#x25CF;
                    </span>
                    <span className="leading-relaxed opacity-85">{q}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Add note form */}
            <div
              className="rounded-2xl p-5 border"
              style={{
                background: 'var(--theme-bg)',
                borderColor: 'var(--theme-accent)',
              }}
            >
              <h3
                className="text-sm font-bold mb-4"
                style={{ color: 'var(--theme-primary)' }}
              >
                הוסיפו נקודה לבריכה
              </h3>

              {/* Depth selector */}
              <div className="flex gap-2 mb-4">
                {(['floating', 'deep'] as Depth[]).map((d) => {
                  const config = DEPTH_CONFIG[d]
                  const isActive = depth === d
                  return (
                    <button
                      key={d}
                      onClick={() => setDepth(d)}
                      className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer border-2 ${
                        isActive
                          ? `${config.bgClass} ${config.borderClass} ${config.textClass}`
                          : 'bg-white border-gray-200 text-gray-400'
                      }`}
                    >
                      <span className="text-lg ml-1">{config.icon}</span>
                      {config.label}
                      <span className="block text-[10px] font-normal opacity-70 mt-0.5">
                        {d === 'floating'
                          ? 'דברים שאנחנו יודעים'
                          : 'שאלות לצלול אליהן'}
                      </span>
                    </button>
                  )
                })}
              </div>

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
                  {submitting ? 'מוסיף...' : 'הוסיפו'}
                </button>
              </div>

              <p className="text-[10px] text-gray-400 mt-2">
                Ctrl+Enter לשליחה מהירה
              </p>
            </div>
          </div>

          {/* RTL: second column = left side = pool area */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-lg font-bold"
                style={{ color: 'var(--theme-text)' }}
              >
                נקודות בבריכה ({notes.length})
              </h2>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-cyan-400" />
                  צף ({floatingNotes.length})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-indigo-500" />
                  צולל ({deepNotes.length})
                </span>
              </div>
            </div>

            {/* The pool — always visible, notes float inside */}
            <div>
              {/* SHALLOW LAYER (floating notes) */}
              <div className="pool-layer pool-layer-shallow">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">~</span>
                  <h3 className="text-sm font-bold text-cyan-900">
                    צף — דברים שאנחנו יודעים
                  </h3>
                  <span className="text-xs text-cyan-700/70 mr-auto">
                    {floatingNotes.length}
                  </span>
                </div>
                {floatingNotes.length === 0 ? (
                  <p className="text-center text-cyan-800/50 text-sm py-6 italic">
                    עדיין אין כלום שצף כאן
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {floatingNotes.map((note) => (
                      <NoteBullet
                        key={note.id}
                        note={note}
                        isNew={note.id === justAdded}
                        editingId={editingId}
                        editContent={editContent}
                        onDelete={handleDelete}
                        onToggleDepth={handleToggleDepth}
                        onEditStart={(n) => {
                          setEditingId(n.id)
                          setEditContent(n.content)
                        }}
                        onEditSave={handleEditSave}
                        onEditCancel={() => {
                          setEditingId(null)
                          setEditContent('')
                        }}
                        onEditChange={setEditContent}
                      />
                    ))}
                  </ul>
                )}
              </div>

              {/* WATER SURFACE DIVIDER */}
              <div className="depth-divider">
                <span className="text-xs text-cyan-900/60 font-bold tracking-wider">
                  ~  ~  עומק  ~  ~
                </span>
              </div>

              {/* DEEP LAYER (deep notes) */}
              <div className="pool-layer pool-layer-deep">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl font-bold text-white">//</span>
                  <h3 className="text-sm font-bold text-white">
                    צולל — שאלות לצלול אליהן
                  </h3>
                  <span className="text-xs text-white/70 mr-auto">
                    {deepNotes.length}
                  </span>
                </div>
                {deepNotes.length === 0 ? (
                  <p className="text-center text-white/60 text-sm py-6 italic">
                    עדיין לא צללנו לכאן
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {deepNotes.map((note) => (
                      <NoteBullet
                        key={note.id}
                        note={note}
                        isNew={note.id === justAdded}
                        editingId={editingId}
                        editContent={editContent}
                        onDelete={handleDelete}
                        onToggleDepth={handleToggleDepth}
                        onEditStart={(n) => {
                          setEditingId(n.id)
                          setEditContent(n.content)
                        }}
                        onEditSave={handleEditSave}
                        onEditCancel={() => {
                          setEditingId(null)
                          setEditContent('')
                        }}
                        onEditChange={setEditContent}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </div>
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
            חזרה לבריכה
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
              סיום — חזרה לבריכה
            </button>
          )}
        </div>
      </div>
    </main>
  )
}

function NoteBullet({
  note,
  isNew,
  editingId,
  editContent,
  onDelete,
  onToggleDepth,
  onEditStart,
  onEditSave,
  onEditCancel,
  onEditChange,
}: {
  note: Note
  isNew: boolean
  editingId: string | null
  editContent: string
  onDelete: (id: string) => void
  onToggleDepth: (note: Note) => void
  onEditStart: (note: Note) => void
  onEditSave: (id: string) => void
  onEditCancel: () => void
  onEditChange: (val: string) => void
}) {
  const isEditing = editingId === note.id
  const isDeep = note.depth === 'deep'
  const bulletColor = isDeep ? 'bg-white' : 'bg-cyan-600'
  const textColor = isDeep ? 'text-white' : 'text-cyan-950'
  const authorColor = isDeep ? 'text-white/60' : 'text-cyan-900/60'
  const hoverBg = isDeep ? 'hover:bg-white/10' : 'hover:bg-white/40'

  if (isEditing) {
    return (
      <li className="flex gap-3 items-start py-2 px-2 rounded-lg bg-white/90">
        <span className={`w-2 h-2 rounded-full ${bulletColor} mt-2.5 shrink-0`} />
        <div className="flex-1 min-w-0">
          <textarea
            value={editContent}
            onChange={(e) => onEditChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white resize-none focus:outline-none focus:border-teal-500"
            rows={2}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey))
                onEditSave(note.id)
              if (e.key === 'Escape') onEditCancel()
            }}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onEditSave(note.id)}
              className="px-3 py-1 text-xs bg-teal-600 text-white rounded-md cursor-pointer"
            >
              שמור
            </button>
            <button
              onClick={onEditCancel}
              className="px-3 py-1 text-xs text-gray-500 cursor-pointer"
            >
              ביטול
            </button>
          </div>
        </div>
      </li>
    )
  }

  return (
    <li
      className={`group flex gap-3 items-start py-1.5 px-2 rounded-lg ${hoverBg} transition-colors ${isNew ? 'note-enter' : ''}`}
    >
      <span
        className={`w-2 h-2 rounded-full ${bulletColor} mt-2 shrink-0`}
      />
      <div className={`flex-1 min-w-0 text-sm leading-relaxed ${textColor}`}>
        {note.content}
        {note.author_name && (
          <span className={`text-[10px] mr-2 ${authorColor}`}>
            — {note.author_name}
          </span>
        )}
      </div>
      <div className="dot-actions flex gap-0.5 shrink-0">
        <button
          onClick={() => onToggleDepth(note)}
          className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold cursor-pointer ${
            isDeep
              ? 'bg-white/20 text-white hover:bg-white/30'
              : 'bg-white/60 text-gray-500 hover:text-indigo-600'
          }`}
          title={isDeep ? 'העבר לצף' : 'העבר לצולל'}
        >
          {isDeep ? '~' : '//'}
        </button>
        <button
          onClick={() => onEditStart(note)}
          className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] cursor-pointer ${
            isDeep
              ? 'bg-white/20 text-white hover:bg-white/30'
              : 'bg-white/60 text-gray-500 hover:text-teal-600'
          }`}
          title="עריכה"
        >
          &#9998;
        </button>
        <button
          onClick={() => onDelete(note.id)}
          className={`w-6 h-6 rounded-md flex items-center justify-center text-xs cursor-pointer ${
            isDeep
              ? 'bg-white/20 text-white hover:bg-red-500'
              : 'bg-white/60 text-gray-500 hover:text-red-500'
          }`}
          title="מחיקה"
        >
          &times;
        </button>
      </div>
    </li>
  )
}
