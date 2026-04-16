'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { WINDOWS } from '@/lib/windows-data'
import {
  Challenge,
  Group,
  GroupMember,
  Note,
  Depth,
  DEPTH_CONFIG,
} from '@/lib/types'

interface GroupData {
  group: Group
  members: GroupMember[]
  notes: Note[]
}

export default function AdminPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null)
  const [groupsData, setGroupsData] = useState<GroupData[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [filterDepth, setFilterDepth] = useState<Depth | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'group' | 'cumulative'>('group')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('challenges')
        .select('*')
        .order('created_at')
      if (data) {
        setChallenges(data as Challenge[])
        if (data.length > 0) setSelectedChallenge(data[0].id)
      }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!selectedChallenge) return

    async function loadGroups() {
      const { data: groups } = await supabase
        .from('groups')
        .select('*')
        .eq('challenge_id', selectedChallenge)
        .order('created_at')

      if (!groups) return

      const allData: GroupData[] = []

      for (const group of groups) {
        const [{ data: members }, { data: notes }] = await Promise.all([
          supabase
            .from('group_members')
            .select('*')
            .eq('group_id', group.id),
          supabase
            .from('notes')
            .select('*')
            .eq('group_id', group.id)
            .order('created_at'),
        ])

        allData.push({
          group: group as Group,
          members: (members || []) as GroupMember[],
          notes: (notes || []) as Note[],
        })
      }

      setGroupsData(allData)
      if (allData.length > 0 && !selectedGroup) {
        setSelectedGroup(allData[0].group.id)
      }
    }

    loadGroups()
  }, [selectedChallenge, selectedGroup])

  async function handleExport(gd: GroupData) {
    const challenge = challenges.find((c) => c.id === selectedChallenge)

    let text = '===========================================\n'
    text += 'תשעת החלונות - ניתוח אתגר\n'
    text += "אדוות | מחזור ז'\n"
    text += '===========================================\n\n'
    text += `אתגר: ${challenge?.name || ''}\n`
    text += `קבוצה: ${gd.group.name}\n`
    text += `משתתפים: ${gd.members.map((m) => m.name).join(', ')}\n`
    text += `תאריך: ${new Date().toLocaleDateString('he-IL')}\n\n`

    for (const win of WINDOWS) {
      text += '-------------------------------------------\n'
      text += `חלון ${win.number}: ${win.title}\n`
      text += `${win.subtitle}\n`
      text += '-------------------------------------------\n\n'

      const windowNotes = gd.notes.filter(
        (n) => n.window_number === win.number,
      )

      const depths: { key: Depth; label: string }[] = [
        { key: 'floating', label: 'צף (על פני השטח)' },
        { key: 'deep', label: 'צולל (לעומק)' },
      ]

      for (const d of depths) {
        const typed = windowNotes.filter((n) => n.depth === d.key)
        if (typed.length > 0) {
          text += `${d.label}:\n`
          typed.forEach((n) => {
            text += `  * ${n.content}${n.author_name ? ` (${n.author_name})` : ''}\n`
          })
          text += '\n'
        }
      }

      if (windowNotes.length === 0) {
        text += '(אין נקודות בחלון זה)\n\n'
      }
    }

    text += '===========================================\n'
    text += `סה"כ נקודות: ${gd.notes.length}\n`
    text += `צף: ${gd.notes.filter((n) => n.depth === 'floating').length}`
    text += ` | צולל: ${gd.notes.filter((n) => n.depth === 'deep').length}\n`

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nine-windows-${gd.group.name}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleExportAll() {
    groupsData.forEach((gd) => handleExport(gd))
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full" />
      </main>
    )
  }

  const activeGroupData = groupsData.find((g) => g.group.id === selectedGroup)

  // Cumulative: merge all notes from all groups
  const allNotes = groupsData.flatMap((gd) => gd.notes)

  return (
    <main className="min-h-screen px-4 py-6 max-w-7xl mx-auto page-enter">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <img src="/eduvot-logo-light.jpeg" alt="אדוות" className="h-9" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">דשבורד ניהול</h1>
            <p className="text-sm text-gray-500">תשעת החלונות — אדוות</p>
          </div>
        </div>
        <a
          href="/"
          className="text-sm text-teal-600 hover:text-teal-700"
        >
          חזרה לאפליקציה &larr;
        </a>
      </div>

      {/* Challenge selector */}
      <div className="flex gap-3 mb-6">
        {challenges.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setSelectedChallenge(c.id)
              setSelectedGroup(null)
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              selectedChallenge === c.id
                ? 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-teal-300'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      {groupsData.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-2xl font-bold text-gray-900">
              {groupsData.length}
            </p>
            <p className="text-xs text-gray-500">קבוצות</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-2xl font-bold text-gray-900">
              {groupsData.reduce((s, g) => s + g.members.length, 0)}
            </p>
            <p className="text-xs text-gray-500">משתתפים</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-2xl font-bold text-gray-900">
              {allNotes.length}
            </p>
            <p className="text-xs text-gray-500">נקודות</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-lg font-bold text-cyan-600">
              {allNotes.filter((n) => n.depth === 'floating').length}
            </p>
            <p className="text-xs text-gray-500">~ צף</p>
            <p className="text-lg font-bold text-indigo-600 mt-1">
              {allNotes.filter((n) => n.depth === 'deep').length}
            </p>
            <p className="text-xs text-gray-500">// צולל</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <button
              onClick={handleExportAll}
              className="text-sm text-teal-600 font-medium hover:text-teal-700 cursor-pointer"
            >
              ייצוא כל הקבוצות
            </button>
            <p className="text-xs text-gray-500 mt-1">הורדת קבצי טקסט</p>
          </div>
        </div>
      )}

      {/* View mode toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setViewMode('group')}
          className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${
            viewMode === 'group'
              ? 'bg-teal-600 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-teal-300'
          }`}
        >
          לפי קבוצה
        </button>
        <button
          onClick={() => setViewMode('cumulative')}
          className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${
            viewMode === 'cumulative'
              ? 'bg-teal-600 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-teal-300'
          }`}
        >
          מצטבר — כל הקבוצות
        </button>
      </div>

      {viewMode === 'group' ? (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Groups sidebar */}
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-gray-700 mb-3">קבוצות</h2>
            {groupsData.length === 0 ? (
              <p className="text-sm text-gray-400">אין קבוצות עדיין</p>
            ) : (
              groupsData.map((gd) => {
                const filledWindows = new Set(
                  gd.notes.map((n) => n.window_number),
                ).size
                return (
                  <button
                    key={gd.group.id}
                    onClick={() => setSelectedGroup(gd.group.id)}
                    className={`w-full text-right p-3 rounded-xl text-sm transition-all cursor-pointer ${
                      selectedGroup === gd.group.id
                        ? 'bg-teal-50 border border-teal-200 text-gray-900'
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-teal-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {gd.notes.length} נקודות
                      </span>
                      <span className="font-semibold">{gd.group.name}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {gd.members.map((m) => m.name).join(', ')}
                    </p>
                    {/* Window progress bar */}
                    <div className="flex gap-0.5 mt-2">
                      {Array.from({ length: 9 }, (_, i) => i + 1).map(
                        (wNum) => {
                          const hasNotes = gd.notes.some(
                            (n) => n.window_number === wNum,
                          )
                          return (
                            <div
                              key={wNum}
                              className={`flex-1 h-1.5 rounded-full ${
                                hasNotes ? 'bg-teal-400' : 'bg-gray-200'
                              }`}
                            />
                          )
                        },
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {filledWindows}/9 חלונות
                    </p>
                  </button>
                )
              })
            )}
          </div>

          {/* Group detail */}
          {activeGroupData ? (
            <GroupNotesView
              groupData={activeGroupData}
              filterDepth={filterDepth}
              setFilterDepth={setFilterDepth}
              onExport={() => handleExport(activeGroupData)}
            />
          ) : (
            <div className="flex items-center justify-center text-gray-400 text-sm py-20">
              בחרו קבוצה מהרשימה
            </div>
          )}
        </div>
      ) : (
        /* Cumulative view */
        <CumulativeView groupsData={groupsData} />
      )}
    </main>
  )
}

function GroupNotesView({
  groupData,
  filterDepth,
  setFilterDepth,
  onExport,
}: {
  groupData: GroupData
  filterDepth: Depth | 'all'
  setFilterDepth: (v: Depth | 'all') => void
  onExport: () => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">
          {groupData.group.name}
        </h2>
        <div className="flex gap-2 items-center">
          <select
            value={filterDepth}
            onChange={(e) => setFilterDepth(e.target.value as Depth | 'all')}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
          >
            <option value="all">כל העומקים</option>
            <option value="floating">~ צף</option>
            <option value="deep">// צולל</option>
          </select>

          <button
            onClick={onExport}
            className="px-4 py-1.5 bg-gradient-to-br from-teal-500 to-cyan-600 text-white text-sm rounded-lg hover:brightness-110 cursor-pointer"
          >
            ייצוא
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {WINDOWS.map((win) => {
          const windowNotes = groupData.notes.filter(
            (n) =>
              n.window_number === win.number &&
              (filterDepth === 'all' || n.depth === filterDepth),
          )

          return (
            <div
              key={win.number}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white text-xs font-bold">
                    {win.number}
                  </span>
                  <div>
                    <span className="text-sm font-semibold text-gray-800">
                      {win.title}
                    </span>
                    <span className="text-xs text-gray-500 mr-2">
                      {' '}
                      — {win.subtitle}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {windowNotes.length} נקודות
                </span>
              </div>

              {windowNotes.length > 0 && (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {windowNotes.map((note) => {
                    const config = DEPTH_CONFIG[note.depth]
                    return (
                      <div
                        key={note.id}
                        className={`dot-card rounded-xl p-3 border ${config.bgClass} ${config.borderClass}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`w-2 h-2 rounded-full ${config.dotClass}`}
                          />
                          <span
                            className={`text-[10px] font-bold ${config.textClass} opacity-70`}
                          >
                            {config.label}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">
                          {note.content}
                        </p>
                        {note.author_name && (
                          <p className="text-[10px] opacity-50 mt-2">
                            — {note.author_name}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CumulativeView({ groupsData }: { groupsData: GroupData[] }) {
  const allNotes = groupsData.flatMap((gd) =>
    gd.notes.map((n) => ({ ...n, groupName: gd.group.name })),
  )

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        תצוגה מצטברת — כל הקבוצות
      </h2>
      <div className="space-y-4">
        {WINDOWS.map((win) => {
          const windowNotes = allNotes.filter(
            (n) => n.window_number === win.number,
          )

          return (
            <div
              key={win.number}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white text-xs font-bold">
                    {win.number}
                  </span>
                  <div>
                    <span className="text-sm font-semibold text-gray-800">
                      {win.title}
                    </span>
                    <span className="text-xs text-gray-500 mr-2">
                      {' '}
                      — {win.subtitle}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">
                    {windowNotes.length} נקודות מ-{
                      new Set(windowNotes.map((n) => n.groupName)).size
                    }{' '}
                    קבוצות
                  </span>
                </div>
              </div>

              {windowNotes.length > 0 && (
                <div className="p-4">
                  {/* Floating */}
                  {windowNotes.filter((n) => n.depth === 'floating').length >
                    0 && (
                    <div className="mb-3">
                      <p className="text-xs font-bold text-cyan-700 mb-2">
                        ~ צף
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {windowNotes
                          .filter((n) => n.depth === 'floating')
                          .map((note) => (
                            <div
                              key={note.id}
                              className="rounded-lg p-3 bg-cyan-50 border border-cyan-200"
                            >
                              <p className="text-sm">{note.content}</p>
                              <p className="text-[10px] opacity-50 mt-1">
                                {note.groupName}
                                {note.author_name && ` — ${note.author_name}`}
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Deep */}
                  {windowNotes.filter((n) => n.depth === 'deep').length >
                    0 && (
                    <div>
                      <p className="text-xs font-bold text-indigo-700 mb-2">
                        // צולל
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {windowNotes
                          .filter((n) => n.depth === 'deep')
                          .map((note) => (
                            <div
                              key={note.id}
                              className="rounded-lg p-3 bg-indigo-50 border border-indigo-200"
                            >
                              <p className="text-sm">{note.content}</p>
                              <p className="text-[10px] opacity-50 mt-1">
                                {note.groupName}
                                {note.author_name && ` — ${note.author_name}`}
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
