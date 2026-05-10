import initSqlJs from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import type {
  CollectionEntry,
  Difficulty,
  GameResult,
  TcgCard,
  TcgSet,
  TrainerProfile,
} from '../types/tcg'
import { loadDatabaseBytes, saveDatabaseBytes } from './indexedDb'

let repositoryPromise: Promise<CardRepository> | null = null

export function getRepository(): Promise<CardRepository> {
  repositoryPromise ??= createRepository()
  return repositoryPromise
}

async function createRepository(): Promise<CardRepository> {
  const SQL = await initSqlJs({ locateFile: () => wasmUrl })
  const bytes = await loadDatabaseBytes()
  const db = bytes ? new SQL.Database(bytes) : new SQL.Database()
  const repository = new CardRepository(db)
  await repository.migrate()
  return repository
}

function toJson<T>(value: string | null): T | null {
  if (!value) return null
  return JSON.parse(value) as T
}

function rowToSet(row: Record<string, unknown>): TcgSet {
  return {
    id: String(row.id),
    name: String(row.name),
    series: String(row.series || ''),
    total: Number(row.total || 0),
    printedTotal:
      row.printed_total === null || row.printed_total === undefined
        ? null
        : Number(row.printed_total),
    releaseDate: row.release_date ? String(row.release_date) : null,
    images: toJson(String(row.images || '{}')) || { symbol: '', logo: '' },
  }
}

function rowToCard(row: Record<string, unknown>): TcgCard {
  return JSON.parse(String(row.payload)) as TcgCard
}

export class CardRepository {
  constructor(private db: import('sql.js').Database) {}

  async migrate(): Promise<void> {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS collection (
        card_id TEXT PRIMARY KEY,
        quantity INTEGER NOT NULL DEFAULT 0,
        first_collected_at TEXT NOT NULL,
        last_collected_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS game_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        set_id TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        score INTEGER NOT NULL,
        won INTEGER NOT NULL,
        awarded_card_ids TEXT NOT NULL,
        played_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tcg_sets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        series TEXT NOT NULL,
        total INTEGER NOT NULL,
        printed_total INTEGER,
        release_date TEXT,
        images TEXT NOT NULL,
        refreshed_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tcg_cards (
        id TEXT PRIMARY KEY,
        set_id TEXT NOT NULL,
        name TEXT NOT NULL,
        number TEXT NOT NULL,
        rarity TEXT,
        payload TEXT NOT NULL,
        refreshed_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_tcg_cards_set_id ON tcg_cards(set_id);
    `)
    await this.persist()
  }

  async persist(): Promise<void> {
    await saveDatabaseBytes(this.db.export())
  }

  getProfile(): TrainerProfile | null {
    const row = this.first(
      'SELECT id, name, created_at, updated_at FROM profile WHERE id = 1',
    )
    if (!row) return null
    return {
      id: 1,
      name: String(row.name),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    }
  }

  async setProfileName(name: string): Promise<TrainerProfile> {
    const now = new Date().toISOString()
    this.db.run(
      `
      INSERT INTO profile (id, name, created_at, updated_at)
      VALUES (1, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at
      `,
      [name.trim(), now, now],
    )
    await this.persist()
    return this.getProfile()!
  }

  getCollectionMap(): Record<string, CollectionEntry> {
    const rows = this.all(
      'SELECT card_id, quantity, first_collected_at, last_collected_at FROM collection',
    )
    const map: Record<string, CollectionEntry> = {}
    rows.forEach((row) => {
      map[String(row.card_id)] = {
        cardId: String(row.card_id),
        quantity: Number(row.quantity),
        firstCollectedAt: String(row.first_collected_at),
        lastCollectedAt: String(row.last_collected_at),
      }
    })
    return map
  }

  async addCards(cardIds: string[]): Promise<void> {
    const now = new Date().toISOString()
    cardIds.forEach((cardId) => {
      this.db.run(
        `
        INSERT INTO collection (card_id, quantity, first_collected_at, last_collected_at)
        VALUES (?, 1, ?, ?)
        ON CONFLICT(card_id) DO UPDATE SET
          quantity = 1,
          last_collected_at = excluded.last_collected_at
        `,
        [cardId, now, now],
      )
    })
    await this.persist()
  }

  async recordGameResult(result: GameResult): Promise<void> {
    this.db.run(
      `
      INSERT INTO game_results
        (set_id, difficulty, score, won, awarded_card_ids, played_at)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        result.setId,
        result.difficulty,
        result.score,
        result.won ? 1 : 0,
        JSON.stringify(result.awardedCardIds),
        result.playedAt,
      ],
    )
    await this.persist()
  }

  getBestScores(): Record<string, Partial<Record<Difficulty, number>>> {
    const rows = this.all(`
      SELECT set_id, difficulty, MAX(score) AS score
      FROM game_results
      GROUP BY set_id, difficulty
    `)
    const scores: Record<string, Partial<Record<Difficulty, number>>> = {}
    rows.forEach((row) => {
      const setId = String(row.set_id)
      scores[setId] ??= {}
      scores[setId][String(row.difficulty) as Difficulty] = Number(row.score)
    })
    return scores
  }

  hasRefreshedTcgData(): boolean {
    const row = this.first('SELECT COUNT(*) AS count FROM tcg_sets')
    return Number(row?.count || 0) > 0
  }

  getStoredSets(): TcgSet[] {
    return this.all(
      'SELECT id, name, series, total, printed_total, release_date, images FROM tcg_sets ORDER BY release_date DESC, name ASC',
    ).map(rowToSet)
  }

  getStoredCards(setId: string): TcgCard[] {
    return this.all(
      'SELECT payload FROM tcg_cards WHERE set_id = ? ORDER BY CAST(number AS INTEGER), number',
      [setId],
    ).map(rowToCard)
  }

  async replaceTcgData(
    sets: TcgSet[],
    cardsBySet: Map<string, TcgCard[]>,
  ): Promise<void> {
    const now = new Date().toISOString()

    this.db.run('BEGIN TRANSACTION')
    try {
      this.db.run('DELETE FROM tcg_sets')
      this.db.run('DELETE FROM tcg_cards')

      sets.forEach((set) => {
        this.db.run(
          `
          INSERT INTO tcg_sets
            (id, name, series, total, printed_total, release_date, images, refreshed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          [
            set.id,
            set.name,
            set.series,
            set.total,
            set.printedTotal,
            set.releaseDate,
            JSON.stringify(set.images),
            now,
          ],
        )

        const cards = cardsBySet.get(set.id) || []
        cards.forEach((card) => {
          this.db.run(
            `
            INSERT INTO tcg_cards
              (id, set_id, name, number, rarity, payload, refreshed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
              card.id,
              set.id,
              card.name,
              card.number,
              card.rarity,
              JSON.stringify(card),
              now,
            ],
          )
        })
      })

      this.db.run('COMMIT')
    } catch (error) {
      this.db.run('ROLLBACK')
      throw error
    }

    await this.persist()
  }

  private all(sql: string, params: unknown[] = []): Record<string, unknown>[] {
    const statement = this.db.prepare(sql)
    statement.bind(params)
    const rows: Record<string, unknown>[] = []
    while (statement.step()) {
      rows.push(statement.getAsObject())
    }
    statement.free()
    return rows
  }

  private first(
    sql: string,
    params: unknown[] = [],
  ): Record<string, unknown> | null {
    return this.all(sql, params)[0] || null
  }
}
