import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Vocab from './pages/Vocab'
import Wordbook from './pages/Wordbook'
import DrillRunner from './pages/DrillRunner'
import { ReadingList, ReadingRunner, ClozeRunner, MatchingRunner } from './pages/Reading'
import { ListeningList, ListeningRunner } from './pages/Listening'
import { TranslationList, TranslationRunner, WritingList, WritingRunner } from './pages/Productive'
import { Mistakes, MistakeType, Settings as SettingsPage } from './pages/Misc'
import { ExamList, ExamRunner } from './pages/Exam'
import AuroraBackground from './components/AuroraBackground'
import { Magnetic, Tilt } from './components/motion'
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  BookMarked,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Clock,
  FileText,
  Flame,
  Headphones,
  Home,
  Languages,
  Layers,
  PenLine,
  Search,
  Settings,
  Sparkles,
  Target,
  X,
} from 'lucide-react'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Progress } from './components/ui/progress'
import { cn } from './lib/utils'
import { getCloudConfig, hashState, pushCloud, setCloudConfig } from './lib/cloud'
import { getSupabaseConfig, pushSupabase, saveSupabaseConfig, fetchRemoteSupabase, applyRemoteSupabase, canonicalHash } from './lib/supabase'
import { loadPapers } from './lib/papers'

const NAV = [
  { key: 'home', label: '首页', icon: Home, href: '#/' },
  { key: 'practice', label: '题目练习', icon: Layers, href: '#/practice' },
  { key: 'exam', label: '整套模考', icon: FileText, href: '#/exam' },
  { key: 'drill', label: '词汇深练', icon: Sparkles, href: '#/drill' },
  { key: 'wordbook', label: '单词本', icon: Bookmark, href: '#/wordbook' },
  { key: 'mistakes', label: '错题本', icon: AlertTriangle, href: '#/mistakes' },
]

const BOTTOM = [
  { key: 'home', label: '首页', icon: Home, href: '#/' },
  { key: 'practice', label: '练习', icon: Layers, href: '#/practice' },
  { key: 'drill', label: '深练', icon: Sparkles, href: '#/drill' },
  { key: 'wordbook', label: '单词本', icon: Bookmark, href: '#/wordbook' },
  { key: 'mistakes', label: '错题本', icon: AlertTriangle, href: '#/mistakes' },
  { key: 'settings', label: '设置', icon: Settings, href: '#/settings' },
]

const MORE = [
  { key: 'wordbook', label: '单词本', icon: Bookmark, href: '#/wordbook' },
  { key: 'mistakes', label: '错题本', icon: AlertTriangle, href: '#/mistakes' },
  { key: 'settings', label: '设置', icon: Settings, href: '#/settings' },
]

const PRACTICE = [
  { key: 'reading', name: '阅读', desc: '仔细阅读 / 选词填空 / 长篇匹配', icon: BookOpen, href: '#/reading', kind: 'reading' },
  { key: 'listening', name: '听力', desc: '短篇新闻 / 长对话 / 听力篇章', icon: Headphones, href: '#/listening', kind: 'listening' },
  { key: 'translation', name: '翻译', desc: '段落翻译', icon: Languages, href: '#/translation', kind: 'translation' },
  { key: 'writing', name: '写作', desc: '命题作文', icon: PenLine, href: '#/writing', kind: 'writing' },
]

const MODES = [
  { key: 'spelling', name: '拼写', desc: '看中文释义，拼出单词', icon: PenLine },
  { key: 'dictation', name: '听写', desc: '听发音，写出单词', icon: Headphones },
  { key: 'sense', name: '词义辨析', desc: '四选一，选出正确释义', icon: Target },
  { key: 'collocation', name: '搭配', desc: '补全常用搭配', icon: Layers },
  { key: 'root', name: '词根词缀', desc: '辨认同族词', icon: Sparkles },
]

function useHashRoute() {
  const [route, setRoute] = useState(() => window.location.hash || '#/')
  useEffect(() => {
    const onChange = () => setRoute(window.location.hash || '#/')
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

function useCore() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (window.App && window.App.core) {
      window.App.core.load()
      setReady(true)
    }
  }, [])
  return ready
}

function Brand({ compact = false }) {
  return (
    <a href="#/" className="flex items-center gap-2.5" aria-label="四级冲刺首页">
      <img src="./cet-logo-cropped.png" alt="CET" className="h-8 w-auto max-w-[72px] object-contain" />
      {!compact ? <span className="truncate text-sm font-medium text-foreground">四级冲刺</span> : null}
    </a>
  )
}

function SearchPalette({ open, onClose }) {
  const [query, setQuery] = useState('')
  const overlayRef = useRef(null)
  const panelRef = useRef(null)
  const inputRef = useRef(null)
  const lastTriggerRef = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const rows = useMemo(() => {
    const all = [
      ...NAV.map((x) => ({ ...x, group: '导航' })),
      { key: 'vocab', label: '抽查单词', icon: BookMarked, href: '#/vocab', group: '导航' },
      ...PRACTICE.map((x) => ({ key: x.key, label: x.name + '练习', icon: x.icon, href: x.href, group: '练习' })),
      ...MODES.map((x) => ({ key: x.key, label: x.name + '训练', icon: x.icon, href: '#/drill/' + x.key, group: '深练' })),
      ...MORE.map((x) => ({ ...x, label: x.label, group: '更多' })),
    ]
    const seen = new Set()
    const uniq = all.filter((x) => (seen.has(x.key + x.href) ? false : (seen.add(x.key + x.href), true)))
    const q = query.trim().toLowerCase()
    return q ? uniq.filter((x) => (x.label + ' ' + x.group + ' ' + (x.desc || '')).toLowerCase().includes(q)) : uniq.slice(0, 9)
  }, [query])

  useLayoutEffect(() => {
    if (!open) return undefined
    const overlay = overlayRef.current
    const panel = panelRef.current
    const triggers = Array.from(document.querySelectorAll('[data-search-trigger]'))
    const trigger = triggers.find((el) => el.getClientRects().length > 0) || triggers[0]
    lastTriggerRef.current = trigger || null
    setQuery('')
    if (overlay && panel) {
      const r = overlay.getBoundingClientRect()
      const pr = panel.getBoundingClientRect()
      const left = r.left + panel.offsetLeft
      const top = r.top + panel.offsetTop
      const sx = trigger ? trigger.getBoundingClientRect().left + trigger.getBoundingClientRect().width / 2 - left : panel.offsetWidth / 2
      const sy = trigger ? trigger.getBoundingClientRect().top + trigger.getBoundingClientRect().height / 2 - top : 0
      panel.style.setProperty('--sx', sx + 'px')
      panel.style.setProperty('--sy', sy + 'px')
      void pr
    }
    return undefined
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const trigger = lastTriggerRef.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 40)
    const onKey = (e) => { if (e.key === 'Escape') closeRef.current() }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(focusTimer)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
      if (trigger) trigger.focus()
    }
  }, [open])

  return (
    <div ref={overlayRef} className="search-overlay" data-open={open} aria-hidden={!open} inert={!open ? '' : undefined} onMouseDown={onClose}>
      <div className="search-scrim" aria-hidden="true" />
      <div ref={panelRef} className="search-panel glass-card overflow-hidden" role="dialog" aria-modal="true" aria-label="站内搜索" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-white/10 px-4">
          <Search className="h-4 w-4 text-[var(--faint)]" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索练习、词汇、页面…"
            className="h-14 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-[var(--faint)]"
            aria-label="搜索"
          />
          <button type="button" onClick={onClose} className="rail-icon h-8 w-8" aria-label="关闭搜索"><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[52vh] overflow-y-auto p-2">
          {rows.length ? rows.map((row) => (
            <a key={row.group + row.key + row.href} href={row.href} onClick={onClose} className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-white/[.06] hover:text-foreground">
              <row.icon className="h-4 w-4" aria-hidden="true" />
              <span className="flex-1">{row.label}</span>
              <span className="text-[11px] text-[var(--faint)]">{row.group}</span>
            </a>
          )) : <div className="px-3 py-8 text-center text-sm text-[var(--faint)]">没有匹配项</div>}
        </div>
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-[11px] text-[var(--faint)]">
          <span>Esc 关闭</span>
          <span className="font-mono-ui">/ 或 Ctrl K</span>
        </div>
      </div>
    </div>
  )
}

function Shell({ route, children, pageAnim = 'page-lateral' }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const navRef = useRef(null)
  const sideIndicatorRef = useRef(null)
  const sideItemsRef = useRef(new Map())
  const sideReadyRef = useRef(false)
  const core = window.App?.core
  const days = core ? core.examInfo().days : null

  useEffect(() => {
    const coreRef = window.App?.core
    if (!coreRef) return
    let busy = false
    async function tick() {
      const cfg = getCloudConfig()
      if (!cfg.auto || !cfg.token || !cfg.repo || busy) return
      const raw = coreRef.exportJSON()
      if (cfg.lastHash === hashState(raw)) return
      busy = true
      try { await pushCloud(coreRef, cfg) } catch (err) { setCloudConfig({ lastError: err.message }) } finally { busy = false }
    }
    const timer = setInterval(tick, 15000)
    const onHide = () => { if (document.visibilityState === 'hidden') tick() }
    document.addEventListener('visibilitychange', onHide)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onHide) }
  }, [])

  useEffect(() => {
    const core = window.App?.core
    if (!core) return undefined
    let busy = false
    async function tick() {
      const cfg = getSupabaseConfig()
      if (!cfg.session || !cfg.url || !cfg.anonKey || busy) return
      if (!cfg.lastHash) return
      if (document.visibilityState === 'hidden') return
      const tag = (document.activeElement && document.activeElement.tagName) || ''
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const route = window.location.hash.split('?')[0]
      if (route.startsWith('#/exam') || route.startsWith('#/settings')) return
      busy = true
      try {
        const localHash = canonicalHash(core.exportJSON())
        const remote = await fetchRemoteSupabase()
        const remoteHash = remote ? canonicalHash(remote.data) : ''
        if (cfg.lastHash && !String(cfg.lastHash).startsWith('v2:')) {
          if (remoteHash && remoteHash === localHash) {
            saveSupabaseConfig({ lastHash: localHash, lastError: '' })
            return
          }
          saveSupabaseConfig({ lastHash: '', lastError: '同步算法已更新，请手动上传或从云端恢复一次' })
          return
        }
        const localDirty = localHash !== cfg.lastHash
        const remoteChanged = !!remote && String(remote.updated_at || '') !== String(cfg.lastRemoteAt || '')
        if (localDirty && remoteChanged) {
          saveSupabaseConfig({ lastError: '本机和云端都有新改动，未自动覆盖。请手动选择上传或从云端恢复。' })
          return
        }
        if (localDirty) {
          if (!cfg.auto) return
          await pushSupabase(core)
          return
        }
        if (remoteChanged && cfg.autoPull) {
          await applyRemoteSupabase(core, remote)
          window.location.reload()
        }
      } catch (err) {
        saveSupabaseConfig({ lastError: err.message })
      } finally {
        busy = false
      }
    }
    const timer = setInterval(tick, 15000)
    const first = setTimeout(tick, 2500)
    return () => { clearInterval(timer); clearTimeout(first) }
  }, [])

  useEffect(() => {
    try {
      document.documentElement.classList.toggle('reduce-motion', localStorage.getItem('cet4-sprint/motion') === 'reduce')
    } catch (e) { /* ignore */ }
  }, [])

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return undefined
    const onResize = () => {
      const open = window.innerHeight - vv.height > 120
      document.body.classList.toggle('keyboard-open', open)
    }
    vv.addEventListener('resize', onResize, { passive: true })
    return () => vv.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    function onKey(e) {
      const tag = (e.target && e.target.tagName) || ''
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function measureSide(animate = true) {
    const nav = navRef.current
    const indicator = sideIndicatorRef.current
    if (!nav || !indicator) return
    const item = NAV.find((x) => x.key === tabKey)
    const el = item ? sideItemsRef.current.get(item.key) : null
    if (!el || tabKey === 'settings') {
      indicator.dataset.visible = 'false'
      indicator.dataset.sweep = 'false'
      if (!sideReadyRef.current) {
        sideReadyRef.current = true
        requestAnimationFrame(() => { indicator.dataset.ready = 'true' })
      }
      return
    }
    const first = !sideReadyRef.current
    if (first) indicator.dataset.ready = 'false'
    indicator.style.height = el.offsetHeight + 'px'
    indicator.style.transform = `translateY(${el.offsetTop}px)`
    indicator.dataset.visible = 'true'
    if (first) {
      sideReadyRef.current = true
      requestAnimationFrame(() => { indicator.dataset.ready = 'true' })
      return
    }
    if (animate) {
      indicator.dataset.sweep = 'false'
      void indicator.offsetWidth
      requestAnimationFrame(() => {
        if (indicator.dataset.visible === 'true') indicator.dataset.sweep = 'true'
      })
    } else {
      indicator.dataset.sweep = 'false'
    }
  }

  const tabKey = route.startsWith('#/exam') ? 'exam'
    : route.startsWith('#/practice') || route.startsWith('#/reading') || route.startsWith('#/cloze') || route.startsWith('#/matching') || route.startsWith('#/listening') || route.startsWith('#/translation') || route.startsWith('#/writing')
    ? 'practice'
    : route.startsWith('#/mistakes') ? 'mistakes'
      : route.startsWith('#/settings') ? 'settings'
        : route.startsWith('#/drill') ? 'drill'
          : route.startsWith('#/vocab') ? 'vocab'
            : route.startsWith('#/wordbook') ? 'wordbook'
              : 'home'
  useLayoutEffect(() => {
    measureSide()
  }, [tabKey])

  useEffect(() => {
    const onResize = () => measureSide(false)
    window.addEventListener('resize', onResize, { passive: true })
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => measureSide(false))
    return () => window.removeEventListener('resize', onResize)
  }, [tabKey])

  const tabIndex = BOTTOM.findIndex((x) => x.key === tabKey)
  const title = route.startsWith('#/exam') ? '整套模考' : route.startsWith('#/reading') || route.startsWith('#/cloze') || route.startsWith('#/matching') ? '阅读理解'
    : route.startsWith('#/listening') ? '听力'
      : route.startsWith('#/translation') ? '翻译'
        : route.startsWith('#/writing') ? '写作'
          : route.startsWith('#/practice') ? '题目练习'
            : route.startsWith('#/drill') ? '词汇深练'
              : route.startsWith('#/vocab') ? '抽查单词'
                : route.startsWith('#/wordbook') ? '单词本'
                  : route.startsWith('#/mistakes') ? '错题本'
                    : route.startsWith('#/settings') ? '设置'
                      : '首页'

  return (
    <div className="app-root">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[208px] flex-col border-r border-white/5 bg-[rgba(5,6,10,.42)] px-3 py-5 backdrop-blur-xl lg:flex">
        <div className="px-2"><Brand /></div>
        <div className="mb-2 mt-8 px-3 t-eyebrow">学习</div>
        <nav ref={navRef} className="relative flex w-full flex-col gap-1">
          <span ref={sideIndicatorRef} className="side-indicator" data-visible="false" data-ready="false" data-sweep="false" aria-hidden="true" />
          {NAV.map((item) => (
            <a key={item.key} href={item.href} aria-current={tabKey === item.key ? 'page' : undefined} data-active={tabKey === item.key}
              ref={(el) => { if (el) sideItemsRef.current.set(item.key, el); else sideItemsRef.current.delete(item.key) }}
              className="side-item flex min-h-11 items-center rounded-xl px-3 text-sm text-muted-foreground hover:text-foreground">
              <span className="side-content">
                <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} aria-hidden="true" />
                <span>{item.label}</span>
              </span>
            </a>
          ))}
        </nav>
        <div className="mt-auto w-full border-t border-white/5 pt-3">
          <a href="#/settings" aria-current={tabKey === 'settings' ? 'page' : undefined}
            className={cn('side-item flex min-h-11 items-center rounded-xl border border-transparent px-3 text-sm text-muted-foreground hover:text-foreground',
              tabKey === 'settings' && 'border-white/10 bg-white/[.07] text-foreground')}>
            <span className="side-content">
              <Settings className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} aria-hidden="true" />
              <span>设置</span>
            </span>
          </a>
        </div>
      </aside>

      <div className="lg:pl-[208px]">
        <header className="glass-nav sticky top-0 z-30 flex h-16 items-center gap-3 border-x-0 border-t-0 px-4 md:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="lg:hidden"><Brand compact /></div>
            <div className="hidden items-center gap-2 text-sm text-muted-foreground lg:flex">
              <span>四级冲刺</span>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span key={title} className="breadcrumb-title text-foreground">{title}</span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {days != null ? (
              <span className="chip text-warning">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="t-num">{Math.max(0, days)}</span> 天
              </span>
            ) : null}
            <button type="button" className="hidden h-9 w-[210px] items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 text-left text-xs text-[var(--faint)] hover:border-white/20 hover:bg-white/[.06] md:flex" data-search-trigger onClick={() => setSearchOpen((v) => !v)}>
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              搜索
            </button>
            <button type="button" className="rail-icon h-10 w-10 md:hidden" data-search-trigger onClick={() => setSearchOpen((v) => !v)} aria-label="搜索"><Search className="h-[18px] w-[18px]" strokeWidth={1.5} /></button>
            <a href="#/settings" className="rail-icon h-10 w-10" aria-label="设置"><Settings className="h-[18px] w-[18px]" strokeWidth={1.5} /></a>
          </div>
        </header>

        <main key={route} className={cn(`${pageAnim} mx-auto w-full max-w-[720px] px-4 pb-[calc(108px+env(safe-area-inset-bottom))] pt-6 md:max-w-[800px] md:px-6 lg:max-w-[928px] lg:px-8 lg:pb-12 xl:max-w-[1228px]`)}>
          {children}
        </main>
      </div>

      <nav data-tabbar className="glass-tab fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-40 mx-auto max-w-[520px] md:max-w-[620px] lg:hidden" aria-label="主导航">
        <div className="relative flex items-stretch p-1">
          {tabIndex >= 0 ? <span className="tab-liquid" style={{ transform: `translateX(${tabIndex * 100}%)`, width: `calc((100% - 8px) / ${BOTTOM.length})` }} aria-hidden="true" /> : null}
          {BOTTOM.map((item) => (
            <a key={item.key} href={item.href} className="tab-item" data-active={tabKey === item.key} aria-current={tabKey === item.key ? 'page' : undefined}>
              <item.icon className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden="true" />
              <span>{item.label}</span>
            </a>
          ))}
        </div>
      </nav>

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}

function PageHead({ eyebrow, title, description, action }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? <div className="t-eyebrow mb-2">{eyebrow}</div> : null}
        <h1 className="t-display">{title}</h1>
        {description ? <p className="t-meta mt-2 max-w-[560px]">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

function CountUp({ value }) {
  const safe = Math.max(0, Number(value) || 0)
  const [n, setN] = useState(0)
  useEffect(() => {
    const reduce = document.documentElement.classList.contains('reduce-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setN(safe); return undefined }
    let raf = 0
    const start = performance.now()
    function tick(now) {
      const p = Math.min(1, (now - start) / 400)
      const eased = 1 - Math.pow(1 - p, 3)
      setN(Math.max(0, Math.round(safe * eased)))
      if (p < 1) raf = requestAnimationFrame(tick)
      else setN(safe)
    }
    raf = requestAnimationFrame(tick)
    const settle = setTimeout(() => setN(safe), 460)
    return () => { cancelAnimationFrame(raf); clearTimeout(settle) }
  }, [safe])
  return <span className="t-num">{n}</span>
}

function Ring({ value }) {
  const pct = Math.max(0, Math.min(1, value))
  return (
    <div className="relative h-[92px] w-[92px] rounded-full" style={{ background: `conic-gradient(var(--accent) ${pct * 360}deg, rgba(255,255,255,.08) 0)` }}>
      <div className="absolute inset-[7px] flex flex-col items-center justify-center rounded-full bg-[var(--surface)]">
        <span className="t-num text-xl leading-none">{Math.round(pct * 100)}<span className="text-[11px]">%</span></span>
      </div>
    </div>
  )
}

function Heatmap({ heat }) {
  const max = Math.max(1, ...heat.cells.map((c) => c.count))
  return (
    <div>
      <div className="heat-wrap" role="img" aria-label={`近 ${heat.weeks} 周学习热力图`}>
        {heat.cells.map((c) => {
          const level = c.count <= 0 ? 0 : Math.max(1, Math.ceil((c.count / max) * 4))
          return <span key={c.key} className="heat-cell" data-level={level} data-future={c.future} title={`${c.key} · ${c.count} 次`} />
        })}
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--faint)]">
        <span>近 {heat.weeks} 周</span>
        <span className="flex items-center gap-1.5">少 <i className="h-[7px] w-[7px] rounded-sm bg-white/[.06]" /> <i className="h-[7px] w-[7px] rounded-sm bg-[rgba(95,211,160,.38)]" /> <i className="h-[7px] w-[7px] rounded-sm bg-[rgba(95,211,160,.92)]" /> 多</span>
      </div>
    </div>
  )
}

function recentRows(core) {
  const st = core.getState()
  const catalogs = [
    { kind: 'reading', route: 'reading', label: '阅读', items: window.CET4_READING || [] },
    { kind: 'reading', route: 'cloze', label: '选词', items: window.CET4_CLOZE || [] },
    { kind: 'reading', route: 'matching', label: '匹配', items: window.CET4_MATCHING || [] },
    { kind: 'listening', route: 'listening', label: '听力', items: window.CET4_LISTENING || [] },
    { kind: 'translation', route: 'translation', label: '翻译', items: window.CET4_TRANSLATION || [] },
    { kind: 'writing', route: 'writing', label: '写作', items: window.CET4_WRITING || [] },
  ]
  const rows = []
  Object.keys(st.attempts || {}).forEach((kind) => {
    const bucket = st.attempts[kind] || {}
    Object.keys(bucket).forEach((id) => {
      const a = bucket[id]
      if (!a || !a.at) return
      const catalog = catalogs.find((c) => c.kind === kind && c.items.some((x) => x.id === id))
      const item = catalog && catalog.items.find((x) => x.id === id)
      rows.push({
        key: kind + ':' + id,
        kind,
        id,
        at: a.at,
        best: a.best || a.score || 0,
        total: a.total || 0,
        words: a.words || 0,
        label: catalog ? catalog.label : '练习',
        route: catalog ? catalog.route : kind,
        title: item ? (item.title || item.topic || id) : id,
        href: '#/' + (catalog ? catalog.route : kind) + '/' + id,
      })
    })
  })
  return rows.sort((a, b) => b.at - a.at).slice(0, 3)
}

function Dashboard() {
  useCore()
  const core = window.App?.core
  const exam = core ? core.examInfo() : {}
  const rec = core ? core.todayRecord() : {}
  const target = core ? core.checkTarget() : 50
  const done = rec.checkDone || 0
  const days = exam.days == null ? '—' : Math.max(0, exam.days)
  const due = core ? core.dueList().length : 0
  const mastered = core ? core.masteredCount() : 0
  const wordbook = core ? core.wordbookCount() : 0
  const streak = core ? core.streak() : 0
  const week = core ? core.weekMinutes() : 0
  const dailyMinutes = core ? Math.max(5, Math.min(240, Number(core.getState().settings.dailyMinutes) || 30)) : 30
  const weekGoal = dailyMinutes * 7
  const totalWords = core ? core.allWords().length : 0
  const left = Math.max(0, target - done)
  const minutes = Math.max(3, Math.round(left * 0.35))
  const pct = target ? Math.min(100, Math.round((done / target) * 100)) : 0
  const heat = core ? core.heat(24) : { cells: [], weeks: 24 }
  const recent = core ? recentRows(core) : []
  const mistakes = core ? core.wrongQuestions().length : 0
  const hour = new Date().getHours()
  const greeting = hour < 6 ? '夜深了' : hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好'
  const nickname = core ? String(core.getState().settings.name || '').trim() : ''
  const dateLabel = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })
  const dayNo = Math.max(1, (exam.elapsed || 0) + 1)
  const remaining = Math.max(0, totalWords - mastered - due)

  const tiles = [
    ...MODES.map((m) => ({ ...m, href: '#/drill/' + m.key, meta: '' })),
    { key: 'wordbook', name: '单词本', desc: '收藏词复习', icon: Bookmark, href: '#/wordbook', meta: wordbook + ' 词' },
  ]

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,840px)_300px] xl:items-start">
      <div className="min-w-0 space-y-6">
        <header>
          <div className="t-eyebrow mb-2">{dateLabel} · DAY {dayNo}</div>
          <h1 className="t-greeting">{greeting}，{nickname ? `${nickname}，今天` : '今天'}还有 <span className="t-num text-[var(--accent)]">{left}</span> 个词</h1>
          <p className="t-meta mt-2">距离考试 {days} 天 · 按今天的节奏走，过线并不难。</p>
        </header>

        <section className="grid gap-4 md:grid-cols-[2.45fr_1fr]">
          <Card className="relative overflow-hidden p-0">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(111,92,255,.24),transparent_68%)]" />
            <CardContent className="relative p-6 md:p-8">
              <div className="t-eyebrow">TODAY · CHECK</div>
              <div className="mt-4 flex items-end gap-3">
                <span className="text-[42px] leading-[.95]"><CountUp value={due > 0 ? due : left} /></span>
                <span className="pb-1 text-sm text-muted-foreground">{due > 0 ? '个待复习' : '个待完成'}</span>
              </div>
              <p className="mt-2 text-xs text-[var(--faint)]">预计 {minutes} 分钟 · 今日已完成 {done} / {target}</p>
              <Progress value={pct} className="mt-6" />
              <div className="mt-6">
                <Magnetic>
                  <Button variant="primary" asChild>
                    <a href="#/vocab">开始抽查 <ArrowUpRight className="h-4 w-4" /></a>
                  </Button>
                </Magnetic>
              </div>
            </CardContent>
          </Card>

          <Card className="p-0">
            <CardContent className="flex h-full flex-col items-center justify-between gap-3 p-5 text-center">
              <div className="t-eyebrow">THIS WEEK</div>
              <Ring value={weekGoal ? week / weekGoal : 0} />
              <div>
                <div className="t-card">本周目标</div>
                <div className="mt-1 text-xs text-[var(--faint)]">{week} / {weekGoal} 分钟</div>
                <div className="mt-0.5 text-[10px] text-[var(--faint)]">每天 {dailyMinutes} 分钟 × 7</div>
              </div>
              <div className="flex items-center gap-1.5 border-t border-white/10 pt-3 text-xs text-[var(--muted)]">
                <Flame className="h-3.5 w-3.5 text-warning" aria-hidden="true" /> 连续 <span className="t-num text-foreground">{streak}</span> 天
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="xl:hidden">
          <Card className="p-0">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="t-section">复习热力图</h2>
                <span className="t-meta">近 24 周</span>
              </div>
              <Heatmap heat={heat} />
            </CardContent>
          </Card>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="t-section">深练入口</h2>
              <p className="t-meta mt-1">五种模式 + 两个复习入口</p>
            </div>
            <a href="#/drill" className="text-xs text-primary hover:underline">全部</a>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {tiles.map((tile) => (
              <Tilt key={tile.key}>
                <a href={tile.href} className="glass-card group flex h-full min-h-[124px] flex-col justify-between p-5 transition-colors hover:border-white/20">
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[.06] text-primary">
                      <tile.icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                    </span>
                    {tile.meta ? <span className="text-[11px] text-[var(--faint)]">{tile.meta}</span> : null}
                  </div>
                  <div>
                    <div className="t-card">{tile.name}</div>
                    <p className="mt-1 text-xs text-[var(--faint)]">{tile.desc}</p>
                  </div>
                </a>
              </Tilt>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card className="p-0">
            <CardContent className="p-6">
              <div className="flex items-end justify-between">
                <div>
                  <div className="t-eyebrow">VOCABULARY</div>
                  <h2 className="t-section mt-2">词库进度</h2>
                </div>
                <span className="t-num text-lg">{mastered}<span className="text-xs text-[var(--faint)]"> / {totalWords}</span></span>
              </div>
              <Progress value={totalWords ? (mastered / totalWords) * 100 : 0} className="mt-5" />
              <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] text-[var(--faint)]">
                <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-white/[.08]" />未开始 {remaining}</span>
                <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-[rgba(95,211,160,.38)]" />待复习 {due}</span>
                <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-[rgba(95,211,160,.92)]" />已掌握 {mastered}</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <a href="#/wordbook" className="glass-card flex min-h-[124px] flex-col justify-between p-5 hover:border-white/20">
              <Bookmark className="h-4 w-4 text-primary" strokeWidth={1.5} aria-hidden="true" />
              <div><div className="t-num text-2xl">{wordbook}</div><div className="mt-1 text-xs text-[var(--faint)]">单词本</div></div>
            </a>
            <a href="#/mistakes" className="glass-card flex min-h-[124px] flex-col justify-between p-5 hover:border-white/20">
              <AlertTriangle className="h-4 w-4 text-warning" strokeWidth={1.5} aria-hidden="true" />
              <div><div className="t-num text-2xl">{mistakes}</div><div className="mt-1 text-xs text-[var(--faint)]">错题本</div></div>
            </a>
          </div>
        </section>

        <section className="xl:hidden">
          <Recent rows={recent} />
        </section>
      </div>

      <aside className="hidden space-y-4 xl:sticky xl:top-24 xl:block">
        <Card className="p-0">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="t-section">复习热力图</h2>
              <span className="text-[11px] text-[var(--faint)]">24 周</span>
            </div>
            <Heatmap heat={heat} />
          </CardContent>
        </Card>
        <Card className="p-0">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex-1">
              <div className="t-eyebrow">WEEK</div>
              <div className="mt-2 t-card">本周 {week} 分钟</div>
              <div className="mt-1 text-xs text-[var(--faint)]">目标 {weekGoal} 分钟 · 每天 {dailyMinutes} 分钟</div>
            </div>
            <Ring value={weekGoal ? week / weekGoal : 0} />
          </CardContent>
        </Card>
        <Recent rows={recent} />
      </aside>
    </div>
  )
}

function Recent({ rows }) {
  return (
    <Card className="p-0">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="t-section">最近练习</h2>
          <a href="#/practice" className="text-[11px] text-primary hover:underline">全部</a>
        </div>
        {rows.length ? (
          <div className="space-y-1">
            {rows.map((r) => (
              <a key={r.key} href={r.href} className="flex min-h-10 items-center gap-3 rounded-lg px-2 text-xs text-muted-foreground hover:bg-white/[.05] hover:text-foreground">
                <span className="w-8 shrink-0 text-[var(--faint)]">{r.label}</span>
                <span className="min-w-0 flex-1 truncate">{r.title}</span>
                <span className="t-num text-[11px]">{r.total ? Math.round((r.best / r.total) * 100) + '%' : r.words + ' 词'}</span>
                <ChevronRight className="h-3.5 w-3.5 opacity-40" aria-hidden="true" />
              </a>
            ))}
          </div>
        ) : <p className="py-4 text-xs text-[var(--faint)]">还没有练习记录，从上方开始。</p>}
      </CardContent>
    </Card>
  )
}

function Practice() {
  const ready = useCore()
  const core = window.App?.core
  const data = useMemo(() => {
    const readingSets = [...(window.CET4_READING || []), ...(window.CET4_CLOZE || []), ...(window.CET4_MATCHING || [])]
    const sets = {
      reading: readingSets,
      listening: window.CET4_LISTENING || [],
      translation: window.CET4_TRANSLATION || [],
      writing: window.CET4_WRITING || [],
    }
    return PRACTICE.map((item) => {
      const list = sets[item.kind]
      const done = list.filter((x) => core && core.attempt(item.kind, x.id)).length
      return { ...item, total: list.length, done }
    })
  }, [ready])

  return (
    <>
      <PageHead eyebrow="PRACTICE" title="题目练习" description="按题型进入，练习记录自动保存。" action={<Badge variant="outline">4 个题型</Badge>} />
      <a href="#/exam" className="glass-card mb-4 flex flex-wrap items-center gap-4 p-5 transition-colors hover:border-white/20">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[.06] text-primary"><FileText className="h-5 w-5" strokeWidth={1.5} /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-xl">整套模考</span>
          <span className="mt-1 block text-xs text-[var(--faint)]">写作 + 阅读 + 选词 + 匹配 + 翻译 · 125 分钟 · 9 套</span>
        </span>
        <span className="text-xs text-primary">进入模考 <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></span>
      </a>
      <div className="grid gap-4 md:grid-cols-2">
        {data.map((item) => (
          <Card key={item.key} className="group flex flex-col p-0 transition-colors hover:border-white/20">
            <CardHeader className="p-6 pb-3">
              <div className="flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[.06] text-primary"><item.icon className="h-5 w-5" strokeWidth={1.5} /></span>
                <Badge variant={item.done ? 'default' : 'muted'}>{item.done ? `已做 ${item.done}` : '未做'}</Badge>
              </div>
              <CardTitle className="pt-4 text-xl">{item.name}</CardTitle>
              <CardDescription>{item.desc}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto p-6 pt-2">
              <div className="mb-4 flex items-center justify-between text-xs text-[var(--faint)]">
                <span>{item.total} {item.kind === 'writing' ? '题' : '套'}</span>
                <span>{item.done ? `已完成 ${Math.round((item.done / Math.max(1, item.total)) * 100)}%` : '从第一套开始'}</span>
              </div>
              <Progress value={item.total ? (item.done / item.total) * 100 : 0} />
              <Button variant="outline" className="mt-5 w-full justify-between" asChild>
                <a href={item.href}>打开{item.name}练习 <ArrowUpRight className="h-4 w-4 opacity-60" /></a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}

function Drill() {
  useCore()
  const core = window.App?.core
  const stats = core ? core.drillStats().byMode : {}
  const extras = window.CET4_WORD_EXTRAS || {}
  const extraList = Object.values(extras)
  const ready = {
    collocation: extraList.some((x) => (x.collocations || []).length),
    root: extraList.some((x) => (x.family || []).length),
  }

  return (
    <>
      <PageHead eyebrow="VOCAB DEEP PRACTICE" title="词汇深练" description="五种模式 · 每轮 10 词 · 记录自动保存" action={<Badge variant="outline">覆盖 200 词</Badge>} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {MODES.map((mode) => {
          const st = stats[mode.key] || { n: 0, ok: 0 }
          const enabled = mode.key === 'collocation' || mode.key === 'root' ? ready[mode.key] : true
          const acc = st.n ? `${Math.round((st.ok / st.n) * 100)}%` : '暂无记录'
          return (
            <Card key={mode.key} className={cn('p-0', !enabled && 'opacity-60')}>
              <CardHeader className="p-6 pb-3">
                <div className="flex items-start justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[.06] text-primary"><mode.icon className="h-5 w-5" strokeWidth={1.5} /></span>
                  <Badge variant="muted">{enabled ? '本轮 10 词' : '内容建设中'}</Badge>
                </div>
                <CardTitle className="pt-4 text-lg">{mode.name}</CardTitle>
                <CardDescription>{mode.desc}</CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <div className="flex items-center justify-between text-xs text-[var(--faint)]"><span>正确率</span><span className="text-foreground">{acc}</span></div>
                <Button variant="outline" className="mt-5 w-full justify-between" disabled={!enabled} asChild={enabled}>
                  {enabled ? <a href={`#/drill/${mode.key}`}>开始{mode.name} <ArrowUpRight className="h-4 w-4 opacity-60" /></a> : <span>暂不可用</span>}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </>
  )
}

function LoadingPage() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="正在加载题库">
      <div className="h-3 w-24 rounded bg-white/[.06] skeleton" />
      <div className="h-8 w-64 rounded bg-white/[.06] skeleton" />
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => <div key={i} className="glass-card h-36 skeleton" style={{ animationDelay: i * 120 + 'ms' }} />)}
      </div>
    </div>
  )
}

function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="t-num text-[42px] text-primary">404</div>
      <p className="mt-3 text-sm text-muted-foreground">这个页面还没有迁移到 v2。</p>
      <Button variant="primary" className="mt-6" asChild><a href="#/">回到首页</a></Button>
    </div>
  )
}

function needsPapers(route) {
  return /^#\/(exam|reading|cloze|matching|translation|writing|practice)/.test(route.split('?')[0])
}

export default function App() {
  const route = useHashRoute()
  const [papersReady, setPapersReady] = useState(() => !!window.CET4_PAPERS)
  const [pageAnim, setPageAnim] = useState('page-lateral')
  const prevRouteRef = useRef(route)
  const routeRef = useRef(route)
  const backRef = useRef(false)
  const scrollPositions = useRef(new Map())
  const paperRoute = needsPapers(route)

  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'
    const onScroll = () => { scrollPositions.current.set(routeRef.current, window.scrollY) }
    const onPop = () => { backRef.current = true }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('popstate', onPop)
    }
  }, [])

  useLayoutEffect(() => {
    const prev = prevRouteRef.current
    if (prev === route) return undefined
    scrollPositions.current.set(prev, window.scrollY)
    const depth = (r) => r.split('?')[0].split('/').filter(Boolean).length
    const dir = depth(route) > depth(prev) ? 'page-forward' : depth(route) < depth(prev) ? 'page-back' : 'page-lateral'
    setPageAnim(dir)
    const isBack = backRef.current
    backRef.current = false
    routeRef.current = route
    prevRouteRef.current = route
    const target = isBack ? (scrollPositions.current.get(route) || 0) : 0
    const raf = requestAnimationFrame(() => {
      window.scrollTo(0, target)
      if (isBack) {
        setTimeout(() => {
          if (routeRef.current === route) window.scrollTo(0, target)
        }, 260)
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [route])
  useEffect(() => {
    if (!paperRoute || papersReady) return undefined
    let alive = true
    loadPapers().then(() => { if (alive) setPapersReady(true) }).catch(() => { if (alive) setPapersReady(true) })
    return () => { alive = false }
  }, [paperRoute, papersReady])
  useEffect(() => {
    const name = route.startsWith('#/exam') ? '整套模考' : route.startsWith('#/reading') || route.startsWith('#/cloze') || route.startsWith('#/matching') ? '阅读理解' : route.startsWith('#/listening') ? '听力' : route.startsWith('#/translation') ? '翻译' : route.startsWith('#/writing') ? '写作' : route.startsWith('#/practice') ? '题目练习' : route.startsWith('#/drill') ? '词汇深练' : route.startsWith('#/vocab') ? '抽查单词' : route.startsWith('#/wordbook') ? '单词本' : route.startsWith('#/mistakes') ? '错题本' : route.startsWith('#/settings') ? '设置' : '首页'
    document.title = name + ' · 四级冲刺'
  }, [route])

  let page
  const clean = route.split('?')[0]
  const params = new URLSearchParams(route.split('?')[1] || '')
  const drillMode = clean.startsWith('#/drill/') ? clean.replace('#/drill/', '') : null
  if (paperRoute && !papersReady) page = <LoadingPage />
  else if (clean === '#/exam') page = <ExamList />
  else if (clean.startsWith('#/exam/')) page = <ExamRunner key={clean} index={Number(clean.replace('#/exam/', ''))} />
  else if (clean === '#/reading') page = <ReadingList />
  else if (clean.startsWith('#/reading/')) page = <ReadingRunner id={clean.replace('#/reading/', '')} reviewQ={params.get('q')} />
  else if (clean.startsWith('#/cloze/')) page = <ClozeRunner id={clean.replace('#/cloze/', '')} />
  else if (clean.startsWith('#/matching/')) page = <MatchingRunner id={clean.replace('#/matching/', '')} />
  else if (clean === '#/listening') page = <ListeningList />
  else if (clean.startsWith('#/listening/')) page = <ListeningRunner id={clean.replace('#/listening/', '')} />
  else if (clean === '#/translation') page = <TranslationList />
  else if (clean.startsWith('#/translation/')) page = <TranslationRunner id={clean.replace('#/translation/', '')} />
  else if (clean === '#/writing') page = <WritingList />
  else if (clean.startsWith('#/writing/')) page = <WritingRunner id={clean.replace('#/writing/', '')} />
  else if (clean === '#/mistakes') page = <Mistakes />
  else if (clean.startsWith('#/mistakes/')) {
    let type = clean.slice('#/mistakes/'.length)
    try { type = decodeURIComponent(type) } catch (e) { /* keep raw */ }
    page = <MistakeType type={type} />
  }
  else if (clean === '#/settings') page = <SettingsPage />
  else if (route.startsWith('#/practice')) page = <Practice />
  else if (drillMode) page = <DrillRunner key={drillMode} mode={drillMode} />
  else if (route.startsWith('#/drill')) page = <Drill />
  else if (route.startsWith('#/vocab')) page = <Vocab />
  else if (route.startsWith('#/wordbook')) page = <Wordbook />
  else if (route === '#/' || route === '') page = <Dashboard />
  else page = <NotFound />

  return (
    <>
      <AuroraBackground />
      <Shell route={route} pageAnim={pageAnim}>{page}</Shell>
    </>
  )
}
