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
        <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 page-enter">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          אדוות &middot; ניתוח אתגר &middot; מחזור ז&apos;
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 mb-4 tracking-tight">
          תשעת החלונות
        </h1>
        <p className="text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
          כלי אנליטי לחשיבה יצירתית המבוסס על מתודולוגיית TRIZ.
          <br />
          בחרו את האתגר שלכם והתחילו לעבוד.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-1.5 mb-10 opacity-15">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="w-5 h-5 rounded bg-indigo-400"
            style={{ opacity: 0.3 + i * 0.08 }}
          />
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl w-full">
        {challenges.map((c, idx) => (
          <button
            key={c.id}
            onClick={() => router.push(`/challenge/${c.id}`)}
            className="group bg-white rounded-2xl p-8 shadow-sm border border-slate-200 hover:shadow-xl hover:border-indigo-300 transition-all duration-300 text-right cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-lg shrink-0">
                {idx + 1}
              </span>
              <h2 className="text-xl font-bold text-slate-900">{c.name}</h2>
            </div>
            <p className="text-slate-600 leading-relaxed text-sm">
              {c.description}
            </p>
            <div className="mt-6 flex items-center gap-2 text-indigo-600 font-medium group-hover:gap-3 transition-all">
              <span>התחילו כאן</span>
              <span className="text-lg">&larr;</span>
            </div>
          </button>
        ))}
      </div>

      <footer className="mt-16 text-center text-sm text-slate-400">
        מבוסס על מודל תשעת החלונות של גנריך אלטשולר (TRIZ)
      </footer>
    </main>
  )
}
