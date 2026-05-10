import type { TcgCard } from '../types/tcg'
import { sample } from './questions'

const rarityWeights: Record<string, number> = {
  Common: 48,
  Uncommon: 28,
  Rare: 12,
  'Rare Holo': 8,
  'Rare Holo EX': 5,
  'Rare Holo GX': 5,
  'Rare Holo V': 5,
  'Rare Holo VMAX': 4,
  'Rare Holo VSTAR': 4,
  'Rare Ultra': 3,
  'Rare Secret': 1,
  'Rare Rainbow': 1,
  'Rare Shiny': 2,
  'Rare Shiny GX': 2,
  'Illustration Rare': 3,
  'Special Illustration Rare': 1,
  'Hyper Rare': 1,
  'Ultra Rare': 3,
  Promo: 8,
}

function weightFor(card: TcgCard): number {
  if (!card.rarity) return 18
  return rarityWeights[card.rarity] ?? 8
}

export function drawRewardCards(cards: TcgCard[], quantity: number): TcgCard[] {
  if (cards.length === 0) return []
  const output: TcgCard[] = []
  for (let index = 0; index < quantity; index += 1) {
    const total = cards.reduce((sum, card) => sum + weightFor(card), 0)
    let roll = Math.random() * total
    const selected =
      cards.find((card) => {
        roll -= weightFor(card)
        return roll <= 0
      }) || sample(cards, 1)[0]
    output.push(selected)
  }
  return output
}
