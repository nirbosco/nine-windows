'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { WINDOWS } from '@/lib/windows-data'
import {
  Challenge,
  Group,
  GroupMember,
  Note,
  Depth,
} from '@/lib/types'
import { EditorialChrome } from '@/components/EditorialChrome'

interface GroupData {
  group: Group
  members: GroupMember[]
  notes: Note[]
}

type ViewMode = 'pools' | 'heatmap' | 'feed'

export default function AdminPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null)
  const [groupsData, setGroupsData] = useState<GroupData[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('pools')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('challenges')
        .select('*')
        .order('created_at')
      if (data) {
        setChallenges(data as Challenge[])
        if (data.length > 0) setSelectedChallenge(data[0].id)
      }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!selectedChallenge) return

    async function loadGroups() {
      const { data: groups } = await supabase
        .from('groups')
        .select('*')
        .eq('challenge_id', selectedChallenge)
        .order('created_at')

      if (!groups) return

      const allData: GroupData[] = []

      for (const group of groups) {
        const [{ data: members }, { data: notes }] = await Promise.all([
          supabase
            .from('group_members')
            .select('*')
            .eq('group_id', group.id),
          supabase
            .from('notes')
            .select('*')
            .eq('group_id', group.id)
            .order('created_at', { ascending: false }),
        ])

        allData.push({
          group: group as Group,
          members: (members || []) as GroupMember[],
          notes: (notes || []) as Note[],
        })
      }

      setGroupsData(allData)
    }

    loadGroups()
  }, [selectedChallenge])

  function handleExportAll() {
    groupsData.forEach((gd) => handleExportOne(gd))
  }

  function handleExportOne(gd: GroupData) {
    const challenge = challenges.find((c) => c.id === selectedChallenge)
    let text = '===========================================\n'
    text += 'תשעת החלונות - ניתוח אתגר\n'
    text += "אדוות | מחזור ז'\n"
    text += '===========================================\n\n'
    text += `אתגר: ${challenge?.name || ''}\n`
    text += `קבוצה: ${gd.group.name}\n`
    text += `משתתפים: ${gd.members.map((m) => m.name).join(', ')}\n`
    text += `תאריך: ${new Date().toLocaleDateString('he-IL')}\n\n`

    for (const win of WINDOWS) {
      text += '-------------------------------------------\n'
      text += `חלון ${win.number}: ${win.title}\n`
      text += `${win.subtitle}\n`
      text += '-------------------------------------------\n\n'
      const wn = gd.notes.filter((n) => n.window_number === win.number)
      const floating = wn.filter((n) => n.depth === 'floating')
      const deep = wn.filter((n) => n.depth === 'deep')
      if (floating.length > 0) {
        text += 'צף:\n'
        floating.forEach((n) => {
          text += `  * ${n.content}${n.author_name ? ` (${n.author_name})` : ''}\n`
        })
        text += '\n'
      }
      if (deep.length > 0) {
        text += 'שקוע:\n'
        deep.forEach((n) => {
          text += `  * ${n.content}${n.author_name ? ` (${n.author_name})` : ''}\n`
        })
        text += '\n'
      }
    }

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nine-windows-${gd.group.name}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <main className="ed-root min-h-screen flex items-center justify-center">
        <div className="text-sm ed-mono">טוען...</div>
      </main>
    )
  }

  const allNotes = groupsData.flatMap((gd) => gd.notes)
  const totalFloating = allNotes.filter((n) => n.depth === 'floating').length
  const totalDeep = allNotes.filter((n) => n.depth === 'deep').length
  const activeGroups = groupsData.filter((gd) => {
    const latest = gd.notes[0]
    if (!latest) return false
    return Date.now() - new Date(latest.created_at).getTime() < 15 * 60 * 1000
  }).length
  const latestNote = allNotes.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0]

  const currentChallenge = challenges.find((c) => c.id === selectedChallenge)

  // Build heatmap data [groups][windows]
  const heatData = groupsData.map((gd) => {
    const row: number[] = []
    for (let w = 1; w <= 9; w++) {
      row.push(gd.notes.filter((n) => n.window_number === w).length)
    }
    return row
  })
  const heatColor = (v: number) => {
    if (v < 3) return '#EDF3F7'
    if (v < 5) return '#D6E4EC'
    if (v < 7) return '#7BAAC2'
    if (v < 10) return '#2D6F94'
    if (v < 15) return '#0F4A78'
    return '#0A3556'
  }

  const r = (a: number, b: number) => a + Math.random() * (b - a)

  // All notes for feed, sorted by time
  const feedItems = allNotes
    .map((n) => {
      const gd = groupsData.find((g) => g.notes.some((nn) => nn.id === n.id))
      return { note: n, groupName: gd?.group.name || '' }
    })
    .sort(
      (a, b) =>
        new Date(b.note.created_at).getTime() -
        new Date(a.note.created_at).getTime(),
    )

  return (
    <EditorialChrome
      activePage="admin"
      breadcrumb={[
        { label: 'תשעת החלונות', href: '/' },
        { label: 'ניהול' },
        { label: currentChallenge?.name || 'מחזור ז׳' },
      ]}
    >
      {/* Hero */}
      <section className="ed-ad-hero">
        <div className="ed-container">
          <div className="ed-kicker ed-reveal">ניהול · מבט על הבריכה</div>
          <h1 className="ed-h-display ed-reveal ed-reveal-d1 ed-serif">
            {groupsData.length}{' '}
            {groupsData.length === 1 ? 'קבוצה' : 'קבוצות'}.
            <br />
            <em className="ed-em">רואים את הכל.</em>
          </h1>

          {/* Challenge selector */}
          {challenges.length > 1 && (
            <div
              style={{
                display: 'flex',
                gap: 12,
                marginBottom: 32,
                flexWrap: 'wrap',
              }}
              className="ed-reveal"
            >
              {challenges.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedChallenge(c.id)}
                  className="ed-pill"
                  style={
                    selectedChallenge === c.id
                      ? { background: 'var(--ink)', color: 'var(--paper)' }
                      : undefined
                  }
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          <div className="ed-live-stats ed-reveal ed-reveal-d2">
            <div>
              <div className="ed-num">{allNotes.length}</div>
              <div className="ed-lbl">נקודות כולל</div>
            </div>
            <div>
              <div className="ed-num">{totalFloating}</div>
              <div className="ed-lbl">צף</div>
            </div>
            <div>
              <div className="ed-num">{totalDeep}</div>
              <div className="ed-lbl">שקוע</div>
            </div>
            <div>
              <div className="ed-num">
                {activeGroups}
                {activeGroups > 0 && <span className="ed-live-dot"></span>}
              </div>
              <div className="ed-lbl">פעילות עכשיו</div>
            </div>
            <div>
              <div className="ed-num" style={{ fontSize: 32 }}>
                {latestNote
                  ? new Date(latestNote.created_at).toLocaleTimeString('he-IL', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </div>
              <div className="ed-lbl">נקודה אחרונה</div>
            </div>
          </div>
        </div>
      </section>

      {/* View switcher */}
      <div className="ed-switcher">
        <button
          className={view === 'pools' ? 'on' : ''}
          onClick={() => setView('pools')}
        >
          תצוגת בריכות
        </button>
        <button
          className={view === 'heatmap' ? 'on' : ''}
          onClick={() => setView('heatmap')}
        >
          מפת חום
        </button>
        <button
          className={view === 'feed' ? 'on' : ''}
          onClick={() => setView('feed')}
        >
          פיד חי
        </button>
        <a
          href="/admin/content"
          style={{
            marginRight: 'auto',
            padding: '18px 28px',
            fontFamily: "'Heebo', sans-serif",
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--water-700)',
            textDecoration: 'none',
            letterSpacing: 0,
          }}
        >
          עריכת תוכן ←
        </a>
        <button onClick={handleExportAll}>ייצוא הכל</button>
      </div>

      {/* Pools view */}
      {view === 'pools' && (
        <section className="ed-pools-view">
          <div className="ed-pools-grid">
            {groupsData.map((gd) => {
              const floating = gd.notes.filter((n) => n.depth === 'floating')
              const deep = gd.notes.filter((n) => n.depth === 'deep')
              const isLive =
                gd.notes[0] &&
                Date.now() - new Date(gd.notes[0].created_at).getTime() <
                  15 * 60 * 1000
              return (
                <div
                  key={gd.group.id}
                  className="ed-pool-card ed-reveal"
                  onClick={() =>
                    window.open(`/workshop/${gd.group.id}`, '_blank')
                  }
                >
                  <div className="ed-pool-head">
                    <div>
                      <h3>{gd.group.name}</h3>
                      <div className="ed-g-sub">
                        {gd.members.map((m) => m.name).join(' · ') ||
                          `${gd.members.length} משתתפים`}
                      </div>
                    </div>
                    <div className={`ed-status ${isLive ? 'live' : ''}`}>
                      <span className="ed-status-dot"></span>
                      {isLive ? 'פעילה' : 'לא פעילה'}
                    </div>
                  </div>
                  <div className="ed-tdpool">
                    {floating.slice(0, 40).map((_, i) => {
                      const sz = 8 + Math.random() * 5
                      return (
                        <div
                          key={`f-${i}`}
                          className="ed-td-dot float"
                          style={{
                            left: r(8, 92) + '%',
                            top: r(8, 45) + '%',
                            width: sz,
                            height: sz,
                          }}
                        />
                      )
                    })}
                    {deep.slice(0, 40).map((_, i) => {
                      const sz = 10 + Math.random() * 8
                      return (
                        <div
                          key={`d-${i}`}
                          className="ed-td-dot deep"
                          style={{
                            left: r(8, 92) + '%',
                            top: r(55, 92) + '%',
                            width: sz,
                            height: sz,
                          }}
                        />
                      )
                    })}
                  </div>
                  <div className="ed-pool-stats">
                    <div>
                      <b>{gd.notes.length}</b>
                      <span>סה&quot;כ</span>
                    </div>
                    <div>
                      <b>{floating.length}</b>
                      <span>צף</span>
                    </div>
                    <div>
                      <b>{deep.length}</b>
                      <span>שקוע</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Heatmap view */}
      {view === 'heatmap' && (
        <section className="ed-heatmap-view">
          <div className="ed-heatmap">
            <div className="ed-heatmap-header">
              נקודות לפי קבוצה × חלון · צבע = צפיפות
            </div>
            <div className="ed-heat-grid">
              <div className="ed-hh"></div>
              {Array.from({ length: 9 }, (_, i) => (
                <div key={i} className="ed-hh">
                  חלון {i + 1}
                </div>
              ))}
              {groupsData.map((gd, ri) => (
                <div
                  key={gd.group.id}
                  style={{ display: 'contents' }}
                >
                  <div className="ed-hh row">{gd.group.name}</div>
                  {heatData[ri].map((v, ci) => {
                    const dark = v >= 5
                    return (
                      <div
                        key={ci}
                        className="ed-heat-cell"
                        style={{
                          background: heatColor(v),
                          color: dark ? '#fff' : '#5C6B73',
                        }}
                      >
                        {v}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 24,
                display: 'flex',
                gap: 20,
                alignItems: 'center',
                fontSize: 11,
                color: 'var(--muted-ink)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              <span>פחות</span>
              <div style={{ display: 'flex', gap: 2 }}>
                {['#EDF3F7', '#D6E4EC', '#7BAAC2', '#2D6F94', '#0F4A78', '#0A3556'].map(
                  (c) => (
                    <div
                      key={c}
                      style={{ width: 20, height: 14, background: c }}
                    />
                  ),
                )}
              </div>
              <span>יותר</span>
            </div>
          </div>
        </section>
      )}

      {/* Feed view */}
      {view === 'feed' && (
        <section className="ed-feed-view">
          <div className="ed-feed">
            {feedItems.length === 0 && (
              <p
                style={{
                  textAlign: 'center',
                  color: 'var(--muted-ink)',
                  padding: '60px 0',
                }}
              >
                אין עדיין נקודות בפיד
              </p>
            )}
            {feedItems.slice(0, 50).map(({ note, groupName }) => {
              const t = new Date(note.created_at).toLocaleTimeString('he-IL', {
                hour: '2-digit',
                minute: '2-digit',
              })
              return (
                <div key={note.id} className="ed-feed-item">
                  <div className="ed-time">{t}</div>
                  <div>
                    <h5>&ldquo;{note.content}&rdquo;</h5>
                    <p>
                      {note.author_name ? `${note.author_name} · ` : ''}
                      {groupName}
                    </p>
                    <div className="ed-tags">
                      <span className="ed-tag">חלון {note.window_number}</span>
                      <span
                        className={`ed-tag ${note.depth === 'floating' ? 'float' : 'sink'}`}
                      >
                        {note.depth === 'floating' ? 'צף' : 'שקוע'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </EditorialChrome>
  )
}
