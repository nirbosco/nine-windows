'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { WINDOWS } from '@/lib/windows-data'
import { Note, Depth, GroupMember, Challenge, Group } from '@/lib/types'
import { EditorialChrome } from '@/components/EditorialChrome'

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
  const [justAdded, setJustAdded] = useState<string | null>(null)
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
      <main className="ed-root min-h-screen flex items-center justify-center">
        <div className="text-sm ed-mono">טוען...</div>
      </main>
    )
  }

  const floatingNotes = notes.filter((n) => n.depth === 'floating')
  const deepNotes = notes.filter((n) => n.depth === 'deep')

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
        {
          label: group?.name || 'קבוצה',
          href: `/workshop/${groupId}`,
        },
        { label: `חלון ${winNum}` },
      ]}
    >
      {/* Window hero */}
      <section className="ed-w-hero">
        <div className="ed-container">
          <div className="ed-kicker ed-reveal">
            חלון {winNum} ·{' '}
            {win.systemLevel === 'super'
              ? 'מערכת-על'
              : win.systemLevel === 'system'
                ? 'מערכת'
                : 'תת-מערכת'}
            {' · '}
            {win.timeFrame === 'past'
              ? 'עבר'
              : win.timeFrame === 'present'
                ? 'הווה'
                : 'עתיד'}
          </div>
          <div className="ed-w-num-big ed-reveal">
            {String(winNum).padStart(2, '0')}
          </div>
          <h1 className="ed-h-display ed-reveal ed-reveal-d1 ed-serif">
            {win.title.replace('?', '')}
            <em className="ed-em">?</em>
          </h1>
          <p
            className="ed-body-lg ed-reveal ed-reveal-d2"
            style={{ maxWidth: 640, color: 'var(--muted-ink)' }}
          >
            {win.description}
          </p>
          <div className="ed-w-meta ed-reveal ed-reveal-d3">
            <span>
              <b>{group?.name}</b>
            </span>
            <span>
              <b>{floatingNotes.length}</b> נקודות צפות
            </span>
            <span>
              <b>{deepNotes.length}</b> נקודות צוללות
            </span>
            <span>
              <b>{notes.length}</b> סה&quot;כ
            </span>
          </div>
        </div>
      </section>

      {/* Pool visualization */}
      <div className="ed-window-hero-pool">
        <div
          className="ed-caustics-after"
          style={{
            position: 'absolute',
            inset: 0,
            top: '30%',
            bottom: 0,
            pointerEvents: 'none',
          }}
        ></div>
        <div className="ed-waterline"></div>
        <div className="ed-label-top">~ פני השטח · צף</div>
        <div className="ed-label-bottom">// תחתית · צולל</div>
        {floatingNotes.slice(0, 10).map((_, i) => {
          const sz = 10 + Math.random() * 10
          return (
            <div
              key={`f-${i}`}
              className="ed-ps float"
              style={{
                position: 'absolute',
                left: `${6 + i * 9 + Math.random() * 3}%`,
                top: `${8 + Math.random() * 14}%`,
                width: sz,
                height: sz,
                animationDelay: `${Math.random() * 2}s`,
                borderRadius: '50%',
              }}
            />
          )
        })}
        {deepNotes.slice(0, 10).map((_, i) => {
          const sz = 12 + Math.random() * 14
          return (
            <div
              key={`d-${i}`}
              className="ed-ps deep"
              style={{
                position: 'absolute',
                left: `${6 + i * 9 + Math.random() * 3}%`,
                top: `${58 + Math.random() * 24}%`,
                width: sz,
                height: sz,
                borderRadius: '50%',
              }}
            />
          )
        })}
        <div className="ed-floor"></div>
      </div>

      {/* Guiding questions */}
      <section
        className="ed-section"
        style={{ padding: '80px 48px', background: 'var(--paper-2)' }}
      >
        <div className="ed-container">
          <div className="ed-section-head ed-reveal" style={{ marginBottom: 40 }}>
            <div className="ed-label" style={{ color: 'var(--water-700)' }}>
              שאלות מכוונות
            </div>
          </div>
          <ul
            style={{
              maxWidth: 900,
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              listStyle: 'none',
              padding: 0,
            }}
          >
            {win.questions.map((q, i) => (
              <li
                key={i}
                className="ed-reveal"
                style={{
                  display: 'flex',
                  gap: 16,
                  fontFamily: "'Frank Ruhl Libre', serif",
                  fontSize: 22,
                  lineHeight: 1.45,
                  letterSpacing: '-0.01em',
                  fontWeight: 500,
                  color: 'var(--ink)',
                }}
              >
                <span style={{ color: 'var(--water-500)', minWidth: 32 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FLOAT BAND */}
      <section className="ed-band">
        <div className="ed-container">
          <div className="ed-band-head ed-reveal">
            <div className="ed-label" style={{ color: 'var(--water-700)' }}>
              01 · צף
            </div>
            <h2 className="ed-h-xl ed-serif">
              דברים שאנחנו <em className="ed-em">יודעים.</em>
            </h2>
            <p
              className="ed-body-lg"
              style={{ color: 'var(--muted-ink)', maxWidth: 620 }}
            >
              מה שעל פני השטח. תצפיות, עובדות, מה שכבר קלטתם. אין צורך להצדיק
              — רק להגיד.
            </p>
          </div>

          {/* Add form for floating */}
          {depth === 'floating' && (
            <AddForm
              depth={depth}
              setDepth={setDepth}
              noteContent={noteContent}
              setNoteContent={setNoteContent}
              authorName={authorName}
              setAuthorName={setAuthorName}
              members={members}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          )}
          {depth !== 'floating' && (
            <div
              style={{
                maxWidth: 900,
                margin: '0 auto 40px',
                textAlign: 'center',
              }}
            >
              <button
                onClick={() => setDepth('floating')}
                className="ed-btn-line dark"
              >
                + הוסיפו נקודה צפה
              </button>
            </div>
          )}

          {floatingNotes.length === 0 ? (
            <p
              style={{
                textAlign: 'center',
                color: 'var(--muted-ink)',
                padding: '60px 0',
                fontStyle: 'italic',
              }}
            >
              עדיין אין כלום שצף בחלון הזה.
            </p>
          ) : (
            <div className="ed-cards">
              {floatingNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  dark={false}
                  isNew={note.id === justAdded}
                  editingId={editingId}
                  editContent={editContent}
                  setEditContent={setEditContent}
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
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SINK BAND */}
      <section className="ed-band sink-band ed-caustics-after">
        <div className="ed-container">
          <div className="ed-band-head ed-reveal">
            <div className="ed-label">02 · צולל</div>
            <h2 className="ed-h-xl ed-serif">
              שאלות <em className="ed-em">לחקור.</em>
            </h2>
            <p
              className="ed-body-lg"
              style={{ maxWidth: 620 }}
            >
              מה שנרצה לצלול אליו. שאלות שדורשות עצירה, קישורים שטרם ראינו,
              הודאות שקשה לאמר. זה המקום שלהן.
            </p>
          </div>

          {/* Add form for deep */}
          {depth === 'deep' && (
            <AddForm
              depth={depth}
              setDepth={setDepth}
              noteContent={noteContent}
              setNoteContent={setNoteContent}
              authorName={authorName}
              setAuthorName={setAuthorName}
              members={members}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          )}
          {depth !== 'deep' && (
            <div
              style={{
                maxWidth: 900,
                margin: '0 auto 40px',
                textAlign: 'center',
              }}
            >
              <button
                onClick={() => setDepth('deep')}
                className="ed-btn-line light"
              >
                + הוסיפו שאלה לצלילה
              </button>
            </div>
          )}

          {deepNotes.length === 0 ? (
            <p
              style={{
                textAlign: 'center',
                color: 'rgba(255,255,255,0.5)',
                padding: '60px 0',
                fontStyle: 'italic',
              }}
            >
              עדיין לא צללנו לחלון הזה.
            </p>
          ) : (
            <div className="ed-cards">
              {deepNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  dark={true}
                  isNew={note.id === justAdded}
                  editingId={editingId}
                  editContent={editContent}
                  setEditContent={setEditContent}
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
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Win-nav: prev / next */}
      <section className="ed-win-nav">
        {winNum > 1 ? (
          <a
            onClick={() =>
              router.push(`/workshop/${groupId}/window/${winNum - 1}`)
            }
          >
            <span className="ed-hint">← חלון {winNum - 1}</span>
            <span className="ed-name">
              {WINDOWS.find((w) => w.number === winNum - 1)?.title}
            </span>
          </a>
        ) : (
          <a onClick={() => router.push(`/workshop/${groupId}`)}>
            <span className="ed-hint">← חזרה לבריכה</span>
            <span className="ed-name">{group?.name}</span>
          </a>
        )}
        {winNum < 9 ? (
          <a
            className="next"
            onClick={() =>
              router.push(`/workshop/${groupId}/window/${winNum + 1}`)
            }
          >
            <span className="ed-hint">חלון {winNum + 1} →</span>
            <span className="ed-name">
              {WINDOWS.find((w) => w.number === winNum + 1)?.title}
            </span>
          </a>
        ) : (
          <a
            className="next"
            onClick={() => router.push(`/workshop/${groupId}`)}
          >
            <span className="ed-hint">סיימתם →</span>
            <span className="ed-name">חזרה לבריכה</span>
          </a>
        )}
      </section>
    </EditorialChrome>
  )
}

function AddForm({
  depth,
  setDepth,
  noteContent,
  setNoteContent,
  authorName,
  setAuthorName,
  members,
  onSubmit,
  submitting,
}: {
  depth: Depth
  setDepth: (d: Depth) => void
  noteContent: string
  setNoteContent: (v: string) => void
  authorName: string
  setAuthorName: (v: string) => void
  members: GroupMember[]
  onSubmit: () => void
  submitting: boolean
}) {
  return (
    <div className="ed-add-form">
      <h3>
        {depth === 'floating'
          ? 'הוסיפו דבר שאתם יודעים'
          : 'הוסיפו שאלה לצלילה'}
      </h3>
      <textarea
        value={noteContent}
        onChange={(e) => setNoteContent(e.target.value)}
        placeholder={
          depth === 'floating'
            ? 'מה אתם יודעים? מה עולה?'
            : 'מה השאלה? מה צריך להבהיר?'
        }
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSubmit()
        }}
      />
      <div className="ed-form-row">
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
          onClick={() => setDepth(depth === 'floating' ? 'deep' : 'floating')}
          style={{
            padding: '10px 14px',
            fontFamily: "'Heebo', sans-serif",
            fontSize: 13,
            background: 'transparent',
            border: '1px solid currentColor',
            color: 'inherit',
            cursor: 'pointer',
          }}
        >
          {depth === 'floating' ? '→ להעביר לצולל' : '→ להעביר לצף'}
        </button>
        <button
          type="submit"
          onClick={onSubmit}
          disabled={!noteContent.trim() || submitting}
        >
          {submitting ? 'מוסיף...' : 'הוסיפו'}
        </button>
      </div>
    </div>
  )
}

function NoteCard({
  note,
  dark,
  isNew,
  editingId,
  editContent,
  setEditContent,
  onDelete,
  onToggleDepth,
  onEditStart,
  onEditSave,
  onEditCancel,
}: {
  note: Note
  dark: boolean
  isNew: boolean
  editingId: string | null
  editContent: string
  setEditContent: (v: string) => void
  onDelete: (id: string) => void
  onToggleDepth: (note: Note) => void
  onEditStart: (note: Note) => void
  onEditSave: (id: string) => void
  onEditCancel: () => void
}) {
  const isEditing = editingId === note.id
  const initial = note.author_name
    ? note.author_name.charAt(0)
    : '·'

  return (
    <div
      className={`ed-card ${note.depth === 'floating' ? 'float' : 'sink'} ${isNew ? 'ed-reveal in' : ''}`}
    >
      <div className="ed-card-actions">
        <button
          className="ed-card-action-btn"
          onClick={() => onToggleDepth(note)}
          title={note.depth === 'floating' ? 'העבר לצולל' : 'העבר לצף'}
        >
          {note.depth === 'floating' ? '↓' : '↑'}
        </button>
        <button
          className="ed-card-action-btn"
          onClick={() => onEditStart(note)}
          title="עריכה"
        >
          ✎
        </button>
        <button
          className="ed-card-action-btn"
          onClick={() => onDelete(note.id)}
          title="מחיקה"
        >
          ×
        </button>
      </div>
      <div className="ed-card-kicker">
        <span className="ed-card-dot"></span>
        <span>{note.depth === 'floating' ? 'צף' : 'צולל'}</span>
      </div>
      {isEditing ? (
        <div>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
            autoFocus
            style={{
              width: '100%',
              padding: 12,
              fontFamily: "'Frank Ruhl Libre', serif",
              fontSize: 18,
              border: `1px solid ${dark ? 'rgba(255,255,255,0.3)' : 'var(--line)'}`,
              background: 'transparent',
              color: 'inherit',
              resize: 'vertical',
              marginBottom: 12,
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey))
                onEditSave(note.id)
              if (e.key === 'Escape') onEditCancel()
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => onEditSave(note.id)}
              className="ed-btn-line"
              style={{
                padding: '8px 18px',
                fontSize: 12,
                color: dark ? 'var(--ink)' : 'var(--paper)',
                background: dark ? 'var(--paper)' : 'var(--ink)',
                border: 'none',
              }}
            >
              שמור
            </button>
            <button
              onClick={onEditCancel}
              style={{
                padding: '8px 18px',
                fontSize: 12,
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                opacity: 0.6,
              }}
            >
              ביטול
            </button>
          </div>
        </div>
      ) : (
        <blockquote>&ldquo;{note.content}&rdquo;</blockquote>
      )}
      {note.author_name && !isEditing && (
        <div className="ed-attr">
          <div className="ed-av">{initial}</div>
          <span>{note.author_name}</span>
        </div>
      )}
    </div>
  )
}
