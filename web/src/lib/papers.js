let promise = null

function signature(set) {
  if (!set) return 'X'
  if (set.bank) return 'C:' + String(set.passage || '').slice(0, 120)
  if (set.statements) return 'M:' + String((set.paragraphs && set.paragraphs[0] && set.paragraphs[0].text) || '').slice(0, 100)
  if (set.questions) return 'R:' + String(set.passage || '').slice(0, 120)
  if (set.sentences) return 'T:' + String(set.zh || '').slice(0, 80)
  return 'X:' + set.id
}

function merge(papers) {
  const map = { reading: 'CET4_READING', cloze: 'CET4_CLOZE', matching: 'CET4_MATCHING', translation: 'CET4_TRANSLATION' }
  const seen = {}
  Object.keys(map).forEach((key) => {
    (window[map[key]] || []).forEach((set) => { seen[signature(set)] = 1 })
  })
  papers.forEach((paper) => {
    Object.keys(map).forEach((key) => {
      let items = paper[key]
      if (!items) return
      if (!Array.isArray(items)) items = [items]
      items.forEach((set) => {
        const sig = signature(set)
        if (seen[sig]) return
        seen[sig] = 1
        const list = window[map[key]] || (window[map[key]] = [])
        if (!list.some((x) => x.id === set.id)) list.push(set)
      })
    })
  })
}

export function loadPapers() {
  if (window.CET4_PAPERS) return Promise.resolve()
  if (promise) return promise
  promise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = new URL('legacy/papers/bundle.js', document.baseURI).toString()
    script.async = true
    script.onload = () => {
      try {
        merge(window.CET4_PAPERS || [])
        resolve()
      } catch (err) {
        reject(err)
      }
    }
    script.onerror = () => reject(new Error('题库加载失败'))
    document.head.appendChild(script)
  })
  return promise
}
