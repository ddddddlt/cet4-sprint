import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Headphones, Play, Square, X } from 'lucide-react'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { cn } from '../lib/utils'
import { restartPractice } from '../lib/practice'
import { toCetStandard } from '../lib/cetScore'

function useCoreReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => { if (window.App?.core) { window.App.core.load(); setReady(true) } }, [])
  return ready
}

function speak(text, rate = 1) {
  if (!text || !('speechSynthesis' in window)) return false
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = rate
  window.speechSynthesis.speak(u)
  return true
}

export function ListeningList() {
  useCoreReady()
  const core = window.App?.core
  const sets = window.CET4_LISTENING || []
  return (
    <>
      <div className="mb-7">
        <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">LISTENING</div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">听力</h1>
        <p className="mt-2 text-sm text-muted-foreground">短篇新闻 / 长对话 / 听力篇章 · 练习记录自动保存</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {sets.map((set) => {
          const att = core ? core.attempt('listening', set.id) : null
          const saved = core ? core.getSession('listening', set.id) : null
          const href = `#/listening/${set.id}`
          return (
            <div key={set.id} className="glass-card group p-5 transition-colors hover:border-white/20">
              <a href={href} className="block">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="font-normal">{set.type}</Badge>
                  <Badge variant={saved ? 'outline' : att ? 'default' : 'muted'} className="font-normal">{saved ? '进行中' : att ? `最好 ${att.best}/${att.total} · 标准分 ${toCetStandard('listening', att.best, att.total)}` : '未做'}</Badge>
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{set.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{set.intro}</p>
              </a>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{set.questions.length} 题 · 约 {Math.ceil(set.seconds / 60)} 分钟</span>
                <div className="flex items-center gap-2">
                  {saved ? <a href={href} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-primary/30 bg-[var(--accent-soft)] px-3 text-primary">继续练习 <ArrowRight className="h-3.5 w-3.5" /></a> : null}
                  {!saved && !att ? <a href={href} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-primary/30 bg-[var(--accent-soft)] px-3 text-primary">开始练习 <ArrowRight className="h-3.5 w-3.5" /></a> : null}
                  {saved || att ? <button type="button" onClick={() => { restartPractice(core, 'listening', set.id); window.location.hash = href }} className="inline-flex min-h-9 items-center rounded-lg px-2 text-muted-foreground hover:text-foreground">重新练习</button> : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

export function ListeningRunner({ id }) {
  useCoreReady()
  const core = window.App?.core
  const set = (window.CET4_LISTENING || []).find((x) => x.id === id)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [showText, setShowText] = useState(false)
  const [rate, setRate] = useState(1)
  const [resumed, setResumed] = useState(false)

  useEffect(() => {
    if (!core || !id) return
    const saved = core.getSession('listening', id)
    if (saved) { setAnswers(saved.answers || {}); setResumed(true) }
  }, [id])

  const transcript = useMemo(() => String(set?.transcript || '').replace(/^[MW]:\s*/gm, ''), [set])

  useEffect(() => () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel() }, [])

  if (!set) return <div className="py-20 text-center text-sm text-muted-foreground">题目不存在</div>

  function togglePlay() {
    if (playing) {
      window.speechSynthesis.cancel()
      setPlaying(false)
      return
    }
    const ok = speak(transcript, rate)
    setPlaying(ok)
    if (!ok) return
    const check = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        clearInterval(check)
        setPlaying(false)
      }
    }, 300)
  }

  function submit() {
    let n = 0
    set.questions.forEach((q) => {
      const ok = answers[q.id] === q.answer
      if (ok) n += 1
      core.recordQuestion(q.id, ok)
      if (!ok) core.wrongQuestion(q.id, 'listening', set.id, {
        stem: q.stem, answer: ['A', 'B', 'C', 'D'][q.answer] + '. ' + q.options[q.answer], explain: q.explain, title: set.title, type: set.type,
      })
    })
    core.recordSet('listening', set.id, n, set.questions.length)
    core.clearSession('listening', set.id)
    setScore(n)
    setSubmitted(true)
    window.speechSynthesis.cancel()
    setPlaying(false)
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><a href="#/listening" aria-label="返回"><ArrowLeft className="h-4 w-4" /></a></Button>
        <div>
          <h1 className="font-display text-lg font-semibold">{set.title}</h1>
          <div className="mt-0.5 text-xs text-muted-foreground">{set.type} · {set.questions.length} 题</div>
        </div>
      </div>

      {resumed && !submitted ? <div className="mb-3 rounded-lg border bg-card px-4 py-2.5 text-xs text-muted-foreground">已恢复上次作答 · 已答 {Object.keys(answers).length} 题</div> : null}
      {submitted ? (
        <div aria-live="polite" className="glass-card mb-4 p-4 font-display text-lg">答对 {score} / {set.questions.length} <span className="ml-2 text-sm text-muted-foreground">· 四级听力标准分（估算） {toCetStandard('listening', score, set.questions.length)} / 248.5</span> <a className="ml-3 text-xs text-primary underline" href="#/listening">返回列表</a></div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
        <div className="space-y-3">
          <Card className="">
            <CardContent className="p-5">
              <div className="flex items-center gap-2">
                <Button size="icon" onClick={togglePlay} aria-label={playing ? '停止' : '播放'}>
                  {playing ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <div>
                  <div className="text-sm font-medium">{playing ? '正在播放' : '播放录音'}</div>
                  <div className="text-[11px] text-muted-foreground">浏览器语音合成 · 约 {set.seconds} 秒</div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                {[0.85, 1].map((r) => (
                  <Button key={r} variant={rate === r ? 'default' : 'outline'} size="sm" onClick={() => setRate(r)}>{r}×</Button>
                ))}
                <Button variant="ghost" size="sm" onClick={() => setShowText((v) => !v)}>{showText ? '隐藏原文' : '显示原文'}</Button>
              </div>
              {showText ? (
                <div className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap border-t pt-4 font-display text-sm leading-relaxed text-muted-foreground">{transcript}</div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          {set.questions.map((q, qi) => (
            <Card key={q.id} className="">
              <CardContent className="p-5">
                <div className="flex gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs text-muted-foreground">{qi + 1}</span>
                  <p className="font-display text-sm font-medium leading-relaxed">{q.stem}</p>
                </div>
                <div className="mt-4 space-y-2">
                  {q.options.map((opt, i) => {
                    const selected = answers[q.id] === i
                    const correct = submitted && i === q.answer
                    const wrong = submitted && selected && i !== q.answer
                    return (
                      <button key={i} type="button" disabled={submitted} onClick={() => { const next = { ...answers, [q.id]: i }; setAnswers(next); core.saveSession('listening', set.id, { answers: next }) }}
                        className={cn('flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                          !submitted && 'hover:border-primary/30 hover:bg-secondary/40',
                          selected && !submitted && 'border-primary/40 bg-secondary/60',
                          correct && 'border-success-soft bg-success-soft text-success',
                          wrong && 'border-danger-soft bg-danger-soft text-danger')}>
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-secondary text-[11px] text-muted-foreground">{['A', 'B', 'C', 'D'][i]}</span>
                        <span>{opt}</span>
                      </button>
                    )
                  })}
                </div>
                {submitted ? (
                  <div className="mt-3 rounded-lg border bg-secondary/40 p-3 text-xs">
                    <div className="flex items-center gap-1.5 font-medium">
                      {answers[q.id] === q.answer ? <Check className="h-3.5 w-3.5 text-success" /> : <X className="h-3.5 w-3.5 text-danger" />}
                      {answers[q.id] === q.answer ? '正确' : '错误'}
                    </div>
                    <p className="mt-1 text-muted-foreground">{q.explain}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
          {!submitted ? <Button className="w-full" onClick={submit} disabled={Object.keys(answers).length < set.questions.length}>交卷</Button> : null}
        </div>
      </div>
    </div>
  )
}
