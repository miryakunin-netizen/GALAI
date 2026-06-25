const CACHE = 'galai-v2';
const ASSETS = ['/', '/index.html', '/style.css', '/app.js', '/chats.js', '/voice.js', '/search.js', '/manifest.json'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(()=>{})));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/search')) return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request).then(r => r || caches.match('/'))));
});
