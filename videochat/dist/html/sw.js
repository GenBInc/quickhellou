var CACHE_VERSION = 1;
var CURRENT_CACHES = {
  prefetch: 'prefetch-cache-v' + CACHE_VERSION
};

self.addEventListener('install', (event) => {
  var urlsToPrefetch = [
    '/',
    'js/quickhellou.min.js',
    'images/send-invitation.svg',
    'images/send-sms.svg',
    'images/close.svg',
    'images/setup-talk.svg',
    'images/hellou-quick-white.svg',
    'images/arrow.svg',
    'images/hellou-quick.svg',
    'images/mobile.svg',
    'images/desktop.svg',
    'images/quick-talk.svg',
  ];
  
  event.waitUntil(
    caches.open(CURRENT_CACHES['prefetch']).then((cache) => {
      cache.addAll(urlsToPrefetch.map((urlToPrefetch) => {
        return new Request(urlToPrefetch, {
          mode: 'no-cors'
        });
      })).then(() => {
        console.log('SW: All resources have been fetched and cached.');
      }).catch((error) => {
        console.log('SW: Resource prefetch error.');
      });
    }).catch((error) => {
      console.error('SW: Pre-fetching failed:', error);
    })
  );
});

self.addEventListener('activate', (event) => {
  clients.claim();
  var cacheWhitelist = [CURRENT_CACHES['prefetch']];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log("SW: Delete cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
    .then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }

      // IMPORTANT: Clone the request. A request is a stream and
      // can only be consumed once. Since we are consuming this
      // once by cache and once by the browser for fetch, we need
      // to clone the response.
      var fetchRequest = event.request.clone();

      return fetch(fetchRequest).then(
        (response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // IMPORTANT: Clone the response. A response is a stream
          // and because we want the browser to consume the response
          // as well as the cache consuming the response, we need
          // to clone it so we have two streams.
          var responseToCache = response.clone();

          caches.open(CURRENT_CACHES['prefetch'])
            .then((cache) => {
              try {
                cache.put(event.request, responseToCache);
              } catch (e) {
                console.warn(e);
              }
            });

          return response;
        }
      );
    })
  );
});