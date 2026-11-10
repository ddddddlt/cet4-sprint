import { activeProfile } from './profiles'

const API = 'https://api.github.com'
const KEY_PREFIX = 'cet4-sprint/cloud/'
const DEFAULT_PATH = 'sync/progress.json'

function key() {
  const p = activeProfile()
  return KEY_PREFIX + (p ? p.id : 'default')
}

export function getCloudConfig() {
  try {
    const cfg = JSON.parse(localStorage.getItem(key()) || '{}') || {}
    return { repo: '', path: DEFAULT_PATH, branch: 'main', token: '', auto: false, ...cfg }
  } catch (e) {
    return { repo: '', path: DEFAULT_PATH, branch: 'main', token: '', auto: false }
  }
}

export function setCloudConfig(patch) {
  const cfg = { ...getCloudConfig(), ...(patch || {}) }
  localStorage.setItem(key(), JSON.stringify(cfg))
  return cfg
}

export function resetCloudConfig() {
  try { localStorage.removeItem(key()) } catch (e) { /* ignore */ }
}

export function hashState(text) {
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0
  return String(h) + ':' + text.length
}

function prepare(cfg) {
  cfg.repo = String(cfg.repo || '')
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '')
  cfg.path = String(cfg.path || DEFAULT_PATH).trim().replace(/^\/+/, '') || DEFAULT_PATH
  cfg.branch = String(cfg.branch || 'main').trim() || 'main'
  cfg.token = String(cfg.token || '').trim()
  if (!/^[^/\s]+\/[^/\s]+$/.test(cfg.repo)) throw new Error('仓库格式应为 owner/repo，例如 ddddddlt/cet4-progress-a')
  if (!cfg.token) throw new Error('请先填写 GitHub Token')
  return cfg
}

async function checkRepo(cfg) {
  const res = await fetch(`${API}/repos/${cfg.repo}`, { headers: headers(cfg) })
  if (res.status === 404) throw new Error(`仓库 ${cfg.repo} 不存在，或当前 Token 无权访问这个私有仓库`)
  if (res.status === 401 || res.status === 403) throw new Error('Token 无效，或没有该仓库的访问权限')
  if (!res.ok) throw new Error('仓库检查失败（HTTP ' + res.status + '）')
  return res.json()
}

async function checkBranch(cfg) {
  const res = await fetch(`${API}/repos/${cfg.repo}/branches/${encodeURIComponent(cfg.branch)}`, { headers: headers(cfg) })
  if (res.status === 404) throw new Error(`仓库 ${cfg.repo} 里没有分支 "${cfg.branch}"，请填写仓库的默认分支`)
  if (res.status === 401 || res.status === 403) throw new Error('Token 没有读取该仓库分支的权限')
  if (!res.ok) throw new Error('分支检查失败（HTTP ' + res.status + '）')
  return res.json()
}

function headers(cfg) {
  return {
    Authorization: 'Bearer ' + cfg.token,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/')
}

function b64encode(text) {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

function b64decode(text) {
  const bin = atob(String(text).replace(/\s/g, ''))
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder('utf-8').decode(bytes)
}

export async function remoteRead(cfg) {
  prepare(cfg)
  const url = `${API}/repos/${cfg.repo}/contents/${encodePath(cfg.path)}?ref=${encodeURIComponent(cfg.branch)}&t=${Date.now()}`
  const res = await fetch(url, { headers: headers(cfg) })
  if (res.status === 404) {
    await checkRepo(cfg)
    await checkBranch(cfg)
    return null
  }
  if (res.status === 401 || res.status === 403) throw new Error('Token 无效，或没有该仓库 Contents 读写权限')
  if (!res.ok) throw new Error('读取失败（HTTP ' + res.status + '）')
  const data = await res.json()
  const payload = JSON.parse(b64decode(data.content))
  const state = payload && payload.state ? payload.state : payload
  return { sha: data.sha, savedAt: payload.savedAt || 0, state }
}

export async function pushCloud(core, cfg, options = {}) {
  prepare(cfg)
  const remote = await remoteRead(cfg)
  const state = JSON.parse(core.exportJSON())
  const payload = {
    v: 1,
    savedAt: Date.now(),
    device: String(navigator.userAgent || '').slice(0, 80),
    state,
  }
  const body = {
    message: 'cet4 progress ' + new Date().toISOString(),
    content: b64encode(JSON.stringify(payload)),
    branch: cfg.branch,
  }
  if (remote && remote.sha) body.sha = remote.sha
  const res = await fetch(`${API}/repos/${cfg.repo}/contents/${encodePath(cfg.path)}`, {
    method: 'PUT',
    headers: { ...headers(cfg), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    if (res.status === 404) {
      try { await checkRepo(cfg); await checkBranch(cfg) } catch (e) { throw e }
      throw new Error('上传失败（HTTP 404）：仓库和分支存在，但 Contents API 不可写。请确认 Token 的 Contents 权限为 Read and write')
    }
    throw new Error('上传失败（HTTP ' + res.status + '）' + (text ? ' ' + text.slice(0, 160) : ''))
  }
  setCloudConfig({ lastPush: payload.savedAt, lastError: '', lastHash: hashState(core.exportJSON()) })
  return payload
}

export async function pullCloud(core, cfg) {
  const remote = await remoteRead(cfg)
  if (!remote || !remote.state) throw new Error('云端还没有进度文件，请先上传一次')
  core.importJSON(JSON.stringify(remote.state))
  setCloudConfig({ lastPull: remote.savedAt || Date.now(), lastError: '' })
  return remote
}

export async function testCloud(cfg) {
  const remote = await remoteRead(cfg)
  return remote ? { exists: true, savedAt: remote.savedAt } : { exists: false }
}

export { DEFAULT_PATH }
