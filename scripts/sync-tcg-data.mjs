#!/usr/bin/env bun
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(appRoot, '..')
const sourceRoot = path.join(repoRoot, 'source_data', 'tcg')
const setsPath = path.join(sourceRoot, 'sets', 'en.json')
const cardsRoot = path.join(sourceRoot, 'cards', 'en')
const publicRoot = path.join(appRoot, 'public', 'tcg')
const publicCardsRoot = path.join(publicRoot, 'cards')

function normalizeSet(set) {
  return {
    id: set.id,
    name: set.name,
    series: set.series || '',
    total: Number(set.total || 0),
    printedTotal: set.printedTotal ?? null,
    releaseDate: set.releaseDate || null,
    images: set.images || { symbol: '', logo: '' },
  }
}

function normalizeCard(card) {
  return {
    id: card.id,
    name: card.name || card.id,
    number: card.number || '',
    artist: card.artist || null,
    rarity: card.rarity || null,
    supertype: card.supertype || 'Unknown',
    subtypes: card.subtypes || [],
    hp: card.hp || null,
    types: card.types || [],
    evolvesFrom: card.evolvesFrom || null,
    evolvesTo: card.evolvesTo || [],
    convertedRetreatCost: card.convertedRetreatCost ?? null,
    nationalPokedexNumbers: card.nationalPokedexNumbers || [],
    images: card.images || { small: '', large: '' },
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

async function main() {
  await fs.mkdir(publicCardsRoot, { recursive: true })

  const sets = (await readJson(setsPath)).map(normalizeSet)
  await fs.writeFile(
    path.join(publicRoot, 'sets.json'),
    `${JSON.stringify(sets)}\n`,
    'utf8',
  )

  let cardCount = 0
  for (const set of sets) {
    const filePath = path.join(cardsRoot, `${set.id}.json`)
    try {
      const cards = (await readJson(filePath)).map(normalizeCard)
      cardCount += cards.length
      await fs.writeFile(
        path.join(publicCardsRoot, `${set.id}.json`),
        `${JSON.stringify(cards)}\n`,
        'utf8',
      )
    } catch (error) {
      console.warn(`Skipping ${set.id}: ${error.message}`)
      await fs.writeFile(path.join(publicCardsRoot, `${set.id}.json`), '[]\n')
    }
  }

  console.log(`Synced ${sets.length} sets and ${cardCount} cards into card-app/public/tcg.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
