const REG_KEY = 'cet4-sprint/profiles/v1'
const MAIN_KEY = 'cet4-sprint/v1'
const PREFIX = 'cet4-sprint/profile/'

function readReg() {
  try {
    const raw = localStorage.getItem(REG_KEY)
    if (raw) {
      const reg = JSON.parse(raw)
      if (reg && Array.isArray(reg.items) && reg.items.length) return reg
    }
  } catch (e) { /* ignore */ }
  return null
}

export function listProfiles() {
  const reg = readReg()
  if (!reg) return []
  return reg.items.map((p) => ({ ...p, active: p.id === reg.active }))
}

export function activeProfile() {
  const reg = readReg()
  if (!reg) return null
  return reg.items.find((p) => p.id === reg.active) || reg.items[0] || null
}

function saveCurrent(reg) {
  const current = localStorage.getItem(MAIN_KEY) || '{}'
  localStorage.setItem(PREFIX + reg.active, current)
}

export function switchProfile(id) {
  const reg = readReg()
  if (!reg || id === reg.active) return false
  const target = reg.items.find((p) => p.id === id)
  if (!target) return false
  saveCurrent(reg)
  const next = localStorage.getItem(PREFIX + target.id) || '{}'
  localStorage.setItem(MAIN_KEY, next)
  reg.active = target.id
  localStorage.setItem(REG_KEY, JSON.stringify(reg))
  window.location.reload()
  return true
}

export function createProfile(name) {
  const reg = readReg()
  if (!reg) return false
  saveCurrent(reg)
  const id = 'p-' + Date.now().toString(36)
  const label = (name || '').trim() || '新档案'
  reg.items.push({ id, name: label.slice(0, 20), createdAt: Date.now() })
  reg.active = id
  localStorage.setItem(PREFIX + id, '{}')
  localStorage.setItem(MAIN_KEY, '{}')
  localStorage.setItem(REG_KEY, JSON.stringify(reg))
  window.location.reload()
  return true
}

export function renameProfile(id, name) {
  const reg = readReg()
  if (!reg) return false
  const item = reg.items.find((p) => p.id === id)
  if (!item) return false
  item.name = (name || '').trim().slice(0, 20) || item.name
  localStorage.setItem(REG_KEY, JSON.stringify(reg))
  return true
}

export function removeProfile(id) {
  const reg = readReg()
  if (!reg || reg.active === id || reg.items.length <= 1) return false
  reg.items = reg.items.filter((p) => p.id !== id)
  localStorage.removeItem(PREFIX + id)
  localStorage.setItem(REG_KEY, JSON.stringify(reg))
  return true
}
