/*
 * 核心逻辑：本地存储 / 间隔重复（简化 FSRS）/ 统计与打卡
 * 所有状态集中在 App.core.state，任何写操作后调用 App.core.save()
 */
window.App = window.App || {};
(function (A) {
  'use strict';

  var DAY = 86400000;
  var KEY = 'cet4-sprint/v1';

  /* ---------------- 工具 ---------------- */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function startOfDay(ts) { var d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function todayStart() { return startOfDay(Date.now()); }
  function dateKey(ts) { var d = new Date(ts); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addDays(ts, n) { return startOfDay(ts) + n * DAY; }
  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
  function parseDate(str) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str || '');
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3]);
  }
  function defaultExamDate() {
    var now = new Date();
    var year = now.getFullYear();
    var dec = new Date(year, 11, 13);
    if (dec.getTime() < startOfDay(now.getTime())) dec = new Date(year + 1, 11, 13);
    return dateKey(dec.getTime());
  }

  /* ---------------- 默认状态 ---------------- */
  function defaults() {
    return {
      version: 1,
      createdAt: Date.now(),
      settings: {
        examDate: defaultExamDate(),
        newPerDay: 15,
        reviewCap: 120,
        checkTarget: 50,
        dailyMinutes: 30,
        name: '',
        theme: 'auto',
        updatedAt: 0
      },
      cards: {},
      daily: {},
      attempts: { reading: {}, listening: {}, translation: {} },
      qstats: {},
      sessions: {},
      drill: { byMode: { spelling: { n: 0, ok: 0 }, dictation: { n: 0, ok: 0 }, sense: { n: 0, ok: 0 }, collocation: { n: 0, ok: 0 }, root: { n: 0, ok: 0 } }, byWord: {} },
      wrong: { words: {}, questions: {} },
      syncTombstones: { wrong: {}, attempts: {} },
      drafts: { translation: {} },
      custom: [],
      wordbook: {}
    };
  }

  function migrate(raw) {
    var d = defaults();
    if (!raw || typeof raw !== 'object') return d;
    var s = raw;
    s.version = 1;
    s.createdAt = s.createdAt || Date.now();
    s.settings = Object.assign({}, d.settings, s.settings || {});
    // 考试日期改为 12 月 13 日：旧默认值自动迁移，用户手动改过的其它日期保留
    if (!s.settings.examDate || /^\d{4}-12-19$/.test(s.settings.examDate)) {
      s.settings.examDate = defaultExamDate();
    }
    s.cards = s.cards || {};
    s.daily = s.daily || {};
    s.attempts = s.attempts || { reading: {}, listening: {}, translation: {} };
    s.attempts.translation = s.attempts.translation || {};
    s.qstats = s.qstats || {};
    s.sessions = s.sessions || {};
    s.drill = s.drill || {};
    s.drill.byMode = s.drill.byMode || {};
    ['spelling', 'dictation', 'sense', 'collocation', 'root'].forEach(function (m) {
      s.drill.byMode[m] = s.drill.byMode[m] || { n: 0, ok: 0 };
    });
    s.drill.byWord = s.drill.byWord || {};
    s.wrong = s.wrong || { words: {}, questions: {} };
    s.wrong.words = s.wrong.words || {};
    s.wrong.questions = s.wrong.questions || {};
    s.syncTombstones = s.syncTombstones || {};
    s.syncTombstones.wrong = s.syncTombstones.wrong || {};
    s.syncTombstones.attempts = s.syncTombstones.attempts || {};
    s.syncTombstones.sessions = s.syncTombstones.sessions || {};
    s.drafts = s.drafts || { translation: {} };
    s.drafts.translation = s.drafts.translation || {};
    s.drafts.writing = s.drafts.writing || {};
    s.custom = s.custom || [];
    s.wordbook = s.wordbook || {};
    return s;
  }

  /* ---------------- 主题 ---------------- */
  function themeMode() {
    return (state.settings && state.settings.theme) || 'auto';
  }

  function applyTheme() {
    var mode = themeMode();
    var dark = mode === 'dark' || (mode === 'auto' && window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#111614' : '#12655a');
    return dark;
  }

  function setThemeMode(mode) {
    state.settings.theme = (mode === 'light' || mode === 'dark') ? mode : 'auto';
    state.settings.updatedAt = Date.now();
    save();
    applyTheme();
    return state.settings.theme;
  }

  if (window.matchMedia) {
    var themeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (themeQuery.addEventListener) {
      themeQuery.addEventListener('change', function () {
        if (themeMode() === 'auto') applyTheme();
      });
    }
  }

  /* ---------------- 存储 ---------------- */
  var storageOK = true;
  var state = defaults();

  function load() {
    var raw = null;
    try {
      raw = window.localStorage.getItem(KEY);
    } catch (e) {
      storageOK = false;
    }
    if (!raw) { state = defaults(); applyTheme(); return state; }
    try {
      state = migrate(JSON.parse(raw));
    } catch (e) {
      state = defaults();
    }
    syncWordbookFromWrong();
    applyTheme();
    return state;
  }

  function save() {
    if (!storageOK) return false;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
      if (typeof syncMarkDirty === 'function') syncMarkDirty();
      return true;
    } catch (e) {
      storageOK = false;
      return false;
    }
  }

  function reset() {
    state = defaults();
    try { window.localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    save();
  }

  function exportJSON() {
    return JSON.stringify(state, null, 2);
  }

  function importJSON(text) {
    var parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || !parsed.settings) throw new Error('文件格式不正确');
    state = migrate(parsed);
    save();
    return state;
  }

  /* ---------------- 云同步（GitHub 仓库文件） ---------------- */
  var SYNC_KEY = 'cet4-sprint/sync/v1';
  var SYNC_REPO = 'ddddddlt/cet4-sprint';
  var SYNC_PATH = 'sync/progress.json';

  function b64encode(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return window.btoa(bin);
  }

  function b64decode(b64) {
    var bin = window.atob(String(b64).replace(/\s/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  }

  function syncConfig() {
    try {
      return JSON.parse(window.localStorage.getItem(SYNC_KEY) || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function syncSaveConfig(patch) {
    var cfg = syncConfig();
    Object.keys(patch || {}).forEach(function (k) { cfg[k] = patch[k]; });
    try { window.localStorage.setItem(SYNC_KEY, JSON.stringify(cfg)); } catch (e) { /* ignore */ }
    return cfg;
  }

  function syncRequest(path, opts) {
    opts = opts || {};
    var cfg = syncConfig();
    var headers = { 'Accept': 'application/vnd.github+json' };
    if (cfg.token) headers.Authorization = 'Bearer ' + cfg.token;
    if (opts.body) headers['Content-Type'] = 'application/json';
    return window.fetch('https://api.github.com' + path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: 'no-store',
      keepalive: !!opts.keepalive
    }).then(function (r) {
      if (r.status === 404) return null;
      if (r.status === 401 || r.status === 403) throw new Error('Token 无效或没有仓库权限');
      if (!r.ok) throw new Error('GitHub ' + r.status);
      return r.json();
    });
  }

  function syncRemote() {
    return syncRequest('/repos/' + SYNC_REPO + '/contents/' + SYNC_PATH + '?ref=main&t=' + Date.now()).then(function (data) {
      if (!data || !data.content) return null;
      var payload = JSON.parse(b64decode(data.content));
      payload.sha = data.sha;
      return payload;
    });
  }

  function syncPush(opts) {
    opts = opts || {};
    var cfg = syncConfig();
    if (!cfg.token) return Promise.reject(new Error('还没有填 GitHub Token'));
    var snapshot = JSON.parse(JSON.stringify(state));
    var payload = {
      v: 1,
      savedAt: Date.now(),
      device: String(navigator.userAgent || '').slice(0, 60),
      state: snapshot
    };
    return syncRemote().then(function (remote) {
      var body = {
        message: 'sync progress ' + new Date().toISOString(),
        content: b64encode(JSON.stringify(payload)),
        branch: 'main'
      };
      if (remote && remote.sha) body.sha = remote.sha;
      return syncRequest('/repos/' + SYNC_REPO + '/contents/' + SYNC_PATH,
        { method: 'PUT', body: body, keepalive: !!opts.keepalive })
        .then(function (res) {
          if (!res) throw new Error('上传失败');
          syncSaveConfig({ lastPush: payload.savedAt, lastError: '' });
          return payload;
        });
    });
  }

  function syncPull() {
    return syncRemote().then(function (p) {
      if (p) syncSaveConfig({ lastPull: p.savedAt });
      return p;
    });
  }

  var syncDirty = false;
  var syncDirtySince = 0;
  var syncTimer = null;
  var syncBusy = false;

  function syncAutoOn() {
    var cfg = syncConfig();
    return !!cfg.token && cfg.auto !== false;
  }

  function syncSchedule(delay) {
    if (syncTimer) window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(function () {
      syncTimer = null;
      syncFlush(false);
    }, delay);
  }

  function syncMarkDirty() {
    if (!syncAutoOn()) return;
    if (!syncDirty) {
      syncDirty = true;
      syncDirtySince = Date.now();
    }
    var age = Date.now() - syncDirtySince;
    syncSchedule(age > 30000 ? 0 : 6000);
  }

  function syncFlush(keepalive) {
    if (syncBusy || !syncDirty) return;
    if (!syncConfig().token) return;
    syncBusy = true;
    syncDirty = false;
    syncPush({ keepalive: !!keepalive }).then(function () {
      syncBusy = false;
    }).catch(function (e) {
      syncBusy = false;
      syncDirty = true;
      syncSaveConfig({ lastError: (e && e.message) || '上传失败', lastErrorAt: Date.now() });
      syncSchedule(60000);
    });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') syncFlush(true);
    });
    window.addEventListener('pagehide', function () { syncFlush(true); });
  }

  /* ---------------- 词库 ---------------- */
  var words = (window.CET4_WORDS || []).slice();
  words.sort(function (a, b) {
    var x = String(a.w).toLowerCase(), y = String(b.w).toLowerCase();
    return x < y ? -1 : x > y ? 1 : 0;
  });
  var wordByW = {};
  words.forEach(function (w) { wordByW[String(w.w).toLowerCase()] = w; });
  var freqHigh = {}, freqMid = {};
  (function () {
    var f = window.CET4_FREQ || {};
    String(f.high || '').split(/\s+/).forEach(function (k) { if (k) freqHigh[k.toLowerCase()] = 1; });
    String(f.mid || '').split(/\s+/).forEach(function (k) { if (k && k.indexOf('?') < 0) freqMid[k.toLowerCase()] = 1; });
  })();

  // 合并导入的真题套卷（由 tools/json_to_js.py 生成）
  (function mergeImported() {
    var map = { reading: 'CET4_READING', cloze: 'CET4_CLOZE', matching: 'CET4_MATCHING', translation: 'CET4_TRANSLATION' };
    function sigOf(set) {
      if (set.bank) return 'C:' + String(set.passage || '').slice(0, 120);
      if (set.statements) return 'M:' + String((set.paragraphs && set.paragraphs[0] && set.paragraphs[0].text) || '').slice(0, 100);
      if (set.questions) return 'R:' + String(set.passage || '').slice(0, 120);
      if (set.sentences) return 'T:' + String(set.zh || '').slice(0, 80);
      return 'X:' + set.id;
    }
    var seen = {};
    Object.keys(map).forEach(function (key) {
      (window[map[key]] || []).forEach(function (set) { seen[sigOf(set)] = 1; });
    });
    (window.CET4_PAPERS || []).forEach(function (paper) {
      Object.keys(map).forEach(function (key) {
        var items = paper[key];
        if (!items) return;
        if (!Array.isArray(items)) items = [items];
        items.forEach(function (set) {
          var sig = sigOf(set);
          if (seen[sig]) return;
          seen[sig] = 1;
          var list = window[map[key]];
          if (!list) list = window[map[key]] = [];
          var exists = list.some(function (x) { return x.id === set.id; });
          if (!exists) list.push(set);
        });
      });
    });
  })();
  var wordMap = {};
  words.forEach(function (w) { wordMap[w.id] = w; });
  function allWords() { return words; }
  function getWord(id) { return wordMap[id] || null; }
  function lookupWord(w) { return wordByW[String(w || '').toLowerCase()] || null; }
  function freqOf(w) {
    var k = String(w || '').toLowerCase();
    if (!k || !wordByW[k]) return 'outside';
    if (freqHigh[k]) return 'high';
    if (freqMid[k]) return 'mid';
    return 'low';
  }

  /* ---------------- 每日记录 ---------------- */
  function dayRecord(key) {
    var k = key || dateKey(Date.now());
    if (!state.daily[k]) {
      state.daily[k] = { reviews: 0, correct: 0, newWords: 0, checkDone: 0, checkTarget: 0, reading: 0, listening: 0, translation: 0, seconds: 0 };
    }
    return state.daily[k];
  }
  function todayRecord() { return dayRecord(); }
  function activeOn(key) {
    var r = state.daily[key];
    return !!r && (r.reviews + r.reading + r.listening + (r.translation || 0) > 0);
  }

  /* ---------------- 间隔重复（简化 FSRS） ----------------
   * S：记忆稳定度（天）；D：难度（1–10）
   * 评级：1 忘记 / 2 模糊 / 3 认识 / 4 简单
   * 下次间隔 ≈ S，答对时间越快评级越高
   */
  function newCard() {
    return { S: 0, D: 5, due: todayStart(), reps: 0, lapses: 0, last: null, lastGrade: 0, wrong: 0 };
  }

  function gradeCard(card, g, now) {
    var mult = g === 1 ? 0.6 : g === 2 ? 1.25 : g === 3 ? 2.1 : 3.2;
    if (card.reps === 0) {
      card.S = g === 1 ? 0.4 : g === 2 ? 0.8 : 1.2;
    } else {
      card.S = clamp(card.S * mult, 0.4, 365);
    }
    card.D = clamp(card.D + (g === 1 ? 0.9 : g === 2 ? 0.2 : g === 3 ? -0.15 : -0.45), 1, 10);
    if (g === 1) card.D = Math.max(card.D, 6);

    var days;
    if (g === 1) {
      days = 0;
      card.due = todayStart();
    } else {
      days = Math.max(1, Math.round(card.S * (0.9 + Math.random() * 0.2)));
      card.due = addDays(now, days);
    }
    card.reps += 1;
    if (g === 1) card.lapses += 1;
    card.last = now;
    card.lastGrade = g;
    return days;
  }

  function answerWord(id, correct, ms) {
    var now = Date.now();
    var card = state.cards[id];
    var wasNew = !card;
    if (!card) {
      card = state.cards[id] = newCard();
    }
    var g = correct ? (ms < 3800 ? 4 : 3) : 1;
    var days = gradeCard(card, g, now);
    var rec = dayRecord();
    rec.reviews += 1;
    if (correct) rec.correct += 1;
    else {
      card.wrong = (card.wrong || 0) + 1;
      var entry = state.wrong.words[id] || { count: 0, last: 0 };
      entry.count += 1;
      entry.last = now;
      state.wrong.words[id] = entry;
    }
    if (wasNew) rec.newWords += 1;
    rec.seconds += clamp(Math.round(ms / 1000), 3, 60);
    save();
    return { grade: g, days: days, wasNew: wasNew };
  }

  function masteredCount() {
    var n = 0;
    Object.keys(state.cards).forEach(function (id) {
      if (state.cards[id].S >= 21) n += 1;
    });
    return n;
  }

  function dueList() {
    var t = todayStart();
    return Object.keys(state.cards)
      .filter(function (id) { return state.cards[id].due <= t; })
      .sort(function (a, b) { return state.cards[a].due - state.cards[b].due; });
  }

  function freshList(limit) {
    var out = [];
    for (var i = 0; i < words.length && out.length < limit; i++) {
      if (!state.cards[words[i].id]) out.push(words[i].id);
    }
    return out;
  }

  function newRemaining() {
    var rec = todayRecord();
    return Math.max(0, state.settings.newPerDay - rec.newWords);
  }

  function buildQueue(mode) {
    var due = dueList();
    if (mode === 'review') {
      return due.slice(0, state.settings.reviewCap).map(function (id) { return { wid: id, isNew: false }; });
    }
    if (mode === 'new') {
      return freshList(newRemaining()).map(function (id) { return { wid: id, isNew: true }; });
    }
    if (mode === 'wrong') {
      return Object.keys(state.wrong.words)
        .sort(function (a, b) { return state.wrong.words[b].count - state.wrong.words[a].count; })
        .filter(function (id) { return !!wordMap[id]; })
        .map(function (id) { return { wid: id, isNew: false }; });
    }
    var fresh = freshList(newRemaining());
    return due.slice(0, state.settings.reviewCap).map(function (id) { return { wid: id, isNew: false }; })
      .concat(fresh.map(function (id) { return { wid: id, isNew: true }; }));
  }

  /* ---------------- 抽查（费曼式） ---------------- */
  function checkTarget() {
    var rec = todayRecord();
    return clamp(rec.checkTarget || state.settings.checkTarget || 50, 10, 200);
  }

  function setCheckTarget(n) {
    var rec = todayRecord();
    rec.checkTarget = clamp(Math.round(n) || 50, 10, 200);
    save();
    return rec.checkTarget;
  }

  function addCheckGroup(n) {
    return setCheckTarget(checkTarget() + (n || 10));
  }

  function buildCheckQueue() {
    var target = checkTarget();
    var done = todayRecord().checkDone || 0;
    var remaining = Math.max(0, target - done);
    if (!remaining) return [];
    var ids = shuffle(dueList()).slice(0, remaining);
    if (ids.length < remaining) {
      var fresh = [];
      for (var i = 0; i < words.length; i++) {
        if (!state.cards[words[i].id]) fresh.push(words[i].id);
      }
      ids = ids.concat(shuffle(fresh).slice(0, remaining - ids.length));
    }
    return shuffle(ids);
  }

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function reviewWord(id, grade, opts) {
    opts = opts || {};
    var t = Date.now();
    var card = state.cards[id];
    var wasNew = !card;
    if (!card) card = state.cards[id] = newCard();
    var days = gradeCard(card, grade, t);
    var rec = dayRecord();
    rec.reviews += 1;
    if (opts.daily !== false) rec.checkDone = (rec.checkDone || 0) + 1;
    if (grade >= 2) rec.correct += 1;
    if (wasNew && opts.daily !== false) rec.newWords += 1;
    rec.seconds += opts.seconds != null ? Math.max(1, Math.round(opts.seconds)) : 12;
    if (grade === 1) {
      card.wrong = (card.wrong || 0) + 1;
      var entry = state.wrong.words[id] || { count: 0, last: 0 };
      entry.count += 1;
      entry.last = t;
      state.wrong.words[id] = entry;
      if (wordMap[id] && !state.wordbook[id]) {
        state.wordbook[id] = { at: t, source: 'wrong' };
      }
    }
    save();
    return { days: days, wasNew: wasNew, left: Math.max(0, checkTarget() - rec.checkDone) };
  }

  /* ---------------- 抽查快照（撤销用） ---------------- */
  function checkSnapshot(id) {
    var key = dateKey(Date.now());
    var hasWrong = Object.prototype.hasOwnProperty.call(state.wrong.words, id);
    return {
      card: state.cards[id] ? JSON.parse(JSON.stringify(state.cards[id])) : null,
      daily: state.daily[key] ? JSON.parse(JSON.stringify(state.daily[key])) : null,
      dailyKey: key,
      wrong: hasWrong ? JSON.parse(JSON.stringify(state.wrong.words[id])) : undefined
    };
  }

  function restoreCheck(id, snap) {
    if (!snap) return false;
    if (snap.card === null) delete state.cards[id];
    else state.cards[id] = JSON.parse(JSON.stringify(snap.card));
    if (snap.daily === null) delete state.daily[snap.dailyKey];
    else state.daily[snap.dailyKey] = JSON.parse(JSON.stringify(snap.daily));
    if (snap.wrong === undefined) delete state.wrong.words[id];
    else state.wrong.words[id] = JSON.parse(JSON.stringify(snap.wrong));
    save();
    return true;
  }

  /* ---------------- 单词本 ---------------- */
  function wordbookHas(id) {
    return !!state.wordbook[id];
  }

  function wordbookAdd(id, source) {
    if (!wordMap[id]) return false;
    if (!state.wordbook[id]) {
      state.wordbook[id] = { at: Date.now(), source: source || 'manual' };
    }
    save();
    return true;
  }

  function wordbookRemove(id) {
    delete state.wordbook[id];
    save();
  }

  function wordbookList() {
    return Object.keys(state.wordbook)
      .filter(function (id) { return !!wordMap[id]; })
      .map(function (id) { return { id: id, w: wordMap[id], meta: state.wordbook[id] }; });
  }

  function wordbookCount() {
    return wordbookList().length;
  }

  function wordbookQueue() {
    var t = todayStart();
    var due = [], fresh = [], later = [];
    wordbookList().forEach(function (item) {
      var c = state.cards[item.id];
      if (!c) fresh.push(item.id);
      else if (c.due <= t) due.push(item.id);
      else later.push(item.id);
    });
    return shuffle(due).concat(shuffle(fresh)).concat(shuffle(later));
  }

  function syncWordbookFromWrong() {
    var changed = false;
    Object.keys(state.wrong.words || {}).forEach(function (id) {
      if (wordMap[id] && !state.wordbook[id]) {
        state.wordbook[id] = { at: state.wrong.words[id].last || Date.now(), source: 'wrong' };
        changed = true;
      }
    });
    if (changed) save();
  }

  function sensesOf(w) {
    if (!w) return [];
    if (Array.isArray(w.senses) && w.senses.length) return w.senses;
    return String(w.zh || '').split(/[；;]/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  /* ---------------- 练习记录 ---------------- */
  function recordSet(kind, setId, score, total, seconds, meta) {
    var now = Date.now();
    var bucket = state.attempts[kind] || (state.attempts[kind] = {});
    var prev = bucket[setId];
    var entry = {
      score: score,
      total: total,
      at: now,
      best: prev ? Math.max(prev.best || 0, score) : score,
      times: prev ? (prev.times || 1) + 1 : 1
    };
    if (meta) Object.keys(meta).forEach(function (key) { if (meta[key] != null) entry[key] = meta[key]; });
    bucket[setId] = entry;
    var rec = dayRecord();
    if (kind === 'reading') rec.reading += 1;
    else if (kind === 'listening') rec.listening += 1;
    else if (kind === 'translation') rec.translation = (rec.translation || 0) + 1;
    rec.seconds += seconds != null ? seconds : kind === 'reading' ? 8 * 60 : kind === 'listening' ? 4 * 60 : 15 * 60;
    save();
    return bucket[setId];
  }

  function gradeTranslation(setId, band) {
    var bucket = state.attempts.translation || (state.attempts.translation = {});
    var att = bucket[setId];
    if (!att) return null;
    att.score = band;
    att.best = Math.max(att.best || 0, band);
    att.graded = true;
    save();
    return att;
  }

  function getDraft(setId) {
    return (state.drafts.translation || {})[setId] || '';
  }

  function writingDraft(id) {
    return (state.drafts.writing || {})[id] || '';
  }

  function saveWritingDraft(id, text) {
    if (!state.drafts.writing) state.drafts.writing = {};
    state.drafts.writing[id] = text;
    save();
  }

  function recordWriting(id, words, seconds, meta) {
    var bucket = state.attempts.writing || (state.attempts.writing = {});
    if (state.syncTombstones && state.syncTombstones.attempts) delete state.syncTombstones.attempts['writing:' + id];
    bucket[id] = { at: Date.now(), words: words, seconds: seconds || 0 };
    if (meta) Object.keys(meta).forEach(function (key) { if (meta[key] != null) bucket[id][key] = meta[key]; });
    var rec = dayRecord();
    rec.seconds += seconds || 0;
    save();
    return bucket[id];
  }

  function saveDraft(setId, text) {
    if (!state.drafts.translation) state.drafts.translation = {};
    state.drafts.translation[setId] = text;
    save();
  }

  function removeWrongQuestion(qid) {
    delete state.wrong.questions[qid];
    if (!state.syncTombstones.wrong) state.syncTombstones.wrong = {};
    state.syncTombstones.wrong[qid] = Date.now();
    save();
  }

  function removeAttempt(kind, setId) {
    if (state.attempts[kind]) delete state.attempts[kind][setId];
    if (!state.syncTombstones.attempts) state.syncTombstones.attempts = {};
    state.syncTombstones.attempts[kind + ':' + setId] = Date.now();
    save();
  }

  function wrongQuestion(qid, kind, setId, meta) {    var entry = state.wrong.questions[qid] || { count: 0, last: 0, kind: kind, setId: setId };
    if (state.syncTombstones && state.syncTombstones.wrong) delete state.syncTombstones.wrong[qid];
    entry.count += 1;
    entry.last = Date.now();
    entry.kind = kind;
    entry.setId = setId;
    if (meta) {
      entry.stem = meta.stem || entry.stem;
      entry.answer = meta.answer || entry.answer;
      entry.explain = meta.explain || entry.explain;
      entry.title = meta.title || entry.title;
      entry.type = meta.type || entry.type;
      entry.passage = meta.passage || entry.passage;
      entry.context = meta.context || entry.context;
      entry.options = meta.options || entry.options;
      entry.exam = meta.exam == null ? entry.exam : meta.exam;
    }
    state.wrong.questions[qid] = entry;
    save();
  }

  function attempt(kind, setId) {
    return (state.attempts[kind] || {})[setId] || null;
  }

  function drillStats() {
    return JSON.parse(JSON.stringify(state.drill));
  }

  function recordDrill(mode, id, ok) {
    var m = state.drill.byMode[mode] || (state.drill.byMode[mode] = { n: 0, ok: 0 });
    m.n += 1;
    if (ok) m.ok += 1;
    var w = state.drill.byWord[id] || { n: 0, ok: 0, last: 0 };
    w.n += 1;
    if (ok) w.ok += 1;
    w.last = Date.now();
    state.drill.byWord[id] = w;
    save();
    return w;
  }

  function drillPool() {
    var weights = {};
    function add(id, w) {
      if (!wordMap[id]) return;
      weights[id] = (weights[id] || 0) + w;
    }
    Object.keys(state.wordbook || {}).forEach(function (id) { add(id, 1); });
    Object.keys(state.wrong.words || {}).forEach(function (id) {
      add(id, (state.wrong.words[id].count || 1) * 3);
    });
    dueList().forEach(function (id) { add(id, 1); });
    return Object.keys(weights).map(function (id) { return { id: id, weight: weights[id] }; });
  }

  function saveSession(runner, setId, data) {
    var key = runner + ':' + setId;
    var now = Date.now();
    if (state.syncTombstones && state.syncTombstones.sessions) delete state.syncTombstones.sessions[key];
    state.sessions[key] = {
      runner: runner,
      setId: setId,
      idx: data && data.idx || 0,
      answers: JSON.parse(JSON.stringify((data && data.answers) || {})),
      startedAt: data && data.startedAt || now,
      updatedAt: now
    };
    var keys = Object.keys(state.sessions);
    if (keys.length > 10) {
      keys.sort(function (a, b) {
        return (state.sessions[a].updatedAt || 0) - (state.sessions[b].updatedAt || 0);
      });
      while (keys.length > 10) delete state.sessions[keys.shift()];
    }
    save();
    return state.sessions[key];
  }

  function getSession(runner, setId) {
    var s = state.sessions[runner + ':' + setId];
    if (!s) return null;
    return {
      runner: s.runner,
      setId: s.setId,
      idx: s.idx,
      answers: JSON.parse(JSON.stringify(s.answers || {})),
      startedAt: s.startedAt,
      updatedAt: s.updatedAt
    };
  }

  function clearSession(runner, setId) {
    var key = runner + ':' + setId;
    delete state.sessions[key];
    if (!state.syncTombstones.sessions) state.syncTombstones.sessions = {};
    state.syncTombstones.sessions[key] = Date.now();
    save();
  }

  function recordQuestion(qid, ok) {
    var q = state.qstats[qid] || { n: 0, ok: 0, last: 0, lastOk: false };
    q.n += 1;
    if (ok) q.ok += 1;
    q.last = Date.now();
    q.lastOk = !!ok;
    state.qstats[qid] = q;
    save();
    return q;
  }

  function questionStat(qid) {
    var q = state.qstats[qid];
    if (!q) return null;
    return { n: q.n || 0, ok: q.ok || 0, last: q.last || 0, lastOk: !!q.lastOk };
  }

  function attemptSummary(kind, setId) {
    var a = (state.attempts[kind] || {})[setId];
    if (!a) return { done: false, times: 0, lastAt: 0, best: 0, total: 0, lastScore: 0 };
    return {
      done: true,
      times: a.times || 1,
      lastAt: a.at || 0,
      best: a.best || a.score || 0,
      total: a.total || 0,
      lastScore: a.score || 0
    };
  }

  function wrongQuestions() {
    return Object.keys(state.wrong.questions).map(function (qid) {
      var e = state.wrong.questions[qid];
      return {
        qid: qid, kind: e.kind || 'reading', setId: e.setId,
        count: e.count || 1, last: e.last || 0,
        title: e.title || '', type: e.type || '',
        stem: e.stem || '', answer: e.answer || '', explain: e.explain || '',
        passage: e.passage || '', context: e.context || '', options: e.options || null, exam: e.exam
      };
    });
  }

  /* ---------------- 统计 ---------------- */
  function streak() {
    var t = todayStart();
    if (!activeOn(dateKey(t))) {
      t = addDays(t, -1);
      if (!activeOn(dateKey(t))) return 0;
    }
    var n = 0;
    while (activeOn(dateKey(t))) {
      n += 1;
      t = addDays(t, -1);
    }
    return n;
  }

  function examInfo() {
    var d = parseDate(state.settings.examDate);
    var days = null;
    if (d) days = Math.round((startOfDay(d.getTime()) - todayStart()) / DAY);
    var total = d ? Math.max(1, Math.round((startOfDay(d.getTime()) - startOfDay(state.createdAt)) / DAY)) : null;
    var elapsed = d ? Math.round((todayStart() - startOfDay(state.createdAt)) / DAY) : 0;
    var progress = total ? clamp(elapsed / total, 0, 1) : 0;
    return { date: d, days: days, total: total, elapsed: elapsed, progress: progress, label: state.settings.examDate };
  }

  function heat(weeks) {
    var w = weeks || 12;
    var t = todayStart();
    var dow = (new Date(t).getDay() + 6) % 7; // 周一为 0
    var start = addDays(t, -dow - (w - 1) * 7);
    var cells = [];
    for (var i = 0; i < w * 7; i++) {
      var ts = addDays(start, i);
      var key = dateKey(ts);
      var rec = state.daily[key];
      var total = rec ? rec.reviews + rec.reading * 6 + rec.listening * 6 : 0;
      cells.push({ ts: ts, key: key, count: total, future: ts > t });
    }
    return { cells: cells, weeks: w, start: start };
  }

  function weekMinutes() {
    var total = 0;
    for (var i = 0; i < 7; i++) {
      var rec = state.daily[dateKey(addDays(todayStart(), -i))];
      if (rec) total += rec.seconds || 0;
    }
    return Math.round(total / 60);
  }

  /* ---------------- 自定义错题 / 语境 ---------------- */
  function customList() { return state.custom || []; }

  function addCustom(item) {
    var list = state.custom || (state.custom = []);
    var entry = {
      id: 'c' + Date.now() + Math.floor(Math.random() * 1000),
      at: Date.now(),
      kind: item.kind || 'note',
      title: String(item.title || '').trim(),
      body: String(item.body || '').trim(),
      note: String(item.note || '').trim()
    };
    list.unshift(entry);
    save();
    return entry;
  }

  function removeCustom(id) {
    state.custom = (state.custom || []).filter(function (x) { return x.id !== id; });
    save();
  }

  function contextSentences(word, limit) {
    limit = limit || 2;
    var stem = String(word || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!stem) return [];
    var re = new RegExp('\\b' + stem + '[a-z]{0,3}\\b', 'i');
    var out = [], seen = {};
    function scan(text, label) {
      if (!text || out.length >= limit) return;
      String(text).split(/(?<=[.!?])\s+/).forEach(function (s) {
        if (out.length >= limit || !s.trim()) return;
        if (!re.test(s)) return;
        var key = s.slice(0, 50);
        if (seen[key]) return;
        seen[key] = 1;
        out.push({ text: s.trim(), source: label || '' });
      });
    }
    (window.CET4_READING || []).forEach(function (set) { scan(set.passage, set.title); });
    (window.CET4_CLOZE || []).forEach(function (set) { scan(set.passage, set.title); });
    (window.CET4_MATCHING || []).forEach(function (set) {
      (set.paragraphs || []).forEach(function (p) { scan(p.text, set.title + ' · ' + p.k); });
    });
    return out.slice(0, limit);
  }

  /* ---------------- 离线词典（ECDICT 分片按需加载） ---------------- */
  var dictQueue = {};

  function normalizeWord(raw) {
    return String(raw || '')
      .toLowerCase()
      .replace(/[^a-z' -]/g, '')
      .replace(/^[ ' -]+|[ ' -]+$/g, '');
  }

  function dictEntry(raw) {
    var w = normalizeWord(raw);
    if (!w) return null;
    var key = /^[a-z]/.test(w) ? w[0] : '_';
    var shard = (window.ECDICT || {})[key];
    if (!shard) return undefined; // 该分片还没加载
    if (shard[w]) return { word: w, e: shard[w] };
    var tries = [];
    if (/ies$/.test(w)) tries.push(w.slice(0, -3) + 'y');
    if (/(es|s)$/.test(w)) tries.push(w.replace(/(es|s)$/, ''));
    if (/ed$/.test(w)) { tries.push(w.slice(0, -2)); tries.push(w.slice(0, -1)); }
    if (/ing$/.test(w)) { tries.push(w.slice(0, -3)); tries.push(w.slice(0, -3) + 'e'); }
    if (/er$/.test(w)) { tries.push(w.slice(0, -2)); tries.push(w.slice(0, -1)); }
    if (/est$/.test(w)) { tries.push(w.slice(0, -3)); tries.push(w.slice(0, -2)); }
    for (var i = 0; i < tries.length; i++) {
      if (tries[i] && shard[tries[i]]) {
        return { word: tries[i], e: shard[tries[i]], inflected: w };
      }
    }
    return null;
  }

  function lookupDict(raw, cb) {
    var w = normalizeWord(raw);
    if (!w) { cb(null); return; }
    var key = /^[a-z]/.test(w) ? w[0] : '_';
    var hit = dictEntry(w);
    if (hit !== undefined) { cb(hit); return; }
    if (dictQueue[key]) {
      dictQueue[key].push(function () { cb(dictEntry(w)); });
      return;
    }
    dictQueue[key] = [function () { cb(dictEntry(w)); }];
    var s = document.createElement('script');
    s.src = 'assets/js/dict/' + key + '.js';
    s.onload = function () {
      var q = dictQueue[key] || [];
      delete dictQueue[key];
      q.forEach(function (fn) { fn(); });
    };
    s.onerror = function () {
      var q = dictQueue[key] || [];
      delete dictQueue[key];
      q.forEach(function (fn) { fn(); });
    };
    document.head.appendChild(s);
  }

  /* ---------------- 导出 ---------------- */
  A.core = {
    getState: function () { return state; },
    load: load,
    save: save,
    themeMode: themeMode,
    setThemeMode: setThemeMode,
    applyTheme: applyTheme,
    reset: reset,
    exportJSON: exportJSON,
    importJSON: importJSON,
    syncConfig: syncConfig,
    syncSaveConfig: syncSaveConfig,
    syncPush: syncPush,
    syncPull: syncPull,
    syncFlush: syncFlush,
    syncMarkDirty: syncMarkDirty,
    storageOK: function () { return storageOK; },
    // 词库
    allWords: allWords,
    getWord: getWord,
    lookupWord: lookupWord,
    freqOf: freqOf,
    papers: function () { return window.CET4_PAPERS || []; },
    // 时间
    DAY: DAY,
    startOfDay: startOfDay,
    todayStart: todayStart,
    dateKey: dateKey,
    addDays: addDays,
    parseDate: parseDate,
    defaultExamDate: defaultExamDate,
    // 每日
    dayRecord: dayRecord,
    todayRecord: todayRecord,
    // 学习
    dueList: dueList,
    newRemaining: newRemaining,
    buildQueue: buildQueue,
    answerWord: answerWord,
    masteredCount: masteredCount,
    // 抽查
    checkTarget: checkTarget,
    setCheckTarget: setCheckTarget,
    addCheckGroup: addCheckGroup,
    buildCheckQueue: buildCheckQueue,
    reviewWord: reviewWord,
    checkSnapshot: checkSnapshot,
    restoreCheck: restoreCheck,
    wordbookHas: wordbookHas,
    wordbookAdd: wordbookAdd,
    wordbookRemove: wordbookRemove,
    wordbookList: wordbookList,
    wordbookCount: wordbookCount,
    wordbookQueue: wordbookQueue,
    sensesOf: sensesOf,
    // 练习
    recordSet: recordSet,
    wrongQuestion: wrongQuestion,
    wrongQuestions: wrongQuestions,
    removeWrongQuestion: removeWrongQuestion,
    removeAttempt: removeAttempt,
    attempt: attempt,
    attemptSummary: attemptSummary,
    drillStats: drillStats,
    recordDrill: recordDrill,
    drillPool: drillPool,
    saveSession: saveSession,
    getSession: getSession,
    clearSession: clearSession,
    recordQuestion: recordQuestion,
    questionStat: questionStat,
    // 自定义
    customList: customList,
    addCustom: addCustom,
    removeCustom: removeCustom,
    contextSentences: contextSentences,
    lookupDict: lookupDict,
    dictEntry: dictEntry,
    normalizeWord: normalizeWord,
    gradeTranslation: gradeTranslation,
    getDraft: getDraft,
    saveDraft: saveDraft,
    writingDraft: writingDraft,
    saveWritingDraft: saveWritingDraft,
    recordWriting: recordWriting,
    // 统计
    streak: streak,
    examInfo: examInfo,
    heat: heat,
    weekMinutes: weekMinutes
  };
})(window.App);
