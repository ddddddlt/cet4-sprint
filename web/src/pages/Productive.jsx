import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Languages, Loader2, PenLine, Sparkles } from 'lucide-react'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { gradeWithAI, saveAiGrade, savedAiGrade } from '../lib/ai'
import { restartPractice } from '../lib/practice'
import { toCetStandard } from '../lib/cetScore'

function useCoreReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => { if (window.App?.core) { window.App.core.load(); setReady(true) } }, [])
  return ready
}

function ListHead({ title, description, count }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">PRACTICE</div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      <Badge variant="outline" className="rounded-md font-normal">{count} 套</Badge>
    </div>
  )
}

function AiReview({ result, busy, error, onGrade }) {
  return (
    <Card className="mt-4 border-primary/20">
      <CardContent className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">AI REVIEW</div>
            <h2 className="mt-1 font-display text-lg font-semibold">AI 批改</h2>
            <p className="mt-1 text-xs text-muted-foreground">DeepSeek · 15 分制 · 自动换算四级标准分</p>
          </div>
          <Button variant="outline" onClick={onGrade} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? '批改中…' : result ? '重新批改' : '开始批改'}
          </Button>
        </div>
        {error ? <p className="mt-4 rounded-lg border border-danger-soft bg-danger-soft px-3 py-2 text-xs text-destructive" aria-live="polite">{error}</p> : null}
        {result ? (
          <div className="mt-5" aria-live="polite">
            <div className="flex items-end gap-3">
              <span className="font-display text-4xl font-semibold text-primary">{result.score}</span>
              <span className="pb-1 text-xs text-muted-foreground">/ 15 · {result.band || '已批改'}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">四级标准分 <span className="text-foreground">{toCetStandard(result.kind === 'writing' ? 'writing' : 'translation', result.score, 15)} / 106.5</span>（按 15 分制比例折算）</p>
            {result.summary ? <p className="mt-3 text-sm leading-relaxed">{result.summary}</p> : null}
            {result.strengths?.length ? (
              <div className="mt-4">
                <div className="text-xs font-medium text-success">做得好的</div>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-xs leading-relaxed text-muted-foreground">
                  {result.strengths.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
            ) : null}
            {result.issues?.length ? (
              <div className="mt-4">
                <div className="text-xs font-medium text-warning">需要修改</div>
                <div className="mt-2 space-y-2">
                  {result.issues.map((x, i) => (
                    <div key={i} className="rounded-lg border border-white/10 bg-secondary/30 p-3 text-xs leading-relaxed">
                      {x.quote ? <div className="text-muted-foreground">「{x.quote}」</div> : null}
                      <div className="mt-1">{x.problem}</div>
                      {x.fix ? <div className="mt-1 text-primary">→ {x.fix}</div> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {result.suggestions?.length ? (
              <div className="mt-4">
                <div className="text-xs font-medium text-primary">下一步</div>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-xs leading-relaxed text-muted-foreground">
                  {result.suggestions.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function TranslationList() {
  useCoreReady()
  const core = window.App?.core
  const sets = window.CET4_TRANSLATION || []
  return (
    <>
      <ListHead title="翻译" description="段落翻译 · 逐句对照 · AI 评分" count={sets.length} />
      <div className="grid gap-3 sm:grid-cols-2">
        {sets.map((set) => {
          const att = core ? core.attempt('translation', set.id) : null
          const draft = core ? core.getDraft(set.id) : ''
          const progress = !!draft || !!att
          const href = `#/translation/${set.id}`
          return (
            <div key={set.id} className="glass-card group p-5 transition-colors hover:border-white/20">
              <a href={href} className="block">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="font-normal">汉译英</Badge>
                  <Badge variant={att?.graded ? 'default' : 'muted'} className="font-normal">{att?.graded ? `评分 ${att.score}/15 · 标准分 ${toCetStandard('translation', att.score, 15)}` : '未做'}</Badge>
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{set.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{set.topic} · 约 {set.sentences.length} 句</p>
              </a>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{set.minutes} 分钟</span>
                <div className="flex items-center gap-2">
                  {progress ? <a href={href} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-primary/30 bg-[var(--accent-soft)] px-3 text-primary">继续练习 <ArrowRight className="h-3.5 w-3.5" /></a> : <a href={href} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-primary/30 bg-[var(--accent-soft)] px-3 text-primary">开始练习 <ArrowRight className="h-3.5 w-3.5" /></a>}
                  {progress ? <button type="button" onClick={() => { restartPractice(core, 'translation', set.id); window.location.hash = href }} className="inline-flex min-h-9 items-center rounded-lg px-2 text-muted-foreground hover:text-foreground">重新练习</button> : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

export function TranslationRunner({ id }) {
  useCoreReady()
  const core = window.App?.core
  const set = (window.CET4_TRANSLATION || []).find((x) => x.id === id)
  const [texts, setTexts] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [ai, setAi] = useState(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState('')
  const [wrongMsg, setWrongMsg] = useState('')

  useEffect(() => {
    if (!core || !set) return
    const raw = core.getDraft(set.id) || ''
    let arr = set.sentences.map(() => '')
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) arr = set.sentences.map((_, i) => parsed[i] || '')
      } catch (e) {
        arr[0] = raw
      }
    }
    setTexts(arr)
    const att = core.attempt('translation', set.id)
    if (att?.graded || att) setSubmitted(true)
    setAi(savedAiGrade('translation:' + set.id))
  }, [id])

  if (!set) return <div className="py-20 text-center text-sm text-muted-foreground">题目不存在</div>
  const words = texts.reduce((n, t) => n + ((t || '').trim().match(/[A-Za-z0-9'’-]+/g) || []).length, 0)

  function saveAt(index, value) {
    const next = texts.slice()
    next[index] = value
    setTexts(next)
    clearTimeout(saveAt.t)
    saveAt.t = setTimeout(() => core.saveDraft(set.id, JSON.stringify(next)), 400)
  }

  function submit() {
    core.saveDraft(set.id, JSON.stringify(texts))
    core.recordSet('translation', set.id, 0, 15, undefined, { route: 'translation', title: set.title, zh: set.topic, type: '翻译' })
    setSubmitted(true)
    window.scrollTo(0, 0)
    askAI()
  }

  async function askAI() {
    const joined = texts.map((t, i) => (t || '').trim() ? `${i + 1}. ${t.trim()}` : '').filter(Boolean).join('\n')
    if (!joined) { setAiError('先写点内容再批改'); return }
    setAiBusy(true)
    setAiError('')
    try {
      const result = await gradeWithAI({
        kind: 'translation',
        prompt: set.sentences.map((x) => x.zh).join('\n'),
        text: joined,
      })
      setAi(result)
      saveAiGrade('translation:' + set.id, result)
      core.gradeTranslation(set.id, result.score)
      const qid = 'translation:' + set.id
      if (result.score <= 9) {
        const zh = set.sentences.map((x) => x.zh).join('\n')
        const en = set.sentences.map((x) => x.en).join('\n')
        const mine = texts.map((t, i) => `${i + 1}. ${String(t || '').trim() || '（未译）'}`).join('\n')
        core.wrongQuestion(qid, 'translation', set.id, {
          stem: `【翻译】${set.title}\n${zh}\n\n我的译文：\n${mine}`,
          answer: en,
          explain: `AI 评分 ${result.score}/15，存在遗漏、表达错误或内容不完整；重新批改达到 10 分及以上会自动移出错题本。`,
          title: set.title,
          type: '翻译',
        })
        setWrongMsg('已收录进错题本：AI 判断存在遗漏或错误')
      } else {
        core.removeWrongQuestion(qid)
        setWrongMsg('AI 未发现需要收录的原则性问题')
      }
    } catch (e) {
      setAiError(e.message || 'AI 批改失败')
    } finally {
      setAiBusy(false)
    }
  }

  function redo() {
    setTexts(set.sentences.map(() => ''))
    setSubmitted(false)
    setAi(null)
    setAiError('')
    setWrongMsg('')
    core.clearSession('translation', set.id)
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><a href="#/translation" aria-label="返回"><ArrowLeft className="h-4 w-4" /></a></Button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-lg font-semibold">{set.title}</h1>
          <div className="mt-0.5 text-xs text-muted-foreground">汉译英 · {set.sentences.length} 句 · {words} 词</div>
        </div>
        {!submitted ? <Button onClick={submit}>提交并 AI 批改</Button> : null}
      </div>

      <div className="space-y-3">
        {set.sentences.map((s, i) => (
          <Card key={i} className="">
            <CardContent className="p-5 sm:p-6">
              <div className="mb-3 flex gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs text-muted-foreground">{i + 1}</span>
                <p className="font-display text-sm leading-relaxed">{s.zh}</p>
              </div>
              <textarea
                value={texts[i] || ''}
                onChange={(e) => saveAt(i, e.target.value)}
                disabled={submitted}
                placeholder="输入这一句的英文译文…"
                className="min-h-24 w-full resize-y rounded-lg border bg-card p-4 font-display text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring"
              />
              {submitted ? (
                <div className="mt-3 rounded-lg border border-border/70 bg-secondary/40 p-4">
                  <div className="text-[11px] text-muted-foreground">参考译文</div>
                  <p className="mt-1 font-display text-sm leading-relaxed">{s.en}</p>
                  {s.tip ? <p className="mt-1.5 text-xs text-muted-foreground">{s.tip}</p> : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      {submitted ? <AiReview result={ai} busy={aiBusy} error={aiError} onGrade={askAI} /> : null}
      {wrongMsg ? <p className={`mt-3 text-xs ${ai && ai.score <= 9 ? 'text-warning' : 'text-success'}`} aria-live="polite">{wrongMsg}</p> : null}
      {submitted ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" asChild><a href="#/translation">返回列表</a></Button>
          <Button variant="ghost" onClick={redo}>重做</Button>
        </div>
      ) : null}
    </div>
  )
}

export function WritingList() {
  useCoreReady()
  const core = window.App?.core
  const sets = window.CET4_WRITING || []
  return (
    <>
      <ListHead title="写作" description="命题作文 · AI 评分 + 参考范文" count={sets.length} />
      <div className="grid gap-3 sm:grid-cols-2">
        {sets.map((set) => {
          const att = core ? core.attempt('writing', set.id) : null
          const ai = core ? core.getState().aiGrades?.['writing:' + set.id] : null
          const draft = core ? core.writingDraft(set.id) : ''
          const progress = !!draft || !!att
          const href = `#/writing/${set.id}`
          return (
            <div key={set.id} className="glass-card group p-5 transition-colors hover:border-white/20">
              <a href={href} className="block">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="font-normal">{set.source}</Badge>
                  <Badge variant={ai || att ? 'default' : 'muted'} className="font-normal">{ai ? `AI ${ai.score}/15 · 标准分 ${toCetStandard('writing', ai.score, 15)}` : att ? `已完成 · ${att.words} 词` : '未开始'}</Badge>
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{set.topic}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{set.prompt}</p>
              </a>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{set.minutes} 分钟 · {set.minWords}–{set.maxWords} 词</span>
                <div className="flex items-center gap-2">
                  {progress ? <a href={href} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-primary/30 bg-[var(--accent-soft)] px-3 text-primary">继续练习 <ArrowRight className="h-3.5 w-3.5" /></a> : <a href={href} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-primary/30 bg-[var(--accent-soft)] px-3 text-primary">开始练习 <ArrowRight className="h-3.5 w-3.5" /></a>}
                  {progress ? <button type="button" onClick={() => { restartPractice(core, 'writing', set.id); window.location.hash = href }} className="inline-flex min-h-9 items-center rounded-lg px-2 text-muted-foreground hover:text-foreground">重新练习</button> : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

export function WritingRunner({ id }) {
  useCoreReady()
  const core = window.App?.core
  const set = (window.CET4_WRITING || []).find((x) => x.id === id)
  const [text, setText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [ai, setAi] = useState(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState('')

  useEffect(() => {
    if (core && set) {
      setText(core.writingDraft(set.id) || '')
      setAi(savedAiGrade('writing:' + set.id))
    }
  }, [id])

  useEffect(() => {
    if (submitted) return
    const t = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [submitted])

  if (!set) return <div className="py-20 text-center text-sm text-muted-foreground">题目不存在</div>
  const words = (text.trim().match(/[A-Za-z0-9'’-]+/g) || []).length

  function save(value) {
    setText(value)
    clearTimeout(save.t)
    save.t = setTimeout(() => core.saveWritingDraft(set.id, value), 400)
  }

  function submit() {
    core.saveWritingDraft(set.id, text)
    core.recordWriting(set.id, words, elapsed, { route: 'writing', title: set.topic, zh: set.topic, type: '写作' })
    setSubmitted(true)
    window.scrollTo(0, 0)
    askAI()
  }

  async function askAI() {
    if (!text.trim()) { setAiError('先写点内容再批改'); return }
    setAiBusy(true)
    setAiError('')
    try {
      const result = await gradeWithAI({ kind: 'writing', prompt: set.prompt, text })
      setAi(result)
      saveAiGrade('writing:' + set.id, result)
    } catch (e) {
      setAiError(e.message || 'AI 批改失败')
    } finally {
      setAiBusy(false)
    }
  }

  function redoWriting() {
    setSubmitted(false)
    setAi(null)
    setAiError('')
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><a href="#/writing" aria-label="返回"><ArrowLeft className="h-4 w-4" /></a></Button>
        <div>
          <h1 className="font-display text-lg font-semibold">{set.source} · {set.topic}</h1>
          <div className="mt-0.5 text-xs text-muted-foreground">{set.minutes} 分钟 · {set.minWords}–{set.maxWords} 词 · 已用 {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
        <Card className="">
          <CardContent className="p-6">
            <div className="mb-2 text-xs text-muted-foreground">WRITING TASK</div>
            <p className="font-display text-sm leading-loose">{set.prompt}</p>
          </CardContent>
        </Card>
        <Card className="">
          <CardContent className="p-6">
            <div className="mb-2 flex justify-between text-xs text-muted-foreground">
              <span>你的作文</span><span>{words} 词</span>
            </div>
            <textarea value={text} onChange={(e) => save(e.target.value)} disabled={submitted}
              placeholder="Write your essay here…"
              className="min-h-64 w-full resize-y rounded-lg border bg-card p-4 font-display text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring" />
            {!submitted ? <div className="mt-4 flex justify-end"><Button onClick={submit}>提交并 AI 批改</Button></div> : null}
          </CardContent>
        </Card>
      </div>
      {submitted ? <AiReview result={ai} busy={aiBusy} error={aiError} onGrade={askAI} /> : null}
      {submitted ? (
        <Card className="mt-4">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">参考范文</h2>
              <Badge variant="secondary">{set.words} 词</Badge>
            </div>
            <p className="mt-4 whitespace-pre-wrap font-display text-sm leading-loose">{set.sample}</p>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-primary">查看中文译文</summary>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{set.sampleZh}</p>
            </details>
            <div className="mt-5 flex gap-2">
              <Button variant="outline" asChild><a href="#/writing">返回列表</a></Button>
              <Button variant="ghost" onClick={redoWriting}>重写</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
