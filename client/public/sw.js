/**
 * Service Worker - Tofas Fen Webapp
 * 
 * ⚠️ GÜVENLİK UYARISI: API response caching PII sızıntısına sebep olabilir.
 * Sensitive endpoints cache'den hariç tutulmalı.
 */

const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

// ⚠️ KRİTİK: PII içeren endpoint'ler ASLA cache'lenmemeli
const SENSITIVE_ENDPOINTS = [
  '/api/auth/me',
  '/api/auth/refresh-token',
  '/api/user',
  '/api/user/profile',
  '/api/notes',           // Öğrenci notları (PII)
  '/api/attendance',      // Devamsızlık kayıtları (PII)
  '/api/performance',     // Performans verileri (PII)
  '/api/analytics',       // Kullanıcı analitikleri (PII)
  '/api/communication',   // Mesajlaşma (PII)
  '/api/files',           // Kullanıcı dosyaları (PII)
];

// Public endpoint'ler - kısa TTL ile cache'lenebilir
const CACHEABLE_ENDPOINTS = [
  '/api/announcements',
  '/api/dormitory/meals',
  '/api/schedule',
  '/api/supervisors',
];

// Static asset patterns
const STATIC_ASSET_PATTERNS = [
  /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp)$/,
  /\/assets\//,
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.webmanifest',
      ]).catch((error) => {
        console.error('[SW] Cachekullanmış yükleme hatası:', error);
      });
    })
  );
  
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== API_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

// Fetch event handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // Static assets - cache first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStaticRequest(request));
    return;
  }
  
  // HTML pages - network first
  event.respondWith(handleHtmlRequest(request));
});

/**
 * Handle API requests with PII protection
 */
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // ⚠️ KRİTİK: Sensitive endpoint'leri ASLA cache'leme
  if (SENSITIVE_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint))) {
    // Network only, no cache fallback for sensitive data
    try {
      const response = await fetch(request);
      return response;
    } catch (error) {
      // Return error response instead of cached data
      return new Response(
        JSON.stringify({ 
          error: 'Offline - sensitive data not available',
          message: 'Bu veri güvenlik nedeniyle offline modda kullanılamaz'
        }),
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 
            'Content-Type': 'application/json',
            'X-Cache': 'BLOCKED',
            'X-Reason': 'SENSITIVE_ENDPOINT'
          },
        }
      );
    }
  }
  
  // Cacheable endpoints - network first with short TTL
  if (CACHEABLE_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint))) {
    try {
      const response = await fetch(request);
      
      // Only cache successful responses
      if (response.ok) {
        const cache = await caches.open(API_CACHE);
        // Clone response because it can only be read once
        const responseClone = response.clone();
        
        // Add cache metadata
        const headers = new Headers(responseClone.headers);
        headers.set('X-Cached-At', new Date().toISOString());
        
        cache.put(request, new Response(responseClone.body, {
          status: responseClone.status,
          statusText: responseClone.statusText,
          headers: headers,
        }));
      }
      
      return response;
    } catch (error) {
      // Network failed - try cache with short TTL
      const cached = await caches.match(request);
      if (cached) {
        const cachedDate = cached.headers.get('X-Cached-At');
        const cacheAge = cachedDate ? Date.now() - new Date(cachedDate).getTime() : Infinity;
        const maxAge = 5 * 60 * 1000; // 5 minutes max cache age
        
        if (cacheAge < maxAge) {
          // Add header to indicate cached response
          const headers = new Headers(cached.headers);
          headers.set('X-Cache', 'HIT');
          headers.set('X-Cache-Age', Math.round(cacheAge / 1000).toString());
          
          return new Response(cached.body, {
            status: cached.status,
            statusText: cached.statusText,
            headers,
          });
        }
      }
      
      // No valid cache - return offline response
      return new Response(
        JSON.stringify({ 
          error: 'Offline',
          message: 'İnternet bağlantısı yok'
        }),
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 
            'Content-Type': 'application/json',
            'X-Cache': 'MISS'
          },
        }
      );
    }
  }
  
  // Other API requests - network only, no cache
  return fetch(request).catch(() => {
    return new Response(
      JSON.stringify({ error: 'Offline' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  });
}

/**
 * Handle static asset requests - cache first
 */
async function handleStaticRequest(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] Statik varlık geçtiği başarısız:', request.url, error);
    return new Response('Varlık çevriyim modda kullanılamadı', { status: 503 });
  }
}

/**
 * Handle HTML requests - network first
 */
async function handleHtmlRequest(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Fallback to index.html for SPA routing
    const cached = await caches.match('/index.html');
    if (cached) {
      return cached;
    }
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Check if pathname is a static asset
 */
function isStaticAsset(pathname) {
  return STATIC_ASSET_PATTERNS.some(pattern => pattern.test(pathname));
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queue') {
    event.waitUntil(syncOfflineQueue());
  }
});

async function syncOfflineQueue() {
  // This will be called by the offline queue system
  // Implementation in offlineQueue.ts
}

// Message handler for cache invalidation
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => caches.delete(name))
        );
      })
    );
  }
  
  if (event.data && event.data.type === 'INVALIDATE_API_CACHE') {
    event.waitUntil(
      caches.open(API_CACHE).then((cache) => {
        return cache.keys().then((keys) => {
          return Promise.all(
            keys.map((key) => {
              if (key.url.includes(event.data.endpoint)) {
                return cache.delete(key);
              }
            })
          );
        });
      })
    );
  }
});

