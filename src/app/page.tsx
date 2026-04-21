'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Challenge } from '@/lib/types'

interface ChallengeWithCount extends Challenge {
  note_count: number
}

// Hardcoded kicker labels for challenges (designer's copy tone)
const CHALLENGE_KICKERS = ['הערכה', 'מוריות', 'דיגיטל', 'שייכות']

export default function Home() {
  const [challenges, setChallenges] = useState<ChallengeWithCount[]>([])
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('challenges')
        .select('*')
        .order('created_at')

      if (data) {
        // Fetch note counts in parallel
        const withCounts = await Promise.all(
          data.map(async (c: Challenge) => {
            const { data: groups } = await supabase
              .from('groups')
              .select('id')
              .eq('challenge_id', c.id)

            const groupIds = (groups || []).map((g) => g.id)
            let noteCount = 0
            if (groupIds.length > 0) {
              const { count } = await supabase
                .from('notes')
                .select('*', { count: 'exact', head: true })
                .in('group_id', groupIds)
              noteCount = count || 0
            }

            return { ...c, note_count: noteCount }
          }),
        )
        setChallenges(withCounts)
      }
    }
    load()
  }, [])

  // Scroll reveal + progress rail
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        }),
      { threshold: 0.15 },
    )
    document
      .querySelectorAll('.ed-reveal')
      .forEach((el) => io.observe(el))

    const rail = document.getElementById('ed-rail')
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight
      if (rail) {
        rail.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%'
      }
    }
    window.addEventListener('scroll', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      io.disconnect()
    }
  }, [challenges])

  const firstChallengeHref = challenges[0]
    ? `/challenge/${challenges[0].id}`
    : '#'

  // Nine-grid labels (matching windows-data.ts sequence: 4,3,7 | 5,1,9 | 6,2,8)
  // But the editorial design numbers them 1-9 left-to-right visually
  // We'll show our real window titles in the editorial grid layout
  const gridLabels = [
    // Row 1: super-system × past/present/future
    { n: '04', name: 'מה קרה בסביבה?' },
    { n: '03', name: 'מה קורה סביבנו?' },
    { n: '07', name: 'לאן העולם צועד?' },
    // Row 2: system × past/present/future
    { n: '05', name: 'מה עשינו עד היום?' },
    { n: '01', name: 'איך זה נראה היום?', active: true },
    { n: '09', name: 'מה צריך להשתנות?' },
    // Row 3: sub-system × past/present/future
    { n: '06', name: 'מה השתנה בפנים?' },
    { n: '02', name: 'מה קורה בפנים?' },
    { n: '08', name: 'איך נרצה שייראה בפנים?' },
  ]

  return (
    <main className="ed-root">
      {/* Progress rail */}
      <div className="ed-progress-rail" id="ed-rail"></div>

      {/* Top nav */}
      <nav className="ed-top-nav">
        <a href="/" className="ed-brand">
          <span className="ed-dot"></span>
          <span>תשעת החלונות</span>
        </a>
        <div className="ed-links">
          <a href="#ed-method">שיטה</a>
          <a href="#ed-process">תהליך</a>
          <a href={firstChallengeHref}>אתגר חי</a>
          <a href="/admin">ניהול</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="ed-hero">
        <div className="ed-container">
          <div className="ed-kicker ed-reveal">
            אדוות · מחזור ז׳ · יולי 2026
          </div>
          <h1 className="ed-h-display ed-reveal ed-reveal-d1 ed-serif">
            תשעת
            <br />
            החלונות.
            <br />
            <em className="ed-em">
              כל אחד מהם
              <br />
              בריכה.
            </em>
          </h1>
          <p className="ed-lead ed-reveal ed-reveal-d2">
            שיטה להתמודדות קבוצתית עם אתגר מורכב — לא דרך סיעור מוחות, אלא
            דרך צלילה איטית. נקודות שצפות מהר. נקודות שטובעות לעומק.
          </p>
          <div className="ed-meta ed-reveal ed-reveal-d3">
            <span>
              <b>9</b>חלונות · מערכת × זמן
            </span>
            <span>
              <b>{challenges.length || '—'}</b>אתגרים במחזור
            </span>
            <span>
              <b>2</b>רבדים · צף וצולל
            </span>
            <span>
              <b>3-5</b>שעות · מושב מלא
            </span>
          </div>
        </div>
      </section>

      {/* Hero pool (side-cutaway) */}
      <div className="ed-hero-pool">
        <div className="ed-caustics"></div>
        <div className="ed-waterline"></div>
        <div className="ed-label-top">~ פני השטח · צף</div>
        <div className="ed-label-bottom">// תחתית · צולל</div>

        {/* Floating stones */}
        <div
          className="ed-ps float"
          style={{ left: '6%', top: '16%', width: 14, height: 14 }}
        ></div>
        <div
          className="ed-ps float"
          style={{
            left: '14%',
            top: '20%',
            width: 18,
            height: 18,
            animationDelay: '0.6s',
          }}
        ></div>
        <div
          className="ed-ps float"
          style={{
            left: '24%',
            top: '10%',
            width: 12,
            height: 12,
            animationDelay: '1.2s',
          }}
        ></div>
        <div
          className="ed-ps float"
          style={{
            left: '32%',
            top: '18%',
            width: 20,
            height: 20,
            animationDelay: '0.3s',
          }}
        ></div>
        <div
          className="ed-ps float"
          style={{
            left: '42%',
            top: '14%',
            width: 14,
            height: 14,
            animationDelay: '0.9s',
          }}
        ></div>
        <div
          className="ed-ps float"
          style={{
            left: '52%',
            top: '22%',
            width: 16,
            height: 16,
            animationDelay: '0.2s',
          }}
        ></div>
        <div
          className="ed-ps float"
          style={{
            left: '62%',
            top: '14%',
            width: 18,
            height: 18,
            animationDelay: '1.5s',
          }}
        ></div>
        <div
          className="ed-ps float"
          style={{
            left: '72%',
            top: '20%',
            width: 13,
            height: 13,
            animationDelay: '0.7s',
          }}
        ></div>
        <div
          className="ed-ps float"
          style={{
            left: '82%',
            top: '10%',
            width: 15,
            height: 15,
            animationDelay: '1.1s',
          }}
        ></div>
        <div
          className="ed-ps float"
          style={{
            left: '92%',
            top: '18%',
            width: 12,
            height: 12,
            animationDelay: '0.4s',
          }}
        ></div>

        {/* Deep stones */}
        <div
          className="ed-ps deep"
          style={{ left: '10%', top: '58%', width: 22, height: 22 }}
        ></div>
        <div
          className="ed-ps deep"
          style={{ left: '22%', top: '74%', width: 18, height: 18 }}
        ></div>
        <div
          className="ed-ps deep"
          style={{ left: '32%', top: '62%', width: 26, height: 26 }}
        ></div>
        <div
          className="ed-ps deep"
          style={{ left: '44%', top: '80%', width: 16, height: 16 }}
        ></div>
        <div
          className="ed-ps deep"
          style={{ left: '54%', top: '66%', width: 24, height: 24 }}
        ></div>
        <div
          className="ed-ps deep"
          style={{ left: '66%', top: '78%', width: 18, height: 18 }}
        ></div>
        <div
          className="ed-ps deep"
          style={{ left: '76%', top: '64%', width: 22, height: 22 }}
        ></div>
        <div
          className="ed-ps deep"
          style={{ left: '86%', top: '72%', width: 16, height: 16 }}
        ></div>
        <div
          className="ed-ps deep"
          style={{ left: '93%', top: '60%', width: 14, height: 14 }}
        ></div>

        <div className="ed-floor"></div>
      </div>

      {/* Method section */}
      <section className="ed-section" id="ed-method">
        <div className="ed-container">
          <div className="ed-section-head ed-reveal">
            <div
              className="ed-label"
              style={{ color: 'var(--water-700)' }}
            >
              01 · שיטה
            </div>
            <h2 className="ed-h-xl ed-serif">
              לא סיעור מוחות.
              <br />
              <em className="ed-em">צלילה.</em>
            </h2>
            <p
              className="ed-body-lg"
              style={{ color: 'var(--muted-ink)', maxWidth: 640 }}
            >
              רוב התהליכים הקבוצתיים חיים על פני השטח. תשעת החלונות מאלצים את
              הקבוצה להישאר במים מספיק זמן כדי שגם הנקודות הכבדות יצופו.
            </p>
          </div>
          <div className="ed-two-col">
            <div className="ed-reveal">
              <h3>המטאפורה</h3>
              <p>
                דמיינו בריכה. <b>בפני השטח</b> צפות נקודות קלות — תצפיות,
                שאלות, תחושות ראשוניות. הן עולות מהר, כי הן לא דורשות הצדקה.{' '}
                <b>בתחתית</b> שוכנות הנקודות הכבדות — תובנות שדורשות עצירה,
                הודאות שקשה לאמר בקול, קשרים שנראים רק כשמסתכלים מספיק זמן.
              </p>
              <p>
                שיטות רגילות אוספות רק את הצף. תשעת החלונות אוספות את שניהם —{' '}
                <em className="ed-em">ומפרידות ביניהם במודע</em>, כדי שהקבוצה
                תדע מה היא מחזיקה.
              </p>
            </div>
            <div className="ed-reveal ed-reveal-d1">
              <h3>המטריצה</h3>
              <p>
                תשעה חלונות = שלוש רמות מערכתיות (
                <b>מערכת-על · מערכת · תת-מערכת</b>) כפול שלושה זמנים (
                <b>עבר · הווה · עתיד</b>). כל אתגר נבחן מכל הזוויות הללו.
              </p>
              <p>
                הרעיון: בעיה אמיתית לא יושבת במשבצת אחת. היא מתפרסת. המטריצה
                מאלצת את הקבוצה לבקר בכל המשבצות — גם באלה שלא נוח להיכנס
                אליהן.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Principles section */}
      <section className="ed-section" style={{ paddingTop: 0 }}>
        <div className="ed-container">
          <div
            className="ed-section-head ed-reveal"
            style={{ maxWidth: 720 }}
          >
            <div
              className="ed-label"
              style={{ color: 'var(--water-700)' }}
            >
              02 · עקרונות
            </div>
            <h2 className="ed-h-xl ed-serif">
              שלושה עקרונות <em className="ed-em">של השיטה.</em>
            </h2>
          </div>
          <div className="ed-principles">
            <div className="ed-principle ed-reveal">
              <div className="ed-n">01</div>
              <h4>הפרדה מודעת</h4>
              <p>
                צף וצולל לא מעורבבים. נקודה שנרשמה כ&quot;צפה&quot; לא עוברת
                לתחתית בגלל שמישהו אמר &quot;זה עמוק&quot;. הקבוצה מחליטה
                באופן מכוון, כי ערך המידע טמון בהבחנה.
              </p>
            </div>
            <div className="ed-principle ed-reveal ed-reveal-d1">
              <div className="ed-n">02</div>
              <h4>חזרה אל אותו חלון</h4>
              <p>
                הקבוצה לא רצה קדימה. כל חלון נפתח פעמיים — פעם ראשונה לצף, פעם
                שנייה אחרי שקט, לצולל. הפסקות הן חלק מהשיטה, לא עיכוב.
              </p>
            </div>
            <div className="ed-principle ed-reveal ed-reveal-d2">
              <div className="ed-n">03</div>
              <h4>בריכות מקבילות</h4>
              <p>
                ארבע קבוצות פועלות במקביל על אותו אתגר. בסוף — הבריכות
                מתאחדות. נקודות שחזרו בארבע קבוצות הן איתותי אמת; יחידות הן
                איתותי עומק.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dark 9-grid section */}
      <section className="ed-grid-section" id="ed-grid">
        <div className="ed-container">
          <div className="ed-section-head ed-reveal">
            <div
              className="ed-label"
              style={{ color: 'var(--water-300)' }}
            >
              03 · המטריצה
            </div>
            <h2
              className="ed-h-xl ed-serif"
              style={{ color: 'var(--paper)' }}
            >
              תשעה חלונות.
              <br />
              <em className="ed-em">שלוש רמות כפול שלושה זמנים.</em>
            </h2>
            <p className="ed-body-lg">
              כל חלון הוא בריכה עצמאית. כל חלון נפתח פעמיים — לצף ולצולל.
              מסלול מלא הוא 18 צלילות.
            </p>
          </div>
          <div className="ed-nine-grid">
            <div></div>
            <div className="ed-col-h">עבר</div>
            <div className="ed-col-h">הווה</div>
            <div className="ed-col-h">עתיד</div>

            <div className="ed-row-h">מערכת-על</div>
            {gridLabels.slice(0, 3).map((g) => (
              <div
                key={g.n}
                className="ed-cell"
                style={
                  g.active
                    ? {
                        background: 'rgba(45,111,148,0.25)',
                        borderColor: 'var(--water-300)',
                      }
                    : undefined
                }
              >
                <div
                  className="ed-num"
                  style={
                    g.active ? { color: 'var(--water-300)' } : undefined
                  }
                >
                  {g.n}
                </div>
                <div className="ed-nm">{g.name}</div>
              </div>
            ))}

            <div className="ed-row-h">מערכת</div>
            {gridLabels.slice(3, 6).map((g) => (
              <div
                key={g.n}
                className="ed-cell"
                style={
                  g.active
                    ? {
                        background: 'rgba(45,111,148,0.25)',
                        borderColor: 'var(--water-300)',
                      }
                    : undefined
                }
              >
                <div
                  className="ed-num"
                  style={
                    g.active ? { color: 'var(--water-300)' } : undefined
                  }
                >
                  {g.n}
                </div>
                <div className="ed-nm">{g.name}</div>
              </div>
            ))}

            <div className="ed-row-h">תת-מערכת</div>
            {gridLabels.slice(6, 9).map((g) => (
              <div
                key={g.n}
                className="ed-cell"
                style={
                  g.active
                    ? {
                        background: 'rgba(45,111,148,0.25)',
                        borderColor: 'var(--water-300)',
                      }
                    : undefined
                }
              >
                <div
                  className="ed-num"
                  style={
                    g.active ? { color: 'var(--water-300)' } : undefined
                  }
                >
                  {g.n}
                </div>
                <div className="ed-nm">{g.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process timeline */}
      <section className="ed-section" id="ed-process">
        <div className="ed-container">
          <div className="ed-section-head ed-reveal">
            <div
              className="ed-label"
              style={{ color: 'var(--water-700)' }}
            >
              04 · תהליך
            </div>
            <h2 className="ed-h-xl ed-serif">
              מה שקורה <em className="ed-em">במושב.</em>
            </h2>
          </div>
          <div className="ed-process-timeline">
            <div className="ed-step ed-reveal">
              <div className="ed-step-dot">1</div>
              <div className="ed-step-body">
                <div className="ed-t">00:00 — 00:20</div>
                <h4>חלוקה לקבוצות</h4>
                <p>
                  ארבע קבוצות של 3-4 איש. כל קבוצה מקבלת שם (רותם · אלון · זית
                  · אורן) ובריכה משלה. אותו אתגר לכולן.
                </p>
              </div>
            </div>
            <div className="ed-step ed-reveal">
              <div className="ed-step-dot">2</div>
              <div className="ed-step-body">
                <div className="ed-t">00:20 — 02:20</div>
                <h4>תשעה חלונות · שני רבדים</h4>
                <p>
                  הקבוצה עוברת חלון אחרי חלון. בכל חלון: 8 דקות לצף, שקט של
                  דקה, 12 דקות לצולל. סה&quot;כ ~22 דקות לחלון × 9.
                </p>
              </div>
            </div>
            <div className="ed-step active ed-reveal">
              <div className="ed-step-dot">3</div>
              <div className="ed-step-body">
                <div className="ed-t">02:20 — 03:20</div>
                <h4>בריכה משותפת</h4>
                <p>
                  כל הנקודות מכל הקבוצות מתאחדות. חיפוש חזרות, חיפוש יחידאיים,
                  חיפוש סתירות. זה הרגע שבו השיטה עובדת — או לא.
                </p>
              </div>
            </div>
            <div className="ed-step ed-reveal">
              <div className="ed-step-dot">4</div>
              <div className="ed-step-body">
                <div className="ed-t">03:20 — 04:00</div>
                <h4>החלטות</h4>
                <p>
                  לא כל מושב מסתיים בהחלטות. לפעמים התוצר הוא רק &quot;עכשיו
                  אנחנו רואים יותר ברור&quot;. גם זה תוצר.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cases — wired to real challenges */}
      <section
        className="ed-section"
        style={{ background: 'var(--paper-2)', padding: '160px 48px' }}
      >
        <div className="ed-container">
          <div className="ed-section-head ed-reveal">
            <div
              className="ed-label"
              style={{ color: 'var(--water-700)' }}
            >
              05 · אתגרי מחזור ז׳
            </div>
            <h2 className="ed-h-xl ed-serif">
              {challenges.length > 1 ? `${challenges.length} אתגרים` : 'אתגר'}.
              <br />
              <em className="ed-em">אותו מושב.</em>
            </h2>
            <p
              className="ed-body-lg"
              style={{ color: 'var(--muted-ink)', maxWidth: 640 }}
            >
              במחזור הנוכחי, קבוצות בוחרות מבין אתגרים מערכתיים מתחום החינוך.
              כל אתגר מופיע בעצימות אחרת בכל קבוצה.
            </p>
          </div>
          <div className="ed-cases">
            {challenges.map((c, i) => (
              <div
                key={c.id}
                className={`ed-case ed-reveal ${i > 0 ? `ed-reveal-d${Math.min(i, 3)}` : ''}`}
                onClick={() => router.push(`/challenge/${c.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') router.push(`/challenge/${c.id}`)
                }}
              >
                <div className="ed-case-kicker">
                  <b>אתגר {String(i + 1).padStart(2, '0')}</b> ·{' '}
                  {CHALLENGE_KICKERS[i] || 'מחזור ז׳'}
                </div>
                <h4>{c.name}</h4>
                <div>
                  <div className="ed-stat">{c.note_count}</div>
                  <div className="ed-stat-l">נקודות במושב</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="ed-cta-section">
        <div className="ed-container">
          <h2 className="ed-serif">
            צללו
            <br />
            <em className="ed-em">עכשיו.</em>
          </h2>
          <p>
            היכנסו לבריכה של מחזור ז׳. אתגר חי, קבוצות פעילות, נקודות כבר
            בפנים.
          </p>
          <div className="ed-cta-buttons">
            <a href={firstChallengeHref} className="ed-btn">
              פתחו את האתגר
            </a>
            <a href="/admin" className="ed-btn ghost">
              דשבורד ניהול
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="ed-footer">
        <div className="ed-end-row">
          <div className="ed-brand-big">תשעת החלונות</div>
          <div className="ed-end-col">
            <div className="ed-label">ניווט</div>
            <a href="/">בית</a>
            <a href={firstChallengeHref}>אתגר</a>
            <a href="/admin">ניהול</a>
          </div>
          <div className="ed-end-col">
            <div className="ed-label">על השיטה</div>
            <a href="#ed-method">שיטה</a>
            <a href="#ed-grid">מטריצה</a>
            <a href="#ed-process">תהליך</a>
          </div>
          <div className="ed-end-col">
            <div className="ed-label">קרדיט</div>
            <span style={{ fontSize: 13, padding: '4px 0', display: 'block' }}>
              פיתוח בהשראת טריז
            </span>
            <span style={{ fontSize: 13, padding: '4px 0', display: 'block' }}>
              מרכז הידע היישומי של חותם
            </span>
          </div>
        </div>
        <div className="ed-end-legal">
          <div className="ed-mono">אדוות · מחזור ז׳ · 2026</div>
          <div className="ed-mono">v2.0 · Editorial</div>
        </div>
      </footer>
    </main>
  )
}
