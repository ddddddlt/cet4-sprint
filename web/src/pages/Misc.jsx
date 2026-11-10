import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowUpRight, Check, Monitor, Moon, Save, Sun } from 'lucide-react'
import { currentMode, setTheme } from '../lib/theme'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'

function legacyUrl(hash) {
  const base = window.location.pathname.replace(/v2\/?$/, '')
  return (base.endsWith('/') ? base : base + '/') + 'legacy/' + hash
}

function useCoreReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => { if (window.App?.core) { window.App.core.load(); setReady(true) } }, [])
  return ready
}

export function Mistakes() {
  useCoreReady()
  const core = window.App?.core
  const list = core ? core.wrongQuestions() : []
  const groups = useMemo(() => {
    const map = {}
    list.forEach((e) => {
      const key = e.kind + ':' + (e.setId || '')
      if (!map[key]) map[key] = { kind: e.kind, setId: e.setId, items: [] }
      map[key].items.push(e)
    })
    return Object.values(map)
  }, [list.length])

  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">MISTAKES</div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">错题本</h1>
          <p className="mt-2 text-sm text-muted-foreground">按套题归组 · 答错自动收录 · 复习后自动移除</p>
        </div>
        <Badge variant="outline" className="rounded-md font-normal">{list.length} 题</Badge>
      </div>

      {groups.length ? (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.kind + g.setId}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">
                  {g.items[0]?.title || g.setId}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">{g.items.length} 题</span>
                </h2>
                <Badge variant="secondary" className="font-normal">{g.kind}</Badge>
              </div>
              <div className="space-y-2">
                {g.items.map((e) => (
                  <Card key={e.qid} className="paper-texture">
                    <CardContent className="p-5">
                      <p className="text-sm leading-relaxed">{e.stem}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="font-normal">答案 {e.answer}</Badge>
                        <span>错 {e.count} 次</span>
                      </div>
                      {e.explain ? <p className="mt-3 rounded-lg bg-secondary/40 p-3 text-xs leading-relaxed text-muted-foreground">{e.explain}</p> : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <Card className="paper-texture">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground/50" />
            <h2 className="mt-4 font-display text-lg font-semibold">错题本是空的</h2>
            <p className="mt-1 text-sm text-muted-foreground">做练习时答错的题会自动收进来</p>
            <Button className="mt-5" asChild><a href="#/practice">去练习</a></Button>
          </CardContent>
        </Card>
      )}
    </>
  )
}

export function Settings() {
  useCoreReady()
  const core = window.App?.core
  const st = core ? core.getState() : null
  const [examDate, setExamDate] = useState('')
  const [name, setName] = useState('')
  const [target, setTarget] = useState(50)
  const [saved, setSaved] = useState(false)
  const [theme, setThemeMode] = useState(() => currentMode())

  useEffect(() => {
    if (!st) return
    setExamDate(st.settings.examDate || '')
    setName(st.settings.name || '')
    setTarget(core.checkTarget())
  }, [st])

  function save() {
    if (!st) return
    st.settings.examDate = examDate || st.settings.examDate
    st.settings.name = name
    core.setCheckTarget(+target || 50)
    core.save()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <>
      <div className="mb-7">
        <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">SETTINGS</div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">设置</h1>
        <p className="mt-2 text-sm text-muted-foreground">考试日期、称呼与每日抽查量</p>
      </div>

      <Card className="paper-texture mb-4">
        <CardContent className="p-6">
          <h2 className="font-display text-lg font-semibold">主题</h2>
          <p className="mt-1 text-xs text-muted-foreground">暖白纸张或深色夜间；自动跟随系统</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              ['auto', '跟随系统', Monitor],
              ['light', '浅色', Sun],
              ['dark', '深色', Moon],
            ].map(([mode, label, Icon]) => (
              <button key={mode} type="button" onClick={() => { setTheme(mode); setThemeMode(mode) }}
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm ${theme === mode ? 'border-primary bg-secondary text-foreground' : 'bg-card text-muted-foreground hover:bg-secondary/40'}`}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="paper-texture">
          <CardContent className="space-y-5 p-6">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">考试日期</span>
              <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="h-10 w-full rounded-md border bg-card px-3 text-sm" />
              <span className="mt-1 block text-xs text-muted-foreground">默认 2026 年 12 月 13 日，以准考证为准</span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">昵称（可选）</span>
              <input type="text" maxLength={12} value={name} onChange={(e) => setName(e.target.value)} placeholder="首页会这样称呼你" className="h-10 w-full rounded-md border bg-card px-3 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">每日抽查量</span>
              <input type="number" min={10} max={200} value={target} onChange={(e) => setTarget(e.target.value)} className="h-10 w-full rounded-md border bg-card px-3 text-sm" />
              <span className="mt-1 block text-xs text-muted-foreground">10–200 个，按 10 个一组</span>
            </label>
            <div className="flex items-center gap-3">
              <Button onClick={save}><Save className="h-4 w-4" /> 保存设置</Button>
              {saved ? <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><Check className="h-3.5 w-3.5" /> 已保存</span> : null}
            </div>
          </CardContent>
        </Card>

        <Card className="paper-texture">
          <CardContent className="p-6">
            <h2 className="font-display text-lg font-semibold">更多</h2>
            <p className="mt-1 text-xs text-muted-foreground">云同步与数据导入导出仍保留在旧版。</p>
            <div className="mt-5 space-y-2">
              <a href={legacyUrl('#/settings')} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm hover:bg-secondary/40">
                打开旧版设置 <ArrowUpRight className="h-4 w-4 opacity-50" />
              </a>
              <a href={legacyUrl('#/settings')} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm hover:bg-secondary/40">
                云同步 / 导出 <ArrowUpRight className="h-4 w-4 opacity-50" />
              </a>
            </div>
            <div className="mt-6 rounded-lg bg-secondary/40 p-4 text-xs leading-relaxed text-muted-foreground">
              支持浅色、深色与跟随系统。浅色为暖白纸张，深色为深蓝夜间纸面。
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
