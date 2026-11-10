import { hashState } from './cloud'
import { activeProfile } from './profiles'

const KEY = 'cet4-sprint/supabase/v1'
const PROFILE_META = 'cet4-sprint/supabase/profile/v1/'

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') || {}
  } catch (e) {
    return {}
  }
}

function profileId() {
  const profile = activeProfile()
  return profile ? profile.id : 'default'
}

function readProfileMeta() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_META + profileId()) || '{}') || {}
  } catch (e) {
    return {}
  }
}

function saveProfileMeta(patch) {
  const next = { ...readProfileMeta(), ...(patch || {}) }
  localStorage.setItem(PROFILE_META + profileId(), JSON.stringify(next))
  return next
}

export function syncHashVersionOK(hash) {
  return typeof hash === 'string' && hash.startsWith('v2:')
}

export function getSupabaseConfig() {
  const meta = readProfileMeta()
  return {
    url: '', anonKey: '', auto: false, autoPull: true, session: null,
    lastPush: 0, lastPull: 0, lastHash: '', lastRemoteAt: '', lastError: '',
    ...read(),
    lastPush: meta.lastPush || 0,
    lastPull: meta.lastPull || 0,
    lastHash: meta.lastHash || '',
    lastRemoteAt: meta.lastRemoteAt || '',
  }
}

export function saveSupabaseConfig(patch) {
  const body = { ...(patch || {}) }
  const meta = {}
  ;['lastPush', 'lastPull', 'lastHash', 'lastRemoteAt'].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      meta[key] = body[key]
      delete body[key]
    }
  })
  if (Object.keys(meta).length) saveProfileMeta(meta)
  if (Object.keys(body).length) localStorage.setItem(KEY, JSON.stringify({ ...read(), ...body }))
  return getSupabaseConfig()
}

function stableStringify(value) {
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']'
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + stableStringify(value[key])).join(',') + '}'
  }
  return JSON.stringify(value)
}

export function canonicalHash(value) {
  const obj = typeof value === 'string' ? JSON.parse(value) : value
  return 'v2:' + hashState(stableStringify(obj))
}

function base() {
  const cfg = getSupabaseConfig()
  cfg.url = String(cfg.url || '').trim().replace(/\/+$/, '')
  cfg.anonKey = String(cfg.anonKey || '').trim()
  if (!/^https:\/\/[^/]+\.supabase\.co$/i.test(cfg.url)) throw new Error('请填写 Supabase Project URL，例如 https://xxxx.supabase.co')
  if (!cfg.anonKey) throw new Error('请填写 Supabase anon public key')
  return cfg
}

function saveSession(cfg, data) {
  const session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (Number(data.expires_in) || 3600) * 1000,
    user: data.user || (cfg.session && cfg.session.user) || null,
  }
  return saveSupabaseConfig({ session, lastError: '' })
}

function parseError(data, status) {
  const msg = (data && (data.msg || data.message || data.error_description || data.error)) || ('HTTP ' + status)
  if (status === 401) return new Error('登录已过期，请重新登录 Supabase')
  if (/relation .* does not exist|Could not find the table/i.test(msg)) return new Error('Supabase 里还没有 progress 表，请先执行建表 SQL')
  if (status === 403) return new Error('没有权限：请确认 progress 表已启用 RLS，并且策略允许当前用户读写自己的行')
  return new Error(msg)
}

async function request(url, opts = {}, ms = 18000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal })
    const text = await res.text()
    let data = null
    try { data = text ? JSON.parse(text) : null } catch (e) { data = text }
    if (!res.ok) throw parseError(data, res.status)
    return data
  } catch (e) {
    if (e && e.name === 'AbortError') throw new Error('请求超时，请检查网络')
    throw e
  } finally {
    clearTimeout(timer)
  }
}

function authHeaders(cfg, token) {
  const headers = { apikey: cfg.anonKey, 'Content-Type': 'application/json' }
  if (token) headers.Authorization = 'Bearer ' + token
  return headers
}

export async function signIn(email, password) {
  const cfg = base()
  const data = await request(cfg.url + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: authHeaders(cfg),
    body: JSON.stringify({ email: String(email).trim(), password }),
  })
  saveSession(cfg, data)
  saveSupabaseConfig({ lastPush: 0, lastPull: 0, lastHash: '', lastRemoteAt: '' })
  return data
}

export async function signUp(email, password) {
  const cfg = base()
  const data = await request(cfg.url + '/auth/v1/signup', {
    method: 'POST',
    headers: authHeaders(cfg),
    body: JSON.stringify({ email: String(email).trim(), password }),
  })
  if (data && data.access_token) {
    saveSession(cfg, data)
    saveSupabaseConfig({ lastPush: 0, lastPull: 0, lastHash: '', lastRemoteAt: '' })
    return { needsConfirm: false }
  }
  if (data && data.session && data.session.access_token) {
    saveSession(cfg, data.session)
    saveSupabaseConfig({ lastPush: 0, lastPull: 0, lastHash: '', lastRemoteAt: '' })
    return { needsConfirm: false }
  }
  return { needsConfirm: true }
}

async function refresh(cfg) {
  const s = cfg.session
  if (!s || !s.refresh_token) throw new Error('请先登录 Supabase')
  const data = await request(cfg.url + '/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    headers: authHeaders(cfg),
    body: JSON.stringify({ refresh_token: s.refresh_token }),
  })
  saveSession(cfg, data)
  return getSupabaseConfig().session
}

export async function ensureSession() {
  const cfg = base()
  const s = cfg.session
  if (s && s.access_token && s.expires_at && s.expires_at > Date.now() + 60000) return { cfg, session: s }
  if (s && s.refresh_token) {
    const next = await refresh(cfg)
    return { cfg: getSupabaseConfig(), session: next }
  }
  throw new Error('请先登录 Supabase')
}

export async function signOut() {
  const cfg = getSupabaseConfig()
  try {
    if (cfg.url && cfg.anonKey && cfg.session && cfg.session.access_token) {
      await request(cfg.url.replace(/\/+$/, '') + '/auth/v1/logout', {
        method: 'POST',
        headers: authHeaders(cfg, cfg.session.access_token),
      })
    }
  } catch (e) { /* ignore */ }
  saveSupabaseConfig({ session: null, lastError: '' })
  saveSupabaseConfig({ lastPush: 0, lastPull: 0, lastHash: '', lastRemoteAt: '' })
}

export function currentEmail() {
  const s = getSupabaseConfig().session
  return s && s.user ? s.user.email : null
}

async function rest(method, path, cfg, token, body, extraHeaders = {}) {
  return request(cfg.url + '/rest/v1/' + path, {
    method,
    headers: { ...authHeaders(cfg, token), ...extraHeaders },
    body: body == null ? undefined : JSON.stringify(body),
  })
}

export async function fetchRemoteSupabase() {
  const { cfg, session } = await ensureSession()
  let rows
  try {
    rows = await rest('GET', 'progress?select=data,updated_at,user_id&user_id=eq.' + encodeURIComponent(session.user.id), cfg, session.access_token)
  } catch (e) {
    if (!/登录已过期/.test(e.message)) throw e
    const next = await refresh(cfg)
    rows = await rest('GET', 'progress?select=data,updated_at,user_id&user_id=eq.' + encodeURIComponent(next.user.id), cfg, next.access_token)
  }
  return Array.isArray(rows) && rows.length ? rows[0] : null
}

export async function applyRemoteSupabase(core, row) {
  if (!row || !row.data) throw new Error('云端没有可恢复的进度')
  core.importJSON(JSON.stringify(row.data))
  saveSupabaseConfig({
    lastPull: Date.now(),
    lastHash: canonicalHash(row.data),
    lastRemoteAt: row.updated_at || new Date().toISOString(),
    lastError: '',
  })
  return row
}

export async function testSupabase() {
  const { cfg, session } = await ensureSession()
  await rest('GET', 'progress?select=user_id&limit=1', cfg, session.access_token)
  return { email: session.user && session.user.email, userId: session.user && session.user.id }
}

function dataCounts(state) {
  const attempts = state && state.attempts ? state.attempts : {}
  return {
    wrong: Object.keys((state && state.wrong && state.wrong.questions) || {}).length,
    attempts: Object.values(attempts).reduce((n, bucket) => n + Object.keys(bucket || {}).length, 0),
  }
}

export async function pushSupabase(core) {
  const { cfg, session } = await ensureSession()
  const state = JSON.parse(core.exportJSON())
  const local = dataCounts(state)
  const updatedAt = new Date().toISOString()
  try {
    await rest('POST', 'progress?on_conflict=user_id', cfg, session.access_token, {
      user_id: session.user.id,
      data: state,
      updated_at: updatedAt,
    }, { Prefer: 'resolution=merge-duplicates,return=representation' })
  } catch (e) {
    if (!/登录已过期/.test(e.message)) throw e
    const next = await refresh(cfg)
    await rest('POST', 'progress?on_conflict=user_id', cfg, next.access_token, {
      user_id: next.user.id,
      data: state,
      updated_at: updatedAt,
    }, { Prefer: 'resolution=merge-duplicates,return=representation' })
  }
  const remote = await fetchRemoteSupabase()
  if (remote && remote.user_id && remote.user_id !== session.user.id) {
    const message = '上传后校验失败：云端返回的用户不是当前登录账号'
    saveSupabaseConfig({ lastError: message })
    throw new Error(message)
  }
  const cloud = dataCounts(remote && remote.data)
  if (!remote || cloud.wrong !== local.wrong || cloud.attempts !== local.attempts) {
    const message = '上传后校验失败：云端错题 ' + cloud.wrong + ' / 练习 ' + cloud.attempts + '，本机错题 ' + local.wrong + ' / 练习 ' + local.attempts
    saveSupabaseConfig({ lastError: message })
    throw new Error(message)
  }
  const finalHash = canonicalHash(core.exportJSON())
  saveSupabaseConfig({ lastPush: Date.now(), lastHash: finalHash, lastRemoteAt: updatedAt, lastError: '' })
  return { updatedAt }
}

export async function pullSupabase(core) {
  const row = await fetchRemoteSupabase()
  if (!row) throw new Error('云端还没有这个账号的进度，请先上传一次')
  return applyRemoteSupabase(core, row)
}
