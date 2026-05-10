import { Menu } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { CollectionView } from './components/CollectionView'
import { GameScreen } from './components/GameScreen'
import { SetBrowser } from './components/SetBrowser'
import { Setup } from './components/Setup'
import { loadCardsForSet, loadSets, refreshTcgData } from './data/tcgData'
import { getRepository } from './db/database'
import type {
  CollectionEntry,
  Difficulty,
  GameResult,
  TcgCard,
  TcgSet,
  TrainerProfile,
} from './types/tcg'

type View = 'collection' | 'game'

export function App() {
  const [profile, setProfile] = useState<TrainerProfile | null>(null)
  const [sets, setSets] = useState<TcgSet[]>([])
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null)
  const [cardsBySet, setCardsBySet] = useState<Record<string, TcgCard[]>>({})
  const [collection, setCollection] = useState<
    Record<string, CollectionEntry>
  >({})
  const [bestScores, setBestScores] = useState<
    Record<string, Partial<Record<Difficulty, number>>>
  >({})
  const [view, setView] = useState<View>('collection')
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshLabel, setRefreshLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [setPickerOpen, setSetPickerOpen] = useState(false)

  async function reloadProgress() {
    const repository = await getRepository()
    setProfile(repository.getProfile())
    setCollection(repository.getCollectionMap())
    setBestScores(repository.getBestScores())
  }

  async function selectSet(setId: string) {
    setSelectedSetId(setId)
    if (!cardsBySet[setId]) {
      const cards = await loadCardsForSet(setId)
      setCardsBySet((current) => ({ ...current, [setId]: cards }))
    }
  }

  useEffect(() => {
    async function boot() {
      try {
        await reloadProgress()
        const loadedSets = await loadSets()
        setSets(loadedSets)
        if (loadedSets[0]) {
          await selectSet(loadedSets[0].id)
        }
      } catch (bootError) {
        setError(
          bootError instanceof Error
            ? bootError.message
            : 'The card app could not start.',
        )
      } finally {
        setLoading(false)
      }
    }

    void boot()
  }, [])

  const selectedSet = useMemo(
    () => sets.find((set) => set.id === selectedSetId) || null,
    [selectedSetId, sets],
  )
  const selectedCards = selectedSetId ? cardsBySet[selectedSetId] || [] : []

  async function saveName(name: string) {
    const repository = await getRepository()
    setProfile(await repository.setProfileName(name))
  }

  async function startGame(nextDifficulty: Difficulty) {
    setDifficulty(nextDifficulty)
    setView('game')
  }

  async function finishGame(result: GameResult) {
    const repository = await getRepository()
    const missingAwardIds = result.awardedCardIds.filter(
      (cardId) => !collection[cardId] || collection[cardId].quantity <= 0,
    )
    if (missingAwardIds.length > 0) {
      await repository.addCards(missingAwardIds)
    }
    await repository.recordGameResult({
      ...result,
      awardedCardIds: missingAwardIds,
    })
    await reloadProgress()
  }

  async function refreshSets() {
    if (refreshing) return
    setRefreshing(true)
    setRefreshLabel('Starting refresh')
    try {
      await refreshTcgData(setRefreshLabel)
      const loadedSets = await loadSets()
      setSets(loadedSets)
      setCardsBySet({})
      if (selectedSetId) await selectSet(selectedSetId)
      setRefreshLabel('Refresh complete')
    } catch (refreshError) {
      setRefreshLabel(
        refreshError instanceof Error ? refreshError.message : 'Refresh failed',
      )
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return <main className="empty-state">Loading card database...</main>
  }

  if (error) {
    return <main className="empty-state">{error}</main>
  }

  if (!profile) {
    return <Setup onSave={saveName} />
  }

  if (view === 'game' && selectedSet) {
    return (
      <GameScreen
        set={selectedSet}
        cards={selectedCards}
        difficulty={difficulty}
        ownedCardIds={
          new Set(
            Object.values(collection)
              .filter((entry) => entry.quantity > 0)
              .map((entry) => entry.cardId),
          )
        }
        onFinish={finishGame}
        onExit={() => setView('collection')}
      />
    )
  }

  return (
    <main className="app-shell">
      <button
        className="floating-menu-button"
        onClick={() => setSetPickerOpen(true)}
        aria-label="Choose set"
      >
        <Menu size={22} />
      </button>

      <div className="workspace">
        <div className="desktop-set-panel">
          <SetBrowser
            sets={sets}
            selectedSetId={selectedSetId}
            collection={collection}
            cardsBySet={cardsBySet}
            bestScores={bestScores}
            refreshing={refreshing}
            refreshLabel={refreshLabel}
            onSelectSet={(setId) => void selectSet(setId)}
            onRefreshSets={() => void refreshSets()}
          />
        </div>
        <CollectionView
          set={selectedSet}
          cards={selectedCards}
          collection={collection}
          onStartGame={startGame}
        />
      </div>

      {setPickerOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="set-picker-sheet">
            <header>
              <div>
                <p className="eyebrow">Choose set</p>
                <h2>All collections</h2>
              </div>
              <button
                className="ghost-button"
                onClick={() => setSetPickerOpen(false)}
              >
                Close
              </button>
            </header>
            <SetBrowser
              sets={sets}
              selectedSetId={selectedSetId}
              collection={collection}
              cardsBySet={cardsBySet}
              bestScores={bestScores}
              refreshing={refreshing}
              refreshLabel={refreshLabel}
              onSelectSet={(setId) => {
                void selectSet(setId)
                setSetPickerOpen(false)
              }}
              onRefreshSets={() => void refreshSets()}
            />
          </div>
        </div>
      )}
    </main>
  )
}
