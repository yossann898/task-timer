/* ============================================
   TaskPressure - Service Worker
   オフライン対応
   ============================================ */

const CACHE_NAME = 'taskpressure-v5';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json'
];

// アイコンは存在しない場合もあるので個別にキャッシュ
const OPTIONAL_ASSETS = [
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// インストール時にすべてのアセットをキャッシュ
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // メインアセットをキャッシュ
            return cache.addAll(ASSETS).then(() => {
                // オプショナルアセット（失敗しても問題なし）
                return Promise.allSettled(
                    OPTIONAL_ASSETS.map(url => cache.add(url).catch(() => { }))
                );
            });
        }).then(() => {
            return self.skipWaiting();
        })
    );
});

// アクティベート時に古いキャッシュを削除
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

// フェッチ時にキャッシュファーストで対応
self.addEventListener('fetch', (event) => {
    // Google Fonts等の外部リソース
    if (event.request.url.startsWith('https://fonts.googleapis.com') ||
        event.request.url.startsWith('https://fonts.gstatic.com')) {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                if (cached) return cached;
                return fetch(event.request).then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone);
                    });
                    return response;
                }).catch(() => {
                    // フォントが取得できない場合は無視（システムフォントにフォールバック）
                    return new Response('', { status: 200 });
                });
            })
        );
        return;
    }

    // ローカルアセット：キャッシュファースト
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((response) => {
                // 成功したレスポンスをキャッシュ
                if (response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            }).catch(() => {
                // オフラインでキャッシュにもない場合
                if (event.request.destination === 'document') {
                    return caches.match('./index.html');
                }
                return new Response('Offline', { status: 503 });
            });
        })
    );
});
