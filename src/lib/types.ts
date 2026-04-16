export interface Challenge {
  id: string
  name: string
  description: string | null
  notebook_url: string | null
  super_system_name: string
  system_name: string
  sub_system_name: string
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

export type Depth = 'floating' | 'deep'

export interface Note {
  id: string
  group_id: string
  window_number: number
  content: string
  depth: Depth
  author_name: string | null
  created_at: string
}

export const DEPTH_CONFIG: Record<Depth, { label: string; icon: string; bgClass: string; borderClass: string; textClass: string; dotClass: string }> = {
  floating: {
    label: 'צף',
    icon: '~',
    bgClass: 'bg-cyan-50',
    borderClass: 'border-cyan-300',
    textClass: 'text-cyan-900',
    dotClass: 'bg-cyan-400',
  },
  deep: {
    label: 'צולל',
    icon: '\/\/',
    bgClass: 'bg-indigo-50',
    borderClass: 'border-indigo-300',
    textClass: 'text-indigo-900',
    dotClass: 'bg-indigo-500',
  },
}
