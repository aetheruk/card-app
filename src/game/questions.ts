import type { QuestionType, TcgCard } from '../types/tcg'

export interface InspectionCard extends TcgCard {
  setName: string
}

export interface InspectionQuestion {
  type: QuestionType
  prompt: string
  targetIndex: number
  answer: string
  options: string[]
}

export function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5)
}

export function sample<T>(items: T[], count: number): T[] {
  return shuffle(items).slice(0, Math.min(count, items.length))
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

function buildOptions(correct: string, candidates: string[]): string[] {
  const wrong = sample(
    unique(candidates).filter((candidate) => candidate !== correct),
    3,
  )
  return shuffle(unique([correct, ...wrong])).slice(0, 4)
}

export function buildQuestion(
  cards: InspectionCard[],
  cardPool: InspectionCard[],
  questionTypes: QuestionType[],
  previousQuestion?: InspectionQuestion,
): InspectionQuestion {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const question = buildQuestionCandidate(cards, cardPool, questionTypes)
    if (
      question.options.length > 1 &&
      !isSameQuestion(question, previousQuestion)
    ) {
      return question
    }
  }

  return buildQuestionCandidate(cards, cardPool, ['name'])
}

function isSameQuestion(
  question: InspectionQuestion,
  previousQuestion?: InspectionQuestion,
): boolean {
  if (!previousQuestion) return false
  return (
    question.type === previousQuestion.type &&
    question.targetIndex === previousQuestion.targetIndex &&
    question.answer === previousQuestion.answer
  )
}

function buildQuestionCandidate(
  cards: InspectionCard[],
  cardPool: InspectionCard[],
  questionTypes: QuestionType[],
): InspectionQuestion {
  const targetIndex = Math.floor(Math.random() * cards.length)
  const target = cards[targetIndex]
  const possibleTypes = questionTypes.filter((type) => {
    if (type === 'rarity') return !!target.rarity
    if (type === 'artist') return !!target.artist
    if (type === 'pokemonType') return !!target.types?.length
    if (type === 'hp') return !!target.hp
    if (type === 'number') return !!target.number
    return true
  })
  const type =
    possibleTypes[Math.floor(Math.random() * possibleTypes.length)] || 'name'
  const slot = targetIndex + 1

  if (type === 'rarity') {
    const answer = target.rarity || 'Unknown'
    return {
      type,
      targetIndex,
      answer,
      prompt: `What rarity was card ${slot}?`,
      options: buildOptions(
        answer,
        cardPool.map((card) => card.rarity || ''),
      ),
    }
  }

  if (type === 'supertype') {
    return {
      type,
      targetIndex,
      answer: target.supertype,
      prompt: `What card type was card ${slot}?`,
      options: buildOptions(
        target.supertype,
        cardPool.map((card) => card.supertype),
      ),
    }
  }

  if (type === 'artist') {
    const answer = target.artist || 'Unknown'
    return {
      type,
      targetIndex,
      answer,
      prompt: `Who illustrated card ${slot}?`,
      options: buildOptions(
        answer,
        cardPool.map((card) => card.artist || ''),
      ),
    }
  }

  if (type === 'pokemonType') {
    const answer = target.types?.[0] || 'Unknown'
    return {
      type,
      targetIndex,
      answer,
      prompt: `What Pokemon type was card ${slot}?`,
      options: buildOptions(
        answer,
        cardPool.flatMap((card) => card.types || []),
      ),
    }
  }

  if (type === 'hp') {
    const answer = target.hp || 'Unknown'
    return {
      type,
      targetIndex,
      answer,
      prompt: `How much HP did card ${slot} have?`,
      options: buildOptions(
        answer,
        cardPool.map((card) => card.hp || ''),
      ),
    }
  }

  if (type === 'number') {
    return {
      type,
      targetIndex,
      answer: target.number,
      prompt: `What collector number was card ${slot}?`,
      options: buildOptions(
        target.number,
        cardPool.map((card) => card.number),
      ),
    }
  }

  return {
    type: 'name',
    targetIndex,
    answer: target.name,
    prompt: `Which card was shown as card ${slot}?`,
    options: buildOptions(
      target.name,
      cardPool.map((card) => card.name),
    ),
  }
}
