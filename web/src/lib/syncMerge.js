function clone(value) {
  return JSON.parse(JSON.stringify(value == null ? {} : value))
}

function stamp(value) {
  return Number(value) || 0
}

function newer(a, b, field) {
  if (!a) return b
  if (!b) return a
  return stamp(b[field]) > stamp(a[field]) ? b : a
}

function mergeTombstoneGroup(local, remote) {
  const out = {}
  ;[remote || {}, local || {}].forEach((group) => {
    Object.keys(group).forEach((key) => {
      out[key] = Math.max(stamp(out[key]), stamp(group[key]))
    })
  })
  return out
}

function mergeQuestions(local, remote, tombstones) {
  const out = {}
  const keys = new Set([...Object.keys(local || {}), ...Object.keys(remote || {})])
  keys.forEach((key) => {
    const a = local && local[key]
    const b = remote && remote[key]
    const chosen = newer(a, b, 'last')
    if (!chosen) return
    if (stamp(tombstones[key]) > stamp(chosen.last)) return
    const entry = clone(chosen)
    const other = chosen === a ? b : a
    ;['title', 'zh', 'type', 'passage', 'context', 'options', 'exam'].forEach((field) => {
      if (entry[field] == null && other && other[field] != null) entry[field] = clone(other[field])
    })
    entry.count = Math.max(stamp(a && a.count), stamp(b && b.count), 1)
    entry.last = Math.max(stamp(a && a.last), stamp(b && b.last))
    out[key] = entry
  })
  return out
}

function mergeAttemptBuckets(local, remote, tombstones) {
  const kinds = new Set([...Object.keys(local || {}), ...Object.keys(remote || {})])
  const out = {}
  kinds.forEach((kind) => {
    const a = local && local[kind] || {}
    const b = remote && remote[kind] || {}
    const bucket = {}
    const ids = new Set([...Object.keys(a), ...Object.keys(b)])
    ids.forEach((id) => {
      const x = a[id]
      const y = b[id]
      const chosen = newer(x, y, 'at')
      if (!chosen) return
      if (stamp(tombstones[kind + ':' + id]) > stamp(chosen.at)) return
      const entry = { ...clone(chosen) }
      const other = chosen === x ? y : x
      ;['title', 'zh', 'type', 'route', 'exam'].forEach((field) => {
        if (entry[field] == null && other && other[field] != null) entry[field] = other[field]
      })
      entry.at = Math.max(stamp(x && x.at), stamp(y && y.at))
      if (x && y) entry.best = Math.max(stamp(x.best), stamp(y.best))
      bucket[id] = entry
    })
    out[kind] = bucket
  })
  return out
}

function mergeCards(baseCards, incomingCards, tombstones) {
  const out = {}
  const keys = new Set([...Object.keys(baseCards || {}), ...Object.keys(incomingCards || {})])
  keys.forEach((key) => {
    const a = baseCards && baseCards[key]
    const b = incomingCards && incomingCards[key]
    const chosen = newer(a, b, 'last')
    if (!chosen) return
    if (stamp(tombstones[key]) > stamp(chosen.last)) return
    const entry = clone(chosen)
    if (a && b) {
      entry.reps = Math.max(stamp(a.reps), stamp(b.reps))
      entry.lapses = Math.max(stamp(a.lapses), stamp(b.lapses))
      entry.wrong = Math.max(stamp(a.wrong), stamp(b.wrong))
      entry.guessCount = Math.max(stamp(a.guessCount), stamp(b.guessCount))
      entry.lastVerifiedAt = Math.max(stamp(a.lastVerifiedAt), stamp(b.lastVerifiedAt))
      if (!entry.lastVerifyMode) entry.lastVerifyMode = a.lastVerifyMode || b.lastVerifyMode || ''
      if (entry.lastVerifyOk == null) entry.lastVerifyOk = !!(a.lastVerifyOk || b.lastVerifyOk)
    }
    out[key] = entry
  })
  return out
}

function mergeDaily(baseDaily, incomingDaily, tombstones) {
  const out = {}
  const keys = new Set([...Object.keys(baseDaily || {}), ...Object.keys(incomingDaily || {})])
  keys.forEach((key) => {
    const tomb = stamp(tombstones[key])
    const a = baseDaily && baseDaily[key]
    const b = incomingDaily && incomingDaily[key]
    const left = a && (stamp(a.updatedAt) > tomb || !tomb) ? a : null
    const right = b && (stamp(b.updatedAt) > tomb || !tomb) ? b : null
    if (!left && !right) return
    if (!left) { out[key] = clone(right); return }
    if (!right) { out[key] = clone(left); return }
    const entry = { ...clone(left) }
    Object.keys(right).forEach((field) => {
      if (typeof right[field] === 'number') entry[field] = Math.max(stamp(left[field]), stamp(right[field]))
      else if (entry[field] == null) entry[field] = right[field]
    })
    entry.updatedAt = Math.max(stamp(left.updatedAt), stamp(right.updatedAt))
    out[key] = entry
  })
  return out
}

function mergeSessions(baseSessions, incomingSessions, tombstones) {
  const out = {}
  const keys = new Set([...Object.keys(baseSessions || {}), ...Object.keys(incomingSessions || {})])
  keys.forEach((key) => {
    const a = baseSessions && baseSessions[key]
    const b = incomingSessions && incomingSessions[key]
    const chosen = newer(a, b, 'updatedAt')
    if (!chosen) return
    const at = stamp(chosen.updatedAt) || stamp(chosen.startedAt)
    if (stamp(tombstones[key]) > at) return
    out[key] = clone(chosen)
  })
  return out
}

export function mergeProgress(base, incoming) {
  const out = mergeWrongAndAttempts(base, incoming)
  const local = base || {}
  const remote = incoming || {}
  const localTombs = local.syncTombstones || {}
  const remoteTombs = remote.syncTombstones || {}
  const sessionTombstones = mergeTombstoneGroup(localTombs.sessions, remoteTombs.sessions)
  const cardTombstones = mergeTombstoneGroup(localTombs.cards, remoteTombs.cards)
  const dailyTombstones = mergeTombstoneGroup(localTombs.daily, remoteTombs.daily)

  const baseSettings = local.settings || {}
  const incomingSettings = remote.settings || {}
  out.settings = stamp(incomingSettings.updatedAt) > stamp(baseSettings.updatedAt)
    ? clone(incomingSettings)
    : clone(baseSettings)

  out.cards = mergeCards(local.cards, remote.cards, cardTombstones)
  out.daily = mergeDaily(local.daily, remote.daily, dailyTombstones)
  out.sessions = mergeSessions(local.sessions, remote.sessions, sessionTombstones)
  out.syncTombstones = { ...(out.syncTombstones || {}), sessions: sessionTombstones, cards: cardTombstones, daily: dailyTombstones }
  return out
}

export function mergeWrongAndAttempts(base, incoming) {
  const local = clone(base)
  const remote = clone(incoming)
  const localTombs = local.syncTombstones || {}
  const remoteTombs = remote.syncTombstones || {}
  const wrongTombstones = mergeTombstoneGroup(localTombs.wrong, remoteTombs.wrong)
  const attemptTombstones = mergeTombstoneGroup(localTombs.attempts, remoteTombs.attempts)

  const out = { ...local }
  out.wrong = {
    ...(local.wrong || {}),
    questions: mergeQuestions(local.wrong && local.wrong.questions, remote.wrong && remote.wrong.questions, wrongTombstones),
  }
  out.attempts = mergeAttemptBuckets(local.attempts, remote.attempts, attemptTombstones)
  out.syncTombstones = {
    ...(local.syncTombstones || {}),
    wrong: wrongTombstones,
    attempts: attemptTombstones,
  }
  return out
}
