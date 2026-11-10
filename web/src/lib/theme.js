function resolve(mode) {
  if (mode === 'dark') return true
  if (mode === 'light') return false
  return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
}

export function currentMode() {
  const core = window.App?.core
  return (core && core.getState().settings.theme) || 'auto'
}

export function applyTheme(mode) {
  const dark = resolve(mode || currentMode())
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', dark ? '#10161f' : '#f7f4ec')
  return dark
}

export function setTheme(mode) {
  const core = window.App?.core
  if (core) {
    core.getState().settings.theme = mode
    core.save()
  }
  applyTheme(mode)
  window.dispatchEvent(new Event('themechange'))
}
