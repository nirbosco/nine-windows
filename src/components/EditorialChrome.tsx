'use client'

import { useEffect, ReactNode } from 'react'

type PageKey = 'home' | 'challenge' | 'window' | 'admin' | 'shared'

interface BreadcrumbItem {
  label: string
  href?: string
}

export function EditorialChrome({
  children,
  activePage,
  breadcrumb,
}: {
  children: ReactNode
  activePage: PageKey
  breadcrumb?: BreadcrumbItem[]
}) {
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
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    )
    document
      .querySelectorAll('.ed-reveal')
      .forEach((el) => io.observe(el))

    const rail = document.getElementById('ed-rail')
    const onScroll = () => {
      const h =
        document.documentElement.scrollHeight - window.innerHeight
      if (rail) {
        rail.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%'
      }
    }
    window.addEventListener('scroll', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      io.disconnect()
    }
  }, [])

  return (
    <main className="ed-root">
      <div className="ed-progress-rail" id="ed-rail"></div>

      <nav className="ed-top-nav">
        <a href="/" className="ed-brand">
          <span className="ed-dot"></span>
          <span>תשעת החלונות</span>
        </a>
        <div className="ed-links">
          <a href="/">בית</a>
          <a href="/admin">ניהול</a>
        </div>
      </nav>

      {breadcrumb && breadcrumb.length > 0 && (
        <div className="ed-breadcrumb">
          {breadcrumb.map((b, i) => (
            <span key={i}>
              {b.href ? <a href={b.href}>{b.label}</a> : b.label}
              {i < breadcrumb.length - 1 && ' · '}
            </span>
          ))}
        </div>
      )}

      {children}

      <footer className="ed-footer">
        <div className="ed-end-row">
          <div className="ed-brand-big">תשעת החלונות</div>
          <div className="ed-end-col">
            <div className="ed-label">ניווט</div>
            <a href="/">בית</a>
            <a href="/admin">ניהול</a>
          </div>
        </div>
        <div className="ed-end-legal">
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
            פיתוח, בנייה ועיצוב — ארגון חותם, אחריות לחינוך בישראל
          </div>
          <div className="ed-mono">אדוות · מחזור ז׳ · 2026</div>
        </div>
      </footer>
    </main>
  )
}
