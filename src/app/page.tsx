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
      {/* Pool background illustration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Water gradient */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, #80DEEA 0%, #26C6DA 30%, #00ACC1 50%, transparent 70%)',
          }}
        />
        {/* Caustic light spots */}
        <div className="absolute top-[20%] left-[15%] w-48 h-48 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #B2EBF2, transparent 70%)' }}
        />
        <div className="absolute top-[60%] right-[20%] w-64 h-64 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #80DEEA, transparent 70%)' }}
        />
      </div>

      <div className="text-center mb-10 relative z-10">
        <img
          src="/eduvot-logo-light.jpeg"
          alt="אדוות — מנהיגות מחוללת שינוי"
          className="h-14 mx-auto mb-6"
        />
        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-5 tracking-tight">
          תשעת החלונות
        </h1>
        <p className="text-lg text-gray-600 max-w-lg mx-auto leading-relaxed">
          צללו לעומק האתגר.
          <br />
          כל חלון מרחיב את <strong className="text-teal-700">בריכת הידע</strong> שלכם.
        </p>
      </div>

      {/* Mini pool — 3x3 grid visualization */}
      <div className="pool-container p-3 rounded-2xl mb-12 relative z-10">
        <div className="grid grid-cols-3 gap-1.5">
          {[4,3,7,5,1,9,6,2,8].map((num, i) => (
            <div
              key={num}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold float-gentle"
              style={{
                background: num === 1 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
                color: num === 1 ? '#0D9488' : 'rgba(255,255,255,0.8)',
                animationDelay: `${i * 0.3}s`,
                border: num === 1 ? '2px solid rgba(255,255,255,0.8)' : '1px solid rgba(255,255,255,0.3)',
                boxShadow: num === 1 ? '0 2px 10px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {num}
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl w-full relative z-10">
        {challenges.map((c, idx) => (
          <button
            key={c.id}
            onClick={() => router.push(`/challenge/${c.id}`)}
            className="group bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-sm border border-gray-200/60 hover:shadow-xl hover:shadow-teal-100/40 hover:border-teal-300 transition-all duration-300 text-right cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white font-bold text-lg shrink-0 shadow-sm">
                {idx + 1}
              </span>
              <h2 className="text-xl font-bold text-gray-900">{c.name}</h2>
            </div>
            <p className="text-gray-600 leading-relaxed text-sm">
              {c.description}
            </p>
            <div className="mt-6 flex items-center gap-2 text-teal-600 font-medium group-hover:gap-3 transition-all">
              <span>צללו פנימה</span>
              <span className="text-lg">&larr;</span>
            </div>
          </button>
        ))}
      </div>

      <footer className="mt-16 text-center text-xs text-gray-400 relative z-10 space-y-1">
        <p>פיתוח בהשראת טריז של מרכז הידע היישומי של חותם</p>
        <p>ארגון חותם — אחריות על החינוך בישראל</p>
      </footer>
    </main>
  )
}
