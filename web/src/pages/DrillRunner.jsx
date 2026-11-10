import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Headphones, Layers, PenLine, RotateCcw, Sparkles, Target, Volume2, X } from 'lucide-react'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Progress } from '../components/ui/progress'
import { cn } from '../lib/utils'

const MODE_META = {
  spelling: { name: '拼写', label: '根据释义拼写单词', icon: PenLine },
  dictation: { name: '听写', label: '听发音，写单词', icon: Headphones },
  sense: { name: '词义辨析', label: '选择正确释义', icon: Target },
  collocation: { name: '搭配', label: '补全常用搭配', icon: Layers },
  root: { name: '词根词缀', label: '选出同族词', icon: Sparkles },
}

function extras(id) {
  return (window.CET4_WORD_EXTRAS || {})[id] || null
}

function shuffle(list) {
  const a = list.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function posOf(w) {
  return String((w && w.pos) || '').split('/')[0]
}

function firstSense(w) {
  return String((w && w.zh) || '').split(/[；;]/)[0].trim()
}

function speak(text) {
  if (!text || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = 0.9
  window.speechSynthesis.speak(u)
}

function weightedIds(pool, n) {
  const copy = pool.slice()
  const out = []
  while (out.length < n && copy.length) {
    const total = copy.reduce((sum, x) => sum + Math.max(1, x.weight || 1), 0)
    let r = Math.random() * total
    let pick = 0
    for (let i = 0; i < copy.length; i++) {
      r -= Math.max(1, copy[i].weight || 1)
      if (r <= 0) { pick = i; break }
    }
    out.push(copy[pick].id)
    copy.splice(pick, 1)
  }
  return out
}

function makeQuestion(mode, word) {
  const core = window.App.core
  const ex = extras(word.id)
  const q = { id: word.id, word, mode, options: [], answerIndex: 0, answerText: '' }

  if (mode === 'spelling' || mode === 'dictation') {
    q.answerText = word.w
    return q
  }

  if (mode === 'sense') {
    const correct = firstSense(word)
    if (!correct) return null
    let pool = core.allWords().filter((x) => x.id !== word.id && posOf(x) === posOf(word) && firstSense(x) && firstSense(x) !== correct)
    pool = shuffle(pool)
    const options = [correct]
    for (const x of pool) {
      const sense = firstSense(x)
      if (!options.includes(sense)) options.push(sense)
      if (options.length === 4) break
    }
    if (options.length < 4) {
      for (const x of shuffle(core.allWords())) {
        if (x.id === word.id) continue
        const sense = firstSense(x)
        if (sense && !options.includes(sense)) options.push(sense)
        if (options.length === 4) break
      }
    }
    if (options.length < 4) return null
    const shuffled = shuffle(options)
    q.options = shuffled
    q.answerIndex = shuffled.indexOf(correct)
    q.answerText = correct
    return q
  }

  if (mode === 'collocation') {
    if (!ex || !(ex.collocations || []).length) return null
    const phrase = ex.collocations.find((c) => c.toLowerCase().includes(word.w.toLowerCase()))
    if (!phrase) return null
    q.prompt = phrase.replace(new RegExp(word.w, 'i'), '____')
    q.fullPhrase = phrase
    let pool = core.allWords().filter((x) => x.id !== word.id && posOf(x) === posOf(word))
    const options = [word.w]
    for (const x of shuffle(pool)) {
      if (!options.includes(x.w)) options.push(x.w)
      if (options.length === 4) break
    }
    if (options.length < 4) return null
    const shuffled = shuffle(options)
    q.options = shuffled
    q.answerIndex = shuffled.indexOf(word.w)
    q.answerText = word.w
    return q
  }

  if (mode === 'root') {
    if (!ex || !(ex.family || []).length) return null
    const family = ex.family.slice()
    const right = family[Math.floor(Math.random() * family.length)]
    const pool = []
    Object.keys(window.CET4_WORD_EXTRAS || {}).forEach((id) => {
      if (id === word.id) return
      ;(window.CET4_WORD_EXTRAS[id].family || []).forEach((f) => {
        if (f !== right && !family.includes(f) && !pool.includes(f)) pool.push(f)
      })
    })
    const options = [right]
    for (const f of shuffle(pool)) {
      if (!options.includes(f)) options.push(f)
      if (options.length === 4) break
    }
    if (options.length < 4) return null
    const shuffled = shuffle(options)
    q.options = shuffled
    q.answerIndex = shuffled.indexOf(right)
    q.answerText = right
    q.rootText = ex.root || ''
    q.family = family
    return q
  }

  return null
}

function buildRound(mode, onlyIds) {
  const core = window.App.core
  let pool = onlyIds && onlyIds.length
    ? onlyIds.map((id) => ({ id, weight: 1 }))
    : core.drillPool()
  if (!pool.length) pool = core.allWords().map((w) => ({ id: w.id, weight: 1 }))
  if (mode === 'collocation' || mode === 'root') {
    pool = pool.filter((x) => {
      const ex = extras(x.id)
      if (!ex) return false
      return mode === 'collocation' ? (ex.collocations || []).length : (ex.family || []).length
    })
  }
  if (!onlyIds && pool.length < 10) {
    const have = new Set(pool.map((x) => x.id))
    core.allWords().forEach((w) => {
      if (have.has(w.id)) return
      const ex = extras(w.id)
      if (!ex) return
      if (mode === 'collocation' && !(ex.collocations || []).length) return
      if (mode === 'root' && !(ex.family || []).length) return
      pool.push({ id: w.id, weight: 1 })
    })
  }
  const ids = weightedIds(pool, Math.min(pool.length, 40))
  const out = []
  const seen = new Set()
  for (const id of ids) {
    if (seen.has(id)) continue
    const word = core.getWord(id)
    if (!word) continue
    const q = makeQuestion(mode, word)
    if (q) {
      out.push(q)
      seen.add(id)
    }
    if (out.length === 10) break
  }
  return out
}

function diffParts(input, answer) {
  if (!input) return [{ text: answer, mark: false }]
  let i = 0
  while (i < input.length && i < answer.length && input[i].toLowerCase() === answer[i].toLowerCase()) i++
  let j = answer.length - 1
  let k = input.length - 1
  while (j >= i && k >= i && input[k].toLowerCase() === answer[j].toLowerCase()) { j--; k-- }
  return [
    { text: answer.slice(0, i), mark: false },
    { text: answer.slice(i, j + 1), mark: true },
    { text: answer.slice(j + 1), mark: false },
  ]
}

export default function DrillRunner({ mode }) {
  const core = window.App?.core
  const meta = MODE_META[mode]
  const [round, setRound] = useState([])
  const [idx, setIdx] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [selected, setSelected] = useState(null)
  const [input, setInput] = useState('')
  const [userAnswer, setUserAnswer] = useState('')
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongIds, setWrongIds] = useState([])
  const [replays, setReplays] = useState(0)
  const [finished, setFinished] = useState(false)
  const [started, setStarted] = useState(false)
  const startRef = useRef(Date.now())
  const inputRef = useRef(null)

  const current = round[idx]

  useEffect(() => {
    if (!core) return
    core.load()
    const qs = buildRound(mode)
    setRound(qs)
    setStarted(true)
    startRef.current = Date.now()
    setIdx(0)
    setAnswered(false)
    setSelected(null)
    setInput('')
    setUserAnswer('')
    setCorrectCount(0)
    setWrongIds([])
    setReplays(0)
    setFinished(false)
  }, [mode])

  useEffect(() => {
    if (mode === 'dictation' && current && !answered && !finished) {
      const t = setTimeout(() => speak(current.word.w), 150)
      return () => clearTimeout(t)
    }
    if (mode !== 'dictation' && inputRef.current && !answered) inputRef.current.focus()
  }, [idx, mode, answered, finished])

  function answer(correct) {
    if (answered || !current) return
    const secs = Math.max(1, Math.round((Date.now() - startRef.current) / 1000))
    setAnswered(true)
    if (correct) setCorrectCount((n) => n + 1)
    else setWrongIds((list) => [...list, current.id])
    setTimeout(() => {
      core.reviewWord(current.id, correct ? (secs <= 8 ? 4 : 3) : 1, { daily: false, seconds: secs })
      core.recordDrill(mode, current.id, correct)
    }, 0)
  }

  function submitInput() {
    if (!current) return
    if (answered) { next(); return }
    const val = input.trim()
    setUserAnswer(val)
    answer(val.toLowerCase() === current.answerText.toLowerCase())
  }

  function choose(i) {
    if (answered) return
    setSelected(i)
    answer(i === current.answerIndex)
  }

  function next() {
    const nextIdx = idx + 1
    if (nextIdx >= round.length) {
      setFinished(true)
      return
    }
    setIdx(nextIdx)
    setAnswered(false)
    setSelected(null)
    setInput('')
    setUserAnswer('')
    setReplays(0)
    startRef.current = Date.now()
  }

  function replay() {
    if (replays >= 2 || !current) return
    setReplays((n) => n + 1)
    speak(current.word.w)
  }

  function startAgain(onlyIds) {
    const qs = buildRound(mode, onlyIds)
    if (!qs.length) return
    setRound(qs)
    setIdx(0)
    setAnswered(false)
    setSelected(null)
    setInput('')
    setUserAnswer('')
    setCorrectCount(0)
    setWrongIds([])
    setReplays(0)
    setFinished(false)
    startRef.current = Date.now()
  }

  useEffect(() => {
    function onKey(e) {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName || '')) return
      if (finished || !current) return
      if (e.key === ' ' && mode === 'dictation' && !answered) {
        e.preventDefault(); replay(); return
      }
      if (!answered && /^[1-4]$/.test(e.key) && current.options.length) {
        e.preventDefault()
        const i = +e.key - 1
        if (i < current.options.length) choose(i)
        return
      }
      if (answered && e.key === 'Enter') {
        e.preventDefault(); next()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [answered, current, finished, mode, replays])

  if (!started) return <div className="py-24 text-center text-sm text-muted-foreground">正在准备题目…</div>
  if (!round.length) return (
    <div className="mx-auto max-w-xl text-center">
      <p className="text-sm text-muted-foreground">该模式暂时没有可练的词。</p>
      <Button className="mt-5" asChild><a href="#/drill">返回词汇深练</a></Button>
    </div>
  )

  if (finished) {
    const total = round.length
    const rate = total ? Math.round((correctCount / total) * 100) : 0
    const wrong = round.filter((q) => wrongIds.includes(q.id))
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><a href="#/drill" aria-label="返回"><ArrowLeft className="h-4 w-4" /></a></Button>
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">DRILL RESULT</div>
            <h1 className="font-display text-2xl font-semibold">{meta.name} · 本轮完成</h1>
          </div>
        </div>
        <Card className="paper-texture">
          <CardContent className="p-7 sm:p-9">
            <div className="flex items-end gap-3">
              <div className="font-display text-6xl font-semibold text-primary">{rate}<span className="text-2xl">%</span></div>
              <div className="pb-2 text-sm text-muted-foreground">{correctCount} / {total} 题</div>
            </div>
            <Progress value={rate} className="mt-5 h-2" />
            {wrong.length ? (
              <div className="mt-7">
                <h2 className="font-display text-lg font-semibold">错词</h2>
                <div className="mt-3 divide-y divide-border/60 rounded-lg border border-border/70">
                  {wrong.map((q) => (
                    <div key={q.id} className="flex items-center gap-3 px-4 py-3">
                      <strong className="min-w-24 font-display text-sm">{q.word.w}</strong>
                      <span className="truncate text-xs text-muted-foreground">{q.word.zh}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p className="mt-6 text-sm text-muted-foreground">全对，状态很好。</p>}
            <div className="mt-7 flex flex-wrap gap-2">
              {wrongIds.length ? <Button onClick={() => startAgain(wrongIds)}>只练错词</Button> : null}
              <Button variant="outline" onClick={() => startAgain()}><RotateCcw className="h-4 w-4" /> 再来一轮</Button>
              <Button variant="ghost" asChild><a href="#/drill">返回深练</a></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isCorrect = answered && (current.options.length ? selected === current.answerIndex : userAnswer.toLowerCase() === current.answerText.toLowerCase())

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><a href="#/drill" aria-label="返回"><ArrowLeft className="h-4 w-4" /></a></Button>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-display text-sm text-foreground">{meta.name}</span>
            <span>{idx + 1} / {round.length}</span>
          </div>
          <Progress value={(idx / round.length) * 100} className="h-1.5" />
        </div>
      </div>

      <Card className="paper-texture">
        <CardContent className="p-7 sm:p-9">
          {!answered ? (
            <>
              <Badge variant="secondary" className="mb-5 font-normal">{meta.label}</Badge>
              {mode === 'spelling' ? (
                <>
                  <div className="font-display text-2xl leading-snug">{current.word.zh}</div>
                  <div className="mt-2 text-xs text-muted-foreground">{current.word.pos}</div>
                </>
              ) : null}
              {mode === 'dictation' ? (
                <>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={replay} disabled={replays >= 2}>
                      <Volume2 className="h-4 w-4" /> 播放（空格）
                    </Button>
                    <span className="text-xs text-muted-foreground">还可重播 {2 - replays} 次</span>
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground">听发音，写出完整的单词。</p>
                </>
              ) : null}
              {mode === 'sense' || mode === 'collocation' || mode === 'root' ? (
                <>
                  {mode === 'collocation' ? (
                    <div className="font-display text-2xl leading-snug">{current.prompt}</div>
                  ) : mode === 'root' ? (
                    <>
                      <div className="font-display text-4xl font-semibold">{current.word.w}</div>
                      <p className="mt-2 text-xs text-muted-foreground">下面哪个词与它同族？</p>
                    </>
                  ) : (
                    <div className="font-display text-4xl font-semibold">{current.word.w}</div>
                  )}
                  <div className="mt-5 flex flex-col gap-2">
                    {current.options.map((o, i) => (
                      <button key={i} type="button" onClick={() => choose(i)} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left text-sm transition-colors hover:border-primary/30 hover:bg-secondary/50">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-secondary text-[11px] text-muted-foreground">{i + 1}</span>
                        <span>{o}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : null}

              {mode === 'spelling' || mode === 'dictation' ? (
                <div className="sticky bottom-0 mt-6 flex gap-2 bg-card/95 pt-3">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitInput() } }}
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder={mode === 'spelling' ? '输入单词' : '输入听到的单词'}
                    className="h-11 text-base"
                  />
                  <Button className="h-11" onClick={submitInput}>提交</Button>
                </div>
              ) : null}
            </>
          ) : (
            <div>
              <div className={cn('mb-4 flex items-center gap-2 font-display text-xl font-semibold', isCorrect ? 'text-emerald-700' : 'text-rose-700')}>
                {isCorrect ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                {isCorrect ? '答对了' : '答错了'}
              </div>

              {mode === 'spelling' && !isCorrect ? (
                <div className="mb-4 text-sm">
                  正确拼写：
                  <span className="ml-1 font-display text-lg">
                    {diffParts(userAnswer, current.answerText).map((p, i) => p.mark ? <mark key={i} className="rounded bg-amber-100 px-0.5">{p.text}</mark> : <span key={i}>{p.text}</span>)}
                  </span>
                </div>
              ) : null}
              {mode === 'collocation' ? <div className="mb-4 text-sm">完整搭配：<span className="font-medium">{current.fullPhrase}</span></div> : null}
              {mode === 'root' ? (
                <div className="mb-4 text-sm">
                  同族词：<span className="font-medium">{(current.family || []).join(' / ')}</span>
                  {current.rootText ? <div className="mt-1 text-xs text-muted-foreground">词根：{current.rootText}</div> : null}
                </div>
              ) : null}

              <div className="flex flex-wrap items-baseline gap-3">
                <div className="font-display text-3xl font-semibold">{current.word.w}</div>
                <button type="button" onClick={() => speak(current.word.w)} className="rounded-full p-1.5 hover:bg-secondary" aria-label="朗读">
                  <Volume2 className="h-4 w-4" />
                </button>
                <span className="text-sm text-muted-foreground">{current.word.ph}</span>
                <Badge variant="outline" className="font-normal">{current.word.pos}</Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{current.word.zh}</p>
              <Button className="mt-7" onClick={next}>下一题 <ArrowRight className="h-4 w-4" /></Button>
            </div>
          )}
        </CardContent>
      </Card>
      <p className="mt-4 text-center text-[11px] text-muted-foreground">按 1–4 选择选项 · Enter 提交/下一题 · 空格重播</p>
    </div>
  )
}
