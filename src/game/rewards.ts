import type { TcgCard } from '../types/tcg'
import { sample } from './questions'

const rarityOdds: Record<string, number> = {
  Common: 10,
  Unknown: 1000,
  Uncommon: 0.85,
  Rare: 0.3,
  'Rare Holo': 0.3,
  'Rare Shining': 0.1,
  'Rare Shiny': 0.1,
  'Shiny Rare': 0.1,
  'Double Rare': 0.2,
  'Rare Holo EX': 0.2,
  'Rare Holo GX': 0.2,
  'Rare Holo V': 0.2,
  'Rare ACE': 0.1,
  'ACE SPEC Rare': 0.1,
  'Amazing Rare': 0.1,
  'Radiant Rare': 0.2,
  'Rare Prism Star': 0.1,
  'Rare Prime': 0.1,
  'Rare Shiny GX': 0.15,
  'Rare Holo LV.X': 0.15,
  'Illustration Rare': 0.1,
  'Trainer Gallery Rare Holo': 0.1,
  LEGEND: 0.1,
  'Rare BREAK': 0.1,
  'Rare Holo VMAX': 0.1,
  'Rare Ultra': 0.1,
  'Shiny Ultra Rare': 0.1,
  'Ultra Rare': 0.1,
  'Classic Collection': 0.1,
  'Special Illustration Rare': 0.08,
  MEGA_ATTACK_RARE: 0.08,
  'Rare Secret': 0.1,
  'Rare Holo VSTAR': 0.1,
  'Rare Rainbow': 0.02,
  'Hyper Rare': 0.02,
  'Mega Hyper Rare': 0.02,
  'Black White Rare': 0.02,
  'Rare Holo Star': 0.02,
  Promo: 0,
}

export function drawRewardCards(cards: TcgCard[], quantity: number): TcgCard[] {
  if (cards.length === 0) return []
  const output: TcgCard[] = []
  for (let index = 0; index < quantity; index += 1) {
    output.push(drawSingleRewardCard(cards))
  }
  return output
}

function drawSingleRewardCard(cards: TcgCard[]): TcgCard {
  const roll = clamp(Math.random(), 0, 1)
  let eligibleCards = cards.filter((card) => roll <= rarityChanceFor(card))

  if (eligibleCards.length === 0) {
    eligibleCards = cards
  }

  const bonusRoll = clamp(Math.random(), 0, 1)
  const bonusTriggered = roll < 0.0001 || bonusRoll < 0.1

  if (bonusTriggered) {
    const rarestChance = Math.min(
      ...eligibleCards.map((card) => rarityChanceFor(card)),
    )
    const rarestCards = eligibleCards.filter(
      (card) => Math.abs(rarityChanceFor(card) - rarestChance) <= 1e-10,
    )
    if (rarestCards.length > 0) {
      eligibleCards = rarestCards
    }
  }

  return sample(eligibleCards, 1)[0] || cards[0]
}

function rarityChanceFor(card: TcgCard): number {
  const rarityKey =
    card.rarity && rarityOdds[card.rarity] !== undefined
      ? card.rarity
      : 'Unknown'
  return clamp(rarityOdds[rarityKey] ?? 0, 0, 1)
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, value))
}
