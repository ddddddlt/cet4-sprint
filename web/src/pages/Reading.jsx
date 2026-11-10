import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, FileText, Layers, X } from 'lucide-react'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Progress } from '../components/ui/progress'
import { cn } from '../lib/utils'
import { restartPractice } from '../lib/practice'
import { toCetStandard } from '../lib/cetScore'

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
                const saved = core ? core.getSession(group.route, set.id) : null
                const total = set.questions?.length || set.statements?.length || set.blanks?.length || 0
                const href = `#/${group.route}/${set.id}`
                return (
                  <div key={set.id} className="glass-card group p-5 transition-colors hover:border-white/20">
                    <a href={href} className="block">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="secondary" className="font-normal">{set.type}</Badge>
                        <Badge variant={saved ? 'outline' : att ? 'default' : 'muted'} className="font-normal">{saved ? '进行中' : att ? `最好 ${att.best}/${att.total} · 标准分 ${toCetStandard('reading', att.best, att.total)}` : '未做'}</Badge>
                      </div>
                      <h3 className="mt-4 font-display text-lg font-semibold leading-snug">{set.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{set.topic || set.intro || ''}</p>
                    </a>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>{total} 题 · 约 {set.minutes} 分钟</span>
                      <div className="flex items-center gap-2">
                        {saved ? <a href={href} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-primary/30 bg-[var(--accent-soft)] px-3 text-primary">继续练习 <ArrowRight className="h-3.5 w-3.5" /></a> : null}
                        {!saved && !att ? <a href={href} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-primary/30 bg-[var(--accent-soft)] px-3 text-primary">开始练习 <ArrowRight className="h-3.5 w-3.5" /></a> : null}
                        {saved || att ? <button type="button" onClick={() => { restartPractice(core, group.route, set.id); window.location.hash = href }} className="inline-flex min-h-9 items-center rounded-lg px-2 text-muted-foreground hover:text-foreground">重新练习</button> : null}
                      </div>
                    </div>
                  </div>
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
    <Card className="">
      <CardContent className="p-6 sm:p-8">
        <div className="space-y-4 font-display text-sm leading-relaxed text-foreground/90">
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
        {ok ? <Check className="h-3.5 w-3.5 text-success" /> : <X className="h-3.5 w-3.5 text-danger" />}
        {ok ? '回答正确' : '回答错误'}
      </div>
      <p className="mt-1 text-muted-foreground">{q.explain}</p>
    </div>
  )
}

export function ReadingRunner({ id, reviewQ }) {
  useCoreReady()
  const core = window.App?.core
  const set = (window.CET4_READING || []).find((x) => x.id === id)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [started, setStarted] = useState(Date.now())
  const [elapsed, setElapsed] = useState(0)
  const [score, setScore] = useState(0)
  const [resumed, setResumed] = useState(false)

  useEffect(() => {
    if (!core || !id) return
    const saved = core.getSession('reading', id)
    if (saved) {
      setAnswers(saved.answers || {})
      setStarted(saved.startedAt || Date.now())
      setResumed(true)
    } else {
      setStarted(Date.now())
    }
  }, [id])

  useEffect(() => {
    if (!reviewQ) return
    const el = document.getElementById('q-' + reviewQ)
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [reviewQ, submitted])

  useEffect(() => {
    if (submitted) return
    const t = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(t)
  }, [submitted, started])

  if (!set) return <div className="py-20 text-center text-sm text-muted-foreground">题目不存在</div>
  function pickAnswer(qid, value) {
    const next = { ...answers, [qid]: value }
    setAnswers(next)
    core.saveSession('reading', set.id, { answers: next, startedAt: started })
  }

  function restart() {
    core.clearSession('reading', set.id)
    setAnswers({})
    setStarted(Date.now())
    setResumed(false)
    setSubmitted(false)
  }

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
        passage: set.passage, options: q.options,
      })
      else core.removeWrongQuestion(q.id)
    })
    core.recordSet('reading', set.id, n, set.questions.length, elapsed, { route: 'reading', title: set.title, zh: set.topic, type: set.type })
    core.clearSession('reading', set.id)
    setResumed(false)
    setScore(n)
    setSubmitted(true)
    window.scrollTo(0, 0)
  }

  return (
    <div>
      <RunnerTop title={set.title} meta={`${set.type} · ${set.questions.length} 题 · ${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`} />
      {reviewQ ? <div className="mb-3 rounded-lg border border-warning-soft bg-warning-soft px-4 py-2.5 text-xs text-warning">错题回顾：已定位到第 {set.questions.findIndex((q) => q.id === reviewQ) + 1} 题，答对后会从错题本移除。</div> : null}
      {resumed && !submitted ? <div className="mb-3 flex items-center justify-between rounded-lg border bg-card px-4 py-2.5 text-xs"><span className="text-muted-foreground">继续上次练习 · 已作答 {answered} 题</span><button type="button" className="text-primary" onClick={restart}>重新开始</button></div> : null}
      {submitted ? (
        <Card className="mb-4">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <div className="font-display text-2xl font-semibold">答对 {score} / {set.questions.length}</div>
              <p className="mt-1 text-xs text-muted-foreground">错题已加入错题本 · 四级阅读标准分（估算） <span className="text-foreground">{toCetStandard('reading', score, set.questions.length)} / 248.5</span></p>
            </div>
            <Button variant="outline" asChild><a href="#/reading">返回阅读列表</a></Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
        <Passage text={set.passage} />
        <div className="space-y-3">
          {set.questions.map((q, qi) => (
            <Card key={q.id} id={'q-' + q.id} className={cn('', reviewQ === q.id && 'ring-2 ring-primary/40')}>
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
                      <button
                        key={i}
                        type="button"
                        disabled={submitted}
                        onClick={() => pickAnswer(q.id, i)}
                        className={cn(
                          'flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                          !submitted && 'hover:border-primary/30 hover:bg-secondary/40',
                          selected && !submitted && 'border-primary/40 bg-secondary/60',
                          correct && 'border-success-soft bg-success-soft text-success',
                          wrong && 'border-danger-soft bg-danger-soft text-danger',
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
  const [resumed, setResumed] = useState(false)

  useEffect(() => {
    if (!core || !id) return
    const saved = core.getSession('cloze', id)
    if (saved) { setAnswers(saved.answers || {}); setResumed(true) }
  }, [id])

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
    core.saveSession('cloze', set.id, { answers: next })
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
        passage: set.passage, context: '备选词：' + set.bank.map((x) => x.w).join(' / '),
      })
      else core.removeWrongQuestion(set.id + '-b' + b.no)
    })
    core.recordSet('reading', set.id, n, set.blanks.length, undefined, { route: 'cloze', title: set.title, zh: set.topic, type: '选词填空' })
    core.clearSession('cloze', set.id)
    setScore(n)
    setSubmitted(true)
  }

  const parts = String(set.passage).split(/(\{\{\d+\}\})/)
  return (
    <div>
      <RunnerTop title={set.title} meta={`选词填空 · ${set.blanks.length} 空`} />
      {resumed && !submitted ? <div className="mb-3 rounded-lg border bg-card px-4 py-2.5 text-xs text-muted-foreground">已恢复上次作答 · 已填 {Object.keys(answers).length} 空</div> : null}
      {submitted ? <div aria-live="polite" className="glass-card mb-4 p-4 font-display text-lg">答对 {score} / {set.blanks.length} <span className="ml-2 text-sm text-muted-foreground">· 四级阅读标准分（估算） {toCetStandard('reading', score, set.blanks.length)} / 248.5</span> <a className="ml-3 text-xs text-primary underline" href="#/reading">返回列表</a></div> : null}
      <div className="grid gap-4">
        <Card className="">
          <CardContent className="p-6 font-display text-sm leading-[2.2]">
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
                    ok && 'border-success-soft bg-success-soft',
                    submitted && !ok && 'border-danger-soft bg-danger-soft')}
                >
                  {bank ? bank.w : no}
                </button>
              )
            })}
          </CardContent>
        </Card>
      </div>
      <Card className="mt-4">
        <CardContent className="p-5">
          <div className="mb-2 text-xs text-muted-foreground">备选词</div>
          <div className="flex flex-wrap gap-2">
            {set.bank.map((w) => (
              <button key={w.k} type="button" disabled={submitted} onClick={() => pick(w.k)} className={cn('rounded-md border bg-card px-3 py-2 text-left text-sm', Object.values(answers).includes(w.k) && 'opacity-40')}>
                <strong className="font-display">{w.w}</strong> <span className="text-[11px] text-muted-foreground">{w.pos}</span>
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
  const [resumed, setResumed] = useState(false)
  useEffect(() => {
    if (!core || !id) return
    const saved = core.getSession('matching', id)
    if (saved) { setAnswers(saved.answers || {}); setResumed(true) }
  }, [id])
  if (!set) return <div className="py-20 text-center text-sm text-muted-foreground">题目不存在</div>

  function pick(stId, value) {
    const next = { ...answers, [stId]: value }
    setAnswers(next)
    core.saveSession('matching', set.id, { answers: next })
  }

  function submit() {
    let n = 0
    set.statements.forEach((st) => {
      const ok = answers[st.id] === st.answer
      if (ok) n += 1
      core.recordQuestion(st.id, ok)
      if (!ok) core.wrongQuestion(st.id, 'matching', set.id, {
        stem: st.text, answer: st.answer, explain: st.explain, title: set.title, type: '长篇匹配',
        context: set.paragraphs.map((x) => x.k + '. ' + x.text).join('\n\n'),
      })
      else core.removeWrongQuestion(st.id)
    })
    core.recordSet('reading', set.id, n, set.statements.length, undefined, { route: 'matching', title: set.title, zh: set.topic, type: '长篇匹配' })
    core.clearSession('matching', set.id)
    setScore(n)
    setSubmitted(true)
  }

  return (
    <div>
      <RunnerTop title={set.title} meta={`长篇匹配 · ${set.statements.length} 题`} />
      {resumed && !submitted ? <div className="mb-3 rounded-lg border bg-card px-4 py-2.5 text-xs text-muted-foreground">已恢复上次作答 · 已选 {Object.keys(answers).length} 题</div> : null}
      {submitted ? <div aria-live="polite" className="glass-card mb-4 p-4 font-display text-lg">答对 {score} / {set.statements.length} <span className="ml-2 text-sm text-muted-foreground">· 四级阅读标准分（估算） {toCetStandard('reading', score, set.statements.length)} / 248.5</span> <a className="ml-3 text-xs text-primary underline" href="#/reading">返回列表</a></div> : null}
      <div className="grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
        <Card className="">
          <CardContent className="space-y-4 p-6 font-display text-sm leading-relaxed">
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
              <div key={st.id} className={cn('rounded-lg border bg-card p-4', submitted && (ok ? 'border-success-soft bg-success-soft' : 'border-danger-soft bg-danger-soft'))}>
                <div className="flex gap-2">
                  <span className="text-xs text-muted-foreground">{i + 1}</span>
                  <p className="text-sm leading-relaxed">{st.text}</p>
                </div>
                <select
                  disabled={submitted}
                  value={value}
                  onChange={(e) => pick(st.id, e.target.value)}
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
