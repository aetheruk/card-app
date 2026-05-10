import { Download, Menu, Settings, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CollectionView } from './components/CollectionView'
import { GameScreen } from './components/GameScreen'
import { SetBrowser } from './components/SetBrowser'
import { Setup } from './components/Setup'
import { loadCardsForSet, loadSets, refreshTcgData } from './data/tcgData'
import {
  getRepository,
  resetRepository,
  validateDatabaseBytes,
} from './db/database'
import { replaceDatabaseBytes } from './db/indexedDb'
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
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const importInputRef = useRef<HTMLInputElement | null>(null)

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

  async function reloadAppData(preferredSetId = selectedSetId) {
    await reloadProgress()
    const loadedSets = await loadSets()
    setSets(loadedSets)
    const nextSelectedSetId =
      preferredSetId && loadedSets.some((set) => set.id === preferredSetId)
        ? preferredSetId
        : loadedSets[0]?.id || null
    setSelectedSetId(nextSelectedSetId)
    setCardsBySet({})
    if (nextSelectedSetId) {
      const cards = await loadCardsForSet(nextSelectedSetId)
      setCardsBySet({ [nextSelectedSetId]: cards })
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
  const collectionCountsBySet = useMemo(() => {
    const counts: Record<string, number> = {}
    Object.values(collection).forEach((entry) => {
      if (entry.quantity <= 0) return
      const separatorIndex = entry.cardId.lastIndexOf('-')
      if (separatorIndex <= 0) return
      const setId = entry.cardId.slice(0, separatorIndex)
      counts[setId] = (counts[setId] || 0) + 1
    })
    return counts
  }, [collection])

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
    setRefreshLabel('Checking for new sets')
    try {
      const addedCount = await refreshTcgData(setRefreshLabel)
      const loadedSets = await loadSets()
      setSets(loadedSets)
      setRefreshLabel(
        addedCount === 0
          ? 'No new sets found'
          : `Added ${addedCount} new ${addedCount === 1 ? 'set' : 'sets'}`,
      )
    } catch (refreshError) {
      setRefreshLabel(
        refreshError instanceof Error ? refreshError.message : 'Update failed',
      )
    } finally {
      setRefreshing(false)
    }
  }

  async function exportSaveData() {
    try {
      const repository = await getRepository()
      const bytes = repository.exportBytes()
      const exportBuffer = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer
      const blob = new Blob([exportBuffer], {
        type: 'application/octet-stream',
      })
      const url = URL.createObjectURL(blob)
      const date = new Date().toISOString().slice(0, 10)
      const link = document.createElement('a')
      link.href = url
      link.download = `tcg-match-save-${date}.tcgmatch`
      document.body.append(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setSaveMessage('Save data exported')
    } catch (exportError) {
      setSaveMessage(
        exportError instanceof Error ? exportError.message : 'Export failed',
      )
    }
  }

  async function importSaveData(file: File | null) {
    if (!file) return
    const confirmed = window.confirm(
      'Importing save data will replace the trainer, collection, scores, and local card data on this device. Continue?',
    )
    if (!confirmed) {
      if (importInputRef.current) importInputRef.current.value = ''
      return
    }

    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      await validateDatabaseBytes(bytes)
      await replaceDatabaseBytes(bytes)
      resetRepository()
      setSaveMessage('Save data imported')
      setOptionsOpen(false)
      setView('collection')
      await reloadAppData(null)
    } catch (importError) {
      setSaveMessage(
        importError instanceof Error ? importError.message : 'Import failed',
      )
    } finally {
      if (importInputRef.current) importInputRef.current.value = ''
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
      <button
        className="floating-options-button"
        onClick={() => {
          setSaveMessage('')
          setOptionsOpen(true)
        }}
        aria-label="Options"
      >
        <Settings size={21} />
      </button>

      <div className="workspace">
        <div className="desktop-set-panel">
          <SetBrowser
            sets={sets}
            selectedSetId={selectedSetId}
            collection={collection}
            collectionCountsBySet={collectionCountsBySet}
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
                <p className="eyebrow">{profile.name}'s</p>
                <h2>Collection</h2>
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
              collectionCountsBySet={collectionCountsBySet}
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

      {optionsOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setOptionsOpen(false)}
        >
          <div
            className="options-sheet"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <h2>Options</h2>
              <button
                className="ghost-button"
                onClick={() => setOptionsOpen(false)}
              >
                Close
              </button>
            </header>
            <div className="options-list">
              <button className="options-row" onClick={() => void exportSaveData()}>
                <span className="options-icon">
                  <Download size={18} />
                </span>
                <span>
                  <strong>Export save data</strong>
                  <small>Download a backup of this device's collection.</small>
                </span>
              </button>
              <button
                className="options-row warning"
                onClick={() => importInputRef.current?.click()}
              >
                <span className="options-icon">
                  <Upload size={18} />
                </span>
                <span>
                  <strong>Import save data</strong>
                  <small>Replaces this device's current save after warning.</small>
                </span>
              </button>
              {saveMessage && <p className="options-message">{saveMessage}</p>}
              <input
                ref={importInputRef}
                className="visually-hidden"
                type="file"
                accept=".tcgmatch,.sqlite,.db,application/octet-stream"
                onChange={(event) =>
                  void importSaveData(event.currentTarget.files?.[0] || null)
                }
              />
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
