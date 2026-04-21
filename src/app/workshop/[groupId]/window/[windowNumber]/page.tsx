'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { WINDOWS } from '@/lib/windows-data'
import { Note, Depth, GroupMember, Challenge, Group } from '@/lib/types'

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
  const [group, setGroup] = useState<Group | null>(null)
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [loading, setLoading] = useState(true)

  const [depth, setDepth] = useState<Depth>('floating')
  const [noteContent, setNoteContent] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

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

      const saved = localStorage.getItem(`nw-author-${groupId}`)
      if (saved) setAuthorName(saved)

      setLoading(false)
    }
    load()
  }, [groupId, winNum, loadNotes])

  async function handleSubmit() {
    if (!noteContent.trim()) return
    setSubmitting(true)
    if (authorName)
      localStorage.setItem(`nw-author-${groupId}`, authorName)
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
      prev.map((n) => (n.id === note.id ? { ...n, depth: newDepth } : n)),
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
        n.id === noteId ? { ...n, content: editContent.trim() } : n,
      ),
    )
    setEditingId(null)
    setEditContent('')
  }

  if (loading) {
    return (
      <main className="wm-root flex items-center justify-center">
        <div className="text-sm ed-mono">טוען...</div>
      </main>
    )
  }

  const floating = notes.filter((n) => n.depth === 'floating')
  const deep = notes.filter((n) => n.depth === 'deep')

  const timeLabel =
    win.timeFrame === 'past'
      ? 'עבר'
      : win.timeFrame === 'present'
        ? 'הווה'
        : 'עתיד'
  const sysLabel =
    win.systemLevel === 'super'
      ? challenge?.super_system_name || 'מערכת-על'
      : win.systemLevel === 'system'
        ? challenge?.system_name || 'מערכת'
        : challenge?.sub_system_name || 'תת-מערכת'

  return (
    <main className="wm-root">
      {/* Top bar */}
      <div className="wm-topbar">
        <button
          className="wm-btn wm-btn-back"
          onClick={() => router.push(`/workshop/${groupId}`)}
          title="חזרה לבריכה"
        >
          ← לבריכה
        </button>

        <div className="wm-topbar-identity">
          <span className="wm-kicker">
            {challenge && (
              <a
                href={`/challenge/${challenge.id}`}
                className="wm-kicker-link"
              >
                {challenge.name}
              </a>
            )}
            {challenge && ' · '}
            <a
              href={`/workshop/${groupId}`}
              className="wm-kicker-link"
            >
              {group?.name}
            </a>
          </span>
          <span className="wm-title">
            חלון {String(winNum).padStart(2, '0')} ·{' '}
            <em>{win.title.replace('?', '')}?</em>
          </span>
        </div>

        <span className="wm-subtitle">
          {sysLabel} · {timeLabel}
        </span>

        <div className="wm-spacer" />

        {winNum > 1 && (
          <button
            className="wm-btn"
            onClick={() =>
              router.push(`/workshop/${groupId}/window/${winNum - 1}`)
            }
          >
            → הקודם
          </button>
        )}
        {winNum < 9 && (
          <button
            className="wm-btn primary"
            onClick={() =>
              router.push(`/workshop/${groupId}/window/${winNum + 1}`)
            }
          >
            הבא ←
          </button>
        )}
        {winNum === 9 && (
          <button
            className="wm-btn primary"
            onClick={() => router.push(`/workshop/${groupId}`)}
          >
            סיום ←
          </button>
        )}
      </div>

      {/* 2-column body */}
      <div className="wm-window-body">
        {/* Sidebar: questions + add form (sticky) */}
        <aside className="wm-sidebar">
          <div>
            <div className="wm-side-kicker">שלב {winNum} מתוך 9</div>
            <h1 className="wm-side-title">
              {win.title.replace('?', '')}
              <em>?</em>
            </h1>
          </div>

          {win.description && (
            <p className="wm-description">{win.description}</p>
          )}

          <div>
            <h3>שאלות מכוונות</h3>
            <ul className="wm-questions">
              {win.questions.map((q, i) => (
                <li key={i}>
                  <span className="wm-q-num">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Add note */}
          <div className="wm-add">
            <h3>הוסיפו נקודה</h3>
            <div className="wm-depth-toggle">
              <button
                className={`float ${depth === 'floating' ? 'on' : ''}`}
                onClick={() => setDepth('floating')}
              >
                ~ צף · יודעים
              </button>
              <button
                className={`deep ${depth === 'deep' ? 'on' : ''}`}
                onClick={() => setDepth('deep')}
              >
                ↓ שקוע · לחקור
              </button>
            </div>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder={
                depth === 'floating'
                  ? 'מה אתם יודעים? מה עולה?'
                  : 'מה השאלה? מה לחקור?'
              }
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey))
                  handleSubmit()
              }}
            />
            <div className="wm-add-row">
              {members.length > 0 ? (
                <select
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
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
                />
              )}
              <button
                className="wm-btn primary"
                onClick={handleSubmit}
                disabled={!noteContent.trim() || submitting}
              >
                {submitting ? 'מוסיף...' : 'הוסיפו'}
              </button>
            </div>
            <p
              style={{
                fontSize: 10,
                color: 'var(--muted-ink)',
                opacity: 0.7,
              }}
            >
              Ctrl+Enter לשליחה מהירה
            </p>
          </div>
        </aside>

        {/* Main: 2 lanes stacked — float (top) + deep (bottom) */}
        <div className="wm-main">
          {/* Float lane */}
          <div className="wm-lane float">
            <div className="wm-lane-head">
              <div style={{ flex: 1 }}>
                <div className="wm-lane-kicker">01 · פני המים</div>
                <h2>
                  צף —{' '}
                  <em style={{ color: 'var(--water-500)' }}>
                    מה שכבר גלוי לנו
                  </em>
                </h2>
              </div>
              <span className="wm-lane-count">
                {floating.length === 1
                  ? '1 נקודה'
                  : `${floating.length} נקודות`}
              </span>
            </div>
            {floating.length === 0 ? (
              <p className="wm-empty">
                פני המים שקטים. התחילו מצד ימין.
              </p>
            ) : (
              <ul className="wm-notes">
                {floating.map((note) => (
                  <NoteRow
                    key={note.id}
                    note={note}
                    editing={editingId === note.id}
                    editContent={editContent}
                    setEditContent={setEditContent}
                    onEditStart={() => {
                      setEditingId(note.id)
                      setEditContent(note.content)
                    }}
                    onEditSave={() => handleEditSave(note.id)}
                    onEditCancel={() => {
                      setEditingId(null)
                      setEditContent('')
                    }}
                    onDelete={() => handleDelete(note.id)}
                    onToggleDepth={() => handleToggleDepth(note)}
                  />
                ))}
              </ul>
            )}
          </div>

          {/* Deep lane */}
          <div className="wm-lane deep">
            <div className="wm-lane-head">
              <div style={{ flex: 1 }}>
                <div className="wm-lane-kicker">02 · עומק הבריכה</div>
                <h2>
                  שקוע —{' '}
                  <em style={{ color: 'var(--water-300)' }}>
                    מה שצריך לחקור
                  </em>
                </h2>
              </div>
              <span className="wm-lane-count">
                {deep.length === 1 ? '1 נקודה' : `${deep.length} נקודות`}
              </span>
            </div>
            {deep.length === 0 ? (
              <p className="wm-empty">
                עדיין אין כאן נקודות שקועות. החליפו את הבורר ל-&quot;שקוע&quot;
                כדי להוסיף.
              </p>
            ) : (
              <ul className="wm-notes">
                {deep.map((note) => (
                  <NoteRow
                    key={note.id}
                    note={note}
                    editing={editingId === note.id}
                    editContent={editContent}
                    setEditContent={setEditContent}
                    onEditStart={() => {
                      setEditingId(note.id)
                      setEditContent(note.content)
                    }}
                    onEditSave={() => handleEditSave(note.id)}
                    onEditCancel={() => {
                      setEditingId(null)
                      setEditContent('')
                    }}
                    onDelete={() => handleDelete(note.id)}
                    onToggleDepth={() => handleToggleDepth(note)}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

function NoteRow({
  note,
  editing,
  editContent,
  setEditContent,
  onEditStart,
  onEditSave,
  onEditCancel,
  onDelete,
  onToggleDepth,
}: {
  note: Note
  editing: boolean
  editContent: string
  setEditContent: (v: string) => void
  onEditStart: () => void
  onEditSave: () => void
  onEditCancel: () => void
  onDelete: () => void
  onToggleDepth: () => void
}) {
  if (editing) {
    return (
      <li className="wm-note" style={{ alignItems: 'stretch' }}>
        <span className={`wm-note-bullet ${note.depth === 'floating' ? 'float' : 'deep'}`} />
        <div style={{ flex: 1 }}>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            autoFocus
            rows={2}
            style={{
              width: '100%',
              fontFamily: "'Frank Ruhl Libre', serif",
              fontSize: 15,
              padding: 8,
              border: '1px solid var(--line)',
              background: 'var(--paper)',
              color: 'var(--ink)',
              resize: 'vertical',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onEditSave()
              if (e.key === 'Escape') onEditCancel()
            }}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <button className="wm-btn primary" onClick={onEditSave}>
              שמור
            </button>
            <button className="wm-btn" onClick={onEditCancel}>
              ביטול
            </button>
          </div>
        </div>
      </li>
    )
  }
  return (
    <li className="wm-note">
      <span
        className={`wm-note-bullet ${note.depth === 'floating' ? 'float' : 'deep'}`}
      />
      <div className="wm-note-body">
        {note.content}
        {note.author_name && (
          <span className="wm-note-author">— {note.author_name}</span>
        )}
      </div>
      <div className="wm-note-actions">
        <button
          className="wm-note-action"
          onClick={onToggleDepth}
          title={note.depth === 'floating' ? 'העבר לשקוע' : 'העבר לצף'}
        >
          {note.depth === 'floating' ? '↓' : '↑'}
        </button>
        <button
          className="wm-note-action"
          onClick={onEditStart}
          title="עריכה"
        >
          ✎
        </button>
        <button
          className="wm-note-action"
          onClick={onDelete}
          title="מחיקה"
        >
          ×
        </button>
      </div>
    </li>
  )
}
