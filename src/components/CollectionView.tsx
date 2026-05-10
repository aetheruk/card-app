import { Eye, Gift, Play, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CardImage } from './CardImage'
import { DIFFICULTIES, difficultyOrder } from '../game/difficulties'
import type {
  CollectionEntry,
  Difficulty,
  TcgCard,
  TcgSet,
} from '../types/tcg'

interface CollectionViewProps {
  set: TcgSet | null
  cards: TcgCard[]
  collection: Record<string, CollectionEntry>
  onStartGame: (difficulty: Difficulty) => void
}

export function CollectionView({
  set,
  cards,
  collection,
  onStartGame,
}: CollectionViewProps) {
  const [query, setQuery] = useState('')
  const [difficultyOpen, setDifficultyOpen] = useState(false)
  const [focusedCard, setFocusedCard] = useState<TcgCard | null>(null)

  const filteredCards = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return cards.filter((card) => {
      if (!normalized) return true
      return `${card.name} ${card.number} ${card.rarity || ''}`
        .toLowerCase()
        .includes(normalized)
    })
  }, [cards, query])

  if (!set) {
    return <section className="empty-state">Select a set to begin.</section>
  }

  const owned = cards.filter((card) => collection[card.id]?.quantity > 0).length

  return (
    <section className="collection-view">
      <header className="set-header">
        <img src={set.images.logo || set.images.symbol || '/icon.svg'} alt="" />
        <div>
          <p className="set-subtitle">{set.series}</p>
          <h2>{set.name}</h2>
          <span className="collected-chip">{owned}/{cards.length || set.total}</span>
        </div>
      </header>

      <div className="primary-action-row">
        <button
          className="reveal-action primary start-game-button"
          onClick={() => setDifficultyOpen(true)}
        >
          <Play size={18} />
          Start game
        </button>
      </div>

      <div className="collection-toolbar">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search cards"
        />
      </div>

      <div className="card-grid">
        {filteredCards.map((card) => {
          const owned = (collection[card.id]?.quantity || 0) > 0
          const content = (
            <>
              <CardImage card={card} hidden={!owned} />
              <div>
                <strong>{owned ? card.name : 'Uncollected card'}</strong>
                <small>
                  #{card.number} · {owned ? card.rarity || 'Unknown' : 'Hidden'}
                </small>
              </div>
            </>
          )
          return (
            owned ? (
              <button
                key={card.id}
                className="collection-card collection-card-button"
                onClick={() => setFocusedCard(card)}
              >
                {content}
              </button>
            ) : (
              <article key={card.id} className="collection-card missing">
                {content}
              </article>
            )
          )
        })}
      </div>

      {focusedCard && (
        <div
          className="modal-backdrop card-detail-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setFocusedCard(null)}
        >
          <div
            className="card-detail-sheet"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="ghost-button icon-close-button card-detail-close"
              onClick={() => setFocusedCard(null)}
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <img
              src={focusedCard.images.large || focusedCard.images.small}
              alt={focusedCard.name}
              onError={(event) => {
                event.currentTarget.src = focusedCard.images.small || '/icon.svg'
              }}
            />
          </div>
        </div>
      )}

      {difficultyOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setDifficultyOpen(false)}
        >
          <div
            className="difficulty-sheet"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="difficulty-header">
              <h2>Choose difficulty</h2>
            </header>
            <div className="difficulty-list">
              {difficultyOrder.map((difficulty, index) => {
                const config = DIFFICULTIES[difficulty]
                return (
                  <button
                    key={difficulty}
                    className={`difficulty-row difficulty-${difficulty}`}
                    onClick={() => {
                      setDifficultyOpen(false)
                      onStartGame(difficulty)
                    }}
                  >
                    <span className="difficulty-orb">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="difficulty-copy">
                      <strong>{config.label}</strong>
                      <small>{config.questionTypes.length} question types</small>
                    </span>
                    <span className="difficulty-meta">
                      <em aria-label={`${config.packSize} cards shown`}>
                        <Eye size={13} />
                        {config.packSize}
                      </em>
                      <em aria-label={`${config.rewardCards} reward cards`}>
                        <Gift size={13} />
                        {config.rewardCards}
                      </em>
                    </span>
                    <span className="difficulty-play">
                      <Play size={16} />
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
