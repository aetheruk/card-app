const DB_NAME = 'pokemon-tcg-card-app'
const STORE_NAME = 'sqlite'
const DB_KEY = 'main'

function openStore(): Promise<IDBObjectStore> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME)
    }

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const transaction = request.result.transaction(STORE_NAME, 'readwrite')
      resolve(transaction.objectStore(STORE_NAME))
    }
  })
}

export async function loadDatabaseBytes(): Promise<Uint8Array | null> {
  const store = await openStore()

  return new Promise((resolve, reject) => {
    const request = store.get(DB_KEY)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const value = request.result
      resolve(value instanceof Uint8Array ? value : null)
    }
  })
}

export async function saveDatabaseBytes(bytes: Uint8Array): Promise<void> {
  const store = await openStore()

  await new Promise<void>((resolve, reject) => {
    const request = store.put(bytes, DB_KEY)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export async function replaceDatabaseBytes(bytes: Uint8Array): Promise<void> {
  await saveDatabaseBytes(bytes)
}
