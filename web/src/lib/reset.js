function dateKey(ts) {
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

function startOfDay(ts) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function clearToday(core) {
  const st = core.getState()
  const start = startOfDay(Date.now())
  const key = dateKey(Date.now())
  const count = { wordbook: 0, wrong: 0, questions: 0, attempts: 0 }

  delete st.daily[key]
  st.syncTombstones = st.syncTombstones || { wrong: {}, attempts: {} }
  st.syncTombstones.wrong = st.syncTombstones.wrong || {}
  st.syncTombstones.attempts = st.syncTombstones.attempts || {}
  const now = Date.now()

  Object.keys(st.wordbook || {}).forEach((id) => {
    const item = st.wordbook[id]
    if (item && item.at >= start) {
      delete st.wordbook[id]
      count.wordbook += 1
    }
  })

  Object.keys((st.wrong && st.wrong.words) || {}).forEach((id) => {
    const item = st.wrong.words[id]
    if (item && item.last >= start) {
      delete st.wrong.words[id]
      count.wrong += 1
    }
  })

  Object.keys((st.wrong && st.wrong.questions) || {}).forEach((id) => {
    const item = st.wrong.questions[id]
    if (item && item.last >= start) {
      delete st.wrong.questions[id]
      st.syncTombstones.wrong[id] = now
      count.questions += 1
    }
  })

  Object.keys(st.qstats || {}).forEach((id) => {
    const item = st.qstats[id]
    if (item && item.last >= start) delete st.qstats[id]
  })

  Object.keys(st.attempts || {}).forEach((kind) => {
    const bucket = st.attempts[kind] || {}
    Object.keys(bucket).forEach((id) => {
      const item = bucket[id]
      if (item && item.at >= start) {
        delete bucket[id]
        st.syncTombstones.attempts[kind + ':' + id] = now
        count.attempts += 1
      }
    })
  })

  Object.keys((st.drill && st.drill.byWord) || {}).forEach((id) => {
    const item = st.drill.byWord[id]
    if (item && item.last >= start) delete st.drill.byWord[id]
  })

  st.sessions = {}
  core.save()
  return { key, ...count }
}
