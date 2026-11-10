import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Bookmark, Check, Eye, Layers, Plus, RotateCcw, Sparkles, Volume2, X } from 'lucide-react'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Progress } from '../components/ui/progress'
import { cn } from '../lib/utils'

function speak(text) {
  if (!text || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = 0.95
  window.speechSynthesis.speak(u)
}

export default function Vocab() {
  const core = window.App?.core
  const [ready, setReady] = useState(false)
  const [tick, setTick] = useState(0)
  const [session, setSession] = useState(null)

  useEffect(() => {
    if (core) {
      core.load()
      setReady(true)
    }
  }, [])

  const target = core ? core.checkTarget() : 50
  const rec = core ? core.todayRecord() : {}
  const done = rec.checkDone || 0
  const due = core ? core.dueList().length : 0
  const mastered = core ? core.masteredCount() : 0
  const wordbook = core ? core.wordbookCount() : 0
  const pct = target ? Math.min(100, Math.round((done / target) * 100)) : 0

  const currentId = session && session.idx < session.ids.length ? session.ids[session.idx] : null
  const word = currentId ? core.getWord(currentId) : null
  const senses = word ? core.sensesOf(word) : []

  function start() {
    const ids = core.buildCheckQueue()
    if (!ids.length) {
      setTick((x) => x + 1)
      return
    }
    setSession({ ids, idx: 0, stats: { 1: 0, 2: 0, 3: 0, 4: 0 }, flipped: false, undo: null })
  }

  function grade(g) {
    if (!session || !session.flipped) return
    const id = session.ids[session.idx]
    const snap = core.checkSnapshot(id)
    const wbBefore = core.wordbookHas(id) ? JSON.parse(JSON.stringify(core.getState().wordbook[id])) : null
    core.reviewWord(id, g)
    core.wordbookAdd(id, g <= 2 ? 'check-fail' : 'check-known')
    const entry = core.getState().wordbook[id]
    if (entry) {
      entry.category = g <= 2 ? 'learning' : 'known'
      core.save()
    }
    const stats = { ...session.stats, [g]: session.stats[g] + 1 }
    setSession({
      ...session,
      idx: session.idx + 1,
      flipped: false,
      stats,
      undo: { id, snap, idx: session.idx, stats: { ...session.stats }, wbBefore },
    })
    setTick((x) => x + 1)
  }

  function undo() {
    if (!session || !session.undo) return
    const u = session.undo
    core.restoreCheck(u.id, u.snap)
    if (u.wbBefore) {
      core.getState().wordbook[u.id] = u.wbBefore
      core.save()
    } else {
      core.wordbookRemove(u.id)
    }
    setSession({ ...session, idx: u.idx, flipped: true, stats: u.stats, undo: null })
    setTick((x) => x + 1)
  }

  useEffect(() => {
    function onKey(e) {
      if (!session) return
      const mod = e.ctrlKey || e.metaKey
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        if (session.undo) { e.preventDefault(); undo() }
        return
      }
      if (mod || e.altKey) return
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        if (word) speak(word.w)
        return
      }
      if (!session.flipped) return
      if (/^[1-4]$/.test(e.key)) {
        e.preventDefault()
        grade(+e.key)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [session, word])

  if (!ready) return <div className="py-24 text-center text-sm text-muted-foreground">正在读取学习记录…</div>

  if (session && session.idx >= session.ids.length) {
    const answered = session.stats[1] + session.stats[2] + session.stats[3] + session.stats[4]
    const rate = answered ? Math.round(((session.stats[2] + session.stats[3] + session.stats[4]) / answered) * 100) : 0
    return (
      <div className="mx-auto max-w-xl">
        <Card className="">
          <CardContent className="p-8 text-center">
            <div className="font-display text-[42px] font-semibold text-primary">{rate}%</div>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">本轮记得率</p>
            <h2 className="mt-6 font-display text-2xl font-semibold">本轮抽查完成</h2>
            <p className="mt-2 text-sm text-muted-foreground">完成 {done} / {target}</p>
            <div className="mt-7 flex flex-wrap justify-center gap-2">
              <Button onClick={() => { core.addCheckGroup(10); setSession(null); setTick((x) => x + 1) }}>+10 个</Button>
              <Button variant="outline" onClick={() => { setSession(null); start() }}>再抽查一轮</Button>
              <Button variant="ghost" onClick={() => setSession(null)}>回到词库</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (session) {
    const group = Math.floor(session.idx / 10) + 1
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSession(null)} aria-label="退出">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>第 {group} 组 · {done} / {target}</span>
              <span>{session.flipped ? '自评' : '先回忆'}</span>
            </div>
            <Progress value={target ? (done / target) * 100 : 0} className="h-1.5" />
          </div>
        </div>

        <Card className="">
          <CardContent className="p-7 sm:p-10">
            {!session.flipped ? (
              <div className="text-center">
                <Badge variant="secondary" className="mb-6 font-normal">先自己说一遍意思</Badge>
                <h1 className="font-display text-[42px] font-semibold tracking-tight sm:text-[42px]">{word.w}</h1>
                <div className="mt-4 flex items-center justify-center gap-3 text-sm text-muted-foreground">
                  <span>{word.ph}</span>
                  <button type="button" onClick={() => speak(word.w)} className="rounded-full p-1.5 hover:bg-secondary" aria-label="朗读">
                    <Volume2 className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    core.wordbookAdd(word.id, 'manual')
                    const entry = core.getState().wordbook[word.id]
                    if (entry) { entry.category = 'learning'; core.save() }
                    setTick((x) => x + 1)
                  }}
                  className="mt-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Bookmark className="h-3.5 w-3.5" /> {core.wordbookHas(word.id) ? '已在单词本' : '加入单词本'}
                </button>
                <p className="mt-7 text-sm text-muted-foreground">在心里造句、讲给自己听，再翻面核对</p>
                <Button size="lg" className="mt-4" onClick={() => setSession({ ...session, flipped: true })}>
                  <Eye className="h-4 w-4" /> 显示释义
                </Button>
                {session.undo ? (
                  <div className="mt-4">
                    <Button variant="ghost" size="sm" onClick={undo}>
                      <RotateCcw className="h-3.5 w-3.5" /> 撤销上一题
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap items-baseline gap-3">
                  <h1 className="font-display text-3xl font-semibold tracking-tight">{word.w}</h1>
                  <button type="button" onClick={() => speak(word.w)} className="rounded-full p-1.5 hover:bg-secondary" aria-label="朗读">
                    <Volume2 className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-muted-foreground">{word.ph}</span>
                  <Badge variant="outline" className="font-normal">{word.pos}</Badge>
                </div>
                <div className="mt-6 space-y-2">
                  {senses.map((s, i) => (
                    <div key={i} className="flex gap-3 text-sm leading-relaxed">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] text-muted-foreground">{i + 1}</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
                {word.ex ? (
                  <div className="mt-6 rounded-lg border border-border/70 bg-secondary/40 p-4 text-sm">
                    <p className="font-display">{word.ex}</p>
                    <p className="mt-1.5 text-xs text-muted-foreground">{word.exZh}</p>
                  </div>
                ) : null}
                <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { g: 1, label: '忘记', hint: '1', cls: 'border-danger-soft bg-danger-soft text-danger hover:bg-danger-soft' },
                    { g: 2, label: '模糊', hint: '2', cls: 'border-warning-soft bg-warning-soft text-warning hover:bg-warning-soft' },
                    { g: 3, label: '认识', hint: '3', cls: 'border-success-soft bg-success-soft text-success hover:bg-success-soft' },
                    { g: 4, label: '简单', hint: '4', cls: 'border-[rgba(111,92,255,.32)] bg-[rgba(111,92,255,.12)] text-primary hover:bg-[rgba(111,92,255,.12)]' },
                  ].map((b) => (
                    <button
                      key={b.g}
                      type="button"
                      onClick={() => grade(b.g)}
                      className={cn('rounded-lg border px-3 py-3 text-left transition-colors', b.cls)}
                    >
                      <span className="block font-display text-base font-semibold">{b.label}</span>
                      <span className="mt-0.5 block text-[11px] opacity-70">按 {b.hint}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground">按 1–4 评分 · 空格朗读 · Ctrl/Cmd+Z 撤销</p>
                  <Button variant="ghost" size="sm" disabled={!session.undo} onClick={undo}>
                    <RotateCcw className="h-3.5 w-3.5" /> 撤销上一题
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">VOCABULARY</div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">抽查单词</h1>
          <p className="mt-2 text-sm text-muted-foreground">费曼式回忆 · 每天 {target} 个 · 10 个一组</p>
        </div>
        <Badge variant="outline" className="rounded-md font-normal">待复习 {due}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <a href="#/wordbook" className="glass-card group flex items-center gap-4 p-5 transition-colors hover:border-white/20">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary"><Bookmark className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-base font-semibold">单词本</span>
            <span className="mt-1 block text-xs text-muted-foreground">收藏不熟的词，按费曼法单独复习</span>
          </span>
          <span className="text-xs text-muted-foreground">{wordbook} 词</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </a>
        <a href="#/drill" className="glass-card group flex items-center gap-4 p-5 transition-colors hover:border-white/20">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary"><Layers className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-base font-semibold">词汇深练</span>
            <span className="mt-1 block text-xs text-muted-foreground">拼写 / 听写 / 词义 / 搭配 / 词根</span>
          </span>
          <span className="text-xs text-muted-foreground">5 种模式</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </a>
      </div>

      <Card className="mt-4">
        <CardContent className="p-7 sm:p-9">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge variant="outline" className="mb-4 border-primary/15 bg-card/60 text-primary">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> 今日抽查
              </Badge>
              <h2 className="font-display text-2xl font-semibold">{done >= target ? '今天的抽查完成了' : `还有 ${target - done} 个单词等你`}</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">先自己说出释义，再翻面自评。记得的拉长复习间隔，模糊和忘记的会自动回到队列。</p>
            </div>
            <div className="font-display text-4xl font-semibold text-primary">{done}<span className="text-base font-normal text-muted-foreground"> / {target}</span></div>
          </div>
          <Progress value={pct} className="mt-6 h-2" />
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{Math.ceil(target / 10)} 组 × 10 个</span>
            <span>已掌握 {mastered}</span>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={start}><Sparkles className="h-4 w-4" /> {done ? '继续抽查' : '开始抽查'}</Button>
            <Button variant="outline" onClick={() => { core.addCheckGroup(10); setTick((x) => x + 1) }}><Plus className="h-4 w-4" /> +10 个</Button>
            <Button variant="ghost" asChild><a href={legacyUrl('#/vocab')}>旧版抽查</a></Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

function legacyUrl(hash) {
  const base = window.location.pathname.replace(/v2\/?$/, '')
  return (base.endsWith('/') ? base : base + '/') + 'legacy/' + hash
}
