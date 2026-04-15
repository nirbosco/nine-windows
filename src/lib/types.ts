export interface Challenge {
  id: string
  name: string
  description: string | null
  notebook_url: string | null
  created_at: string
}

export interface Group {
  id: string
  challenge_id: string
  name: string
  created_at: string
}

export interface GroupMember {
  id: string
  group_id: string
  name: string
  created_at: string
}

export interface Note {
  id: string
  group_id: string
  window_number: number
  content: string
  note_type: 'question' | 'knowledge' | 'thought'
  author_name: string | null
  created_at: string
}

export type NoteType = 'question' | 'knowledge' | 'thought'

export const NOTE_TYPE_CONFIG: Record<NoteType, { label: string; bgClass: string; borderClass: string; textClass: string; dotClass: string }> = {
  question: {
    label: 'שאלה שעולה',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-300',
    textClass: 'text-blue-800',
    dotClass: 'bg-blue-400',
  },
  knowledge: {
    label: 'דבר שאנחנו יודעים',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-300',
    textClass: 'text-emerald-800',
    dotClass: 'bg-emerald-400',
  },
  thought: {
    label: 'מחשבה כללית',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-300',
    textClass: 'text-amber-800',
    dotClass: 'bg-amber-400',
  },
}
