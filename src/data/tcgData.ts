import { getRepository } from '../db/database'
import type { TcgCard, TcgSet } from '../types/tcg'

const REMOTE_ROOT =
  'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master'

let bundledSetsPromise: Promise<TcgSet[]> | null = null
const bundledCardsPromises = new Map<string, Promise<TcgCard[]>>()

function normalizeSet(raw: any): TcgSet {
  return {
    id: raw.id,
    name: raw.name,
    series: raw.series || '',
    total: Number(raw.total || 0),
    printedTotal:
      raw.printedTotal === null || raw.printedTotal === undefined
        ? null
        : Number(raw.printedTotal),
    releaseDate: raw.releaseDate || null,
    images: raw.images || { symbol: '', logo: '' },
  }
}

function normalizeCard(raw: any): TcgCard {
  return {
    id: raw.id,
    name: raw.name || raw.id,
    number: raw.number || '',
    artist: raw.artist || null,
    rarity: raw.rarity || null,
    supertype: raw.supertype || 'Unknown',
    subtypes: raw.subtypes || [],
    hp: raw.hp || null,
    types: raw.types || [],
    evolvesFrom: raw.evolvesFrom || null,
    evolvesTo: raw.evolvesTo || [],
    convertedRetreatCost: raw.convertedRetreatCost ?? null,
    nationalPokedexNumbers: raw.nationalPokedexNumbers || [],
    images: raw.images || { small: '', large: '' },
  }
}

export async function loadSets(): Promise<TcgSet[]> {
  const repository = await getRepository()
  if (repository.hasRefreshedTcgData()) {
    return repository.getStoredSets()
  }

  bundledSetsPromise ??= fetch('/tcg/sets.json').then(async (res) => {
    if (!res.ok) throw new Error('Bundled TCG sets could not be loaded.')
    const raw = (await res.json()) as unknown[]
    return raw.map(normalizeSet).sort(sortSets)
  })

  return bundledSetsPromise
}

export async function loadCardsForSet(setId: string): Promise<TcgCard[]> {
  const repository = await getRepository()
  if (repository.hasRefreshedTcgData()) {
    return repository.getStoredCards(setId)
  }

  if (!bundledCardsPromises.has(setId)) {
    bundledCardsPromises.set(
      setId,
      fetch(`/tcg/cards/${setId}.json`).then(async (res) => {
        if (!res.ok) return []
        const raw = (await res.json()) as unknown[]
        return raw.map(normalizeCard).sort(sortCards)
      }),
    )
  }

  return bundledCardsPromises.get(setId)!
}

export async function refreshTcgData(
  onProgress: (message: string) => void,
): Promise<void> {
  const setsRes = await fetch(`${REMOTE_ROOT}/sets/en.json`, {
    cache: 'no-store',
  })
  if (!setsRes.ok) {
    throw new Error(`Could not refresh sets: ${setsRes.status}`)
  }

  const rawSets = (await setsRes.json()) as unknown[]
  const sets = rawSets.map(normalizeSet).sort(sortSets)
  const cardsBySet = new Map<string, TcgCard[]>()

  for (const [index, set] of sets.entries()) {
    onProgress(`Refreshing ${set.name} (${index + 1}/${sets.length})`)
    const cardsRes = await fetch(`${REMOTE_ROOT}/cards/en/${set.id}.json`, {
      cache: 'no-store',
    })
    if (!cardsRes.ok) {
      cardsBySet.set(set.id, [])
      continue
    }
    const rawCards = (await cardsRes.json()) as unknown[]
    cardsBySet.set(set.id, rawCards.map(normalizeCard).sort(sortCards))
  }

  const repository = await getRepository()
  await repository.replaceTcgData(sets, cardsBySet)
  bundledSetsPromise = null
  bundledCardsPromises.clear()
}

export function sortSets(a: TcgSet, b: TcgSet): number {
  const dateA = a.releaseDate || ''
  const dateB = b.releaseDate || ''
  return dateB.localeCompare(dateA) || a.name.localeCompare(b.name)
}

function sortCards(a: TcgCard, b: TcgCard): number {
  const aNum = Number.parseInt(a.number, 10)
  const bNum = Number.parseInt(b.number, 10)
  if (Number.isFinite(aNum) && Number.isFinite(bNum) && aNum !== bNum) {
    return aNum - bNum
  }
  return a.number.localeCompare(b.number, undefined, { numeric: true })
}
