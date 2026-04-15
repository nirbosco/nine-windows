'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Challenge } from '@/lib/types'

export default function Home() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('challenges')
        .select('*')
        .order('created_at')
      if (data) setChallenges(data)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full" />
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 page-enter relative overflow-hidden">
      {/* Background water decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-100/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-sky-100/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-teal-50/40 rounded-full blur-2xl" />
      </div>

      <div className="text-center mb-10 relative z-10">
        <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 text-sm font-medium px-5 py-2 rounded-full mb-6 border border-teal-200/50">
          אדוות &middot; ניתוח אתגר &middot; מחזור ז&apos;
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-teal-900 mb-5 tracking-tight">
          תשעת החלונות
        </h1>
        <p className="text-lg text-teal-700/70 max-w-lg mx-auto leading-relaxed">
          צללו לעומק האתגר.
          <br />
          כל חלון מרחיב את <strong className="text-teal-800">בריכת הידע</strong> שלכם.
        </p>
      </div>

      {/* Pool-inspired 3x3 mini grid */}
      <div className="grid grid-cols-3 gap-2 mb-12 relative z-10">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="w-7 h-7 rounded-lg float-gentle"
            style={{
              background: `linear-gradient(135deg, rgba(13,148,136,${0.08 + i * 0.04}), rgba(94,234,212,${0.12 + i * 0.03}))`,
              animationDelay: `${i * 0.3}s`,
              border: '1px solid rgba(13,148,136,0.1)',
            }}
          />
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl w-full relative z-10">
        {challenges.map((c, idx) => (
          <button
            key={c.id}
            onClick={() => router.push(`/challenge/${c.id}`)}
            className="group bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-sm border border-teal-200/40 hover:shadow-xl hover:shadow-teal-200/30 hover:border-teal-300 transition-all duration-300 text-right cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white font-bold text-lg shrink-0 shadow-sm">
                {idx + 1}
              </span>
              <h2 className="text-xl font-bold text-teal-900">{c.name}</h2>
            </div>
            <p className="text-teal-700/70 leading-relaxed text-sm">
              {c.description}
            </p>
            <div className="mt-6 flex items-center gap-2 text-teal-600 font-medium group-hover:gap-3 transition-all">
              <span>צללו פנימה</span>
              <span className="text-lg">&larr;</span>
            </div>
          </button>
        ))}
      </div>

      <footer className="mt-16 text-center text-sm text-teal-500/60 relative z-10">
        מבוסס על מודל תשעת החלונות של גנריך אלטשולר (TRIZ)
      </footer>
    </main>
  )
}
