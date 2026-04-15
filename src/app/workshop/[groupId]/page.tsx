'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { WINDOWS } from '@/lib/windows-data'
import { Challenge, Group, Note, NoteType, NOTE_TYPE_CONFIG } from '@/lib/types'

const GRID_ROWS = [
  { label: 'מערכת-על', windows: [4, 3, 7] },
  { label: 'מערכת', windows: [5, 1, 9] },
  { label: 'תת-מערכת', windows: [6, 2, 8] },
]
const COL_HEADERS = ['עבר', 'הווה', 'עתיד']

const TIME_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  past: { bg: 'rgba(217, 119, 6, 0.08)', text: '#92400E', border: 'rgba(217, 119, 6, 0.25)', badge: '#D97706' },
  present: { bg: 'rgba(13, 148, 136, 0.08)', text: '#134E4A', border: 'rgba(13, 148, 136, 0.25)', badge: '#0D9488' },
  future: { bg: 'rgba(99, 102, 241, 0.08)', text: '#312E81', border: 'rgba(99, 102, 241, 0.25)', badge: '#6366F1' },
}

type WindowCounts = Record<number, Record<NoteType | 'total', number>>

export default function WorkshopGrid() {
  const { groupId } = useParams<{ groupId: string }>()
  const router = useRouter()
  const [group, setGroup] = useState<Group | null>(null)
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [counts, setCounts] = useState<WindowCounts>({})
  const [loading, setLoading] = useState(true)
  const [guideOpen, setGuideOpen] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: g } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single()

      if (g) {
        setGroup(g)
        const { data: c } = await supabase
          .from('challenges')
          .select('*')
          .eq('id', g.challenge_id)
          .single()
        if (c) setChallenge(c)
      }

      const { data: notes } = await supabase
        .from('notes')
        .select('window_number, note_type')
        .eq('group_id', groupId)

      if (notes) {
        const c: WindowCounts = {}
        notes.forEach((n: { window_number: number; note_type: NoteType }) => {
          if (!c[n.window_number]) {
            c[n.window_number] = { question: 0, knowledge: 0, thought: 0, total: 0 }
          }
          c[n.window_number][n.note_type]++
          c[n.window_number].total++
        })
        setCounts(c)
      }

      setLoading(false)
    }
    load()
  }, [groupId])

  function getNextStep(): number {
    for (let i = 1; i <= 9; i++) {
      if (!counts[i] || counts[i].total === 0) return i
    }
    return 0
  }

  function handleExport() {
    exportGroupData(groupId, group, challenge)
  }

  async function handleExportForNotebook() {
    const { data: members } = await supabase
      .from('group_members')
      .select('name')
      .eq('group_id', groupId)

    const { data: notes } = await supabase
      .from('notes')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at') as { data: Note[] | null }

    let text = `# ניתוח אתגר בשיטת תשעת החלונות (TRIZ)\n\n`
    text += `## פרטי הסדנה\n`
    text += `- **אתגר:** ${challenge?.name || ''}\n`
    text += `- **קבוצה:** ${group?.name || ''}\n`
    text += `- **משתתפים:** ${members?.map((m: { name: string }) => m.name).join(', ') || ''}\n`
    text += `- **תאריך:** ${new Date().toLocaleDateString('he-IL')}\n`
    text += `- **תוכנית:** אדוות — מחזור ז'\n\n`
    text += `---\n\n`
    text += `## הסבר על המבנה\n`
    text += `הטבלה מאורגנת כמטריצה של 3×3:\n`
    text += `- **שורות** = רמות מערכת: מערכת-על (סביבה רחבה), מערכת (האתגר עצמו), תת-מערכת (רכיבים פנימיים)\n`
    text += `- **עמודות** = ממדי זמן: עבר, הווה, עתיד\n`
    text += `- **סוגי פתקים**: שאלות (דברים שצריך לברר), ידע (עובדות ונתונים), מחשבות (תובנות ורעיונות)\n\n`
    text += `---\n\n`

    for (const win of WINDOWS) {
      const windowNotes = notes?.filter(
        (n) => n.window_number === win.number
      ) || []

      text += `## חלון ${win.number}: ${win.title}\n`
      text += `**${win.subtitle}** | ${win.systemLevel === 'super' ? 'מערכת-על' : win.systemLevel === 'system' ? 'מערכת' : 'תת-מערכת'} + ${win.timeFrame === 'past' ? 'עבר' : win.timeFrame === 'present' ? 'הווה' : 'עתיד'}\n\n`
      text += `> ${win.description}\n\n`

      if (windowNotes.length > 0) {
        const questions = windowNotes.filter((n) => n.note_type === 'question')
        const knowledge = windowNotes.filter((n) => n.note_type === 'knowledge')
        const thoughts = windowNotes.filter((n) => n.note_type === 'thought')

        if (questions.length > 0) {
          text += `### שאלות שעולות\n`
          questions.forEach((n) => {
            text += `- ${n.content}${n.author_name ? ` *(${n.author_name})*` : ''}\n`
          })
          text += '\n'
        }

        if (knowledge.length > 0) {
          text += `### דברים שאנחנו יודעים\n`
          knowledge.forEach((n) => {
            text += `- ${n.content}${n.author_name ? ` *(${n.author_name})*` : ''}\n`
          })
          text += '\n'
        }

        if (thoughts.length > 0) {
          text += `### מחשבות ותובנות\n`
          thoughts.forEach((n) => {
            text += `- ${n.content}${n.author_name ? ` *(${n.author_name})*` : ''}\n`
          })
          text += '\n'
        }
      } else {
        text += `*(לא מולא עדיין)*\n\n`
      }

      text += `---\n\n`
    }

    text += `## סיכום כמותי\n`
    const allNotes = notes || []
    text += `- **סה"כ פתקים:** ${allNotes.length}\n`
    text += `- **שאלות:** ${allNotes.filter((n) => n.note_type === 'question').length}\n`
    text += `- **ידע:** ${allNotes.filter((n) => n.note_type === 'knowledge').length}\n`
    text += `- **מחשבות:** ${allNotes.filter((n) => n.note_type === 'thought').length}\n`

    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nine-windows-${group?.name || 'export'}-notebook.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full" />
      </main>
    )
  }

  const nextStep = getNextStep()
  const totalNotes = Object.values(counts).reduce((s, c) => s + c.total, 0)
  const filledWindows = Object.keys(counts).length

  return (
    <main className="min-h-screen px-4 py-6 max-w-5xl mx-auto page-enter relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <button
            onClick={() =>
              router.push(challenge ? `/challenge/${challenge.id}` : '/')
            }
            className="text-gray-400 hover:text-gray-600 text-sm mb-2 flex items-center gap-1 cursor-pointer"
          >
            <span>&rarr;</span>
            <span>חזרה</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {group?.name}
          </h1>
          {challenge && (
            <p className="text-sm text-gray-500 mt-1">{challenge.name}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer"
          >
            ייצוא לטקסט
          </button>
          <button
            onClick={() => handleExportForNotebook()}
            className="px-4 py-2 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl text-sm font-medium hover:brightness-110 transition-all cursor-pointer"
          >
            NotebookLM
          </button>
        </div>
      </div>

      {/* Pool status bar */}
      <div className="bg-gradient-to-r from-cyan-50 to-teal-50 rounded-2xl p-5 mb-6 border border-teal-200/40 relative">
        <div className="flex items-center justify-between relative z-10">
          <div>
            <p className="text-sm text-teal-800 font-bold mb-1">
              בריכת הידע
            </p>
            <p className="text-xs text-teal-600/70">
              {filledWindows}/9 חלונות מלאים &middot; {totalNotes} פתקים
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-36 h-3 bg-white/60 rounded-full overflow-hidden border border-teal-200/30">
              <div
                className="h-full depth-fill rounded-full"
                style={{ width: `${Math.round((filledWindows / 9) * 100)}%` }}
              />
            </div>
            <span className="text-xs font-bold text-teal-700">
              {Math.round((filledWindows / 9) * 100)}%
            </span>
          </div>
        </div>
        {/* Subtle wave */}
        <div className="wave-bottom absolute inset-0 pointer-events-none" />
      </div>

      {/* Methodology guide - collapsible */}
      <div className="bg-white rounded-2xl border border-gray-200 mb-6 overflow-hidden">
        <button
          onClick={() => setGuideOpen(!guideOpen)}
          className="w-full px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors"
        >
          <h2 className="text-sm font-bold text-gray-800">
            איך עובדים עם תשעת החלונות?
          </h2>
          <span className={`text-gray-400 transition-transform duration-200 text-xs ${guideOpen ? 'rotate-180' : ''}`}>
            &#x25BC;
          </span>
        </button>

        {guideOpen && (
          <div className="px-5 pb-6 border-t border-gray-100 space-y-5">
            {/* What is Nine Windows */}
            <div className="mt-4">
              <h3 className="text-sm font-bold text-teal-700 mb-2">מה זה תשעת החלונות?</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                תשעת החלונות הוא כלי חשיבה מתודולוגי מעולם ה-TRIZ (תורת הפתרון היצירתי של בעיות) של גנריך אלטשולר.
                הכלי מזמין אתכם להסתכל על האתגר דרך <strong>טבלה של 3×3</strong> — שלוש רמות מערכת כפול שלושה ממדי זמן.
                המטרה: להרחיב את &quot;בריכת הידע&quot; שלכם על האתגר לפני שקופצים לפתרונות.
              </p>
            </div>

            {/* System levels */}
            <div>
              <h3 className="text-sm font-bold text-teal-700 mb-2">שלוש רמות המערכת (השורות)</h3>
              <div className="space-y-2">
                <div className="flex gap-3 items-start">
                  <span className="shrink-0 w-20 text-xs font-bold text-gray-700 bg-gray-100 rounded-lg px-2 py-1 text-center">מערכת-על</span>
                  <p className="text-sm text-gray-600">הסביבה הרחבה שבתוכה המערכת שלנו פועלת — הרגולציה, השוק, התרבות, מערכות שכנות. &quot;זום אאוט&quot; מקסימלי.</p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="shrink-0 w-20 text-xs font-bold text-gray-700 bg-gray-100 rounded-lg px-2 py-1 text-center">מערכת</span>
                  <p className="text-sm text-gray-600">המערכת עצמה, כפי שאנחנו חווים אותה. זה האתגר שלנו, הארגון שלנו, התהליך שאנחנו מנסים לשנות.</p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="shrink-0 w-20 text-xs font-bold text-gray-700 bg-gray-100 rounded-lg px-2 py-1 text-center">תת-מערכת</span>
                  <p className="text-sm text-gray-600">הרכיבים הפנימיים של המערכת — אנשים, תהליכים, כלים, משאבים. &quot;זום אין&quot; לקרביים.</p>
                </div>
              </div>
            </div>

            {/* Time frames */}
            <div>
              <h3 className="text-sm font-bold text-teal-700 mb-2">שלושה ממדי זמן (העמודות)</h3>
              <div className="space-y-2">
                <div className="flex gap-3 items-start">
                  <span className="shrink-0 w-14 text-xs font-bold rounded-lg px-2 py-1 text-center" style={{ background: '#FEF3C7', color: '#92400E' }}>עבר</span>
                  <p className="text-sm text-gray-600">מאיפה באנו? מה הוביל למצב הנוכחי? אילו ניסיונות כבר נעשו?</p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="shrink-0 w-14 text-xs font-bold rounded-lg px-2 py-1 text-center" style={{ background: '#CCFBF1', color: '#134E4A' }}>הווה</span>
                  <p className="text-sm text-gray-600">מה קורה עכשיו? מה עובד ומה לא? מי מעורב?</p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="shrink-0 w-14 text-xs font-bold rounded-lg px-2 py-1 text-center" style={{ background: '#E0E7FF', color: '#312E81' }}>עתיד</span>
                  <p className="text-sm text-gray-600">לאן נרצה להגיע? מה המגמות? מה יקרה אם לא נשנה כלום?</p>
                </div>
              </div>
            </div>

            {/* How to fill */}
            <div>
              <h3 className="text-sm font-bold text-teal-700 mb-2">סדר מילוי מומלץ</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-2">
                הטבלה ממולאת לפי סדר מספרי (1→9), לא לפי שורות או עמודות. הסדר מתוכנן כך:
              </p>
              <ol className="text-sm text-gray-600 space-y-1 list-none">
                <li className="flex gap-2"><span className="font-bold text-teal-600 shrink-0">1-3</span> מתחילים מההווה — עוגנים את הבעיה, צוללים פנימה, ואז רואים את התמונה הרחבה.</li>
                <li className="flex gap-2"><span className="font-bold text-amber-600 shrink-0">4-6</span> חוזרים לעבר — מהמאקרו למיקרו, מבינים איך הגענו לכאן.</li>
                <li className="flex gap-2"><span className="font-bold text-indigo-600 shrink-0">7-9</span> מדמיינים את העתיד — מגמות-על, רכיבים חדשים, ולבסוף תמונת הניצחון.</li>
              </ol>
            </div>

            {/* Note types */}
            <div>
              <h3 className="text-sm font-bold text-teal-700 mb-2">סוגי הפתקים</h3>
              <p className="text-sm text-gray-600 mb-2">בכל חלון אפשר להדביק שלושה סוגי פתקים:</p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-5 h-5 rounded" style={{ background: '#C5E8F7' }} />
                  <span className="text-gray-600"><strong className="text-sky-800">שאלה</strong> — דברים שלא ברורים, שצריך לברר</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-5 h-5 rounded" style={{ background: '#C5F0D5' }} />
                  <span className="text-gray-600"><strong className="text-teal-800">ידע</strong> — עובדות, נתונים, דברים שאנחנו יודעים</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-5 h-5 rounded" style={{ background: '#FFFAA0' }} />
                  <span className="text-gray-600"><strong className="text-amber-800">מחשבה</strong> — תובנות, רעיונות, אינטואיציות</span>
                </div>
              </div>
            </div>

            {/* What to do after */}
            <div>
              <h3 className="text-sm font-bold text-teal-700 mb-2">מה עושים אחרי?</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                אחרי שמילאתם את כל 9 החלונות, ייצאו את הקובץ ללחצן <strong>&quot;NotebookLM&quot;</strong> —
                הקובץ יורד כטקסט מובנה שאפשר להעלות ישירות ל-Google NotebookLM.
                שם תוכלו לשוחח עם ה-AI על הממצאים, לשאול שאלות, לבקש סיכומים, ולמצוא תבניות שחוצות את כל החלונות.
                זוהי הדרך להפוך את בריכת הידע שאספתם לתובנות פעולה.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* THE POOL — 3x3 grid inside a pool container */}
      <div className="pool-container p-4 sm:p-6 mb-8 relative">
        <div className="min-w-[560px]">
          {/* Column headers */}
          <div className="grid grid-cols-[70px_1fr_1fr_1fr] gap-3 mb-3">
            <div />
            {COL_HEADERS.map((h, i) => {
              const timeKey = ['past', 'present', 'future'][i]
              return (
                <div
                  key={h}
                  className="text-center text-sm font-bold rounded-lg py-1.5"
                  style={{ color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
                >
                  {h}
                </div>
              )
            })}
          </div>

          {/* Grid rows */}
          {GRID_ROWS.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[70px_1fr_1fr_1fr] gap-3 mb-3"
            >
              <div className="flex items-center justify-center text-xs font-bold text-white/80 text-center leading-tight"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>
                {row.label}
              </div>

              {row.windows.map((wNum) => {
                const win = WINDOWS.find((w) => w.number === wNum)!
                const wCounts = counts[wNum]
                const total = wCounts?.total || 0
                const isNext = wNum === nextStep
                const isCenter = wNum === 1
                const timeColors = TIME_COLORS[win.timeFrame]

                return (
                  <button
                    key={wNum}
                    onClick={() =>
                      router.push(`/workshop/${groupId}/window/${wNum}`)
                    }
                    className={`pool-tile rounded-2xl p-4 cursor-pointer text-right ${
                      isCenter ? 'ring-2 ring-white/40 shadow-lg' : ''
                    } ${isNext ? 'ripple-active' : ''}`}
                    style={{
                      background: total > 0
                        ? `linear-gradient(145deg, rgba(255,255,255,0.9), ${timeColors.bg})`
                        : 'rgba(255,255,255,0.75)',
                    }}
                  >
                    {/* Step number badge */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all"
                        style={{
                          background: total > 0 ? timeColors.badge : 'rgba(255,255,255,0.8)',
                          color: total > 0 ? 'white' : '#9CA3AF',
                          boxShadow: total > 0 ? `0 2px 8px ${timeColors.badge}40` : 'none',
                          border: total > 0 ? 'none' : '1px solid rgba(0,0,0,0.1)',
                        }}
                      >
                        {wNum}
                      </span>
                      {total > 0 && (
                        <span className="text-[10px] font-medium" style={{ color: timeColors.text }}>
                          {total} פתקים
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-xs font-semibold mb-1 line-clamp-1" style={{ color: total > 0 ? timeColors.text : '#6B7280' }}>
                      {win.subtitle}
                    </h3>

                    {/* Type breakdown mini badges */}
                    {total > 0 && wCounts && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {(['question', 'knowledge', 'thought'] as NoteType[]).map(
                          (type) =>
                            wCounts[type] > 0 && (
                              <span
                                key={type}
                                className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${NOTE_TYPE_CONFIG[type].bgClass} ${NOTE_TYPE_CONFIG[type].textClass}`}
                              >
                                {wCounts[type]}
                              </span>
                            )
                        )}
                      </div>
                    )}

                    {/* Next step indicator */}
                    {isNext && total === 0 && (
                      <p className="text-[10px] mt-2 font-bold animate-pulse" style={{ color: timeColors.badge }}>
                        צללו לכאן
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-6 justify-center mb-4">
        {(['question', 'knowledge', 'thought'] as NoteType[]).map((type) => (
          <div key={type} className="flex items-center gap-2 text-xs text-gray-500">
            <span className={`w-3 h-3 rounded-full ${NOTE_TYPE_CONFIG[type].dotClass}`} />
            {NOTE_TYPE_CONFIG[type].label}
          </div>
        ))}
      </div>

      {/* Time frame legend */}
      <div className="flex flex-wrap gap-4 justify-center text-[10px] text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: TIME_COLORS.past.badge }} /> עבר</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: TIME_COLORS.present.badge }} /> הווה</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: TIME_COLORS.future.badge }} /> עתיד</span>
      </div>
    </main>
  )
}

async function exportGroupData(
  groupId: string,
  group: Group | null,
  challenge: Challenge | null,
) {
  const { data: members } = await supabase
    .from('group_members')
    .select('name')
    .eq('group_id', groupId)

  const { data: notes } = await supabase
    .from('notes')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at')

  let text = '===========================================\n'
  text += 'תשעת החלונות - ניתוח אתגר\n'
  text += "אדוות | מחזור ז'\n"
  text += '===========================================\n\n'
  text += `אתגר: ${challenge?.name || ''}\n`
  text += `קבוצה: ${group?.name || ''}\n`
  text += `משתתפים: ${members?.map((m: { name: string }) => m.name).join(', ') || ''}\n`
  text += `תאריך: ${new Date().toLocaleDateString('he-IL')}\n\n`

  for (const win of WINDOWS) {
    text += '-------------------------------------------\n'
    text += `חלון ${win.number}: ${win.title}\n`
    text += `${win.subtitle}\n`
    text += '-------------------------------------------\n\n'

    const windowNotes = notes?.filter(
      (n: { window_number: number }) => n.window_number === win.number
    ) || []

    const byType = {
      question: windowNotes.filter((n: { note_type: string }) => n.note_type === 'question'),
      knowledge: windowNotes.filter((n: { note_type: string }) => n.note_type === 'knowledge'),
      thought: windowNotes.filter((n: { note_type: string }) => n.note_type === 'thought'),
    }

    if (byType.question.length > 0) {
      text += 'שאלות שעולות:\n'
      byType.question.forEach((n: { content: string }) => {
        text += `  * ${n.content}\n`
      })
      text += '\n'
    }

    if (byType.knowledge.length > 0) {
      text += 'דברים שאנחנו יודעים:\n'
      byType.knowledge.forEach((n: { content: string }) => {
        text += `  * ${n.content}\n`
      })
      text += '\n'
    }

    if (byType.thought.length > 0) {
      text += 'מחשבות כלליות:\n'
      byType.thought.forEach((n: { content: string }) => {
        text += `  * ${n.content}\n`
      })
      text += '\n'
    }

    if (windowNotes.length === 0) {
      text += '(אין פתקים בחלון זה)\n\n'
    }
  }

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `nine-windows-${group?.name || 'export'}.txt`
  a.click()
  URL.revokeObjectURL(url)
}
