import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  Bookmark,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Flame,
  Headphones,
  Home,
  Languages,
  Layers,
  PenLine,
  Settings,
  Sparkles,
  Target,
} from 'lucide-react'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Progress } from './components/ui/progress'
import { cn } from './lib/utils'

const NAV = [
  { key: 'home', label: '首页', icon: Home, href: '#/' },
  { key: 'practice', label: '题目练习', icon: Layers, href: '#/practice' },
  { key: 'drill', label: '词汇深练', icon: Sparkles, href: '#/drill' },
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

function legacyBase() {
  return window.location.pathname.replace(/v2\/?$/, '')
}

function legacyUrl(hash) {
  const base = legacyBase()
  return (base.endsWith('/') ? base : base + '/') + hash
}

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

function Shell({ route, children }) {
  const tabKey = route.startsWith('#/practice')
    ? 'practice'
    : route.startsWith('#/drill')
      ? 'drill'
      : 'home'

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="paper-texture fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border/80 bg-[hsl(42_26%_93%)] px-4 py-6 lg:flex">
        <a href="#/" className="flex items-center gap-3 px-2">
          <img src="./cet-logo-cropped.png" alt="CET" className="h-7 w-14 object-contain" />
          <span>
            <span className="block font-display text-base font-semibold tracking-tight">四级冲刺</span>
            <span className="block text-[10px] tracking-[0.22em] text-muted-foreground">CET-4 SPRINT</span>
          </span>
        </a>

        <nav className="mt-9 flex flex-col gap-1">
          {NAV.map((item) => (
            <a
              key={item.key}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground',
                tabKey === item.key && 'bg-card text-foreground shadow-sm ring-1 ring-border/70'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </a>
          ))}
        </nav>

        <div className="mb-2 mt-8 px-3 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">更多</div>
        <nav className="flex flex-col gap-1">
          {MORE.map((item) => (
            <a
              key={item.key}
              href={legacyUrl(item.href)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
              <ArrowUpRight className="ml-auto h-3.5 w-3.5 opacity-40" />
            </a>
          ))}
        </nav>

        <div className="mt-auto rounded-xl border border-border/80 bg-card/70 p-4">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" /> 12 月 13 日
          </div>
          <p className="font-display text-lg font-semibold">每天 20 分钟</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">先过线，再冲高分。v2 预览只覆盖首页、练习与深练。</p>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/70 bg-background/85 px-4 backdrop-blur-md sm:px-8">
          <a href="#/" className="flex items-center gap-2 lg:hidden">
            <img src="./cet-logo-cropped.png" alt="CET" className="h-6 w-12 object-contain" />
            <span className="font-display text-sm font-semibold">四级冲刺</span>
          </a>
          <div className="hidden items-center gap-2 text-sm text-muted-foreground lg:flex">
            <span>四级冲刺</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground">{route.startsWith('#/practice') ? '题目练习' : route.startsWith('#/drill') ? '词汇深练' : '首页'}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="secondary" className="rounded-md font-normal">v2 预览</Badge>
            <a href={legacyUrl('#/')} className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              返回旧版
            </a>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-8 sm:pt-8 lg:pb-12">{children}</main>
      </div>

      <nav className="paper-texture fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-md items-stretch px-2">
          {[
            { key: 'home', label: '首页', icon: Home, href: '#/' },
            { key: 'practice', label: '练习', icon: Layers, href: '#/practice' },
            { key: 'drill', label: '深练', icon: Sparkles, href: '#/drill' },
            { key: 'mistakes', label: '错题本', icon: AlertTriangle, href: legacyUrl('#/mistakes') },
            { key: 'settings', label: '设置', icon: Settings, href: legacyUrl('#/settings') },
          ].map((item) => (
            <a
              key={item.key}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[12px] text-muted-foreground',
                tabKey === item.key && 'text-primary'
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </a>
          ))}
        </div>
      </nav>
    </div>
  )
}

function PageHead({ eyebrow, title, description, action }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</div> : null}
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
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
  const pct = target ? Math.min(100, Math.round((done / target) * 100)) : 0

  return (
    <>
      <section className="paper-texture relative overflow-hidden rounded-2xl border border-border/80 bg-[linear-gradient(135deg,hsl(42_40%_96%),hsl(42_30%_98%)_55%,hsl(214_30%_93%))] p-6 shadow-sm sm:p-9">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,hsl(219_60%_40%/0.10),transparent_70%)]" />
        <Badge variant="outline" className="mb-5 rounded-md border-primary/15 bg-card/60 text-primary">
          <Sparkles className="mr-1.5 h-3.5 w-3.5" /> 今日冲刺
        </Badge>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <span className="font-display text-6xl font-semibold leading-none tracking-tight text-primary sm:text-7xl">{days}</span>
          <span className="pb-1 text-sm text-muted-foreground">天后考试</span>
          <span className="pb-1 text-xs text-muted-foreground/70">· 12 月 13 日</span>
        </div>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
          按今天的节奏走，过线并不难。先完成 {target} 个抽查词，再做一套阅读或一次词汇深练。
        </p>
        <div className="mt-7 max-w-xl">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>今日抽查</span>
            <span className="font-medium text-foreground">{done} / {target}</span>
          </div>
          <Progress value={pct} className="h-2 bg-card/80" />
        </div>
        <div className="mt-7 flex flex-wrap gap-2.5">
          <Button asChild>
            <a href={legacyUrl('#/vocab')}>开始抽查 <ArrowUpRight className="h-4 w-4" /></a>
          </Button>
          <Button variant="outline" asChild>
            <a href="#/practice">题目练习 <ChevronRight className="h-4 w-4" /></a>
          </Button>
          <Button variant="ghost" asChild>
            <a href="#/drill">词汇深练</a>
          </Button>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: '待复习', value: due, hint: '到期卡片', icon: CalendarDays },
          { label: '已掌握', value: mastered, hint: '长期记忆', icon: Target },
          { label: '单词本', value: wordbook, hint: '收藏词', icon: Bookmark },
          { label: '连续打卡', value: streak, hint: '天', icon: Flame },
        ].map((s) => (
          <Card key={s.label} className="rounded-xl border-border/70 bg-card/80 shadow-none">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{s.label}</span>
                <s.icon className="h-4 w-4 opacity-60" />
              </div>
              <div className="mt-2 font-display text-2xl font-semibold tracking-tight">{s.value}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground/70">{s.hint}</div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">今天做什么</h2>
            <p className="mt-1 text-xs text-muted-foreground">按题型进入，练习记录自动保存</p>
          </div>
          <a href="#/practice" className="text-xs text-primary underline-offset-4 hover:underline">全部练习</a>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { title: '阅读理解', desc: '仔细阅读 / 匹配 / 选词', icon: BookOpen, href: '#/practice', meta: '41 套' },
            { title: '词汇深练', desc: '拼写 / 听写 / 词义 / 搭配', icon: Sparkles, href: '#/drill', meta: '5 种模式' },
            { title: '错题回顾', desc: '清理未掌握的题', icon: AlertTriangle, href: legacyUrl('#/mistakes'), meta: '旧版' },
          ].map((c) => (
            <a key={c.title} href={c.href} className="group rounded-xl border border-border/70 bg-card/60 p-5 transition-colors hover:bg-card">
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-primary">
                  <c.icon className="h-4 w-4" />
                </span>
                <Badge variant="muted" className="font-normal">{c.meta}</Badge>
              </div>
              <div className="mt-4 font-display text-base font-semibold">{c.title}</div>
              <p className="mt-1 text-xs text-muted-foreground">{c.desc}</p>
            </a>
          ))}
        </div>
      </section>
    </>
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
      <PageHead
        eyebrow="PRACTICE"
        title="题目练习"
        description="按题型进入，练习记录自动保存。v2 暂时作为设计预览，具体做题仍可回到旧版。"
        action={<Badge variant="secondary" className="rounded-md font-normal">4 个题型</Badge>}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {data.map((item) => (
          <Card key={item.key} className="group flex flex-col rounded-xl border-border/70 bg-card/80 shadow-none transition-colors hover:border-primary/20">
            <CardHeader className="p-6 pb-3">
              <div className="flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                  <item.icon className="h-5 w-5" />
                </span>
                <Badge variant={item.done ? 'default' : 'muted'} className="font-normal">
                  {item.done ? `已做 ${item.done}` : '未做'}
                </Badge>
              </div>
              <CardTitle className="pt-4 text-xl">{item.name}</CardTitle>
              <CardDescription>{item.desc}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto p-6 pt-2">
              <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>{item.total} {item.kind === 'writing' ? '题' : '套'}</span>
                <span>{item.done ? `已完成 ${Math.round((item.done / Math.max(1, item.total)) * 100)}%` : '从第一套开始'}</span>
              </div>
              <Progress value={item.total ? (item.done / item.total) * 100 : 0} className="h-1.5" />
              <Button variant="outline" className="mt-5 w-full justify-between" asChild>
                <a href={legacyUrl(item.href)}>
                  打开{item.name}练习
                  <ArrowUpRight className="h-4 w-4 opacity-60" />
                </a>
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
      <PageHead
        eyebrow="VOCAB DEEP PRACTICE"
        title="词汇深练"
        description="五种模式 · 每轮 10 词 · 记录自动保存。v2 保留深练入口，具体答题仍可回到旧版。"
        action={<Badge variant="outline" className="rounded-md font-normal">覆盖 200 词</Badge>}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {MODES.map((mode) => {
          const st = stats[mode.key] || { n: 0, ok: 0 }
          const enabled = mode.key === 'collocation' || mode.key === 'root' ? ready[mode.key] : true
          const acc = st.n ? `${Math.round((st.ok / st.n) * 100)}%` : '暂无记录'
          return (
            <Card key={mode.key} className={cn('rounded-xl border-border/70 bg-card/80 shadow-none', !enabled && 'opacity-60')}>
              <CardHeader className="p-6 pb-3">
                <div className="flex items-start justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                    <mode.icon className="h-5 w-5" />
                  </span>
                  <Badge variant="muted" className="font-normal">{enabled ? '本轮 10 词' : '内容建设中'}</Badge>
                </div>
                <CardTitle className="pt-4 text-lg">{mode.name}</CardTitle>
                <CardDescription>{mode.desc}</CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>正确率</span>
                  <span className="font-medium text-foreground">{acc}</span>
                </div>
                <Button variant={enabled ? 'default' : 'secondary'} className="mt-5 w-full justify-between" disabled={!enabled} asChild={enabled}>
                  {enabled ? (
                    <a href={legacyUrl(`#/drill/${mode.key}`)}>
                      开始{mode.name}
                      <ArrowUpRight className="h-4 w-4 opacity-60" />
                    </a>
                  ) : (
                    <span>暂不可用</span>
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        搭配与词根词缀只覆盖已有例句/词族数据的 200 个核心词；拼写、听写、词义辨析覆盖全词库。
      </p>
    </>
  )
}

function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="font-display text-5xl font-semibold text-primary">404</div>
      <p className="mt-3 text-sm text-muted-foreground">这个页面还没有迁移到 v2。</p>
      <Button className="mt-6" asChild><a href="#/">回到首页</a></Button>
    </div>
  )
}

export default function App() {
  const route = useHashRoute()
  useEffect(() => {
    window.scrollTo(0, 0)
    const name = route.startsWith('#/practice') ? '题目练习' : route.startsWith('#/drill') ? '词汇深练' : '首页'
    document.title = name + ' · 四级冲刺 v2'
  }, [route])

  let page
  if (route.startsWith('#/practice')) page = <Practice />
  else if (route.startsWith('#/drill')) page = <Drill />
  else if (route === '#/' || route === '') page = <Dashboard />
  else page = <NotFound />

  return <Shell route={route}>{page}</Shell>
}
