export const CET_STANDARD_MAX = {
  reading: 248.5,
  listening: 248.5,
  writing: 106.5,
  translation: 106.5,
}

export function toCetStandard(kind, score, total) {
  const max = CET_STANDARD_MAX[kind] || 0
  const t = Number(total) || 0
  const s = Math.max(0, Math.min(t, Number(score) || 0))
  if (!max || !t) return 0
  return Math.round(((s / t) * max) * 10) / 10
}

export function standardLabel(kind, score, total) {
  return `${toCetStandard(kind, score, total)} / ${CET_STANDARD_MAX[kind] || 0}`
}
