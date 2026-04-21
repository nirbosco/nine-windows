'use client'

import { useEffect, useState, ReactNode } from 'react'

const ADMIN_PASSWORD = 'advot2026'
const STORAGE_KEY = 'nw-admin-auth'

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    setAuthorized(stored === ADMIN_PASSWORD)
  }, [])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, password)
      setAuthorized(true)
      setError(false)
    } else {
      setError(true)
    }
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY)
    setAuthorized(false)
    setPassword('')
  }

  if (authorized === null) {
    return (
      <main className="ed-root" style={{ minHeight: '100vh' }} />
    )
  }

  if (!authorized) {
    return (
      <main
        className="ed-root"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <form
          onSubmit={submit}
          style={{
            maxWidth: 440,
            width: '100%',
            padding: 40,
            border: '1px solid var(--line)',
            background: 'var(--paper)',
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--water-700)',
              marginBottom: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span
              style={{
                width: 24,
                height: 1,
                background: 'currentColor',
                display: 'inline-block',
              }}
            ></span>
            ניהול · כניסה
          </div>
          <h1
            style={{
              fontFamily: "'Frank Ruhl Libre', serif",
              fontSize: 40,
              fontWeight: 500,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
              marginBottom: 24,
            }}
          >
            סיסמה,{' '}
            <em
              style={{
                fontStyle: 'italic',
                color: 'var(--water-800)',
              }}
            >
              בבקשה.
            </em>
          </h1>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError(false)
            }}
            placeholder="סיסמת ניהול"
            autoFocus
            style={{
              width: '100%',
              padding: '14px 16px',
              fontFamily: "'Heebo', sans-serif",
              fontSize: 15,
              border: `1px solid ${error ? '#C44D3A' : 'var(--line)'}`,
              background: 'transparent',
              marginBottom: 16,
            }}
          />
          {error && (
            <p
              style={{
                fontSize: 12,
                color: '#C44D3A',
                marginBottom: 12,
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              סיסמה שגויה
            </p>
          )}
          <button
            type="submit"
            style={{
              padding: '14px 28px',
              background: 'var(--ink)',
              color: 'var(--paper)',
              border: 'none',
              fontFamily: "'Heebo', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            כניסה
          </button>
        </form>
      </main>
    )
  }

  return (
    <>
      {children}
      <button
        onClick={logout}
        style={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          zIndex: 600,
          padding: '6px 12px',
          fontSize: 11,
          fontFamily: "'IBM Plex Mono', monospace",
          letterSpacing: '0.08em',
          background: 'var(--paper)',
          border: '1px solid var(--line)',
          cursor: 'pointer',
          color: 'var(--muted-ink)',
        }}
      >
        יציאה
      </button>
    </>
  )
}
