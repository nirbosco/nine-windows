'use client'

import { useEffect, useState, useCallback } from 'react'

/* ====================================================
   WINDOW TIMER — counts elapsed minutes on current window
   White → Red after 10 minutes
   ==================================================== */

export function WindowTimer({ resetKey }: { resetKey: string | number }) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    setSeconds(0)
    const start = Date.now()
    const id = setInterval(() => {
      setSeconds(Math.floor((Date.now() - start) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [resetKey])

  const mm = Math.floor(seconds / 60)
  const ss = seconds % 60
  const danger = mm >= 10
  return (
    <span
      className={`wm-timer ${danger ? 'danger' : ''}`}
      aria-label="זמן בחלון"
    >
      <span className="wm-timer-pulse" />
      {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
    </span>
  )
}

/* ====================================================
   BRAIN BREAK — button + auto banner + modal
   ==================================================== */

type Activity = 'breath' | 'stretch' | 'wordgame'

interface BrainBreakProps {
  groupId: string
  windowNumber: number
}

export function BrainBreak({ groupId, windowNumber }: BrainBreakProps) {
  const [open, setOpen] = useState(false)
  const [bannerOpen, setBannerOpen] = useState(false)

  // Auto banner — show on entering windows 4 or 7 (row boundaries)
  // unless dismissed for this group+boundary already.
  useEffect(() => {
    if (windowNumber !== 4 && windowNumber !== 7) return
    if (typeof window === 'undefined') return
    const key = `nw-bb-${groupId}-${windowNumber}`
    if (localStorage.getItem(key) === '1') return

    // Brief delay so it doesn't pop in mid-page-load
    const showTimer = setTimeout(() => setBannerOpen(true), 1200)
    // Auto-dismiss after 12 seconds total (10.8s after appearing)
    const dismissTimer = setTimeout(() => {
      setBannerOpen(false)
      localStorage.setItem(key, '1')
    }, 12000)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(dismissTimer)
    }
  }, [windowNumber, groupId])

  function dismissBanner(accept: boolean) {
    setBannerOpen(false)
    if (typeof window !== 'undefined') {
      localStorage.setItem(`nw-bb-${groupId}-${windowNumber}`, '1')
    }
    if (accept) setOpen(true)
  }

  return (
    <>
      {/* Always-available trigger button */}
      <button
        className="bb-trigger"
        onClick={() => setOpen(true)}
        aria-label="הפסקת מוח"
      >
        <span className="bb-trigger-icon" aria-hidden>
          🫧
        </span>
        <span className="bb-trigger-label">הפסקת מוח</span>
      </button>

      {/* Auto suggestion banner */}
      {bannerOpen && (
        <div className="bb-banner" role="dialog" aria-live="polite">
          <div className="bb-banner-text">
            השלמתם שורה. רוצים{' '}
            <em>הפסקת מוח של 3 דקות</em> לפני שממשיכים?
          </div>
          <div className="bb-banner-actions">
            <button
              className="bb-btn primary"
              onClick={() => dismissBanner(true)}
            >
              כן, 3 דקות
            </button>
            <button
              className="bb-btn ghost"
              onClick={() => dismissBanner(false)}
            >
              לא, נמשיך
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {open && <BrainBreakModal onClose={() => setOpen(false)} />}
    </>
  )
}

/* ====================================================
   MODAL — picks one of 3 activities (random) or lets user choose
   ==================================================== */

function BrainBreakModal({ onClose }: { onClose: () => void }) {
  const [activity, setActivity] = useState<Activity | null>(null)

  // Esc to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="bb-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bb-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="bb-modal-close" onClick={onClose} aria-label="סגור">
          ×
        </button>

        {!activity ? (
          <ActivityChooser onPick={setActivity} />
        ) : (
          <ActivityRunner
            activity={activity}
            onBack={() => setActivity(null)}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  )
}

function ActivityChooser({ onPick }: { onPick: (a: Activity) => void }) {
  return (
    <>
      <div className="bb-modal-kicker">
        <span className="bb-line" />
        הפסקת מוח · 2-3 דקות
      </div>
      <h2 className="bb-modal-title">
        בחרו דרך{' '}
        <em>לאוורר את הראש.</em>
      </h2>
      <p className="bb-modal-sub">
        כמה דקות שינוי קצב — יחזירו את הקבוצה לפוקוס.
      </p>

      <div className="bb-activity-grid">
        <button
          className="bb-activity-card"
          onClick={() => onPick('breath')}
        >
          <div className="bb-activity-icon">🫁</div>
          <h3>נשימה 4-7-8</h3>
          <p>שאיפה 4, עצירה 7, נשיפה 8. שש פעמים.</p>
          <span className="bb-activity-len">~2:30</span>
        </button>

        <button
          className="bb-activity-card"
          onClick={() => onPick('stretch')}
        >
          <div className="bb-activity-icon">🤸</div>
          <h3>תזוזה</h3>
          <p>ארבע מתיחות עם טיימר 30 שניות. קלות, אפשר במקום.</p>
          <span className="bb-activity-len">~2:00</span>
        </button>

        <button
          className="bb-activity-card"
          onClick={() => onPick('wordgame')}
        >
          <div className="bb-activity-icon">💬</div>
          <h3>תורות מילים</h3>
          <p>אחד מתחיל במילה, הבא ממשיך באסוציאציה. כל הקבוצה.</p>
          <span className="bb-activity-len">~3:00</span>
        </button>
      </div>
    </>
  )
}

function ActivityRunner({
  activity,
  onBack,
  onClose,
}: {
  activity: Activity
  onBack: () => void
  onClose: () => void
}) {
  return (
    <div className="bb-runner">
      <button className="bb-back" onClick={onBack}>
        ← בחירה אחרת
      </button>
      {activity === 'breath' && <BreathActivity onClose={onClose} />}
      {activity === 'stretch' && <StretchActivity onClose={onClose} />}
      {activity === 'wordgame' && <WordgameActivity onClose={onClose} />}
    </div>
  )
}

/* ====================================================
   ACTIVITY: BREATH — 4-7-8 breathing × 6 cycles
   ==================================================== */

const BREATH_PHASES: { name: string; duration: number }[] = [
  { name: 'שאיפה', duration: 4 },
  { name: 'עצירה', duration: 7 },
  { name: 'נשיפה', duration: 8 },
]

function BreathActivity({ onClose }: { onClose: () => void }) {
  const [running, setRunning] = useState(false)
  const [cycle, setCycle] = useState(0)
  const [phase, setPhase] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(BREATH_PHASES[0].duration)

  const tick = useCallback(() => {
    setSecondsLeft((prev) => {
      if (prev > 1) return prev - 1
      // advance phase
      setPhase((p) => {
        const next = (p + 1) % BREATH_PHASES.length
        if (next === 0) {
          setCycle((c) => c + 1)
        }
        return next
      })
      return 0
    })
  }, [])

  useEffect(() => {
    if (!running) return
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [running, tick])

  // When phase changes, reset seconds
  useEffect(() => {
    if (!running) return
    setSecondsLeft(BREATH_PHASES[phase].duration)
  }, [phase, running])

  // Stop after 6 cycles
  useEffect(() => {
    if (cycle >= 6) {
      setRunning(false)
    }
  }, [cycle])

  const phaseObj = BREATH_PHASES[phase]
  const done = cycle >= 6

  // Circle scale depends on phase — bigger on inhale, hold, smaller on exhale
  let scale = 0.5
  if (running) {
    if (phase === 0) {
      // inhale — grow
      const t =
        (BREATH_PHASES[0].duration - secondsLeft) / BREATH_PHASES[0].duration
      scale = 0.5 + 0.5 * t
    } else if (phase === 1) {
      // hold — full
      scale = 1
    } else {
      // exhale — shrink
      const t =
        (BREATH_PHASES[2].duration - secondsLeft) / BREATH_PHASES[2].duration
      scale = 1 - 0.5 * t
    }
  }

  return (
    <div className="bb-breath">
      <h3 className="bb-runner-title">
        נשימה <em>4-7-8</em>
      </h3>
      <p className="bb-runner-sub">
        {done
          ? 'יפה. עוד שש נשימות עמוקות והיינו לגמרי שם.'
          : !running
            ? 'נצמדים לקצב של העיגול. שש פעמים.'
            : phaseObj.name}
      </p>

      <div className="bb-breath-stage">
        <div
          className="bb-breath-circle"
          style={{
            transform: `scale(${scale})`,
            transition: running ? 'transform 1s linear' : 'transform 0.5s ease',
          }}
        />
        {running && !done && (
          <div className="bb-breath-num">{secondsLeft}</div>
        )}
      </div>

      <div className="bb-breath-meta">
        מחזור {Math.min(cycle + (running ? 1 : 0), 6)}/6
      </div>

      <div className="bb-runner-actions">
        {!running && !done && (
          <button
            className="bb-btn primary"
            onClick={() => {
              setCycle(0)
              setPhase(0)
              setSecondsLeft(BREATH_PHASES[0].duration)
              setRunning(true)
            }}
          >
            התחילו
          </button>
        )}
        {running && (
          <button
            className="bb-btn"
            onClick={() => setRunning(false)}
          >
            עצרו
          </button>
        )}
        {done && (
          <button className="bb-btn primary" onClick={onClose}>
            חוזרים לעבודה ←
          </button>
        )}
      </div>
    </div>
  )
}

/* ====================================================
   ACTIVITY: STRETCH — 4 × 30s stretches
   ==================================================== */

const STRETCHES = [
  { name: 'מתיחת צוואר', body: 'הטו את הראש עדינות לכל צד. בכל צד 15 שניות.' },
  { name: 'גלגלי כתפיים', body: 'גלגלו את הכתפיים אחורה 8 פעמים, ואז קדימה 8 פעמים.' },
  { name: 'מתיחת גב עליון', body: 'שלבו אצבעות מקדימה ודחפו לאחור. הרגישו את השכם נפתח.' },
  { name: 'נשימה עמוקה', body: 'הרימו ידיים מעלה בשאיפה. הורידו צידה בנשיפה. שלוש פעמים.' },
] as const

function StretchActivity({ onClose }: { onClose: () => void }) {
  const [idx, setIdx] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(30)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s > 1) return s - 1
        // advance
        setIdx((i) => {
          if (i + 1 >= STRETCHES.length) {
            setRunning(false)
            return i
          }
          return i + 1
        })
        return 30
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running])

  useEffect(() => {
    setSecondsLeft(30)
  }, [idx])

  const cur = STRETCHES[idx]
  const done = !running && idx === STRETCHES.length - 1 && secondsLeft <= 1

  return (
    <div className="bb-stretch">
      <h3 className="bb-runner-title">
        תזוזה <em>{idx + 1}/4</em>
      </h3>
      <h4 className="bb-stretch-name">{cur.name}</h4>
      <p className="bb-runner-sub">{cur.body}</p>

      <div className="bb-stretch-timer">
        <div
          className="bb-stretch-bar"
          style={{
            width: running ? `${((30 - secondsLeft) / 30) * 100}%` : '0%',
            transition: running ? 'width 1s linear' : 'none',
          }}
        />
      </div>
      <div className="bb-stretch-num">{secondsLeft}s</div>

      <div className="bb-runner-actions">
        {!running && !done && (
          <button
            className="bb-btn primary"
            onClick={() => setRunning(true)}
          >
            {idx === 0 ? 'התחילו' : 'המשיכו'}
          </button>
        )}
        {running && (
          <button
            className="bb-btn"
            onClick={() => {
              if (idx + 1 < STRETCHES.length) {
                setIdx(idx + 1)
              } else {
                setRunning(false)
              }
            }}
          >
            הבא ←
          </button>
        )}
        {done && (
          <button className="bb-btn primary" onClick={onClose}>
            חוזרים לעבודה ←
          </button>
        )}
      </div>
    </div>
  )
}

/* ====================================================
   ACTIVITY: WORD GAME — group word association
   ==================================================== */

const SEED_WORDS = [
  'בריכה',
  'מים',
  'מערכת',
  'חלון',
  'אבן',
  'גל',
  'אופק',
  'בית',
  'דרך',
  'אור',
  'שקט',
  'תחילה',
  'עצירה',
  'אוויר',
  'ענן',
  'ים',
]

function WordgameActivity({ onClose }: { onClose: () => void }) {
  const [seed] = useState(
    () => SEED_WORDS[Math.floor(Math.random() * SEED_WORDS.length)],
  )
  const [secondsLeft, setSecondsLeft] = useState(180)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s > 1) return s - 1
        setRunning(false)
        return 0
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running])

  const mm = Math.floor(secondsLeft / 60)
  const ss = secondsLeft % 60
  const done = secondsLeft === 0

  return (
    <div className="bb-wordgame">
      <h3 className="bb-runner-title">
        תורות <em>מילים.</em>
      </h3>
      <p className="bb-runner-sub">
        אחד מתחיל. הבא בתור עונה במילה אחת — אסוציאציה ישירה.
        ממשיכים סביב הקבוצה עד שהטיימר מסיים.
      </p>

      <div className="bb-wordgame-seed">
        <div className="bb-wordgame-label">מילת פתיחה</div>
        <div className="bb-wordgame-word">{seed}</div>
      </div>

      <div className="bb-wordgame-timer">
        {String(mm).padStart(1, '0')}:{String(ss).padStart(2, '0')}
      </div>

      <div className="bb-runner-actions">
        {!running && !done && (
          <button
            className="bb-btn primary"
            onClick={() => setRunning(true)}
          >
            התחילו ←
          </button>
        )}
        {running && (
          <button className="bb-btn" onClick={() => setRunning(false)}>
            עצרו
          </button>
        )}
        {done && (
          <button className="bb-btn primary" onClick={onClose}>
            חוזרים לעבודה ←
          </button>
        )}
      </div>
    </div>
  )
}
