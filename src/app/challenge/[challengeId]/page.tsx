'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Challenge, Group, Depth } from '@/lib/types'
import { WINDOWS } from '@/lib/windows-data'
import { EditorialChrome } from '@/components/EditorialChrome'

interface GroupRow extends Group {
  member_count: number
  member_names: string[]
  note_count: number
  windows_filled: number
  last_active: string | null
}

interface WindowAgg {
  n: number
  floating: number
  deep: number
}

interface WindowNote {
  content: string
  depth: Depth
  author_name: string | null
  group_id: string
  group_name: string
  group_color: string
  created_at: string
}

const GROUP_COLORS = [
  '#C4623A',
  '#2D6F94',
  '#6B8E4E',
  '#6B6E9E',
  '#C89968',
  '#7A4E6B',
]

export default function ChallengePage() {
  const { challengeId } = useParams<{ challengeId: string }>()
  const router = useRouter()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [windowAggs, setWindowAggs] = useState<WindowAgg[]>([])
  const [windowNotes, setWindowNotes] = useState<Record<number, WindowNote[]>>({})
  const [openedWindow, setOpenedWindow] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [memberNames, setMemberNames] = useState('')

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
        .select('*, group_members(name)')
        .eq('challenge_id', challengeId)
        .order('created_at')

      if (g) {
        const rows: GroupRow[] = await Promise.all(
          g.map(async (group: Record<string, unknown>) => {
            const members = (group.group_members as { name: string }[]) || []
            const { data: notes } = await supabase
              .from('notes')
              .select('window_number, created_at')
              .eq('group_id', group.id as string)
              .order('created_at', { ascending: false })

            const windowsFilled = new Set(
              (notes || []).map((n: { window_number: number }) => n.window_number),
            ).size

            return {
              id: group.id as string,
              challenge_id: group.challenge_id as string,
              name: group.name as string,
              created_at: group.created_at as string,
              member_count: members.length,
              member_names: members.map((m) => m.name),
              note_count: notes?.length || 0,
              windows_filled: windowsFilled,
              last_active: notes?.[0]?.created_at || null,
            }
          }),
        )
        setGroups(rows)
      }

      // Aggregate notes by window across all groups of this challenge
      if (g && g.length > 0) {
        const groupIds = g.map((grp) => grp.id as string)
        const groupMeta = new Map<
          string,
          { name: string; color: string }
        >()
        g.forEach((grp, idx) =>
          groupMeta.set(grp.id as string, {
            name: grp.name as string,
            color: GROUP_COLORS[idx % GROUP_COLORS.length],
          }),
        )

        const { data: allNotes } = await supabase
          .from('notes')
          .select(
            'window_number, depth, content, author_name, group_id, created_at',
          )
          .in('group_id', groupIds)
          .order('created_at', { ascending: true })

        const aggMap: Record<number, WindowAgg> = {}
        const notesByWindow: Record<number, WindowNote[]> = {}
        for (let i = 1; i <= 9; i++) {
          aggMap[i] = { n: i, floating: 0, deep: 0 }
          notesByWindow[i] = []
        }
        ;(allNotes || []).forEach(
          (n: {
            window_number: number
            depth: Depth
            content: string
            author_name: string | null
            group_id: string
            created_at: string
          }) => {
            if (aggMap[n.window_number]) {
              aggMap[n.window_number][n.depth]++
              const meta = groupMeta.get(n.group_id)
              notesByWindow[n.window_number].push({
                content: n.content,
                depth: n.depth,
                author_name: n.author_name,
                group_id: n.group_id,
                group_name: meta?.name || '',
                group_color: meta?.color || '#999',
                created_at: n.created_at,
              })
            }
          },
        )
        setWindowAggs(Object.values(aggMap))
        setWindowNotes(notesByWindow)
      } else {
        setWindowAggs(
          Array.from({ length: 9 }, (_, i) => ({
            n: i + 1,
            floating: 0,
            deep: 0,
          })),
        )
      }

      setLoading(false)
    }
    load()
  }, [challengeId])

  async function handleCreate() {
    if (!groupName.trim()) return
    setCreating(true)

    const { data: group } = await supabase
      .from('groups')
      .insert({ challenge_id: challengeId, name: groupName.trim() })
      .select()
      .single()

    if (group) {
      const names = memberNames
        .split('\n')
        .map((n) => n.trim())
        .filter((n) => n.length > 0)

      if (names.length > 0) {
        await supabase
          .from('group_members')
          .insert(names.map((name) => ({ group_id: group.id, name })))
      }

      router.push(`/workshop/${group.id}`)
    }
    setCreating(false)
  }

  if (loading) {
    return (
      <main className="ed-root min-h-screen flex items-center justify-center">
        <div className="text-sm ed-mono">טוען...</div>
      </main>
    )
  }

  const totalNotes = groups.reduce((s, g) => s + g.note_count, 0)
  const activeGroups = groups.filter((g) => {
    if (!g.last_active) return false
    const lastMs = new Date(g.last_active).getTime()
    return Date.now() - lastMs < 15 * 60 * 1000 // 15 minutes
  }).length

  // rand for stones
  const r = (a: number, b: number) => a + Math.random() * (b - a)

  return (
    <EditorialChrome
      activePage="challenge"
      breadcrumb={[
        { label: 'תשעת החלונות', href: '/' },
        { label: 'אתגרים' },
        { label: challenge?.name || 'אתגר' },
      ]}
    >
      {/* Hero */}
      <section className="ed-ch-hero">
        <div className="ed-container">
          <div className="ed-kicker ed-reveal">אתגר · מחזור ז׳</div>
          <h1 className="ed-h-display ed-reveal ed-reveal-d1 ed-serif">
            {challenge?.name.split(':').length === 2
              ? challenge.name.split(':')[1].trim()
              : challenge?.name || ''}
            .
          </h1>
          {challenge?.description && (
            <p className="ed-lead-ch ed-reveal ed-reveal-d2">
              {challenge.description}
            </p>
          )}
          <div className="ed-ch-stats ed-reveal ed-reveal-d3">
            <div>
              <div className="ed-num">{groups.length}</div>
              <div className="ed-lbl">קבוצות</div>
            </div>
            <div>
              <div className="ed-num">{totalNotes}</div>
              <div className="ed-lbl">נקודות בבריכה</div>
            </div>
            <div>
              <div className="ed-num">9</div>
              <div className="ed-lbl">חלונות · 3×3</div>
            </div>
            <div>
              <div className="ed-num">{activeGroups}</div>
              <div className="ed-lbl">קבוצות פעילות</div>
            </div>
          </div>
        </div>
      </section>

      {/* Groups list */}
      <section className="ed-groups">
        <div className="ed-container">
          <div className="ed-groups-header ed-reveal">
            <div className="ed-label">01 · קבוצות</div>
            <h2 className="ed-h-xl ed-serif">
              {groups.length === 1 ? 'קבוצה אחת.' : `${groups.length} קבוצות.`}{' '}
              <em className="ed-em">
                {groups.length === 1 ? 'קול אחד.' : `${groups.length} קולות.`}
              </em>
            </h2>
            <p
              className="ed-body-lg"
              style={{ color: 'var(--muted-ink)', maxWidth: 560 }}
            >
              כל קבוצה רואה את כל תשעת החלונות — אבל מתחילה מזווית אחרת.
              השוואה מגיעה בשלב השיתוף.
            </p>
          </div>
          <div className="ed-groups-list">
            {groups.length === 0 ? (
              <p
                style={{
                  textAlign: 'center',
                  padding: '60px 0',
                  color: 'var(--muted-ink)',
                }}
              >
                עדיין אין קבוצות באתגר הזה.
              </p>
            ) : (
              groups.map((g, idx) => {
                const isLive =
                  g.last_active &&
                  Date.now() - new Date(g.last_active).getTime() <
                    15 * 60 * 1000
                return (
                  <div
                    key={g.id}
                    className={`ed-group-row ed-reveal ${
                      idx > 0 ? `ed-reveal-d${Math.min(idx, 3)}` : ''
                    }`}
                    onClick={() => router.push(`/workshop/${g.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') router.push(`/workshop/${g.id}`)
                    }}
                  >
                    <div className="ed-idx">
                      {String(idx + 1).padStart(2, '0')}
                    </div>
                    <div>
                      <div className="ed-g-name">{g.name}</div>
                      <div className="ed-g-sub">
                        {g.member_names.length > 0
                          ? g.member_names.join(' · ')
                          : `${g.member_count} משתתפים`}
                      </div>
                    </div>
                    <div className="ed-metric">
                      <b>{g.note_count}</b>
                      נקודות
                    </div>
                    <div className="ed-metric">
                      <b>{g.windows_filled}/9</b>
                      חלונות
                    </div>
                    <div className={`ed-status ${isLive ? 'live' : ''}`}>
                      <span className="ed-status-dot"></span>
                      {isLive ? 'פעילה עכשיו' : 'לא פעילה'}
                    </div>
                    <div className="ed-arr">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </div>
                  </div>
                )
              })
            )}

            {/* Create new group toggle */}
            {!showCreate ? (
              <div
                className="ed-group-row ed-reveal"
                onClick={() => setShowCreate(true)}
                role="button"
                tabIndex={0}
                style={{ color: 'var(--water-700)' }}
              >
                <div className="ed-idx">+</div>
                <div>
                  <div className="ed-g-name">יצירת קבוצה חדשה</div>
                  <div className="ed-g-sub">
                    הקימו קבוצה חדשה באתגר הזה
                  </div>
                </div>
                <div></div>
                <div></div>
                <div></div>
                <div className="ed-arr">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: 36,
                  border: '1px solid var(--line)',
                  background: 'var(--paper)',
                  marginTop: 20,
                }}
              >
                <h3
                  style={{
                    fontFamily: "'Frank Ruhl Libre', serif",
                    fontSize: 26,
                    fontWeight: 500,
                    marginBottom: 16,
                  }}
                >
                  יצירת קבוצה חדשה
                </h3>
                <div style={{ marginBottom: 14 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 11,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--muted-ink)',
                      marginBottom: 6,
                    }}
                  >
                    שם הקבוצה
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="רותם · אלון · זית · אורן..."
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      fontFamily: "'Heebo', sans-serif",
                      fontSize: 15,
                      border: '1px solid var(--line)',
                      background: 'transparent',
                    }}
                  />
                </div>
                <div style={{ marginBottom: 18 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 11,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--muted-ink)',
                      marginBottom: 6,
                    }}
                  >
                    שמות משתתפים — שם בכל שורה
                  </label>
                  <textarea
                    value={memberNames}
                    onChange={(e) => setMemberNames(e.target.value)}
                    rows={4}
                    placeholder={'שגית כהן\nדני לוי\nרחל פרץ'}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      fontFamily: "'Heebo', sans-serif",
                      fontSize: 14,
                      border: '1px solid var(--line)',
                      background: 'transparent',
                      resize: 'vertical',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={handleCreate}
                    disabled={!groupName.trim() || creating}
                    className="ed-btn-line dark"
                  >
                    {creating ? 'יוצר...' : 'צרו קבוצה'}
                  </button>
                  <button
                    onClick={() => setShowCreate(false)}
                    style={{
                      padding: '18px 30px',
                      fontFamily: "'Heebo', sans-serif",
                      fontSize: 14,
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--muted-ink)',
                      cursor: 'pointer',
                    }}
                  >
                    ביטול
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Mega pool — 9 windows aggregate (moved below groups) */}
      <section className="ed-mega-pool ed-caustics-after">
        <div
          className="ed-container"
          style={{ position: 'relative', zIndex: 1 }}
        >
          <div className="ed-label ed-reveal">02 · הבריכה</div>
          <h2 className="ed-h-xl ed-reveal ed-reveal-d1 ed-serif">
            תשעה חלונות. <em className="ed-em">בריכה אחת.</em>
          </h2>
          <p className="ed-mp-sub ed-reveal ed-reveal-d2">
            כל חלון הוא חתך של בריכת הידע. לחצו על חלון לראות את כל הנקודות
            שהעלו כל הקבוצות יחד.
          </p>
          <div className="ed-col-legend ed-reveal ed-reveal-d2">
            <div></div>
            <div>עבר · שורש</div>
            <div>הווה · עוגן</div>
            <div>עתיד · יעד</div>
          </div>
          <div className="ed-pool-wrap ed-reveal ed-reveal-d3">
            <div className="ed-pool-grid">
              {[
                {
                  label: challenge?.super_system_name || 'מערכת-על',
                  wins: [4, 3, 7],
                },
                {
                  label: challenge?.system_name || 'מערכת',
                  wins: [5, 1, 9],
                },
                {
                  label: challenge?.sub_system_name || 'תת-מערכת',
                  wins: [6, 2, 8],
                },
              ]
                .flatMap((row) => [
                  <div key={`label-${row.label}`} className="ed-row-label">
                    {row.label}
                  </div>,
                  ...row.wins.map((n) => n),
                ])
                .map((item) => {
                  if (typeof item !== 'number') return item
                  const n = item
                  const agg = windowAggs.find((a) => a.n === n) || {
                    n,
                    floating: 0,
                    deep: 0,
                  }
                  const win = WINDOWS.find((w) => w.number === n)
                  const maxFloat = Math.min(agg.floating, 8)
                  const maxDeep = Math.min(agg.deep, 8)
                  const isActive = agg.floating + agg.deep > 0
                  return (
                    <div
                      key={n}
                      className={`ed-win ${isActive ? 'active' : ''}`}
                      onClick={() => setOpenedWindow(n)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="ed-win-waterline"></div>
                      <span className="ed-w-num">
                        {String(n).padStart(2, '0')}
                      </span>
                      <span className="ed-w-label">
                        {win
                          ? win.timeFrame === 'past'
                            ? 'עבר'
                            : win.timeFrame === 'present'
                              ? 'הווה'
                              : 'עתיד'
                          : ''}
                      </span>
                      <span className="ed-w-title">{win?.title || ''}</span>
                      <span className="ed-w-count">
                        {agg.floating}↑ {agg.deep}↓
                      </span>
                      <div className="ed-win-floor"></div>
                      <div className="ed-stones">
                        {Array.from({ length: maxFloat }).map((_, i) => {
                          const sz = 7 + Math.random() * 5
                          return (
                            <div
                              key={`f-${i}`}
                              className="ed-stone float"
                              style={{
                                left: r(8, 92) + '%',
                                top: r(22, 32) + '%',
                                width: sz,
                                height: sz,
                                animationDelay: r(0, 2) + 's',
                              }}
                            />
                          )
                        })}
                        {Array.from({ length: maxDeep }).map((_, i) => {
                          const sz = 9 + Math.random() * 8
                          return (
                            <div
                              key={`d-${i}`}
                              className="ed-stone deep"
                              style={{
                                left: r(8, 92) + '%',
                                top: r(48, 85) + '%',
                                width: sz,
                                height: sz,
                              }}
                            />
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="ed-bottom-cta">
        <div className="ed-container">
          <h2 className="ed-serif">
            {groups.length > 0 ? 'ארבע בריכות.' : 'בריכה אחת.'}
            <br />
            <em className="ed-em">מדיה משותפת.</em>
          </h2>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <a
              className="ed-btn-line light"
              href={`/shared/${challengeId}`}
            >
              מעבר לבריכה המשותפת
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </a>
            <a className="ed-btn-line light" href="/admin">
              תצוגת ניהול
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Cross-group window modal — opens when a window tile is clicked */}
      {openedWindow !== null && (
        <WindowNotesModal
          windowNumber={openedWindow}
          notes={windowNotes[openedWindow] || []}
          onClose={() => setOpenedWindow(null)}
          groupCount={groups.length}
        />
      )}
    </EditorialChrome>
  )
}

function WindowNotesModal({
  windowNumber,
  notes,
  onClose,
  groupCount,
}: {
  windowNumber: number
  notes: WindowNote[]
  onClose: () => void
  groupCount: number
}) {
  const win = WINDOWS.find((w) => w.number === windowNumber)
  const floating = notes.filter((n) => n.depth === 'floating')
  const deep = notes.filter((n) => n.depth === 'deep')
  const byGroupCount = new Set(notes.map((n) => n.group_id)).size

  const timeLabel =
    win?.timeFrame === 'past'
      ? 'עבר'
      : win?.timeFrame === 'present'
        ? 'הווה'
        : 'עתיד'
  const sysLabel =
    win?.systemLevel === 'super'
      ? 'מערכת-על'
      : win?.systemLevel === 'system'
        ? 'מערכת'
        : 'תת-מערכת'

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 31, 48, 0.78)',
        backdropFilter: 'blur(4px)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        cursor: 'pointer',
        overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 760,
          width: '100%',
          maxHeight: 'calc(100vh - 48px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--paper)',
          cursor: 'default',
          position: 'relative',
        }}
      >
        {/* Modal header */}
        <div
          style={{
            padding: '32px 44px 24px',
            borderBottom: '1px solid var(--line)',
            background: 'var(--bone-050, #FBF8F3)',
            position: 'relative',
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              width: 36,
              height: 36,
              background: 'transparent',
              border: '1px solid var(--line)',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: 18,
              color: 'var(--muted-ink)',
              lineHeight: 1,
            }}
            aria-label="סגור"
          >
            ×
          </button>

          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--water-700)',
              marginBottom: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span
              style={{
                width: 20,
                height: 1,
                background: 'currentColor',
                display: 'inline-block',
              }}
            />
            חלון {windowNumber} · סיכום קבוצות
          </div>

          <h2
            style={{
              fontFamily: "'Frank Ruhl Libre', serif",
              fontSize: 36,
              fontWeight: 500,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
              color: 'var(--ink)',
              marginBottom: 8,
            }}
          >
            {windowNumber} · {timeLabel}{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--water-800)' }}>
              + {sysLabel}
            </em>
          </h2>

          {win?.title && (
            <p
              style={{
                fontFamily: "'Frank Ruhl Libre', serif",
                fontSize: 18,
                fontStyle: 'italic',
                color: 'var(--muted-ink)',
                lineHeight: 1.3,
                marginBottom: 16,
              }}
            >
              {win.title}
            </p>
          )}

          <div
            style={{
              display: 'flex',
              gap: 20,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--muted-ink)',
            }}
          >
            <span>
              <b
                style={{
                  fontFamily: "'Frank Ruhl Libre', serif",
                  fontSize: 16,
                  color: 'var(--ink)',
                }}
              >
                {notes.length}
              </b>{' '}
              נקודות
            </span>
            <span>
              <b
                style={{
                  fontFamily: "'Frank Ruhl Libre', serif",
                  fontSize: 16,
                  color: 'var(--ink)',
                }}
              >
                {byGroupCount}
              </b>
              /{groupCount} קבוצות
            </span>
          </div>
        </div>

        {/* Modal body — scrollable */}
        <div
          style={{
            overflowY: 'auto',
            padding: '28px 44px 36px',
          }}
        >
          {notes.length === 0 && (
            <p
              style={{
                textAlign: 'center',
                padding: '60px 0',
                fontStyle: 'italic',
                fontFamily: "'Frank Ruhl Libre', serif",
                fontSize: 17,
                color: 'var(--muted-ink)',
              }}
            >
              אף קבוצה עוד לא העלתה נקודות לחלון הזה.
            </p>
          )}

          {floating.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h3
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--water-700)',
                  fontWeight: 700,
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 1,
                    background: 'currentColor',
                    display: 'inline-block',
                  }}
                />
                צף — {floating.length}{' '}
                {floating.length === 1 ? 'נקודה' : 'נקודות'}
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {floating.map((n, i) => (
                  <NoteLine key={`f-${i}`} note={n} />
                ))}
              </ul>
            </div>
          )}

          {deep.length > 0 && (
            <div>
              <h3
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--water-700)',
                  fontWeight: 700,
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 1,
                    background: 'currentColor',
                    display: 'inline-block',
                  }}
                />
                שקוע — {deep.length}{' '}
                {deep.length === 1 ? 'נקודה' : 'נקודות'}
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {deep.map((n, i) => (
                  <NoteLine key={`d-${i}`} note={n} />
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function NoteLine({ note }: { note: WindowNote }) {
  return (
    <li
      style={{
        padding: '14px 0',
        borderBottom: '1px solid var(--line-soft)',
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: note.group_color,
          marginTop: 8,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--muted-ink)',
            marginBottom: 4,
          }}
        >
          {note.group_name}
          {note.author_name && <> · {note.author_name}</>}
        </div>
        <p
          style={{
            fontFamily: "'Frank Ruhl Libre', serif",
            fontSize: 16,
            fontWeight: 500,
            lineHeight: 1.4,
            letterSpacing: '-0.005em',
            color: 'var(--ink)',
            margin: 0,
          }}
        >
          {note.content}
        </p>
      </div>
    </li>
  )
}
