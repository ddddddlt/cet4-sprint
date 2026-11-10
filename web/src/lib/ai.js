import { ensureSession } from './supabase'

export async function gradeWithAI({ kind, prompt, text }) {
  if (!text || !String(text).trim()) throw new Error('还没有可批改的内容')
  const { cfg, session } = await ensureSession()
  const base = cfg.url.replace(/\/+$/, '')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 90000)
  try {
    const res = await fetch(base + '/functions/v1/grade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.anonKey,
        Authorization: 'Bearer ' + session.access_token,
      },
      body: JSON.stringify({ kind, prompt, text }),
      signal: controller.signal,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      if (res.status === 404) throw new Error('AI 批改函数还没部署')
      if (res.status === 401) throw new Error('登录已失效，请到设置页重新登录')
      throw new Error(data.error || 'AI 批改暂时不可用')
    }
    return data
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('AI 批改超时，请稍后重试')
    throw e
  } finally {
    clearTimeout(timer)
  }
}

export function savedAiGrade(key) {
  const st = window.App?.core?.getState?.()
  return st?.aiGrades?.[key] || null
}

export function saveAiGrade(key, result) {
  const core = window.App?.core
  if (!core) return
  const st = core.getState()
  st.aiGrades = st.aiGrades || {}
  st.aiGrades[key] = { ...result, at: Date.now() }
  core.save()
}
