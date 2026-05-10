export interface TcgCardImages {
  small: string
  large: string
}

export interface TcgCard {
  id: string
  name: string
  number: string
  artist: string | null
  rarity: string | null
  supertype: string
  subtypes: string[]
  hp?: string | null
  types?: string[]
  evolvesFrom?: string | null
  evolvesTo?: string[]
  convertedRetreatCost?: number | null
  nationalPokedexNumbers: number[]
  images: TcgCardImages
}

export interface TcgSetImages {
  symbol: string
  logo: string
}

export interface TcgSet {
  id: string
  name: string
  series: string
  total: number
  printedTotal: number | null
  releaseDate: string | null
  images: TcgSetImages
}

export interface TcgSetWithCards extends TcgSet {
  cards: TcgCard[]
}

export interface CollectionEntry {
  cardId: string
  quantity: number
  firstCollectedAt: string
  lastCollectedAt: string
}

export interface TrainerProfile {
  id: 1
  name: string
  createdAt: string
  updatedAt: string
}

export type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme'

export interface DifficultyConfig {
  id: Difficulty
  label: string
  packSize: number
  rounds: number
  timeLimit: number
  winScore: number
  pointsPerCorrect: number
  rewardCards: number
  questionTypes: QuestionType[]
}

export type QuestionType =
  | 'name'
  | 'rarity'
  | 'supertype'
  | 'number'
  | 'artist'
  | 'pokemonType'
  | 'hp'

export interface GameResult {
  setId: string
  difficulty: Difficulty
  score: number
  won: boolean
  awardedCardIds: string[]
  playedAt: string
}
