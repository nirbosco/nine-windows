'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Challenge, Group } from '@/lib/types'

export default function ChallengePage() {
  const { challengeId } = useParams<{ challengeId: string }>()
  const router = useRouter()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [groups, setGroups] = useState<(Group & { member_count: number })[]>([])
  const [loading, setLoading] = useState(true)
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
      if (c) setChallenge(c)

      const { data: g } = await supabase
        .from('groups')
        .select('*, group_members(id)')
        .eq('challenge_id', challengeId)
        .order('created_at')

      if (g) {
        setGroups(
          g.map((group: Record<string, unknown>) => ({
            ...group,
            member_count: (group.group_members as unknown[])?.length || 0,
          })) as (Group & { member_count: number })[]
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
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full" />
      </main>
    )
  }

  return (
    <main className="min-h-screen px-4 py-8 max-w-4xl mx-auto page-enter">
      <button
        onClick={() => router.push('/')}
        className="text-teal-600/60 hover:text-teal-700 text-sm mb-6 flex items-center gap-1 cursor-pointer"
      >
        <span>&rarr;</span>
        <span>חזרה לבחירת אתגר</span>
      </button>

      {challenge && (
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-teal-900 mb-3">
            {challenge.name}
          </h1>
          <p className="text-teal-700/70 leading-relaxed">{challenge.description}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Create new group */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-teal-200/40">
          <h2 className="text-lg font-bold text-teal-900 mb-1">
            יצירת קבוצה חדשה
          </h2>
          <p className="text-sm text-teal-600/60 mb-5">
            הקימו קבוצת עבודה וצללו לתוך האתגר
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-teal-800 mb-1">
                שם הקבוצה
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder='למשל: "צוות אלפא"'
                className="w-full px-4 py-2.5 border border-teal-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white/60"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-teal-800 mb-1">
                שמות המשתתפים
              </label>
              <textarea
                value={memberNames}
                onChange={(e) => setMemberNames(e.target.value)}
                placeholder={'שם בכל שורה:\nדנה כהן\nיוסי לוי\nמיכל אברהם'}
                rows={4}
                className="w-full px-4 py-2.5 border border-teal-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none bg-white/60"
              />
            </div>

            <button
              onClick={handleCreate}
              disabled={!groupName.trim() || creating}
              className="w-full py-3 btn-pool font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {creating ? 'יוצר קבוצה...' : 'צרו קבוצה וצללו פנימה'}
            </button>
          </div>
        </div>

        {/* Join existing group */}
        <div>
          <h2 className="text-lg font-bold text-teal-900 mb-1">
            הצטרפות לקבוצה קיימת
          </h2>
          <p className="text-sm text-teal-600/60 mb-5">
            בחרו מתוך הקבוצות שכבר צללו
          </p>

          {groups.length === 0 ? (
            <div className="bg-teal-50/50 rounded-2xl p-8 text-center text-teal-500/60 text-sm border border-dashed border-teal-300/40">
              עדיין אין קבוצות. צרו את הראשונה!
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => router.push(`/workshop/${g.id}`)}
                  className="w-full bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-teal-200/40 hover:border-teal-300 hover:shadow-md hover:shadow-teal-100/50 transition-all text-right cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-teal-500/60">
                      {g.member_count} משתתפים
                    </span>
                    <h3 className="font-semibold text-teal-800">{g.name}</h3>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
