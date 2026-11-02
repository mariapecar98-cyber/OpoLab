import type { StudyItem, StudyKind, Topic } from './types'

// El catálogo se obtiene de las dos pestañas, excluyendo sus encabezados.
export type TopicSelection = 'all' | number[]

export function studyItemsFromRows(rows: string[][], kind: StudyKind): StudyItem[] {
  return rows.slice(1).flatMap((row) => {
    const number = row[0]?.trim() ?? ''
    const title = row[1] ?? ''
    const content = row[2] ?? ''
    const topicNumber = Number(number)
    if (!/^\d+$/.test(number) || !Number.isSafeInteger(topicNumber) || topicNumber < 1 || !title.trim() || !content.trim()) return []
    return [{ id: `${kind}:${topicNumber}:${encodeURIComponent(title)}`, topicNumber, title, content, kind }]
  })
}

export function topicsFromItems(items: StudyItem[]): Topic[] {
  return [...new Set(items.map((item) => item.topicNumber))].sort((a, b) => a - b)
    .map((number) => ({ number, title: `Tema ${number}`, checklist: [] }))
}

export function selectedTopicNumbers(topics: Topic[], selection: TopicSelection): number[] {
  const available = topics.map((topic) => topic.number)
  return selection === 'all' ? available : selection.filter((number) => available.includes(number))
}

export function trainingItems(items: StudyItem[], topics: Topic[], selection: TopicSelection, kinds: StudyKind[]): StudyItem[] {
  const selected = selectedTopicNumbers(topics, selection)
  return items.filter((item) => selected.includes(item.topicNumber) && kinds.includes(item.kind))
}
