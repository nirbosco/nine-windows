'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Challenge } from '@/lib/types'
import { loadLabels, L, DEFAULT_LABELS } from '@/lib/content'

interface ChallengeWithCount extends Challenge {
  note_count: number
}

// Hardcoded kicker labels for challenges (designer's copy tone)
const CHALLENGE_KICKERS = ['הערכה', 'מוריות', 'דיגיטל', 'שייכות']

export default function Home() {
  const [challenges, setChallenges] = useState<ChallengeWithCount[]>([])
  const [labels, setLabels] = useState<Record<string, string>>(DEFAULT_LABELS)
  const router = useRouter()

  useEffect(() => {
    loadLabels().then(setLabels)
  }, [])

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
        </div>
      </nav>

      {/* Hero */}
      <section className="ed-hero">
        <div className="ed-container">
          {/* Eduvot logo */}
          <div className="ed-reveal" style={{ marginBottom: 48 }}>
            <img
              src="/eduvot-logo.png"
              alt="אדוות"
              style={{ height: 52, display: 'block' }}
            />
          </div>
          <div className="ed-kicker ed-reveal">
            {L(labels, 'landing_kicker')}
          </div>
          <h1 className="ed-h-display ed-reveal ed-reveal-d1 ed-serif">
            {L(labels, 'landing_title_line1')}
            <br />
            {L(labels, 'landing_title_line2')}
            <br />
            <em className="ed-em">
              {L(labels, 'landing_title_em_line1')}
              <br />
              {L(labels, 'landing_title_em_line2')}
            </em>
          </h1>
          <p className="ed-lead ed-reveal ed-reveal-d2">
            {L(labels, 'landing_lead')}
          </p>
        </div>
      </section>

      {/* Hero pool (side-cutaway) */}
      <div className="ed-hero-pool">
        <div className="ed-caustics"></div>
        <div className="ed-waterline"></div>
        <div className="ed-label-top">{L(labels, 'landing_pool_label_top')}</div>
        <div className="ed-label-bottom">
          {L(labels, 'landing_pool_label_bottom')}
        </div>

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
            <div className="ed-label" style={{ color: 'var(--water-700)' }}>
              {L(labels, 'landing_method_label')}
            </div>
            <h2 className="ed-h-xl ed-serif">
              {L(labels, 'landing_method_h1')}
              {L(labels, 'landing_method_em') && (
                <>
                  <br />
                  <em className="ed-em">{L(labels, 'landing_method_em')}</em>
                </>
              )}
            </h2>
            {L(labels, 'landing_method_intro') && (
              <p
                className="ed-body-lg"
                style={{ color: 'var(--muted-ink)', maxWidth: 640 }}
              >
                {L(labels, 'landing_method_intro')}
              </p>
            )}
          </div>
          <div className="ed-two-col">
            <div className="ed-reveal">
              {L(labels, 'landing_method_col1_h3') && (
                <h3>{L(labels, 'landing_method_col1_h3')}</h3>
              )}
              {L(labels, 'landing_method_col1_p1') && (
                <p>{L(labels, 'landing_method_col1_p1')}</p>
              )}
              {L(labels, 'landing_method_col1_p2') && (
                <p>{L(labels, 'landing_method_col1_p2')}</p>
              )}
            </div>
            <div className="ed-reveal ed-reveal-d1">
              {L(labels, 'landing_method_col2_h3') && (
                <h3>{L(labels, 'landing_method_col2_h3')}</h3>
              )}
              {L(labels, 'landing_method_col2_p1') && (
                <p>{L(labels, 'landing_method_col2_p1')}</p>
              )}
              {L(labels, 'landing_method_col2_p2') && (
                <p>{L(labels, 'landing_method_col2_p2')}</p>
              )}
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
              {L(labels, 'landing_grid_label')}
            </div>
            <h2
              className="ed-h-xl ed-serif"
              style={{ color: 'var(--paper)' }}
            >
              {L(labels, 'landing_grid_h1')}
              {L(labels, 'landing_grid_em') && (
                <>
                  <br />
                  <em className="ed-em">{L(labels, 'landing_grid_em')}</em>
                </>
              )}
            </h2>
            {L(labels, 'landing_grid_body') && (
              <p className="ed-body-lg">{L(labels, 'landing_grid_body')}</p>
            )}
          </div>
          <div className="ed-nine-grid">
            <div></div>
            <div className="ed-col-h">{L(labels, 'landing_grid_col_past')}</div>
            <div className="ed-col-h">
              {L(labels, 'landing_grid_col_present')}
            </div>
            <div className="ed-col-h">
              {L(labels, 'landing_grid_col_future')}
            </div>

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
              {L(labels, 'landing_process_label')}
            </div>
            <h2 className="ed-h-xl ed-serif">
              {L(labels, 'landing_process_h1')}
              {L(labels, 'landing_process_em') && (
                <>
                  {' '}
                  <em className="ed-em">{L(labels, 'landing_process_em')}</em>
                </>
              )}
            </h2>
          </div>
          <div className="ed-process-timeline">
            <div className="ed-step ed-reveal">
              <div className="ed-step-dot">1</div>
              <div className="ed-step-body">
                <div className="ed-t">
                  {L(labels, 'landing_process_step_1_time')}
                </div>
                <h4>{L(labels, 'landing_process_step_1_title')}</h4>
                <p>{L(labels, 'landing_process_step_1_body')}</p>
              </div>
            </div>
            <div className="ed-step ed-reveal">
              <div className="ed-step-dot">2</div>
              <div className="ed-step-body">
                <div className="ed-t">
                  {L(labels, 'landing_process_step_2_time')}
                </div>
                <h4>{L(labels, 'landing_process_step_2_title')}</h4>
                <p>{L(labels, 'landing_process_step_2_body')}</p>
              </div>
            </div>
            <div className="ed-step ed-reveal">
              <div className="ed-step-dot">3</div>
              <div className="ed-step-body">
                <div className="ed-t">
                  {L(labels, 'landing_process_step_3_time')}
                </div>
                <h4>{L(labels, 'landing_process_step_3_title')}</h4>
                <p>{L(labels, 'landing_process_step_3_body')}</p>
              </div>
            </div>
            <div className="ed-step ed-reveal">
              <div className="ed-step-dot">4</div>
              <div className="ed-step-body">
                <div className="ed-t">
                  {L(labels, 'landing_process_step_4_time')}
                </div>
                <h4>{L(labels, 'landing_process_step_4_title')}</h4>
                <p>{L(labels, 'landing_process_step_4_body')}</p>
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
              {L(labels, 'landing_cases_label')}
            </div>
            <h2 className="ed-h-xl ed-serif">
              {challenges.length > 1 ? `${challenges.length} אתגרים` : 'אתגר'}.
              {L(labels, 'landing_cases_em') && (
                <>
                  <br />
                  <em className="ed-em">{L(labels, 'landing_cases_em')}</em>
                </>
              )}
            </h2>
            {L(labels, 'landing_cases_body') && (
              <p
                className="ed-body-lg"
                style={{ color: 'var(--muted-ink)', maxWidth: 640 }}
              >
                {L(labels, 'landing_cases_body')}
              </p>
            )}
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
            {L(labels, 'landing_cta_h1')}
            {L(labels, 'landing_cta_em') && (
              <>
                <br />
                <em className="ed-em">{L(labels, 'landing_cta_em')}</em>
              </>
            )}
          </h2>
          {L(labels, 'landing_cta_body') && <p>{L(labels, 'landing_cta_body')}</p>}
          <div className="ed-cta-buttons">
            {challenges.map((c) => (
              <a
                key={c.id}
                href={`/challenge/${c.id}`}
                className="ed-btn"
              >
                {c.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="ed-footer">
        <div className="ed-end-row">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <img
              src="/eduvot-logo.png"
              alt="אדוות"
              style={{
                height: 48,
                display: 'block',
                filter: 'brightness(0) invert(1)',
              }}
            />
            <div className="ed-brand-big">תשעת החלונות</div>
          </div>
          <div className="ed-end-col">
            <div className="ed-label">ניווט</div>
            <a href="/">בית</a>
            <a href={firstChallengeHref}>אתגר</a>
          </div>
          <div className="ed-end-col">
            <div className="ed-label">על השיטה</div>
            <a href="#ed-method">שיטה</a>
            <a href="#ed-grid">מטריצה</a>
            <a href="#ed-process">תהליך</a>
          </div>
        </div>
        <div className="ed-end-legal">
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
            {L(labels, 'footer_credit_1')}
            {L(labels, 'footer_credit_2') && (
              <> · {L(labels, 'footer_credit_2')}</>
            )}
          </div>
          <div className="ed-mono">אדוות · מחזור ז׳ · 2026</div>
        </div>
      </footer>
    </main>
  )
}
