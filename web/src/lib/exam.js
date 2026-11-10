import { activeProfile } from './profiles'

const PREFIX = 'cet4-sprint/exam/v1/'

export function paperId(paper, index) {
  return (paper && paper.writing && paper.writing.id) || 'paper-' + index
}

export function paperLabel(paper, index) {
  return (paper && paper.source && paper.source.label) || '整套试卷 ' + (index + 1)
}

export function listPapers() {
  return (window.CET4_PAPERS || []).map((paper, index) => ({ paper, index }))
}

export function makeExam(paper, index) {
  return {
    id: paperId(paper, index),
    index,
    label: paperLabel(paper, index),
    writing: paper.writing || null,
    reading: Array.isArray(paper.reading) ? paper.reading : (paper.reading ? [paper.reading] : []),
    cloze: Array.isArray(paper.cloze) ? paper.cloze[0] : paper.cloze,
    matching: Array.isArray(paper.matching) ? paper.matching[0] : paper.matching,
    translation: Array.isArray(paper.translation) ? paper.translation[0] : paper.translation,
    minutes: 125,
  }
}

export function objectiveTotal(exam) {
  return exam.reading.reduce((n, s) => n + (s.questions || []).length, 0)
    + (exam.cloze?.blanks?.length || 0)
    + (exam.matching?.statements?.length || 0)
}

function key(id) {
  const p = activeProfile()
  return PREFIX + (p ? p.id + '/' : '') + id
}

export function loadExam(id) {
  try {
    const raw = localStorage.getItem(key(id))
    if (!raw) return null
    return JSON.parse(raw)
  } catch (e) {
    return null
  }
}

export function saveExam(id, state) {
  try { localStorage.setItem(key(id), JSON.stringify(state)) } catch (e) { /* ignore */ }
  return state
}

export function clearExam(id) {
  try { localStorage.removeItem(key(id)) } catch (e) { /* ignore */ }
}

export function startExam(exam) {
  const state = {
    id: exam.id,
    startedAt: Date.now(),
    endsAt: Date.now() + exam.minutes * 60 * 1000,
    answers: { reading: {}, cloze: {}, matching: {} },
    texts: { writing: '', translation: '' },
    section: 'writing',
    submitted: false,
    result: null,
  }
  return saveExam(exam.id, state)
}

export function evaluate(exam, state) {
  let readingScore = 0
  let readingTotal = 0
  exam.reading.forEach((set) => {
    (set.questions || []).forEach((q) => {
      readingTotal += 1
      if (state.answers.reading[q.id] === q.answer) readingScore += 1
    })
  })
  let clozeScore = 0
  const clozeTotal = exam.cloze?.blanks?.length || 0
  ;(exam.cloze?.blanks || []).forEach((b) => {
    if (state.answers.cloze[b.no] === b.answer) clozeScore += 1
  })
  let matchingScore = 0
  const matchingTotal = exam.matching?.statements?.length || 0
  ;(exam.matching?.statements || []).forEach((st) => {
    if (state.answers.matching[st.id] === st.answer) matchingScore += 1
  })
  const score = readingScore + clozeScore + matchingScore
  const total = readingTotal + clozeTotal + matchingTotal
  return {
    reading: { score: readingScore, total: readingTotal },
    cloze: { score: clozeScore, total: clozeTotal },
    matching: { score: matchingScore, total: matchingTotal },
    score,
    total,
    pct: total ? Math.round((score / total) * 100) : 0,
    writingWords: (state.texts.writing.trim().match(/[A-Za-z0-9'’-]+/g) || []).length,
    translationWords: (state.texts.translation.trim().match(/[A-Za-z0-9'’-]+/g) || []).length,
  }
}
