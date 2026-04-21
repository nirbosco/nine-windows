'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { WINDOWS } from '@/lib/windows-data'
import { Challenge, Group, Note, Depth } from '@/lib/types'
import { EditorialChrome } from '@/components/EditorialChrome'

interface NoteWithGroup extends Note {
  groupName: string
  groupColor: string
}

// Preset colors per group index
const GROUP_COLORS = ['#C4623A', '#2D6F94', '#6B8E4E', '#6B6E9E', '#C89968', '#7A4E6B']

export default function SharedPoolPage() {
  const { challengeId } = useParams<{ challengeId: string }>()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [groups, setGroups] = useState<(Group & { color: string; count: number })[]>([])
  const [notes, setNotes] = useState<NoteWithGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [filterGroup, setFilterGroup] = useState<string>('all')
  const [filterDepth, setFilterDepth] = useState<Depth | 'all'>('all')

  useEffect(() => {
    async function load() {
      const { data: c } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', challengeId)
        .single()
      if (c) setChallenge(c as Challenge)

      const { data: g } = await supabase
        .from('groups')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('created_at')

      if (g) {
        const colored = g.map((grp, i) => ({
          ...(grp as Group),
          color: GROUP_COLORS[i % GROUP_COLORS.length],
          count: 0,
        }))

        const allNotes: NoteWithGroup[] = []
        for (const grp of colored) {
          const { data: nt } = await supabase
            .from('notes')
            .select('*')
            .eq('group_id', grp.id)
            .order('created_at', { ascending: false })
          if (nt) {
            grp.count = nt.length
            nt.forEach((n: Note) => {
              allNotes.push({
                ...n,
                groupName: grp.name,
                groupColor: grp.color,
              })
            })
          }
        }

        setGroups(colored)
        setNotes(allNotes)
      }

      setLoading(false)
    }
    load()
  }, [challengeId])

  if (loading) {
    return (
      <main className="ed-root min-h-screen flex items-center justify-center">
        <div className="text-sm ed-mono">טוען...</div>
      </main>
    )
  }

  const visibleNotes = notes.filter((n) => {
    if (filterGroup !== 'all' && n.group_id !== filterGroup) return false
    if (filterDepth !== 'all' && n.depth !== filterDepth) return false
    return true
  })

  return (
    <EditorialChrome
      activePage="shared"
      breadcrumb={[
        { label: 'תשעת החלונות', href: '/' },
        {
          label: challenge?.name || 'אתגר',
          href: `/challenge/${challengeId}`,
        },
        { label: 'בריכה משותפת' },
      ]}
    >
      {/* Hero */}
      <section className="ed-sh-hero">
        <div className="ed-container">
          <div className="ed-kicker ed-reveal">
            שלב השיתוף · כל הקבוצות יחד
          </div>
          <h1 className="ed-h-display ed-reveal ed-reveal-d1 ed-serif">
            בריכה
            <br />
            <em className="ed-em">משותפת.</em>
          </h1>
          <p className="ed-lead-sh ed-reveal ed-reveal-d2">
            כל מה שהקבוצות העלו, בחלונות אחד-לצד-השני. מצאו קולות שחוזרים,
            קשיים שמופיעים רק אצל חלק, תובנות שקבוצה אחת ניסחה ואחרת ניסחה
            אחרת. סננו לפי קבוצה או רובד.
          </p>
        </div>
      </section>

      {/* Filters */}
      <div className="ed-pills ed-reveal">
        <button
          className={`ed-pill ${filterGroup === 'all' ? 'on' : ''}`}
          onClick={() => setFilterGroup('all')}
        >
          כל הקבוצות · {notes.length}
        </button>
        {groups.map((g) => (
          <button
            key={g.id}
            className={`ed-pill ${filterGroup === g.id ? 'on' : ''}`}
            onClick={() => setFilterGroup(g.id)}
            style={
              filterGroup === g.id
                ? { background: g.color, borderColor: g.color, color: '#fff' }
                : undefined
            }
          >
            {g.name} · {g.count}
          </button>
        ))}
        <span style={{ borderRight: '1px solid var(--line)', margin: '0 8px' }} />
        <button
          className={`ed-pill ${filterDepth === 'all' ? 'on' : ''}`}
          onClick={() => setFilterDepth('all')}
        >
          צף + שקוע
        </button>
        <button
          className={`ed-pill ${filterDepth === 'floating' ? 'on' : ''}`}
          onClick={() => setFilterDepth('floating')}
        >
          רק צף
        </button>
        <button
          className={`ed-pill ${filterDepth === 'deep' ? 'on' : ''}`}
          onClick={() => setFilterDepth('deep')}
        >
          רק שקוע
        </button>
      </div>

      {/* Windows grid */}
      <section className="ed-sh-grid">
        <div className="ed-sh-windows">
          {WINDOWS.map((win) => {
            const windowNotes = visibleNotes.filter(
              (n) => n.window_number === win.number,
            )
            return (
              <div key={win.number} className="ed-sh-win ed-reveal">
                <div className="ed-sh-win-head">
                  <div
                    style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}
                  >
                    <div className="ed-sh-n">
                      {String(win.number).padStart(2, '0')}
                    </div>
                    <div className="ed-sh-info">
                      <span>
                        {win.systemLevel === 'super'
                          ? 'מערכת-על'
                          : win.systemLevel === 'system'
                            ? 'מערכת'
                            : 'תת-מערכת'}{' '}
                        ·{' '}
                        {win.timeFrame === 'past'
                          ? 'עבר'
                          : win.timeFrame === 'present'
                            ? 'הווה'
                            : 'עתיד'}
                      </span>
                      <h4>{win.title}</h4>
                    </div>
                  </div>
                  <div className="ed-sh-count">
                    {windowNotes.length}
                    <br />
                    נקודות
                  </div>
                </div>
                <div>
                  {windowNotes.length === 0 && (
                    <p
                      style={{
                        color: 'var(--muted-ink)',
                        fontSize: 13,
                        fontStyle: 'italic',
                        padding: '20px 0',
                      }}
                    >
                      אין נקודות בפילטר הנוכחי
                    </p>
                  )}
                  {windowNotes.map((n) => (
                    <div key={n.id} className="ed-note">
                      <div className="ed-note-head">
                        <span
                          className="ed-gd"
                          style={{ background: n.groupColor }}
                        />
                        <span>{n.groupName}</span>
                        <span
                          className={`ed-type ${n.depth === 'floating' ? 'float' : 'sink'}`}
                        >
                          {n.depth === 'floating' ? 'צף' : 'שקוע'}
                        </span>
                      </div>
                      <p>
                        {n.content}
                        {n.author_name && (
                          <span
                            style={{
                              fontSize: 12,
                              color: 'var(--muted-ink)',
                              marginRight: 8,
                            }}
                          >
                            — {n.author_name}
                          </span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </EditorialChrome>
  )
}
