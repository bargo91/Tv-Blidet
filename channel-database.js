const ChannelDatabase = (() => {
  const databaseName = 'blidaoui-tv';
  const storeName = 'channels';
  let databasePromise;

  function open() {
    if (!('indexedDB' in window)) return Promise.resolve(null);
    if (!databasePromise) {
      databasePromise = new Promise((resolve) => {
        const request = indexedDB.open(databaseName, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: 'source' });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      });
    }
    return databasePromise;
  }

  async function save(channels, section) {
    const database = await open();
    if (!database) return;
    await new Promise((resolve) => {
      const transaction = database.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      channels.forEach((channel) => store.put({ ...channel, section, updatedAt: Date.now() }));
      transaction.oncomplete = resolve;
      transaction.onerror = resolve;
    });
  }

  async function markUnavailable(source) {
    const database = await open();
    if (!database) return;
    await new Promise((resolve) => {
      const transaction = database.transaction(storeName, 'readwrite');
      const request = transaction.objectStore(storeName).get(source);
      request.onsuccess = () => {
        if (request.result) transaction.objectStore(storeName).put({ ...request.result, unavailable: true, failedAt: Date.now() });
      };
      transaction.oncomplete = resolve;
      transaction.onerror = resolve;
    });
  }

  return { save, markUnavailable };
})();

const ChannelIntelligence = {
  rank(channels) {
    return [...channels].sort((first, second) => this.score(second) - this.score(first));
  },
  score(channel) {
    let score = 0;
    if (channel.logoUrl) score += 3;
    if (/https:\/\//i.test(channel.source)) score += 2;
    if (/\.m3u8(?:$|[?#])/i.test(channel.source)) score += 2;
    if (channel.name && channel.name !== 'قناة بدون اسم') score += 1;
    if (channel.unavailable) score -= 20;
    return score;
  }
};
