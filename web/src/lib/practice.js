export function restartPractice(core, kind, id) {
  if (!core) return
  core.clearSession(kind, id)
  if (kind === 'translation') core.saveDraft(id, '')
  if (kind === 'writing') core.saveWritingDraft(id, '')
  const st = core.getState()
  if (st.attempts && st.attempts[kind]) delete st.attempts[kind][id]
  if (st.aiGrades) {
    delete st.aiGrades[kind + ':' + id]
    delete st.aiGrades[kind + ':' + id + ':result']
  }
  core.save()
}
