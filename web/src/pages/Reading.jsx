import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, FileText, Layers, X } from 'lucide-react'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Progress } from '../components/ui/progress'
import { cn } from '../lib/utils'

function useCoreReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (window.App?.core) { window.App.core.load(); setReady(true) }
  }, [])
  return ready
}

function Head({ title, description, children }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">READING</div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}

export function ReadingList() {
  useCoreReady()
  const core = window.App?.core
  const groups = useMemo(() => [
    { label: '仔细阅读', data: window.CET4_READING || [], route: 'reading', icon: BookOpen },
    { label: '长篇匹配', data: window.CET4_MATCHING || [], route: 'matching', icon: Layers },
    { label: '选词填空', data: window.CET4_CLOZE || [], route: 'cloze', icon: FileText },
  ], [])

  return (
    <>
      <Head title="阅读理解" description="仔细阅读 / 选词填空 / 长篇匹配 · 练习记录自动保存">
        <Badge variant="outline" className="rounded-md font-normal">{groups.reduce((n, g) => n + g.data.length, 0)} 套</Badge>
      </Head>
      <div className="space-y-9">
        {groups.map((group) => (
          <section key={group.route}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">{group.label}</h2>
              <span className="text-xs text-muted-foreground">{group.data.length} 套</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.data.map((set) => {
                const att = core ? core.attempt('reading', set.id) : null
                const total = set.questions?.length || set.statements?.length || set.blanks?.length || 0
                return (
                  <a key={set.id} href={`#/${group.route}/${set.id}`} className="paper-texture group rounded-xl border bg-card p-5 transition-colors hover:border-primary/25">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary" className="font-normal">{set.type}</Badge>
                      <Badge variant={att ? 'default' : 'muted'} className="font-normal">{att ? `最好 ${att.best}/${att.total}` : '未做'}</Badge>
                    </div>
                    <h3 className="mt-4 font-display text-lg font-semibold leading-snug">{set.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{set.topic || set.intro || ''}</p>
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{total} 题 · 约 {set.minutes} 分钟</span>
                      <span className="inline-flex items-center gap-1 text-primary">开始 <ArrowRight className="h-3.5 w-3.5" /></span>
                    </div>
                  </a>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}

function RunnerTop({ title, back = '#/reading', meta }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <Button variant="ghost" size="icon" asChild><a href={back} aria-label="返回"><ArrowLeft className="h-4 w-4" /></a></Button>
      <div className="min-w-0">
        <h1 className="truncate font-display text-lg font-semibold">{title}</h1>
        <div className="mt-0.5 text-xs text-muted-foreground">{meta}</div>
      </div>
    </div>
  )
}

function Passage({ text }) {
  const paragraphs = String(text || '').split(/\n{2,}/)
  return (
    <Card className="paper-texture">
      <CardContent className="p-6 sm:p-8">
        <div className="space-y-4 font-display text-[15px] leading-relaxed text-foreground/90">
          {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </CardContent>
    </Card>
  )
}

function resultLine(q, submitted, wrongIds) {
  if (!submitted) return null
  const ok = wrongIds.indexOf(q.id) < 0
  return (
    <div className="mt-3 rounded-lg border border-border/70 bg-secondary/40 p-3 text-xs">
      <div className="flex items-center gap-1.5 font-medium">
        {ok ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <X className="h-3.5 w-3.5 text-rose-700" />}
        {ok ? '回答正确' : '回答错误'}
      </div>
      <p className="mt-1 text-muted-foreground">{q.explain}</p>
    </div>
  )
}

export function ReadingRunner({ id }) {
  useCoreReady()
  const core = window.App?.core
  const set = (window.CET4_READING || []).find((x) => x.id === id)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [started] = useState(Date.now())
  const [elapsed, setElapsed] = useState(0)
  const [score, setScore] = useState(0)

  useEffect(() => {
    if (submitted) return
    const t = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(t)
  }, [submitted, started])

  if (!set) return <div className="py-20 text-center text-sm text-muted-foreground">题目不存在</div>
  const answered = Object.keys(answers).length
  const wrongIds = submitted ? set.questions.filter((q) => answers[q.id] !== q.answer).map((q) => q.id) : []

  function submit() {
    if (submitted) return
    let n = 0
    set.questions.forEach((q) => {
      const ok = answers[q.id] === q.answer
      if (ok) n += 1
      core.recordQuestion(q.id, ok)
      if (!ok) core.wrongQuestion(q.id, 'reading', set.id, {
        stem: q.stem, answer: ['A', 'B', 'C', 'D'][q.answer] + '. ' + q.options[q.answer], explain: q.explain, title: set.title, type: set.type,
      })
    })
    core.recordSet('reading', set.id, n, set.questions.length, elapsed)
    setScore(n)
    setSubmitted(true)
    window.scrollTo(0, 0)
  }

  return (
    <div>
      <RunnerTop title={set.title} meta={`${set.type} · ${set.questions.length} 题 · ${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`} />
      {submitted ? (
        <Card className="paper-texture mb-4">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <div className="font-display text-2xl font-semibold">答对 {score} / {set.questions.length}</div>
              <p className="mt-1 text-xs text-muted-foreground">错题已加入错题本</p>
            </div>
            <Button variant="outline" asChild><a href="#/reading">返回阅读列表</a></Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
        <Passage text={set.passage} />
        <div className="space-y-3">
          {set.questions.map((q, qi) => (
            <Card key={q.id} className="paper-texture">
              <CardContent className="p-5">
                <div className="flex gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs text-muted-foreground">{qi + 1}</span>
                  <p className="font-display text-[15px] font-medium leading-relaxed">{q.stem}</p>
                </div>
                <div className="mt-4 space-y-2">
                  {q.options.map((opt, i) => {
                    const selected = answers[q.id] === i
                    const correct = submitted && i === q.answer
                    const wrong = submitted && selected && i !== q.answer
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={submitted}
                        onClick={() => setAnswers({ ...answers, [q.id]: i })}
                        className={cn(
                          'flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                          !submitted && 'hover:border-primary/30 hover:bg-secondary/40',
                          selected && !submitted && 'border-primary/40 bg-secondary/60',
                          correct && 'border-emerald-300 bg-emerald-50 text-emerald-900',
                          wrong && 'border-rose-300 bg-rose-50 text-rose-900',
                        )}
                      >
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-secondary text-[11px] text-muted-foreground">{['A', 'B', 'C', 'D'][i]}</span>
                        <span>{opt}</span>
                      </button>
                    )
                  })}
                </div>
                {resultLine(q, submitted, wrongIds)}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {!submitted ? (
        <div className="sticky bottom-0 mt-5 flex items-center justify-between gap-3 bg-background/95 py-3 backdrop-blur">
          <span className="text-xs text-muted-foreground">{answered} / {set.questions.length} 已作答</span>
          <Button onClick={submit} disabled={answered < set.questions.length}>交卷</Button>
        </div>
      ) : null}
    </div>
  )
}

export function ClozeRunner({ id }) {
  useCoreReady()
  const core = window.App?.core
  const set = (window.CET4_CLOZE || []).find((x) => x.id === id)
  const [answers, setAnswers] = useState({})
  const [active, setActive] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)

  if (!set) return <div className="py-20 text-center text-sm text-muted-foreground">题目不存在</div>

  function pick(word) {
    if (submitted) return
    let target = active
    if (!target) {
      for (let n = 1; n <= set.blanks.length; n++) if (!answers[n]) { target = n; break }
    }
    if (!target) return
    const next = { ...answers }
    Object.keys(next).forEach((k) => { if (next[k] === word) delete next[k] })
    next[target] = word
    setAnswers(next)
    setActive(null)
  }

  function submit() {
    let n = 0
    set.blanks.forEach((b) => {
      const ok = answers[b.no] === b.answer
      if (ok) n += 1
      core.recordQuestion(set.id + '-b' + b.no, ok)
      if (!ok) core.wrongQuestion(set.id + '-b' + b.no, 'cloze', set.id, {
        stem: '选词填空 · 第 ' + b.no + ' 空', answer: b.answer, explain: b.explain, title: set.title, type: '选词填空',
      })
    })
    core.recordSet('reading', set.id, n, set.blanks.length)
    setScore(n)
    setSubmitted(true)
  }

  const parts = String(set.passage).split(/(\{\{\d+\}\})/)
  return (
    <div>
      <RunnerTop title={set.title} meta={`选词填空 · ${set.blanks.length} 空`} />
      {submitted ? <div className="mb-4 rounded-xl border bg-card p-4 font-display text-lg">答对 {score} / {set.blanks.length} <a className="ml-3 text-xs text-primary underline" href="#/reading">返回列表</a></div> : null}
      <div className="grid gap-4">
        <Card className="paper-texture">
          <CardContent className="p-6 font-display text-[15px] leading-[2.2]">
            {parts.map((p, i) => {
              const m = /^\{\{(\d+)\}\}$/.exec(p)
              if (!m) return <span key={i}>{p}</span>
              const no = +m[1]
              const val = answers[no]
              const def = set.blanks.find((b) => b.no === no)
              const bank = val ? set.bank.find((b) => b.k === val) : null
              const ok = submitted && val === def.answer
              return (
                <button
                  key={i}
                  type="button"
                  disabled={submitted}
                  onClick={() => setActive(active === no ? null : no)}
                  className={cn('mx-1 inline-flex min-w-16 items-center justify-center rounded-md border-b-2 px-2 py-1 text-sm',
                    active === no && 'border-primary bg-secondary',
                    !active && !submitted && 'border-border bg-secondary/50',
                    ok && 'border-emerald-400 bg-emerald-50',
                    submitted && !ok && 'border-rose-400 bg-rose-50')}
                >
                  {bank ? bank.w : no}
                </button>
              )
            })}
          </CardContent>
        </Card>
      </div>
      <Card className="paper-texture mt-4">
        <CardContent className="p-5">
          <div className="mb-2 text-xs text-muted-foreground">备选词</div>
          <div className="flex flex-wrap gap-2">
            {set.bank.map((w) => (
              <button key={w.k} type="button" disabled={submitted} onClick={() => pick(w.k)} className={cn('rounded-md border bg-card px-3 py-2 text-left text-sm', Object.values(answers).includes(w.k) && 'opacity-40')}>
                <strong className="font-display">{w.w}</strong> <span className="text-[10px] text-muted-foreground">{w.pos}</span>
              </button>
            ))}
          </div>
          {!submitted ? <Button className="mt-4" onClick={submit} disabled={Object.keys(answers).length < set.blanks.length}>交卷</Button> : null}
        </CardContent>
      </Card>
    </div>
  )
}

export function MatchingRunner({ id }) {
  useCoreReady()
  const core = window.App?.core
  const set = (window.CET4_MATCHING || []).find((x) => x.id === id)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  if (!set) return <div className="py-20 text-center text-sm text-muted-foreground">题目不存在</div>

  function submit() {
    let n = 0
    set.statements.forEach((st) => {
      const ok = answers[st.id] === st.answer
      if (ok) n += 1
      core.recordQuestion(st.id, ok)
      if (!ok) core.wrongQuestion(st.id, 'matching', set.id, { stem: st.text, answer: st.answer, explain: st.explain, title: set.title, type: '长篇匹配' })
    })
    core.recordSet('reading', set.id, n, set.statements.length)
    setScore(n)
    setSubmitted(true)
  }

  return (
    <div>
      <RunnerTop title={set.title} meta={`长篇匹配 · ${set.statements.length} 题`} />
      {submitted ? <div className="mb-4 rounded-xl border bg-card p-4 font-display text-lg">答对 {score} / {set.statements.length} <a className="ml-3 text-xs text-primary underline" href="#/reading">返回列表</a></div> : null}
      <div className="grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
        <Card className="paper-texture">
          <CardContent className="space-y-4 p-6 font-display text-[15px] leading-relaxed">
            {set.paragraphs.map((p) => (
              <div key={p.k} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs text-muted-foreground">{p.k}</span>
                <p>{p.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="space-y-2">
          {set.statements.map((st, i) => {
            const value = answers[st.id] || ''
            const ok = submitted && value === st.answer
            return (
              <div key={st.id} className={cn('rounded-lg border bg-card p-4', submitted && (ok ? 'border-emerald-300 bg-emerald-50/60' : 'border-rose-300 bg-rose-50/60'))}>
                <div className="flex gap-2">
                  <span className="text-xs text-muted-foreground">{i + 1}</span>
                  <p className="text-sm leading-relaxed">{st.text}</p>
                </div>
                <select
                  disabled={submitted}
                  value={value}
                  onChange={(e) => setAnswers({ ...answers, [st.id]: e.target.value })}
                  className="mt-3 h-9 w-full rounded-md border bg-card px-2 text-sm"
                >
                  <option value="">选择段落</option>
                  {set.paragraphs.map((p) => <option key={p.k} value={p.k}>{p.k}</option>)}
                </select>
                {submitted ? <p className="mt-2 text-xs text-muted-foreground">答案 {st.answer} · {st.explain}</p> : null}
              </div>
            )
          })}
          {!submitted ? <Button className="w-full" onClick={submit} disabled={Object.keys(answers).length < set.statements.length}>交卷</Button> : null}
        </div>
      </div>
    </div>
  )
}
