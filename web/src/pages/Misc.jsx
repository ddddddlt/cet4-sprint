import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, ArrowUpRight, Check, Save } from 'lucide-react'
import { createProfile, listProfiles, removeProfile, renameProfile, switchProfile } from '../lib/profiles'
import { getCloudConfig, setCloudConfig, resetCloudConfig, pushCloud, pullCloud, testCloud } from '../lib/cloud'
import { getSupabaseConfig, saveSupabaseConfig, signIn, signUp, signOut, testSupabase, pushSupabase, pullSupabase, fetchRemoteSupabase } from '../lib/supabase'
import { clearToday } from '../lib/reset'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'


function useCoreReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => { if (window.App?.core) { window.App.core.load(); setReady(true) } }, [])
  return ready
}

function mistakeType(e) {
  if (e.type) return e.type
  if (e.kind === 'translation') return '翻译'
  if (e.kind === 'listening') return '听力'
  if (e.kind === 'matching') return '长篇匹配'
  if (e.kind === 'cloze') return '选词填空'
  return '仔细阅读'
}

function mistakeGroups(list) {
  const map = {}
  list.forEach((e) => {
    const type = mistakeType(e)
    if (!map[type]) map[type] = { type, items: [] }
    map[type].items.push(e)
  })
  return Object.values(map)
    .map((g) => ({ ...g, items: g.items.slice().sort((a, b) => (b.last || 0) - (a.last || 0)) }))
    .sort((a, b) => (b.items[0]?.last || 0) - (a.items[0]?.last || 0))
}

function MistakeCard({ e }) {
  const link = e.exam != null ? `#/exam/${e.exam}` : e.kind === 'listening' ? `#/listening/${e.setId}` : `#/${e.kind}/${e.setId}?review=1&q=${e.qid}`
  const hasFull = !!(e.passage || e.context || (Array.isArray(e.options) && e.options.length))
  return (
    <Card className="">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{e.title || '未命名题目'}</span>
          <span>·</span>
          <span>错 {e.count} 次</span>
        </div>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{e.stem}</p>
        {hasFull ? (
          <details className="mt-3 rounded-lg border border-white/10 bg-secondary/20 px-3 py-2">
            <summary className="cursor-pointer text-xs text-primary">查看完整题目</summary>
            <div className="mt-3 space-y-3 text-xs leading-relaxed text-muted-foreground">
              {e.passage ? <div><div className="mb-1 font-medium text-foreground">原文</div><p className="whitespace-pre-line">{String(e.passage).replace(/\{\{\d+\}\}/g, '____')}</p></div> : null}
              {e.context ? <div><div className="mb-1 font-medium text-foreground">题目内容</div><p className="whitespace-pre-line">{e.context}</p></div> : null}
              {Array.isArray(e.options) && e.options.length ? (
                <div>
                  <div className="mb-1 font-medium text-foreground">选项</div>
                  <div className="space-y-1">{e.options.map((o, i) => <p key={i}>{String.fromCharCode(65 + i)}. {o}</p>)}</div>
                </div>
              ) : null}
            </div>
          </details>
        ) : null}
        {e.kind === 'translation' ? (
          <div className="mt-3 rounded-lg border border-white/10 bg-secondary/30 p-3">
            <div className="text-[11px] text-muted-foreground">参考译文</div>
            <p className="mt-1 whitespace-pre-line text-xs leading-relaxed">{e.answer}</p>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="font-normal">答案 {e.answer}</Badge>
          </div>
        )}
        {e.explain ? <p className="mt-3 rounded-lg bg-secondary/40 p-3 text-xs leading-relaxed text-muted-foreground">{e.explain}</p> : null}
        {e.setId ? (
          <a className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline" href={link}>
            {e.exam != null ? '查看整套模考' : '去原题重做'} <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function Mistakes() {
  useCoreReady()
  const core = window.App?.core
  const list = core ? core.wrongQuestions() : []
  const groups = useMemo(() => mistakeGroups(list), [list])

  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">MISTAKES</div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">错题本</h1>
          <p className="mt-2 text-sm text-muted-foreground">按题型进入 · 只收录错的小题 · 可查看完整题目</p>
        </div>
        <Badge variant="outline" className="rounded-md font-normal">{list.length} 题</Badge>
      </div>

      {groups.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((g) => (
            <a key={g.type} href={'#/mistakes/' + encodeURIComponent(g.type)} className="glass-card group flex flex-col p-5 transition-colors hover:border-white/20">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-xl font-semibold">{g.type}</h2>
                <Badge variant="outline" className="font-normal">{g.items.length} 题</Badge>
              </div>
              <p className="mt-2 truncate text-xs text-muted-foreground">
                最近：{g.items[0]?.title || g.items[0]?.stem || '—'}
              </p>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>查看这类错题</span>
                <span className="inline-flex items-center gap-1 text-primary">进入 <ArrowUpRight className="h-3.5 w-3.5" /></span>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <Card className="">
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

export function MistakeType({ type }) {
  useCoreReady()
  const core = window.App?.core
  const list = (core ? core.wrongQuestions() : []).filter((e) => mistakeType(e) === type)
  return (
    <>
      <div className="mb-6">
        <a href="#/mistakes" className="mb-5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> 错题本</a>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">MISTAKE TYPE</div>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{type || '题型'}错题</h1>
            <p className="mt-2 text-sm text-muted-foreground">只显示答错的小题 · 展开查看完整题目</p>
          </div>
          <Badge variant="outline" className="rounded-md font-normal">{list.length} 题</Badge>
        </div>
      </div>
      {list.length ? (
        <div className="space-y-2">{list.map((e) => <MistakeCard key={e.qid} e={e} />)}</div>
      ) : (
        <Card className="">
          <CardContent className="flex flex-col items-center py-14 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground/50" />
            <h2 className="mt-4 font-display text-lg font-semibold">这一类暂时没有错题</h2>
            <p className="mt-1 text-sm text-muted-foreground">去对应题型练习，答错的题会自动收进来</p>
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
  const [minutes, setMinutes] = useState(30)
  const [target, setTarget] = useState(50)
  const [saved, setSaved] = useState(false)
  const [profiles, setProfiles] = useState(() => listProfiles())
  const [newName, setNewName] = useState('')
  const [cloud, setCloud] = useState(() => getCloudConfig())
  const [cloudBusy, setCloudBusy] = useState(false)
  const [motionOff, setMotionOff] = useState(() => { try { return localStorage.getItem('cet4-sprint/motion') === 'reduce' } catch (e) { return false } })
  const [cloudMsg, setCloudMsg] = useState('')
  const [supa, setSupa] = useState(() => getSupabaseConfig())
  const [supaEmail, setSupaEmail] = useState('')
  const [supaPassword, setSupaPassword] = useState('')
  const [supaMode, setSupaMode] = useState('login')
  const [supaBusy, setSupaBusy] = useState(false)
  const [supaMsg, setSupaMsg] = useState('')
  const [confirmPull, setConfirmPull] = useState(false)
  const [confirmToday, setConfirmToday] = useState(false)
  const [todayMsg, setTodayMsg] = useState('')
  const [syncDiag, setSyncDiag] = useState(null)
  const [syncDiagBusy, setSyncDiagBusy] = useState(false)
  const importRef = useRef(null)

  useEffect(() => {
    if (!st) return
    setExamDate(st.settings.examDate || '')
    setName(st.settings.name || '')
    setMinutes(Math.max(5, Math.min(240, Number(st.settings.dailyMinutes) || 30)))
    setTarget(core.checkTarget())
  }, [st])

  function saveSupa(patch) {
    const cfg = saveSupabaseConfig({ ...supa, ...(patch || {}) })
    setSupa(cfg)
    return cfg
  }

  function refreshSupa() {
    setSupa(getSupabaseConfig())
  }

  async function runSupa(label, fn) {
    setSupaBusy(true)
    setSupaMsg(label + '…')
    try {
      const result = await fn()
      setSupaMsg(result || (label + '成功'))
      refreshSupa()
    } catch (err) {
      saveSupabaseConfig({ lastError: err.message })
      setSupaMsg('失败：' + err.message)
      refreshSupa()
    } finally {
      setSupaBusy(false)
    }
  }

  async function authSupa(mode) {
    saveSupa()
    setSupaBusy(true)
    setSupaMsg(mode === 'signup' ? '正在注册…' : '正在登录…')
    try {
      const result = mode === 'signup'
        ? await signUp(supaEmail, supaPassword)
        : await signIn(supaEmail, supaPassword)
      if (result && result.needsConfirm) {
        setSupaMsg('注册成功，请先去邮箱点击确认邮件，再回来登录')
      } else {
        setSupaMsg(mode === 'signup' ? '注册并登录成功' : '登录成功')
      }
      setSupaPassword('')
      refreshSupa()
    } catch (err) {
      saveSupabaseConfig({ lastError: err.message })
      setSupaMsg('失败：' + err.message)
      refreshSupa()
    } finally {
      setSupaBusy(false)
    }
  }

  async function logoutSupa() {
    setSupaBusy(true)
    try { await signOut(); setSupaMsg('已退出 Supabase'); refreshSupa() } catch (err) { setSupaMsg('退出失败：' + err.message) } finally { setSupaBusy(false) }
  }

  function saveCloud(patch) {
    const cfg = setCloudConfig({ ...cloud, ...(patch || {}) })
    setCloud(cfg)
    return cfg
  }

  async function runCloud(label, fn) {
    setCloudBusy(true)
    setCloudMsg(label + '中…')
    try {
      const result = await fn()
      setCloudMsg(result || (label + '成功'))
      setCloud(getCloudConfig())
    } catch (err) {
      setCloudConfig({ lastError: err.message })
      setCloudMsg('失败：' + err.message)
      setCloud(getCloudConfig())
    } finally {
      setCloudBusy(false)
    }
  }

  function exportData() {
    if (!core) return
    const blob = new Blob([core.exportJSON()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'cet4-sprint-' + new Date().toISOString().slice(0, 10) + '.json'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  function importData(e) {
    const file = e.target.files && e.target.files[0]
    if (!file || !core) return
    file.text().then((text) => {
      try {
        core.importJSON(text)
        window.location.reload()
      } catch (err) {
        window.alert('导入失败：' + err.message)
      }
    })
    e.target.value = ''
  }

  function save() {
    if (!st) return
    st.settings.examDate = examDate || st.settings.examDate
    st.settings.name = name
    st.settings.dailyMinutes = Math.max(5, Math.min(240, Number(minutes) || 30))
    core.setCheckTarget(+target || 50)
    core.save()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function inspectSync() {
    setSyncDiagBusy(true)
    setSyncDiag(null)
    try {
      const row = await fetchRemoteSupabase()
      const data = row && row.data ? row.data : {}
      const countAttempts = (value) => Object.values(value && value.attempts || {}).reduce((n, bucket) => n + Object.keys(bucket || {}).length, 0)
      setSyncDiag({
        email: supa.session?.user?.email || '—',
        updatedAt: row?.updated_at || '—',
        localWrong: core.wrongQuestions().length,
        remoteWrong: Object.keys(data.wrong?.questions || {}).length,
        localAttempts: countAttempts(core.getState()),
        remoteAttempts: countAttempts(data),
        lastHash: supa.lastHash || '无',
        lastPush: supa.lastPush ? new Date(supa.lastPush).toLocaleString() : '—',
        lastPull: supa.lastPull ? new Date(supa.lastPull).toLocaleString() : '—',
        lastError: supa.lastError || '',
      })
    } catch (err) {
      setSyncDiag({ error: err.message })
    } finally {
      setSyncDiagBusy(false)
    }
  }

  return (
    <>
      <div className="mb-7">
        <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">SETTINGS</div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">设置</h1>
        <p className="mt-2 text-sm text-muted-foreground">学习计划、档案与云同步</p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card className="mb-4">
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-semibold">学习计划</h2>
                <p className="mt-1 text-xs text-muted-foreground">每天学多久，由你决定</p>
              </div>
              <Badge variant="outline" className="font-normal">每周 {minutes * 7} 分钟</Badge>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">考试日期</span>
              <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="h-10 w-full rounded-md border bg-card px-3 text-sm" />
              <span className="mt-1 block text-xs text-muted-foreground">默认 2026 年 12 月 13 日，以准考证为准</span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">昵称（可选）</span>
              <input type="text" maxLength={12} value={name} onChange={(e) => setName(e.target.value)} placeholder="首页会这样称呼你" className="h-10 w-full rounded-md border bg-card px-3 text-sm" />
            </label>
            <div>
              <span className="mb-1.5 block text-sm font-medium">每天学习时长</span>
              <div className="flex items-center gap-3">
                <input type="number" min={5} max={240} value={minutes} onChange={(e) => setMinutes(e.target.value)} className="h-10 w-28 rounded-md border bg-card px-3 text-sm" />
                <span className="text-xs text-muted-foreground">分钟 / 天</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[20, 30, 45, 60, 90].map((v) => (
                  <button key={v} type="button" onClick={() => setMinutes(v)} className={`rounded-md border px-2.5 py-1 text-xs ${Number(minutes) === v ? 'border-primary/50 bg-[var(--accent-soft)] text-primary' : 'text-muted-foreground hover:text-foreground'}`}>{v} 分</button>
                ))}
              </div>
              <span className="mt-2 block text-xs text-muted-foreground">本周目标 = 每天 {Number(minutes) || 0} 分钟 × 7 天 = <span className="text-foreground">{Number(minutes) * 7 || 0} 分钟</span></span>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">每日抽查量</span>
              <input type="number" min={10} max={200} value={target} onChange={(e) => setTarget(e.target.value)} className="h-10 w-full rounded-md border bg-card px-3 text-sm" />
              <span className="mt-1 block text-xs text-muted-foreground">10–200 个，按 10 个一组</span>
            </label>
            <div className="flex items-center gap-3">
              <Button onClick={save}><Save className="h-4 w-4" /> 保存设置</Button>
              {saved ? <span className="inline-flex items-center gap-1 text-xs text-success"><Check className="h-3.5 w-3.5" /> 已保存</span> : null}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold">学习档案</h2>
              <p className="mt-1 text-xs text-muted-foreground">同一浏览器下分档，进度互不干扰。切换后页面会重新加载。</p>
            </div>
            <Badge variant="secondary" className="font-normal">{profiles.length} 个档案</Badge>
          </div>
          <div className="mt-4 space-y-2">
            {profiles.map((p) => (
              <div key={p.id} className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${p.active ? 'border-primary/40 bg-secondary/60' : 'bg-card'}`}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary font-display text-sm text-primary">{p.name.slice(0, 1)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {p.name}
                    {p.active ? <Badge variant="default" className="h-5 px-1.5 text-[11px]">当前</Badge> : null}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{p.active ? '正在使用' : '点击切换到此档案'}</div>
                </div>
                {!p.active ? <Button size="sm" variant="outline" onClick={() => switchProfile(p.id)}>切换</Button> : null}
                <Button size="sm" variant="ghost" onClick={() => {
                  const name = window.prompt('档案名称', p.name)
                  if (name) { renameProfile(p.id, name); setProfiles(listProfiles()) }
                }}>改名</Button>
                {!p.active && profiles.length > 1 ? <Button size="sm" variant="ghost" onClick={() => {
                  if (window.confirm('删除档案「' + p.name + '」？此操作不可撤销。')) {
                    removeProfile(p.id); setProfiles(listProfiles())
                  }
                }}>删除</Button> : null}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={20} placeholder="新档案名称，如：室友 A" className="h-9 min-w-48 flex-1 rounded-md border bg-card px-3 text-sm" />
            <Button variant="outline" onClick={() => { if (createProfile(newName)) setNewName('') }}>新建空白档案</Button>
          </div>
          {profiles.length > 1 ? <p className="mt-3 rounded-lg bg-warning-soft p-3 text-xs text-warning">云同步仍只有一个远程进度文件；多档案 + 云同步会互相覆盖，建议每个档案只在本机使用。</p> : null}
        </CardContent>
      </Card>
      </div>

      <h2 className="t-section mb-3 mt-8">显示与数据</h2>
      <div className="grid items-start gap-4 lg:grid-cols-2">
      <Card className="mb-4 border-danger-soft">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">清空今天的学习记录</h2>
              <p className="mt-1 max-w-[560px] text-xs leading-relaxed text-muted-foreground">删除今天的抽查数、热力图记录、答题记录、今天新增的单词本和错题。不会回滚已经写入的 SRS 记忆，也不会删除历史记录。</p>
            </div>
            <Badge variant="outline" className="font-normal">不可撤销</Badge>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="destructive" onClick={() => {
              if (!confirmToday) {
                setConfirmToday(true)
                setTodayMsg('再点一次确认：只清空今天，历史进度保留')
                return
              }
              const result = clearToday(core)
              setConfirmToday(false)
              setTodayMsg('已清空今天：单词本 ' + result.wordbook + ' 个、错题 ' + result.wrong + ' 个、答题 ' + result.attempts + ' 条')
              setTimeout(() => window.location.reload(), 800)
            }}>{confirmToday ? '确认清空今天' : '清空今天'}</Button>
            {todayMsg ? <span className="text-xs text-muted-foreground" aria-live="polite">{todayMsg}</span> : null}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent className="p-6">
          <h2 className="t-section">动效</h2>
          <p className="t-meta mt-1">关闭极光动画与卡片入场，保留静态背景。</p>
          <button
            type="button"
            aria-pressed={motionOff}
            onClick={() => {
              const next = !motionOff
              setMotionOff(next)
              try { localStorage.setItem('cet4-sprint/motion', next ? 'reduce' : 'full') } catch (e) { /* ignore */ }
              document.documentElement.classList.toggle('reduce-motion', next)
              window.dispatchEvent(new Event('motionchange'))
            }}
            className={`mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm ${motionOff ? 'border-[rgba(111,92,255,.45)] bg-[var(--accent-soft)] text-foreground' : 'border-white/10 text-muted-foreground'}`}
          >
            <span className={`h-2 w-2 rounded-full ${motionOff ? 'bg-primary' : 'bg-white/25'}`} />
            减少动效
          </button>
        </CardContent>
      </Card>
      </div>

      <h2 className="t-section mb-3 mt-8">账号与同步</h2>
      <Card className="mb-4">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold">Supabase 账号同步</h2>
              <p className="mt-1 text-xs text-muted-foreground">真实邮箱账号，每个人只读写自己的进度；不需要 GitHub Token。</p>
            </div>
            <Badge variant="default" className="font-normal">推荐</Badge>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs text-muted-foreground">Project URL</span>
              <input value={supa.url} onChange={(e) => setSupa({ ...supa, url: e.target.value.trim() })} placeholder="https://xxxx.supabase.co" className="h-10 w-full rounded-md border bg-card px-3 text-sm" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs text-muted-foreground">anon public key</span>
              <input value={supa.anonKey} onChange={(e) => setSupa({ ...supa, anonKey: e.target.value.trim() })} placeholder="eyJhbGciOi..." autoComplete="off" className="h-10 w-full rounded-md border bg-card px-3 text-sm" />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button variant="outline" disabled={supaBusy} onClick={() => { saveSupa(); setSupaMsg('Supabase 配置已保存') }}>保存 URL / Key</Button>
            <a href="./supabase-schema.sql" target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">查看建表 SQL</a>
            <span className="text-[11px] text-[var(--faint)]">SQL 文件也会随站点部署</span>
          </div>

          {!supa.session ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[.03] p-4">
              <div className="t-eyebrow">ACCOUNT</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <input value={supaEmail} onChange={(e) => setSupaEmail(e.target.value.trim())} placeholder="邮箱" autoComplete="email" className="h-10 w-full rounded-md border bg-card px-3 text-sm" />
                <input type="password" value={supaPassword} onChange={(e) => setSupaPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') authSupa(supaMode) }} placeholder="密码（至少 6 位）" autoComplete="current-password" className="h-10 w-full rounded-md border bg-card px-3 text-sm" />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button variant="outline" disabled={supaBusy} onClick={() => authSupa('login')}>登录</Button>
                <Button variant="ghost" disabled={supaBusy} onClick={() => authSupa('signup')}>注册新账号</Button>
                <button type="button" className="text-[11px] text-muted-foreground underline-offset-4 hover:underline" onClick={() => setSupaMode(supaMode === 'login' ? 'signup' : 'login')}>
                  当前模式：{supaMode === 'login' ? '登录' : '注册'}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-[var(--faint)]">如果注册后收不到邮件，去 Supabase Authentication → Providers → Email 关闭 Confirm email，或先点确认邮件再登录。</p>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[.03] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-[var(--faint)]">当前登录</div>
                  <div className="mt-1 text-sm">{supa.session.user?.email || '已登录'}</div>
                </div>
                <Button variant="ghost" size="sm" disabled={supaBusy} onClick={logoutSupa}>退出登录</Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" disabled={supaBusy} onClick={() => { saveSupa(); runSupa('测试连接', async () => { const r = await testSupabase(); return '连接成功：' + (r.email || '已登录') }) }}>测试连接</Button>
                <Button disabled={supaBusy} onClick={() => runSupa('上传', async () => { saveSupa(); await pushSupabase(core); return '已上传到 Supabase' })}>上传到 Supabase</Button>
                <Button variant="outline" disabled={supaBusy} onClick={() => {
                  if (!confirmPull) { setConfirmPull(true); setSupaMsg('再点一次确认：会覆盖本机当前档案的进度'); return }
                  setConfirmPull(false)
                  runSupa('恢复', async () => { await pullSupabase(core); setTimeout(() => window.location.reload(), 400); return '已恢复，正在刷新…' })
                }}>{confirmPull ? '确认覆盖并恢复' : '从 Supabase 恢复'}</Button>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!supa.auto} onChange={(e) => saveSupa({ auto: e.target.checked })} />
                  自动上传本机改动
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!supa.autoPull} onChange={(e) => saveSupa({ autoPull: e.target.checked })} />
                  自动获取云端更新
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button variant="ghost" size="sm" disabled={syncDiagBusy} onClick={inspectSync}>{syncDiagBusy ? '检查中…' : '同步诊断'}</Button>
                <span className="text-[11px] text-muted-foreground">对比本机与云端的错题、练习数量</span>
              </div>
              {syncDiag ? (
                <div className="mt-2 rounded-lg border border-white/10 bg-black/20 p-3 text-[11px] leading-relaxed text-muted-foreground">
                  {syncDiag.error ? <p className="text-danger">{syncDiag.error}</p> : (
                    <>
                      <div className="grid gap-1 sm:grid-cols-2">
                        <span>账号：{syncDiag.email}</span>
                        <span>云端时间：{syncDiag.updatedAt}</span>
                        <span>本机错题：{syncDiag.localWrong} · 云端错题：{syncDiag.remoteWrong}</span>
                        <span>本机练习：{syncDiag.localAttempts} · 云端练习：{syncDiag.remoteAttempts}</span>
                        <span>上次上传：{syncDiag.lastPush}</span>
                        <span>上次恢复：{syncDiag.lastPull}</span>
                      </div>
                      {syncDiag.lastError ? <p className="mt-1 text-warning">{syncDiag.lastError}</p> : null}
                    </>
                  )}
                </div>
              ) : null}
              {!supa.lastHash ? <p className="mt-2 rounded-lg bg-warning-soft p-2 text-[11px] text-warning">首次连接：先手动「上传到 Supabase」或「从 Supabase 恢复」一次；完成后自动更新才会启用。</p> : null}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--faint)]">
                {supa.lastPush ? <span>上次上传 {new Date(supa.lastPush).toLocaleString()}</span> : null}
                {supa.lastPull ? <span>上次恢复 {new Date(supa.lastPull).toLocaleString()}</span> : null}
              </div>
            </div>
          )}

          <div className="mt-3 text-[11px] text-muted-foreground" aria-live="polite">{supaMsg || '首次使用：填 Project URL + anon key，保存，登录或注册，再测试连接。'}</div>
          {supa.lastError ? <p className="mt-2 rounded-lg bg-danger-soft p-2 text-xs text-danger">{supa.lastError}</p> : null}

          <details className="mt-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer text-primary">Supabase 初始化步骤</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-4 leading-relaxed">
              <li>在 supabase.com 新建免费项目。</li>
              <li>Project Settings → API 复制 Project URL 和 anon public key，填到上面并保存。</li>
              <li>SQL Editor 执行仓库里的 supabase/schema.sql（或点上方「查看建表 SQL」）。</li>
              <li>Authentication → Providers → Email 开启；两个人分别注册账号。</li>
              <li>回到这里登录，先「上传到 Supabase」建立自己的进度行。</li>
            </ol>
          </details>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold">GitHub 同步（备用）</h2>
              <p className="mt-1 text-xs text-muted-foreground">每个档案绑定自己的仓库和 Token；两人互不覆盖。仓库需为私有仓库，Token 只需 Contents 读写权限。</p>
            </div>
            <Badge variant="outline" className="font-normal">GitHub</Badge>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">仓库 owner/repo</span>
              <input value={cloud.repo} onChange={(e) => setCloud({ ...cloud, repo: e.target.value.trim() })} placeholder="你的用户名/cet4-progress" className="h-10 w-full rounded-md border bg-card px-3 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">分支</span>
              <input value={cloud.branch || 'main'} onChange={(e) => setCloud({ ...cloud, branch: e.target.value.trim() })} placeholder="main" className="h-10 w-full rounded-md border bg-card px-3 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">文件路径</span>
              <input value={cloud.path} onChange={(e) => setCloud({ ...cloud, path: e.target.value.trim() })} placeholder="sync/progress.json" className="h-10 w-full rounded-md border bg-card px-3 text-sm" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>Fine-grained GitHub Token（只存在本机）</span>
                <button type="button" className="text-primary hover:underline" onClick={() => setCloud({ ...cloud, token: '' })}>清空 Token</button>
              </span>
              <input type="password" value={cloud.token} onChange={(e) => setCloud({ ...cloud, token: e.target.value.trim() })} onFocus={(e) => e.target.select()} placeholder="github_pat_..." autoComplete="off" className="h-10 w-full rounded-md border bg-card px-3 text-sm" />
            </label>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!cloud.auto} onChange={(e) => saveCloud({ auto: e.target.checked })} />
            自动上传（每 15 秒检查变更；不会自动覆盖本地）
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" disabled={cloudBusy} onClick={() => { saveCloud(); setCloudMsg('配置已保存') }}>保存配置</Button>
            <Button variant="outline" onClick={() => {
              resetCloudConfig()
              setCloud(getCloudConfig())
              setCloudMsg('已清空本机云同步配置，请重新填写仓库、分支和 Token')
            }}>重置配置</Button>
            <Button variant="outline" disabled={cloudBusy} onClick={() => { saveCloud(); runCloud('测试连接', async () => {
              const r = await testCloud(cloud)
              return r.exists ? '连接成功，云端已有进度' : '连接成功，云端暂无文件（首次上传会创建）'
            }) }}>测试连接</Button>
            <Button disabled={cloudBusy} onClick={() => runCloud('上传', async () => {
              saveCloud()
              await pushCloud(core, cloud)
              return '已上传到云端'
            })}>上传到云端</Button>
            <Button variant="outline" disabled={cloudBusy} onClick={() => { saveCloud(); runCloud('下载', async () => {
              if (!window.confirm('从云端恢复会覆盖当前档案的本地进度，确定继续？')) return '已取消'
              await pullCloud(core, cloud)
              setTimeout(() => window.location.reload(), 400)
              return '已下载，正在刷新…'
            }) }}>从云端恢复</Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span aria-live="polite">{cloudMsg || '私有仓库必须在 Token 的 Repository access 中勾选；分支默认 main。'}</span>
            {cloud.lastPush ? <span>上次上传 {new Date(cloud.lastPush).toLocaleString()}</span> : null}
            {cloud.lastPull ? <span>上次恢复 {new Date(cloud.lastPull).toLocaleString()}</span> : null}
          </div>
          {cloud.lastError ? <p className="mt-2 rounded-lg bg-danger-soft p-2 text-xs text-danger">{cloud.lastError}</p> : null}
        </CardContent>
      </Card>

        <h2 className="t-section mb-3 mt-8">数据与备份</h2>
        <Card className="mb-4">
          <CardContent className="p-6">
            <h2 className="font-display text-lg font-semibold">更多</h2>
            <p className="mt-1 text-xs text-muted-foreground">数据导入导出已迁到「更多」，旧版入口已移除。</p>
            <div className="mt-5 space-y-2">
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={exportData}>导出 JSON</Button>
                <Button variant="outline" className="flex-1" onClick={() => importRef.current?.click()}>导入 JSON</Button>
                <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={importData} />
              </div>
            </div>
            <div className="mt-6 rounded-lg bg-secondary/40 p-4 text-xs leading-relaxed text-muted-foreground">
              当前为深色极光主题；学习档案与云同步配置仅保存在本机浏览器和你的 Supabase 账号。
            </div>
          </CardContent>
        </Card>
    </>
  )
}
