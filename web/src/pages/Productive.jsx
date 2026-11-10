import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Languages, PenLine } from 'lucide-react'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'

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

export function TranslationList() {
  useCoreReady()
  const core = window.App?.core
  const sets = window.CET4_TRANSLATION || []
  return (
    <>
      <ListHead title="翻译" description="段落翻译 · 逐句对照 · 自评档位" count={sets.length} />
      <div className="grid gap-3 sm:grid-cols-2">
        {sets.map((set) => {
          const att = core ? core.attempt('translation', set.id) : null
          return (
            <a key={set.id} href={`#/translation/${set.id}`} className="paper-texture group rounded-xl border bg-card p-5 transition-colors hover:border-primary/25">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="font-normal">汉译英</Badge>
                <Badge variant={att?.graded ? 'default' : 'muted'} className="font-normal">{att?.graded ? `自评 ${att.score}/15` : '未做'}</Badge>
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{set.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{set.topic} · 约 {set.sentences.length} 句</p>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>{set.minutes} 分钟</span>
                <span className="inline-flex items-center gap-1 text-primary">开始 <ArrowRight className="h-3.5 w-3.5" /></span>
              </div>
            </a>
          )
        })}
      </div>
    </>
  )
}

const BANDS = [
  [14, '13–15', '完整准确'], [11, '10–12', '基本完整'], [8, '7–9', '有遗漏'], [5, '4–6', '只译出部分'], [2, '1–3', '难成句'],
]

export function TranslationRunner({ id }) {
  useCoreReady()
  const core = window.App?.core
  const set = (window.CET4_TRANSLATION || []).find((x) => x.id === id)
  const [text, setText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [band, setBand] = useState(null)

  useEffect(() => {
    if (core && set) {
      setText(core.getDraft(set.id) || '')
      const att = core.attempt('translation', set.id)
      if (att?.graded) setBand(att.score)
    }
  }, [id])

  if (!set) return <div className="py-20 text-center text-sm text-muted-foreground">题目不存在</div>

  function save(value) {
    setText(value)
    clearTimeout(save.t)
    save.t = setTimeout(() => core.saveDraft(set.id, value), 400)
  }

  function submit() {
    core.saveDraft(set.id, text)
    core.recordSet('translation', set.id, band || 0, 15)
    setSubmitted(true)
    window.scrollTo(0, 0)
  }

  function choose(v) {
    setBand(v)
    core.gradeTranslation(set.id, v)
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><a href="#/translation" aria-label="返回"><ArrowLeft className="h-4 w-4" /></a></Button>
        <div>
          <h1 className="font-display text-lg font-semibold">{set.title}</h1>
          <div className="mt-0.5 text-xs text-muted-foreground">汉译英 · {set.sentences.length} 句 · 15 分钟</div>
        </div>
      </div>

      <Card className="paper-texture mb-4">
        <CardContent className="p-6">
          <div className="mb-2 text-xs text-muted-foreground">中文原文</div>
          <p className="font-display text-[15px] leading-loose">{set.zh}</p>
        </CardContent>
      </Card>

      <Card className="paper-texture">
        <CardContent className="p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">你的译文</span>
            <span className="text-xs text-muted-foreground">{(text.trim().match(/[A-Za-z0-9'’-]+/g) || []).length} 词</span>
          </div>
          <textarea
            value={text}
            onChange={(e) => save(e.target.value)}
            disabled={submitted}
            placeholder="在此输入英文译文…"
            className="min-h-44 w-full resize-y rounded-lg border bg-card p-4 font-display text-[15px] leading-relaxed outline-none focus:ring-2 focus:ring-ring"
          />
          {!submitted ? (
            <div className="mt-4 flex justify-end">
              <Button onClick={submit} disabled={!text.trim()}>提交并对照</Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {submitted ? (
        <>
          <Card className="paper-texture mt-4">
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-semibold">逐句参考</h2>
              <div className="mt-4 space-y-4">
                {set.sentences.map((s, i) => (
                  <div key={i} className="border-b pb-3 last:border-0">
                    <p className="text-sm text-muted-foreground">{s.zh}</p>
                    <p className="mt-1 font-display text-[15px] leading-relaxed">{s.en}</p>
                    {s.tip ? <p className="mt-1 text-xs text-muted-foreground">{s.tip}</p> : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="paper-texture mt-4">
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-semibold">自评档位</h2>
              <p className="mt-1 text-xs text-muted-foreground">参考译文不是唯一答案，选择后会计入今日记录</p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {BANDS.map(([v, label, desc]) => (
                  <button key={v} type="button" onClick={() => choose(v)}
                    className={`rounded-lg border px-3 py-3 text-left ${band === v ? 'border-primary bg-secondary' : 'bg-card hover:bg-secondary/40'}`}>
                    <span className="block font-display text-sm font-semibold">{label}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">{desc}</span>
                  </button>
                ))}
              </div>
              <div className="mt-5 flex gap-2">
                <Button variant="outline" asChild><a href="#/translation">返回列表</a></Button>
                <Button variant="ghost" onClick={() => { setSubmitted(false); setBand(null) }}>重做</Button>
              </div>
            </CardContent>
          </Card>
        </>
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
      <ListHead title="写作" description="命题作文 · 先写再对照范文" count={sets.length} />
      <div className="grid gap-3 sm:grid-cols-2">
        {sets.map((set) => {
          const att = core ? core.attempt('writing', set.id) : null
          return (
            <a key={set.id} href={`#/writing/${set.id}`} className="paper-texture group rounded-xl border bg-card p-5 transition-colors hover:border-primary/25">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="font-normal">{set.source}</Badge>
                <Badge variant={att ? 'default' : 'muted'} className="font-normal">{att ? `已完成 · ${att.words} 词` : '未开始'}</Badge>
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{set.topic}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{set.prompt}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>{set.minutes} 分钟 · {set.minWords}–{set.maxWords} 词</span>
                <span className="inline-flex items-center gap-1 text-primary">开始 <ArrowRight className="h-3.5 w-3.5" /></span>
              </div>
            </a>
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

  useEffect(() => {
    if (core && set) setText(core.writingDraft(set.id) || '')
  }, [id])

  if (!set) return <div className="py-20 text-center text-sm text-muted-foreground">题目不存在</div>
  const words = (text.trim().match(/[A-Za-z0-9'’-]+/g) || []).length

  function save(value) {
    setText(value)
    clearTimeout(save.t)
    save.t = setTimeout(() => core.saveWritingDraft(set.id, value), 400)
  }

  function submit() {
    core.saveWritingDraft(set.id, text)
    core.recordWriting(set.id, words, 0)
    setSubmitted(true)
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><a href="#/writing" aria-label="返回"><ArrowLeft className="h-4 w-4" /></a></Button>
        <div>
          <h1 className="font-display text-lg font-semibold">{set.source} · {set.topic}</h1>
          <div className="mt-0.5 text-xs text-muted-foreground">{set.minutes} 分钟 · {set.minWords}–{set.maxWords} 词</div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
        <Card className="paper-texture">
          <CardContent className="p-6">
            <div className="mb-2 text-xs text-muted-foreground">WRITING TASK</div>
            <p className="font-display text-[15px] leading-loose">{set.prompt}</p>
          </CardContent>
        </Card>
        <Card className="paper-texture">
          <CardContent className="p-6">
            <div className="mb-2 flex justify-between text-xs text-muted-foreground">
              <span>你的作文</span><span>{words} 词</span>
            </div>
            <textarea value={text} onChange={(e) => save(e.target.value)} disabled={submitted}
              placeholder="Write your essay here…"
              className="min-h-64 w-full resize-y rounded-lg border bg-card p-4 font-display text-[15px] leading-relaxed outline-none focus:ring-2 focus:ring-ring" />
            {!submitted ? <div className="mt-4 flex justify-end"><Button onClick={submit}>完成并对照</Button></div> : null}
          </CardContent>
        </Card>
      </div>
      {submitted ? (
        <Card className="paper-texture mt-4">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">参考范文</h2>
              <Badge variant="secondary">{set.words} 词</Badge>
            </div>
            <p className="mt-4 whitespace-pre-wrap font-display text-[15px] leading-loose">{set.sample}</p>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-primary">查看中文译文</summary>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{set.sampleZh}</p>
            </details>
            <div className="mt-5 flex gap-2">
              <Button variant="outline" asChild><a href="#/writing">返回列表</a></Button>
              <Button variant="ghost" onClick={() => setSubmitted(false)}>重写</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
