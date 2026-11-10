import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Bookmark, Check, Layers, Play, Trash2, Volume2 } from 'lucide-react'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Progress } from '../components/ui/progress'

function speak(text) {
  if (!text || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = 0.95
  window.speechSynthesis.speak(u)
}

export default function Wordbook() {
  const core = window.App?.core
  const [ready, setReady] = useState(false)
  const [version, setVersion] = useState(0)
  const [session, setSession] = useState(null)
  const [tab, setTab] = useState('learning')

  useEffect(() => {
    if (core) {
      core.load()
      setReady(true)
    }
  }, [])

  const list = useMemo(() => {
    if (!core) return []
    return core.wordbookList().slice().sort((a, b) => (b.meta.at || 0) - (a.meta.at || 0))
  }, [core, version])

  const learning = list.filter((item) => item.meta.category !== 'known')
  const known = list.filter((item) => item.meta.category === 'known')
  const learningIds = new Set(learning.map((item) => item.id))
  const current = session && session.idx < session.ids.length ? core.getWord(session.ids[session.idx]) : null
  const senses = current ? core.sensesOf(current) : []

  function start() {
    const ids = core.wordbookQueue().filter((id) => learningIds.has(id))
    if (!ids.length) return
    setSession({ ids, idx: 0, flipped: false, stats: { 1: 0, 2: 0, 3: 0, 4: 0 } })
  }

  function grade(g) {
    if (!session || !session.flipped) return
    const id = session.ids[session.idx]
    core.reviewWord(id, g, { daily: false })
    const entry = core.getState().wordbook[id]
    if (entry) { entry.category = g <= 2 ? 'learning' : 'known'; core.save() }
    const stats = { ...session.stats, [g]: session.stats[g] + 1 }
    setSession({ ...session, idx: session.idx + 1, flipped: false, stats })
    setVersion((v) => v + 1)
  }

  function remove(id) {
    core.wordbookRemove(id)
    setVersion((v) => v + 1)
  }

  if (!ready) return <div className="py-24 text-center text-sm text-muted-foreground">正在读取单词本…</div>

  if (session && session.idx >= session.ids.length) {
    const total = session.stats[1] + session.stats[2] + session.stats[3] + session.stats[4]
    const rate = total ? Math.round(((session.stats[2] + session.stats[3] + session.stats[4]) / total) * 100) : 0
    return (
      <div className="mx-auto max-w-xl">
        <Card className="">
          <CardContent className="p-8 text-center">
            <div className="font-display text-[42px] font-semibold text-primary">{rate}%</div>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">本轮记得率</p>
            <h2 className="mt-6 font-display text-2xl font-semibold">单词本复习完成</h2>
            <p className="mt-2 text-sm text-muted-foreground">本轮 {total} 个词 · 忘了的词仍在单词本里</p>
            <div className="mt-7 flex flex-wrap justify-center gap-2">
              <Button onClick={() => { setSession(null); setVersion((v) => v + 1) }}>回到单词本</Button>
              <Button variant="outline" onClick={() => { setSession(null); setTimeout(start, 0) }}>再复习一轮</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (session) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSession(null)} aria-label="退出"><ArrowLeft className="h-4 w-4" /></Button>
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
              <span>单词本复习</span>
              <span>{session.idx + 1} / {session.ids.length}</span>
            </div>
            <Progress value={(session.idx / session.ids.length) * 100} className="h-1.5" />
          </div>
        </div>
        <Card className="">
          <CardContent className="p-7 sm:p-10">
            {!session.flipped ? (
              <div className="text-center">
                <Badge variant="secondary" className="mb-6 font-normal">先自己说一遍意思</Badge>
                <h1 className="font-display text-[42px] font-semibold tracking-tight">{current.w}</h1>
                <div className="mt-4 flex items-center justify-center gap-3 text-sm text-muted-foreground">
                  <span>{current.ph}</span>
                  <button type="button" onClick={() => speak(current.w)} className="rounded-full p-1.5 hover:bg-secondary" aria-label="朗读">
                    <Volume2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-7 text-sm text-muted-foreground">在心里造句、讲给自己听，再翻面核对</p>
                <Button size="lg" className="mt-4" onClick={() => setSession({ ...session, flipped: true })}>显示释义</Button>
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap items-baseline gap-3">
                  <h1 className="font-display text-3xl font-semibold tracking-tight">{current.w}</h1>
                  <button type="button" onClick={() => speak(current.w)} className="rounded-full p-1.5 hover:bg-secondary" aria-label="朗读">
                    <Volume2 className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-muted-foreground">{current.ph}</span>
                  <Badge variant="outline" className="font-normal">{current.pos}</Badge>
                </div>
                <div className="mt-6 space-y-2">
                  {senses.map((s, i) => (
                    <div key={i} className="flex gap-3 text-sm leading-relaxed">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] text-muted-foreground">{i + 1}</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
                {current.ex ? (
                  <div className="mt-6 rounded-lg border border-border/70 bg-secondary/40 p-4 text-sm">
                    <p className="font-display">{current.ex}</p>
                    <p className="mt-1.5 text-xs text-muted-foreground">{current.exZh}</p>
                  </div>
                ) : null}
                <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { g: 1, label: '忘了', cls: 'border-danger-soft bg-danger-soft text-danger hover:bg-danger-soft' },
                    { g: 2, label: '模糊', cls: 'border-warning-soft bg-warning-soft text-warning hover:bg-warning-soft' },
                    { g: 3, label: '记得', cls: 'border-success-soft bg-success-soft text-success hover:bg-success-soft' },
                    { g: 4, label: '简单', cls: 'border-[rgba(111,92,255,.32)] bg-[rgba(111,92,255,.12)] text-primary hover:bg-[rgba(111,92,255,.12)]' },
                  ].map((b) => (
                    <button key={b.g} type="button" onClick={() => grade(b.g)} className={`rounded-lg border px-3 py-3 text-left transition-colors ${b.cls}`}>
                      <span className="block font-display text-base font-semibold">{b.label}</span>
                      <span className="mt-0.5 block text-[11px] opacity-70">按 {b.g}</span>
                    </button>
                  ))}
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
          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">WORDBOOK</div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">单词本</h1>
          <p className="mt-2 text-sm text-muted-foreground">忘记/模糊自动进「不熟」，认识/简单自动进「熟记」</p>
        </div>
        <div className="flex gap-2">
          <Button disabled={!learning.length} onClick={start}><Play className="h-4 w-4" /> 复习不熟单词</Button>
          <Button variant="outline" asChild><a href="#/drill"><Layers className="h-4 w-4" /> 深练</a></Button>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <button type="button" onClick={() => setTab('learning')} className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 text-sm ${tab === 'learning' ? 'border-primary/40 bg-[var(--accent-soft)] text-foreground' : 'border-white/10 bg-white/[.03] text-muted-foreground'}`}>
          不熟 <span className="text-[11px] opacity-70">{learning.length}</span>
        </button>
        <button type="button" onClick={() => setTab('known')} className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 text-sm ${tab === 'known' ? 'border-primary/40 bg-[var(--accent-soft)] text-foreground' : 'border-white/10 bg-white/[.03] text-muted-foreground'}`}>
          熟记 <span className="text-[11px] opacity-70">{known.length}</span>
        </button>
      </div>
      {(tab === 'known' ? known : learning).length ? (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {(tab === 'known' ? known : learning).map((item, i) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-4 py-3.5 sm:px-6 ${i ? 'border-t border-border/60' : ''}`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                  {tab === 'known' ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <strong className="font-display text-base">{item.w.w}</strong>
                    <span className="text-xs text-muted-foreground">{item.w.ph}</span>
                    <Badge variant={tab === 'known' ? 'default' : 'outline'} className="font-normal">{tab === 'known' ? '熟记' : '待攻克'}</Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.w.zh}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(item.id)} aria-label="移出单词本">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="">
          <CardContent className="flex flex-col items-center py-16 text-center">
            {tab === 'known' ? <Check className="h-8 w-8 text-muted-foreground/50" /> : <Bookmark className="h-8 w-8 text-muted-foreground/50" />}
            <h2 className="mt-4 font-display text-lg font-semibold">{tab === 'known' ? '还没有熟记的单词' : '还没有不熟的单词'}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{tab === 'known' ? '抽查时选择「认识」或「简单」会自动收进这里' : '抽查时选择「忘记」或「模糊」会自动收进这里'}</p>
            <Button className="mt-5" asChild><a href="#/vocab">去抽查</a></Button>
          </CardContent>
        </Card>
      )}
    </>
  )
}
