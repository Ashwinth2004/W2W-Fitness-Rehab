// Minimal service worker — present only to make the app installable (PWA).
// It deliberately does NOT cache anything (network passthrough), so the site
// always serves the latest content and there is no stale-cache risk.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => { /* passthrough: let the browser handle it */ })
