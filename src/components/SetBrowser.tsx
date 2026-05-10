import { RefreshCw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { CollectionEntry, Difficulty, TcgCard, TcgSet } from '../types/tcg'

interface SetBrowserProps {
  sets: TcgSet[]
  selectedSetId: string | null
  collection: Record<string, CollectionEntry>
  collectionCountsBySet: Record<string, number>
  cardsBySet: Record<string, TcgCard[]>
  bestScores: Record<string, Partial<Record<Difficulty, number>>>
  refreshing: boolean
  refreshLabel: string
  onSelectSet: (setId: string) => void
  onRefreshSets: () => void
}

export function SetBrowser({
  sets,
  selectedSetId,
  collection,
  collectionCountsBySet,
  cardsBySet,
  bestScores,
  refreshing,
  refreshLabel,
  onSelectSet,
  onRefreshSets,
}: SetBrowserProps) {
  const [query, setQuery] = useState('')

  const filteredSets = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return sets
    return sets.filter((set) =>
      `${set.name} ${set.series} ${set.id}`.toLowerCase().includes(normalized),
    )
  }, [query, sets])

  return (
    <aside className="set-browser">
      <div className="browser-actions">
        <div className="search-box">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search sets"
          />
        </div>
        <button
          className="icon-button"
          onClick={onRefreshSets}
          disabled={refreshing}
          title="Check for new sets"
          aria-label="Check for new sets"
        >
          <RefreshCw size={18} className={refreshing ? 'spin' : ''} />
        </button>
      </div>
      {refreshLabel && <p className="sync-label">{refreshLabel}</p>}

      <div className="set-list">
        {filteredSets.map((set) => {
          const cards = cardsBySet[set.id] || []
          const loadedOwned = cards.filter(
            (card) => collection[card.id]?.quantity > 0,
          ).length
          const owned = cards.length ? loadedOwned : collectionCountsBySet[set.id] || 0
          const total = cards.length || set.total

          return (
            <button
              key={set.id}
              className={`set-row ${selectedSetId === set.id ? 'active' : ''}`}
              onClick={() => onSelectSet(set.id)}
            >
              <img src={set.images.symbol || '/icon.svg'} alt="" />
              <span>
                <strong>{set.name}</strong>
                <small>
                  {set.series} · {owned}/{total}
                </small>
              </span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
