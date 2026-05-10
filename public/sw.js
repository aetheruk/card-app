const STATIC_CACHE = 'tcg-static-v1'
const IMAGE_CACHE = 'tcg-images-v1'
const STATIC_ASSETS = ['/', '/manifest.webmanifest', '/app-icon.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  if (url.hostname === 'images.pokemontcg.io') {
    event.respondWith(cacheFirst(event.request, IMAGE_CACHE))
    return
  }

  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(event.request))
  }
})

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok || response.type === 'opaque') {
    cache.put(request, response.clone())
  }
  return response
}

async function networkFirst(request) {
  const cache = await caches.open(STATIC_CACHE)
  try {
    const response = await fetch(request)
    if (request.method === 'GET' && response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    const cached = await cache.match(request)
    if (cached) return cached
    throw error
  }
}
