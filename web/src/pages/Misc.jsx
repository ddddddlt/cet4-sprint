import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowUpRight, Check, Save } from 'lucide-react'
import { createProfile, listProfiles, removeProfile, renameProfile, switchProfile } from '../lib/profiles'
import { getCloudConfig, setCloudConfig, resetCloudConfig, pushCloud, pullCloud, testCloud } from '../lib/cloud'
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
                  <Card key={e.qid} className="">
                    <CardContent className="p-5">
                      <p className="text-sm leading-relaxed">{e.stem}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="font-normal">答案 {e.answer}</Badge>
                        <span>错 {e.count} 次</span>
                      </div>
                      {e.explain ? <p className="mt-3 rounded-lg bg-secondary/40 p-3 text-xs leading-relaxed text-muted-foreground">{e.explain}</p> : null}
                      {e.setId ? (
                        <a className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          href={e.kind === 'listening' ? `#/listening/${e.setId}` : `#/${e.kind}/${e.setId}?review=1&q=${e.qid}`}>
                          去原题重做 <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
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

export function Settings() {
  useCoreReady()
  const core = window.App?.core
  const st = core ? core.getState() : null
  const [examDate, setExamDate] = useState('')
  const [name, setName] = useState('')
  const [target, setTarget] = useState(50)
  const [saved, setSaved] = useState(false)
  const [profiles, setProfiles] = useState(() => listProfiles())
  const [newName, setNewName] = useState('')
  const [cloud, setCloud] = useState(() => getCloudConfig())
  const [cloudBusy, setCloudBusy] = useState(false)
  const [motionOff, setMotionOff] = useState(() => { try { return localStorage.getItem('cet4-sprint/motion') === 'reduce' } catch (e) { return false } })
  const [cloudMsg, setCloudMsg] = useState('')
  const importRef = useRef(null)

  useEffect(() => {
    if (!st) return
    setExamDate(st.settings.examDate || '')
    setName(st.settings.name || '')
    setTarget(core.checkTarget())
  }, [st])

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

      <Card className="mb-4">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold">云同步 · 当前档案独立</h2>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="">
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
              {saved ? <span className="inline-flex items-center gap-1 text-xs text-success"><Check className="h-3.5 w-3.5" /> 已保存</span> : null}
            </div>
          </CardContent>
        </Card>

        <Card className="">
          <CardContent className="p-6">
            <h2 className="font-display text-lg font-semibold">更多</h2>
            <p className="mt-1 text-xs text-muted-foreground">数据导入导出已迁到 v2；旧版设置里的云同步是单文件，不建议两人同时使用。</p>
            <div className="mt-5 space-y-2">
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={exportData}>导出 JSON</Button>
                <Button variant="outline" className="flex-1" onClick={() => importRef.current?.click()}>导入 JSON</Button>
                <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={importData} />
              </div>
              <a href={legacyUrl('#/settings')} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm hover:bg-secondary/40">
                打开旧版设置 <ArrowUpRight className="h-4 w-4 opacity-50" />
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
