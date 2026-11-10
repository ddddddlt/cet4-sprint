import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Clock, FileText, Play, RotateCcw, X } from 'lucide-react'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Progress } from '../components/ui/progress'
import { cn } from '../lib/utils'
import { clearExam, evaluate, listPapers, loadExam, makeExam, paperLabel, saveExam, startExam } from '../lib/exam'

const SECTIONS = [
  { key: 'writing', label: '写作', minutes: 30 },
  { key: 'reading', label: '阅读', minutes: 40 },
  { key: 'cloze', label: '选词', minutes: 10 },
  { key: 'matching', label: '匹配', minutes: 15 },
  { key: 'translation', label: '翻译', minutes: 30 },
]

function useCoreReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => { if (window.App?.core) { window.App.core.load(); setReady(true) } }, [])
  return ready
}

function fmt(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

function words(text) {
  return (String(text || '').trim().match(/[A-Za-z0-9'’-]+/g) || []).length
}

export function ExamList() {
  useCoreReady()
  const papers = useMemo(() => listPapers(), [])
  return (
    <div className="mx-auto max-w-[980px]">
      <div className="mb-8">
        <div className="t-eyebrow">FULL MOCK EXAM</div>
        <h1 className="t-display mt-2">整套模考</h1>
        <p className="t-meta mt-2">写作 + 阅读 + 选词 + 匹配 + 翻译，按 125 分钟整套作答。听力请到听力专项练习。</p>
      </div>
      <div className="mb-4 rounded-xl border border-warning-soft bg-warning-soft px-4 py-3 text-xs text-warning">
        当前题库中的整套卷覆盖写作、阅读、选词、匹配、翻译；听力音频不在套卷数据内，单独进入听力专项。
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {papers.map(({ paper, index }) => {
          const exam = makeExam(paper, index)
          const state = loadExam(exam.id)
          const score = state?.result?.score
          const running = state && !state.submitted
          const href = `#/exam/${index}`
          return (
            <div key={exam.id} className="glass-card group flex flex-col p-5 transition-colors hover:border-white/20">
              <a href={href} className="block">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge variant="secondary">{paper.source?.year || '—'} · {paper.source?.month || '—'} 月</Badge>
                    <h2 className="mt-3 font-display text-xl leading-tight">{paperLabel(paper, index)}</h2>
                  </div>
                  <Badge variant={state?.submitted ? 'default' : running ? 'outline' : 'muted'}>
                    {state?.submitted ? `${score} / ${state.result.total}` : running ? '进行中' : '未开始'}
                  </Badge>
                </div>
                <p className="t-meta mt-2">写作 1 · 客观题 30 · 翻译 1 · 125 分钟</p>
              </a>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--faint)]">
                <span>{state?.submitted ? '已完成，可查看解析' : running ? '继续上次作答' : '按考试节奏完成整套'}</span>
                <div className="flex items-center gap-2">
                  {running ? <a href={href} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-primary/30 bg-[var(--accent-soft)] px-3 text-primary">继续练习 <ArrowRight className="h-3.5 w-3.5" /></a> : null}
                  {state?.submitted ? <a href={href} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-primary/30 bg-[var(--accent-soft)] px-3 text-primary">查看结果 <ArrowRight className="h-3.5 w-3.5" /></a> : null}
                  {!state ? <a href={href} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-primary/30 bg-[var(--accent-soft)] px-3 text-primary">开始模考 <ArrowRight className="h-3.5 w-3.5" /></a> : null}
                  {state ? <button type="button" onClick={() => { clearExam(exam.id); window.location.hash = href }} className="inline-flex min-h-9 items-center rounded-lg px-2 text-muted-foreground hover:text-foreground">重新练习</button> : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function sectionProgress(exam, state, key) {
  if (key === 'writing') return words(state.texts.writing) > 0
  if (key === 'translation') return words(state.texts.translation) > 0
  if (key === 'reading') {
    const total = exam.reading.reduce((n, s) => n + s.questions.length, 0)
    return Object.keys(state.answers.reading).length >= total
  }
  if (key === 'cloze') return Object.keys(state.answers.cloze).length >= (exam.cloze?.blanks?.length || 0)
  return Object.keys(state.answers.matching).length >= (exam.matching?.statements?.length || 0)
}

export function ExamRunner({ index }) {
  useCoreReady()
  const paper = (window.CET4_PAPERS || [])[index]
  const exam = paper ? makeExam(paper, index) : null
  const [state, setState] = useState(() => (exam ? loadExam(exam.id) : null))
  const [now, setNow] = useState(Date.now())
  const [showReview, setShowReview] = useState(false)
  const submittingRef = useRef(false)

  useEffect(() => {
    if (!state || state.submitted) return undefined
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [state && state.submitted])

  function update(patch) {
    setState((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      saveExam(exam.id, next)
      return next
    })
  }

  function answer(section, key, value) {
    setState((prev) => {
      if (!prev) return prev
      const next = { ...prev, answers: { ...prev.answers, [section]: { ...prev.answers[section], [key]: value } } }
      saveExam(exam.id, next)
      return next
    })
  }

  function text(kind, value) {
    setState((prev) => {
      if (!prev) return prev
      const next = { ...prev, texts: { ...prev.texts, [kind]: value } }
      saveExam(exam.id, next)
      return next
    })
  }

  function begin() {
    if (!exam) return
    setState(startExam(exam))
  }

  function submit(auto = false) {
    if (!exam || !state || state.submitted || submittingRef.current) return
    if (!auto && !window.confirm('交卷后本套作答不能再改，确定交卷？')) return
    submittingRef.current = true
    const result = evaluate(exam, state)
    recordResult(exam, state, result)
    const next = { ...state, submitted: true, result, submittedAt: Date.now() }
    saveExam(exam.id, next)
    setState(next)
    submittingRef.current = false
  }

  useEffect(() => {
    if (!state || state.submitted) return
    if (now >= state.endsAt) submit(true)
  }, [now, state])

  if (!exam) return <div className="py-20 text-center text-sm text-muted-foreground">试卷不存在。</div>

  if (!state) {
    return (
      <div className="mx-auto max-w-[760px]">
        <a href="#/exam" className="mb-6 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> 整套模考</a>
        <Card className="p-0">
          <CardContent className="p-7 sm:p-10">
            <Badge variant="secondary">FULL MOCK</Badge>
            <h1 className="t-display mt-4">{exam.label}</h1>
            <p className="t-meta mt-2">125 分钟 · 写作 / 阅读 / 选词 / 匹配 / 翻译</p>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['写作', '1 篇'],
                ['阅读', exam.reading.reduce((n, s) => n + s.questions.length, 0) + ' 题'],
                ['选词', (exam.cloze?.blanks?.length || 0) + ' 题'],
                ['匹配', (exam.matching?.statements?.length || 0) + ' 题'],
              ].map(([k, v]) => <div key={k} className="rounded-xl border border-white/10 bg-white/[.04] p-3"><div className="text-xs text-[var(--faint)]">{k}</div><div className="mt-1 t-num">{v}</div></div>)}
            </div>
            <div className="mt-6 rounded-xl border border-warning-soft bg-warning-soft p-4 text-xs leading-relaxed text-warning">
              本卷不含听力音频；听力请使用「听力」专项。交卷只统计阅读、选词、匹配的客观题，写作和翻译保留原文供自评。
            </div>
            <Button variant="primary" className="mt-7" onClick={begin}><Play className="h-4 w-4" /> 开始整套模考</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state.submitted) return <ExamResult exam={exam} state={state} showReview={showReview} setShowReview={setShowReview} />

  const remaining = state.endsAt - now
  const answered = SECTIONS.filter((s) => sectionProgress(exam, state, s.key)).length

  return (
    <div className="mx-auto max-w-[1040px]">
      <div className="glass-card mb-4 flex flex-wrap items-center gap-3 px-4 py-3">
        <a href="#/exam" className="rail-icon h-9 w-9 shrink-0" aria-label="退出模考"><ArrowLeft className="h-4 w-4" /></a>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{exam.label}</div>
          <div className="mt-0.5 text-[11px] text-[var(--faint)]">已答 {answered} / {SECTIONS.length} 个部分</div>
        </div>
        <div className={cn('chip t-num', remaining < 5 * 60 * 1000 && 'text-danger border-danger-soft')}>
          <Clock className="h-3.5 w-3.5" /> {fmt(remaining)}
        </div>
        <Button variant="primary" size="sm" onClick={() => submit(false)}>交卷</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[176px_minmax(0,1fr)] lg:items-start">
        <Card className="p-0 lg:sticky lg:top-20">
          <CardContent className="p-3">
            <div className="mb-2 px-2 t-eyebrow">SECTIONS</div>
            <div className="flex gap-1 overflow-x-auto lg:flex-col">
              {SECTIONS.map((section) => (
                <button key={section.key} type="button" onClick={() => update({ section: section.key })}
                  className={cn('flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-2.5 text-left text-xs text-muted-foreground lg:w-full',
                    state.section === section.key && 'bg-white/[.07] text-foreground')}>
                  <span className={cn('flex h-4 w-4 items-center justify-center rounded-full border', sectionProgress(exam, state, section.key) ? 'border-primary bg-primary text-primary-foreground' : 'border-white/15')}>
                    {sectionProgress(exam, state, section.key) ? <Check className="h-2.5 w-2.5" /> : null}
                  </span>
                  {section.label}
                </button>
              ))}
            </div>
            <Button variant="outline" className="mt-3 w-full" onClick={() => submit(false)}>交卷</Button>
          </CardContent>
        </Card>

        <div className="min-w-0">
          {state.section === 'writing' && <WritingSection exam={exam} state={state} text={text} />}
          {state.section === 'reading' && <ReadingSection exam={exam} state={state} answer={answer} />}
          {state.section === 'cloze' && <ClozeSection exam={exam} state={state} answer={answer} />}
          {state.section === 'matching' && <MatchingSection exam={exam} state={state} answer={answer} />}
          {state.section === 'translation' && <TranslationSection exam={exam} state={state} text={text} />}
        </div>
      </div>
    </div>
  )
}

function WritingSection({ exam, state, text }) {
  if (!exam.writing) return <Card><CardContent className="p-6 text-sm text-muted-foreground">本套没有写作题。</CardContent></Card>
  return (
    <Card className="p-0">
      <CardContent className="p-6">
        <div className="t-eyebrow">PART I · WRITING · 30 MIN</div>
        <p className="mt-4 font-display text-[15px] leading-loose">{exam.writing.prompt}</p>
        <div className="mt-5 flex justify-between text-xs text-[var(--faint)]"><span>你的作文</span><span>{words(state.texts.writing)} 词</span></div>
        <textarea value={state.texts.writing} onChange={(e) => text('writing', e.target.value)}
          placeholder="Write your essay here…"
          className="mt-2 min-h-[320px] w-full resize-y rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm leading-relaxed outline-none focus:border-[rgba(111,92,255,.5)]" />
        <p className="mt-2 text-[11px] text-[var(--faint)]">建议 120–180 词 · 可随时切换部分，作答自动保存</p>
      </CardContent>
    </Card>
  )
}

function ReadingSection({ exam, state, answer }) {
  if (!exam.reading.length) return <Card><CardContent className="p-6 text-sm text-muted-foreground">本套没有阅读题。</CardContent></Card>
  return (
    <div className="space-y-4">
      {exam.reading.map((set, si) => (
        <Card key={set.id} className="p-0">
          <CardContent className="p-6">
            <div className="t-eyebrow">READING · PASSAGE {si + 1}</div>
            <h2 className="mt-2 font-display text-xl">{set.title}</h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-foreground/85">
              {String(set.passage || '').split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </CardContent>
        </Card>
      ))}
      {exam.reading.map((set) => (
        <Card key={set.id + '-q'} className="p-0">
          <CardContent className="p-6">
            <div className="t-eyebrow">QUESTIONS · {set.title}</div>
            <div className="mt-4 space-y-5">
              {set.questions.map((q, qi) => (
                <div key={q.id}>
                  <p className="text-sm font-medium leading-relaxed">{qi + 1}. {q.stem}</p>
                  <div className="mt-2 space-y-1.5">
                    {(q.options || []).map((opt, i) => (
                      <button key={i} type="button" onClick={() => answer('reading', q.id, i)}
                        className={cn('flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:border-white/20 hover:bg-white/[.04]',
                          state.answers.reading[q.id] === i ? 'border-[rgba(111,92,255,.5)] bg-[rgba(111,92,255,.12)]' : 'border-white/10 bg-white/[.02]')}>
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white/[.06] text-[11px] text-[var(--faint)]">{['A', 'B', 'C', 'D'][i]}</span>
                        <span>{opt}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ClozeSection({ exam, state, answer }) {
  const [active, setActive] = useState(null)
  const cloze = exam.cloze
  if (!cloze) return <Card><CardContent className="p-6 text-sm text-muted-foreground">本套没有选词填空。</CardContent></Card>
  const parts = String(cloze.passage).split(/(\{\{\d+\}\})/)
  return (
    <Card className="p-0">
      <CardContent className="p-6">
        <div className="t-eyebrow">BANKED CLOZE · 10 MIN</div>
        <div className="mt-4 font-display text-[15px] leading-[2.2]">
          {parts.map((part, i) => {
            const m = /^\{\{(\d+)\}\}$/.exec(part)
            if (!m) return <span key={i}>{part}</span>
            const no = +m[1]
            const chosen = state.answers.cloze[no]
            const bank = chosen ? cloze.bank.find((b) => b.k === chosen) : null
            return (
              <button key={i} type="button" onClick={() => setActive(active === no ? null : no)} className={cn('mx-1 inline-flex min-w-20 items-center justify-center rounded-md border-b-2 px-2 py-1 text-sm', active === no && 'border-primary bg-[rgba(111,92,255,.16)]', !active && chosen && 'border-primary bg-[rgba(111,92,255,.12)]', !active && !chosen && 'border-white/20 bg-white/[.04]')}>
                {bank ? bank.w : no}
              </button>
            )
          })}
        </div>
        <div className="mt-6 border-t border-white/10 pt-4">
          <div className="mb-2 text-xs text-[var(--faint)]">备选词（点击填入当前空；再次点击其他空可替换）</div>
          <div className="flex flex-wrap gap-2">
            {cloze.bank.map((b) => (
              <button key={b.k} type="button" onClick={() => {
                let target = active
                if (!target) {
                  const empty = cloze.blanks.find((x) => !state.answers.cloze[x.no])
                  target = empty ? empty.no : 1
                }
                answer('cloze', target, b.k)
                setActive(null)
              }} className="rounded-lg border border-white/10 bg-white/[.04] px-3 py-2 text-left text-sm hover:border-white/20">
                <span className="font-medium">{b.w}</span> <span className="text-[11px] text-[var(--faint)]">{b.k}</span>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MatchingSection({ exam, state, answer }) {
  const matching = exam.matching
  if (!matching) return <Card><CardContent className="p-6 text-sm text-muted-foreground">本套没有长篇匹配。</CardContent></Card>
  return (
    <div className="space-y-4">
      <Card className="p-0">
        <CardContent className="p-6">
          <div className="t-eyebrow">MATCHING · 15 MIN</div>
          <div className="mt-4 space-y-3 text-sm leading-relaxed">
            {matching.paragraphs.map((p) => (
              <p key={p.k}><strong className="mr-2 text-primary">{p.k}</strong>{p.text}</p>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card className="p-0">
        <CardContent className="p-6">
          <div className="t-eyebrow">STATEMENTS</div>
          <div className="mt-4 space-y-3">
            {matching.statements.map((st, i) => (
              <div key={st.id} className="rounded-lg border border-white/10 bg-white/[.02] p-3">
                <p className="text-sm leading-relaxed">{i + 1}. {st.text}</p>
                <select value={state.answers.matching[st.id] || ''} onChange={(e) => answer('matching', st.id, e.target.value)}
                  className="mt-2 h-9 w-full rounded-md border border-white/10 bg-[var(--surface)] px-2 text-sm">
                  <option value="">选择段落</option>
                  {matching.paragraphs.map((p) => <option key={p.k} value={p.k}>{p.k}</option>)}
                </select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function TranslationSection({ exam, state, text }) {
  if (!exam.translation) return <Card><CardContent className="p-6 text-sm text-muted-foreground">本套没有翻译题。</CardContent></Card>
  return (
    <Card className="p-0">
      <CardContent className="p-6">
        <div className="t-eyebrow">PART · TRANSLATION · 30 MIN</div>
        <p className="mt-4 font-display text-[15px] leading-loose">{exam.translation.zh}</p>
        <div className="mt-5 flex justify-between text-xs text-[var(--faint)]"><span>你的译文</span><span>{words(state.texts.translation)} 词</span></div>
        <textarea value={state.texts.translation} onChange={(e) => text('translation', e.target.value)}
          placeholder="Write your translation here…"
          className="mt-2 min-h-[260px] w-full resize-y rounded-xl border border-white/10 bg-white/[.03] p-4 text-sm leading-relaxed outline-none focus:border-[rgba(111,92,255,.5)]" />
        <p className="mt-2 text-[11px] text-[var(--faint)]">交卷后可查看逐句参考译文并自评。</p>
      </CardContent>
    </Card>
  )
}

function recordResult(exam, state, result) {
  const core = window.App?.core
  if (!core) return
  const seconds = Math.max(1, Math.round((Date.now() - state.startedAt) / 1000))
  exam.reading.forEach((set) => {
    let n = 0
    set.questions.forEach((q) => {
      const ok = state.answers.reading[q.id] === q.answer
      if (ok) n += 1
      core.recordQuestion(q.id, ok)
      if (!ok) core.wrongQuestion(q.id, 'reading', set.id, { stem: q.stem, answer: ['A', 'B', 'C', 'D'][q.answer] + '. ' + q.options[q.answer], explain: q.explain, title: set.title, type: '仔细阅读' })
      else { const st = core.getState(); delete st.wrong.questions[q.id]; core.save() }
    })
    core.recordSet('reading', set.id, n, set.questions.length, seconds)
  })
  if (exam.cloze) {
    let n = 0
    exam.cloze.blanks.forEach((b) => {
      const ok = state.answers.cloze[b.no] === b.answer
      if (ok) n += 1
      core.recordQuestion(exam.cloze.id + '-b' + b.no, ok)
      if (!ok) core.wrongQuestion(exam.cloze.id + '-b' + b.no, 'cloze', exam.cloze.id, { stem: '选词填空 · 第 ' + b.no + ' 空', answer: b.answer, explain: b.explain, title: exam.cloze.title, type: '选词填空' })
    })
    core.recordSet('reading', exam.cloze.id, n, exam.cloze.blanks.length, seconds)
  }
  if (exam.matching) {
    let n = 0
    exam.matching.statements.forEach((st) => {
      const ok = state.answers.matching[st.id] === st.answer
      if (ok) n += 1
      core.recordQuestion(st.id, ok)
      if (!ok) core.wrongQuestion(st.id, 'matching', exam.matching.id, { stem: st.text, answer: st.answer, explain: st.explain, title: exam.matching.title, type: '长篇匹配' })
    })
    core.recordSet('reading', exam.matching.id, n, exam.matching.statements.length, seconds)
  }
  if (exam.writing) core.recordWriting(exam.writing.id, result.writingWords, seconds)
  if (exam.translation) core.recordSet('translation', exam.translation.id, 0, 15, seconds)
}

function ExamResult({ exam, state, showReview, setShowReview }) {
  const r = state.result
  return (
    <div className="mx-auto max-w-[980px]">
      <a href="#/exam" className="mb-6 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> 整套模考</a>
      <Card className="p-0">
        <CardContent className="p-7 sm:p-10">
          <div className="t-eyebrow">EXAM RESULT</div>
          <h1 className="t-display mt-2">{exam.label}</h1>
          <div className="mt-6 flex flex-wrap items-end gap-4">
            <div className="t-num text-[42px] leading-none text-primary">{r.score}<span className="text-base text-[var(--faint)]"> / {r.total}</span></div>
            <div className="pb-1 text-sm text-[var(--faint)]">客观题正确率 {r.pct}%</div>
          </div>
          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            {[['阅读', r.reading], ['选词', r.cloze], ['匹配', r.matching]].map(([name, s]) => (
              <div key={name} className="rounded-xl border border-white/10 bg-white/[.04] p-4">
                <div className="text-xs text-[var(--faint)]">{name}</div>
                <div className="mt-1 t-num">{s.score} / {s.total}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-[var(--faint)]">写作 {r.writingWords} 词 · 翻译 {r.translationWords} 词。写作和翻译不自动打分，可查看参考后自评。</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => setShowReview((v) => !v)}><FileText className="h-4 w-4" /> {showReview ? '收起解析' : '查看解析'}</Button>
            <Button variant="outline" onClick={() => { clearExam(exam.id); window.location.reload() }}><RotateCcw className="h-4 w-4" /> 重新开始</Button>
            <Button variant="ghost" asChild><a href="#/exam">返回列表</a></Button>
          </div>
        </CardContent>
      </Card>

      {showReview ? (
        <div className="mt-4 space-y-4">
          {exam.reading.map((set) => (
            <Card key={set.id} className="p-0">
              <CardContent className="p-6">
                <h2 className="t-section">{set.title}</h2>
                <div className="mt-4 space-y-4">
                  {set.questions.map((q, i) => {
                    const picked = state.answers.reading[q.id]
                    const ok = picked === q.answer
                    return (
                      <div key={q.id} className="rounded-lg border border-white/10 p-3">
                        <div className="flex gap-2 text-sm"><span className={ok ? 'text-success' : 'text-danger'}>{ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}</span><span>{i + 1}. {q.stem}</span></div>
                        <div className="mt-2 text-xs text-[var(--faint)]">你的答案：{picked == null ? '未答' : ['A', 'B', 'C', 'D'][picked]} · 正确答案：{['A', 'B', 'C', 'D'][q.answer]}</div>
                        {q.explain ? <p className="mt-1 text-xs text-[var(--muted)]">{q.explain}</p> : null}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
          {exam.writing ? (
            <Card className="p-0"><CardContent className="p-6"><h2 className="t-section">写作参考</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{exam.writing.sample}</p><details className="mt-3"><summary className="cursor-pointer text-xs text-primary">中文译文</summary><p className="mt-2 text-xs text-muted-foreground">{exam.writing.sampleZh}</p></details></CardContent></Card>
          ) : null}
          {exam.translation ? (
            <Card className="p-0"><CardContent className="p-6"><h2 className="t-section">翻译参考</h2><div className="mt-3 space-y-3">{(exam.translation.sentences || []).map((s, i) => <div key={i}><p className="text-xs text-[var(--faint)]">{s.zh}</p><p className="mt-1 text-sm">{s.en}</p></div>)}</div></CardContent></Card>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
