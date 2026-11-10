// Supabase Edge Function: grade
// Secrets required: DEEPSEEK_API_KEY
// SUPABASE_URL and SUPABASE_ANON_KEY are provided by Supabase at runtime.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

function clip(value, n) {
  return String(value || '').slice(0, n)
}

async function verifyUser(req) {
  const auth = req.headers.get('Authorization') || ''
  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  if (!auth.startsWith('Bearer ') || !url || !anon) return null
  const res = await fetch(url + '/auth/v1/user', {
    headers: { apikey: anon, Authorization: auth },
  })
  if (!res.ok) return null
  return res.json()
}

const RUBRIC = {
  writing: `你是大学英语四级（CET-4）写作阅卷老师。按 15 分制评分，参考：内容切题、结构清晰、语言准确、词汇与句式多样。
只输出 JSON，不要 markdown：
{"score":0-15,"band":"13-15/10-12/7-9/4-6/1-3","summary":"一句话总评","strengths":["..."],"issues":[{"quote":"原文片段","problem":"问题","fix":"修改建议"}],"suggestions":["..."]}`,
  translation: `你是大学英语四级（CET-4）翻译阅卷老师。按 15 分制评分，参考：信息完整、语义准确、语法与用词、英文表达自然。
只输出 JSON，不要 markdown：
{"score":0-15,"band":"13-15/10-12/7-9/4-6/1-3","summary":"一句话总评","strengths":["..."],"issues":[{"quote":"原文片段","problem":"问题","fix":"修改建议"}],"suggestions":["..."]}`,
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const user = await verifyUser(req)
  if (!user) return json({ error: '请先在设置页登录 Supabase' }, 401)

  const apiKey = Deno.env.get('DEEPSEEK_API_KEY')
  if (!apiKey) return json({ error: '服务端还没有配置 DEEPSEEK_API_KEY' }, 503)

  let body
  try {
    body = await req.json()
  } catch (e) {
    return json({ error: '请求格式不正确' }, 400)
  }

  const kind = body.kind === 'translation' ? 'translation' : body.kind === 'writing' ? 'writing' : null
  const text = clip(body.text, 5000).trim()
  const prompt = clip(body.prompt, 3000).trim()
  if (!kind || !text) return json({ error: '缺少 kind 或 text' }, 400)

  const userPrompt = [
    kind === 'writing' ? '作文题目：' : '中文原文：',
    prompt,
    '',
    kind === 'writing' ? '学生作文：' : '学生译文：',
    text,
  ].join('\n')

  const upstream = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: 0.2,
      max_tokens: 1200,
      messages: [
        { role: 'system', content: RUBRIC[kind] },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '')
    return json({ error: 'AI 批改服务暂时不可用', detail: clip(detail, 300) }, 502)
  }

  const data = await upstream.json()
  const raw = data?.choices?.[0]?.message?.content || ''
  let result
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
    result = JSON.parse(cleaned)
  } catch (e) {
    return json({ error: 'AI 返回格式无法解析', raw: clip(raw, 500) }, 502)
  }

  const score = Math.max(0, Math.min(15, Number(result.score) || 0))
  return json({
    kind,
    score,
    band: clip(result.band, 20),
    summary: clip(result.summary, 400),
    strengths: Array.isArray(result.strengths) ? result.strengths.slice(0, 5).map((x) => clip(x, 200)) : [],
    issues: Array.isArray(result.issues) ? result.issues.slice(0, 6).map((x) => ({
      quote: clip(x.quote, 200), problem: clip(x.problem, 200), fix: clip(x.fix, 300),
    })) : [],
    suggestions: Array.isArray(result.suggestions) ? result.suggestions.slice(0, 5).map((x) => clip(x, 300)) : [],
    model: 'deepseek-chat',
  })
})
