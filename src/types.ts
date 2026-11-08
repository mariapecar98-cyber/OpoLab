export type StudyKind = 'definition' | 'demonstration'
export type SelfRating = 'unknown' | 'partial' | 'known'
export type Page = 'home' | 'definitions' | 'demonstrations' | 'checklist' | 'train' | 'exercises'

export interface Topic {
  number: number
  title: string
  checklist: string[]
}

export interface StudyItem {
  id: string
  kind: StudyKind
  topicNumber: number
  title: string
  content: string
  hint?: string
}

export interface AnswerRecord {
  itemId: string
  topicNumber: number
  kind: StudyKind
  rating: SelfRating
  answeredAt: string
}

export interface StudyProgress {
  checklist: Record<number, boolean[]>
  answers: AnswerRecord[]
}
