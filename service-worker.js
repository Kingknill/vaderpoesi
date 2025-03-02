// 2. Skapa service-worker.js i root-katalogen

const CACHE_NAME = 'vaderpoesi-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.css',
  'https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&family=Merriweather:wght@700&display=swap',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Installation av service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event - rensa gamla cacher
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

// Hantera fetch-händelser för nätverksbegäran
self.addEventListener('fetch', event => {
  // Skippa API-anrop från cachen
  if (event.request.url.includes('/weather') || 
      event.request.url.includes('/forecast') || 
      event.request.url.includes('/geocode') || 
      event.request.url.includes('/generate') || 
      event.request.url.includes('/comments') || 
      event.request.url.includes('/subscribe')) {
    return fetch(event.request);
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - returnera respons
        if (response) {
          return response;
        }
        
        // Klona begäran eftersom det är en ström som bara kan användas en gång
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          response => {
            // Kontrollera om vi fick ett giltigt svar
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Klona responsen eftersom det är en ström som bara kan användas en gång
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

// Synkronisera offline-data när användaren kommer online igen
self.addEventListener('sync', event => {
  if (event.tag === 'sync-comments') {
    event.waitUntil(syncComments());
  }
});

// Bakgrundssynkronisering för kommentarer
async function syncComments() {
  try {
    const offlineComments = await getOfflineComments();
    if (offlineComments.length > 0) {
      for (const comment of offlineComments) {
        await fetch('/comments', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({comment: comment.text})
        });
      }
      await clearOfflineComments();
    }
  } catch (error) {
    console.error('Failed to sync comments:', error);
  }
}

// Hjälpfunktioner för IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('vaderpoesi-offline', 1);

    request.onupgradeneeded = event => {
      const db = event.target.result;
      db.createObjectStore('comments', { keyPath: 'id', autoIncrement: true });
    };

    request.onsuccess = event => resolve(event.target.result);
    request.onerror = event => reject(event.target.error);
  });
}

async function getOfflineComments() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['comments'], 'readonly');
    const store = transaction.objectStore('comments');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function clearOfflineComments() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['comments'], 'readwrite');
    const store = transaction.objectStore('comments');
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}