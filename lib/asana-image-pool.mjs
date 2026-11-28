export function createAsanaImagePool(download, urlApi = URL, concurrency = 4) {
  const entries = new Map()
  const queue = new Set()
  let active = 0
  let owner = null

  function discard(entry) {
    if (entries.get(entry.path) !== entry) return
    entries.delete(entry.path)
    queue.delete(entry)
    entry.abort.abort()
    if (entry.url) urlApi.revokeObjectURL(entry.url)
    entry.resolve(null)
  }

  function pump() {
    for (const entry of queue) {
      if (active >= concurrency) break
      queue.delete(entry)
      active++
      void Promise.resolve().then(() => download(entry.path, entry.owner, entry.abort.signal))
        .then(blob => {
          if (!blob || entries.get(entry.path) !== entry) return
          entry.url = urlApi.createObjectURL(blob)
          entry.resolve(entry.url)
        })
        .catch(() => {})
        .finally(() => {
          if (!entry.url) discard(entry)
          active--
          pump()
        })
    }
  }

  return {
    setOwner(next) {
      if (next === owner) return
      owner = next
      for (const entry of entries.values()) discard(entry)
    },
    acquire(path, expectedOwner) {
      if (!owner || owner !== expectedOwner || path.split('/')[0] !== owner) {
        return { url: Promise.resolve(null), release() {} }
      }
      let entry = entries.get(path)
      if (!entry) {
        let resolve
        const urlPromise = new Promise(done => { resolve = done })
        entry = { path, owner, abort: new AbortController(), urlPromise, resolve, users: 0 }
        entries.set(path, entry)
        queue.add(entry)
      }
      entry.users++
      pump()
      let released = false
      return {
        url: entry.urlPromise,
        release() {
          if (released) return
          released = true
          if (--entry.users === 0) discard(entry)
        },
      }
    },
  }
}
