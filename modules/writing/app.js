/*
 * 作文批改 · 应用层
 * 用法（独立运行）：WritingCoach.mount('#app')
 * 嵌入到其他项目：引入 app.css + engine.js + data.js + app.js，然后
 *   WritingCoach.mount(document.querySelector('#container'), { data: 自定义题库 })
 */
(function () {
  'use strict';

  var E = window.SubjectiveEngine;
  var DATA = window.WRITING_DATA || [];
  var K_HISTORY = 'wc:history';
  var K_DRAFT = 'wc:draft:';

  var host = null;
  var state = { view: 'home', promptId: null, tab: 11, report: null, compare: null };
  var timerId = null;
  var deadline = 0;

  /* ---------------- 小工具 ---------------- */
  function qs(sel, root) { return (root || host).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || host).querySelectorAll(sel)); }
  function esc(s) { return E.esc(s); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function fmt(sec) { sec = Math.max(0, sec); return pad(Math.floor(sec / 60)) + ':' + pad(sec % 60); }
  function promptById(id) {
    for (var i = 0; i < DATA.length; i++) if (DATA[i].id === id) return DATA[i];
    return null;
  }
  function history() { return E.read(K_HISTORY, []); }
  function saveHistory(list) { E.write(K_HISTORY, list.slice(0, 40)); }

  function toast(msg, tone) {
    var el = document.createElement('div');
    el.className = 'wc-toast' + (tone ? ' ' + tone : '');
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(function () { el.classList.add('out'); }, 2000);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 2400);
  }

  function modal(opts) {
    var wrap = document.createElement('div');
    wrap.className = 'wc-modal';
    wrap.innerHTML = '<div class="wc-modal-mask"></div><div class="wc-modal-card">' +
      '<h3>' + esc(opts.title) + '</h3>' +
      '<div class="wc-modal-body">' + (opts.body || '') + '</div>' +
      '<footer><button class="wc-btn ghost" data-cancel>' + esc(opts.cancel || '取消') + '</button>' +
      '<button class="wc-btn primary" data-ok>' + esc(opts.ok || '确定') + '</button></footer></div>';
    host.appendChild(wrap);
    function close() { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }
    wrap.querySelector('.wc-modal-mask').addEventListener('click', close);
    wrap.querySelector('[data-cancel]').addEventListener('click', close);
    wrap.querySelector('[data-ok]').addEventListener('click', function () { close(); if (opts.onOk) opts.onOk(); });
    return close;
  }

  /* ---------------- 首页 ---------------- */
  function guideHtml() {
    return '<section class="wc-card wc-guide">' +
      '<div class="wc-row"><h3>怎么用</h3><span class="wc-muted small">3 步完成一篇</span></div>' +
      '<ol class="wc-steps">' +
      '<li><span class="wc-step-no">1</span><div><strong>计时写完</strong><p>按考试时间倒计时，实时词数提示，草稿自动保存在本机。</p></div></li>' +
      '<li><span class="wc-step-no">2</span><div><strong>提交即批改</strong><p>内容、结构、语言、词汇四维打分，逐句标出语法和搭配问题。</p></div></li>' +
      '<li><span class="wc-step-no">3</span><div><strong>对照三档范文</strong><p>同样一道题，看 8 分、11 分、14 分分别怎么写、差在哪。</p></div></li>' +
      '</ol>' +
      '<p class="wc-guide-note">评分为规则引擎估算，用于定位可改进点，不等同于阅卷老师给出的分数。</p>' +
      '</section>';
  }

  function showHome() {
    stopTimer();
    state.view = 'home';
    state.report = null;
    var hist = history();
    var bands = hist.map(function (h) { return h.band; });
    var best = bands.length ? Math.max.apply(null, bands) : 0;
    var avg = hist.length ? Math.round(hist.reduce(function (s, h) { return s + h.score; }, 0) / hist.length) : 0;

    var cards = DATA.map(function (p) {
      var done = hist.filter(function (h) { return h.promptId === p.id; }).length;
      return '<article class="wc-card wc-prompt">' +
        '<div class="wc-row"><span class="wc-chip type">' + esc(p.type) + '</span>' +
        '<span class="wc-meta">' + p.minWords + '–' + p.maxWords + ' 词 · ' + p.minutes + ' 分钟</span></div>' +
        '<h3>' + esc(p.title) + '</h3>' +
        '<p class="wc-zh">' + esc(p.titleZh) + '</p>' +
        '<p class="wc-directions">' + esc(p.directions) + '</p>' +
        '<div class="wc-card-foot">' +
        '<button class="wc-btn primary" data-start="' + p.id + '">开始写作</button>' +
        '<span class="wc-muted">' + (done ? '已练 ' + done + ' 次 · ' : '') + '三档范文</span>' +
        '</div></article>';
    }).join('');

    var recent = '';
    if (hist.length) {
      recent = '<section class="wc-card wc-recent"><div class="wc-row"><h3>最近练习</h3>' +
        '<button class="wc-btn ghost small" data-clear>清空记录</button></div>' +
        '<div class="wc-hlist">' + hist.slice(0, 6).map(function (h) {
          var p = promptById(h.promptId);
          return '<button class="wc-hrow" data-open="' + h.at + '">' +
            '<span class="wc-band small">' + h.band + '</span>' +
            '<span class="wc-hrow-title">' + esc(p ? p.title : '未知题目') + '</span>' +
            '<span class="wc-muted">' + h.words + ' 词</span>' +
            '<span class="wc-muted">' + h.score + ' 分</span>' +
            '<span class="wc-muted">' + E.fmtDate(h.at) + '</span>' +
            '</button>';
        }).join('') + '</div></section>';
    }

    host.innerHTML =
      '<header class="wc-top">' +
      '<div class="wc-brand"><span class="wc-mark">作</span><div><strong>作文批改</strong><span>WRITING COACH</span></div></div>' +
      '<div class="wc-top-right"><span class="wc-chip quiet">本地运行 · 作文不上传</span>' +
      '<button class="wc-btn ghost small" data-ai>AI 设置</button></div>' +
      '</header>' +
      '<section class="wc-hero">' +
      '<div class="wc-hero-main"><span class="wc-eyebrow">CET-4 WRITING · 五档评分</span>' +
      '<h1>写完，就知道能拿几分</h1>' +
      '<p>按四级 14 / 11 / 8 / 5 / 2 分档给出四维评分，逐句批注语法与搭配，并配三档范文对照。</p></div>' +
      '<div class="wc-hero-stats">' +
      (hist.length
        ? '<div><strong>' + hist.length + '</strong><span>已练篇数</span></div>' +
        '<div><strong>' + best + '</strong><span>最高档</span></div>' +
        '<div><strong>' + avg + '</strong><span>平均折算分</span></div>'
        : '<div><strong>0</strong><span>已练篇数</span></div>' +
        '<div class="wc-hero-empty"><span>写一篇后，这里会出现最高档和平均折算分</span></div>') +
      '</div></section>' +
      '<section class="wc-grid">' + cards + '</section>' +
      recent +
      guideHtml();

    qsa('[data-start]').forEach(function (b) {
      b.addEventListener('click', function () { showEditor(b.getAttribute('data-start')); });
    });
    var clearBtn = qs('[data-clear]');
    if (clearBtn) clearBtn.addEventListener('click', function () {
      modal({
        title: '清空练习记录？', body: '<p>本机保存的所有作文记录会被删除，题库不受影响。</p>', ok: '清空', onOk: function () {
          E.remove(K_HISTORY);
          showHome();
        }
      });
    });
    qsa('[data-open]').forEach(function (b) {
      b.addEventListener('click', function () { openHistory(+b.getAttribute('data-open')); });
    });
    qsa('[data-ai]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!window.DeepSeekLLM) { toast('AI 模块未加载'); return; }
        window.DeepSeekLLM.settings(function () { toast('AI 配置已保存'); });
      });
    });
  }

  function openHistory(at) {
    var entry = history().filter(function (h) { return h.at === at; })[0];
    var p = entry ? promptById(entry.promptId) : null;
    if (!entry || !p) { toast('记录已失效'); return; }
    state.promptId = p.id;
    state.report = { prompt: p, result: E.gradeWriting(entry.text, p), text: entry.text, fromHistory: true };
    state.tab = state.report.result.band >= 14 ? 14 : state.report.result.band >= 11 ? 11 : 8;
    showReport();
  }

  /* ---------------- 写作页 ---------------- */
  function showEditor(id) {
    var p = promptById(id);
    if (!p) { showHome(); return; }
    state.view = 'edit';
    state.promptId = id;
    state.report = null;
    var draft = E.read(K_DRAFT + id, '');

    host.innerHTML =
      '<header class="wc-bar">' +
      '<button class="wc-btn ghost small" data-back>← 题库</button>' +
      '<div class="wc-bar-title">' + esc(p.title) + '</div>' +
      '<div class="wc-timer" id="wc-timer">' + fmt(p.minutes * 60) + '</div>' +
      '</header>' +
      '<main class="wc-editor">' +
      '<aside class="wc-card wc-brief">' +
      '<span class="wc-chip type">' + esc(p.type) + '</span>' +
      '<h2>Directions</h2>' +
      '<p class="wc-directions">' + esc(p.directions) + '</p>' +
      '<p class="wc-hint">' + esc(p.chineseHint) + '</p>' +
      '<h3>题目关键词</h3>' +
      '<div class="wc-chips">' + p.keywords.map(function (k) { return '<span class="wc-chip">' + esc(k.label) + '</span>'; }).join('') + '</div>' +
      '<details class="wc-outline"><summary>写作提纲（可参考）</summary><ol>' +
      p.outline.map(function (o) { return '<li><strong>' + esc(o.title) + '</strong><span>' + esc(o.hint) + '</span></li>'; }).join('') +
      '</ol></details>' +
      '</aside>' +
      '<section class="wc-card wc-pad">' +
      '<textarea id="wc-essay" spellcheck="false" placeholder="Start writing here..."></textarea>' +
      '<footer class="wc-pad-foot">' +
      '<div class="wc-count"><strong id="wc-count">0</strong><span> / ' + p.minWords + '–' + p.maxWords + ' 词</span></div>' +
      '<div class="wc-meter"><i id="wc-meter"></i></div>' +
      '<button class="wc-btn primary" id="wc-submit">提交批改</button>' +
      '</footer>' +
      '</section></main>';

    var ta = qs('#wc-essay');
    ta.value = draft;

    var saveTimer = null;
    function saveDraft() {
      E.write(K_DRAFT + p.id, ta.value);
    }
    ta.addEventListener('input', function () {
      updateCount(p);
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(saveDraft, 600);
    });

    qs('[data-back]').addEventListener('click', function () {
      if (ta.value.trim() && !E.read(K_DRAFT + p.id, '')) saveDraft();
      showHome();
    });

    qs('#wc-submit').addEventListener('click', function () { trySubmit(p, ta.value); });

    updateCount(p);
    startTimer(p.minutes * 60);
    setTimeout(function () { ta.focus(); }, 60);
  }

  function updateCount(p) {
    var ta = qs('#wc-essay');
    if (!ta) return;
    var n = E.countWords(ta.value);
    var countEl = qs('#wc-count');
    var meter = qs('#wc-meter');
    if (countEl) countEl.textContent = n;
    if (meter) {
      var pct = Math.min(100, (n / p.minWords) * 100);
      meter.style.width = pct + '%';
      meter.className = n > p.maxWords ? 'over' : n >= p.minWords ? 'ok' : '';
    }
    var countBox = countEl ? countEl.parentNode : null;
    if (countBox) countBox.classList.toggle('ok', n >= p.minWords && n <= p.maxWords);
  }

  function trySubmit(p, text) {
    var n = E.countWords(text);
    if (n < 30) { toast('至少写几句再提交'); return; }
    if (n < p.minWords) {
      modal({
        title: '字数不足 ' + p.minWords + ' 词',
        body: '<p>现在只有 <strong>' + n + '</strong> 词，四级会按字数不足扣分。仍然提交吗？</p>',
        ok: '仍然提交',
        onOk: function () { doSubmit(p, text); }
      });
      return;
    }
    doSubmit(p, text);
  }

  function doSubmit(p, text) {
    stopTimer();
    var result = E.gradeWriting(text, p);
    saveHistory([{ promptId: p.id, at: Date.now(), text: text, band: result.band, score: result.score, words: result.stats.words }].concat(history()));
    E.remove(K_DRAFT + p.id);
    state.report = { prompt: p, result: result, text: text };
    state.tab = result.band >= 14 ? 14 : result.band >= 11 ? 11 : 8;
    showReport();
  }

  /* ---------------- 计时 ---------------- */
  function startTimer(total) {
    stopTimer();
    deadline = Date.now() + total * 1000;
    tick();
    timerId = setInterval(tick, 1000);
  }
  function tick() {
    var el = qs('#wc-timer');
    if (!el) { stopTimer(); return; }
    var left = Math.round((deadline - Date.now()) / 1000);
    if (left <= 0) {
      el.textContent = '00:00';
      el.classList.add('timeup');
      stopTimer();
      toast('时间到，可以提交了', 'warn');
      return;
    }
    el.textContent = fmt(left);
    el.classList.toggle('warn', left <= 300);
  }
  function stopTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
  }

  /* ---------------- 批改结果 ---------------- */
  function showReport() {
    var rep = state.report;
    if (!rep) { showHome(); return; }
    var p = rep.prompt;
    var r = rep.result;
    state.view = 'report';
    stopTimer();

    var dims = [
      { key: 'content', label: '内容切题' },
      { key: 'structure', label: '结构衔接' },
      { key: 'language', label: '语言准确' },
      { key: 'lexicon', label: '词汇句式' }
    ];

    var dimHtml = dims.map(function (d) {
      var v = r.dims[d.key];
      return '<div class="wc-dim"><span>' + d.label + '</span>' +
        '<div class="wc-dim-bar"><i style="width:' + v + '%"></i></div>' +
        '<strong>' + v + '</strong></div>';
    }).join('');

    var kwHtml = r.keywords.map(function (k) {
      return '<div class="wc-kw ' + (k.hitAll ? 'ok' : 'miss') + '">' +
        '<span class="wc-kw-dot">' + (k.hitAll ? '✓' : '✗') + '</span>' +
        '<span class="wc-kw-label">' + esc(k.label) + '</span>' +
        '<span class="wc-kw-note">' + (k.hitFront ? '开头已点到' : k.hitAll ? '文中出现，开头没点' : '全文未出现') + '</span>' +
        '</div>';
    }).join('');

    var tipsHtml = r.tips.map(function (t) {
      return '<li class="' + (t.tone === 'warn' ? 'warn' : '') + '">' + esc(t.text) + '</li>';
    }).join('');

    var upsHtml = r.upgrades.length
      ? r.upgrades.slice(0, 6).map(function (u) {
        return '<div class="wc-up"><span class="wc-up-word">' + esc(u.word) + ' ×' + u.count + '</span>' +
          '<span class="wc-up-arrow">→</span>' +
          '<span class="wc-up-sug">' + u.suggestions.map(function (s) { return esc(s); }).join(' / ') + '</span></div>';
      }).join('')
      : '<p class="wc-muted small">没有检测到明显的高频低分词。</p>';

    var sentHtml = renderSentences(rep.text, r.issues);

    var models = (p.models || []).slice().sort(function (a, b) { return a.band - b.band; });
    var tabs = models.map(function (m) {
      return '<button class="wc-tab' + (m.band === state.tab ? ' on' : '') + '" data-tab="' + m.band + '">' + m.band + ' 分档</button>';
    }).join('');
    var model = models.filter(function (m) { return m.band === state.tab; })[0] || models[0];
    var modelHtml = model ?
      '<div class="wc-model-body">' +
      model.text.split(/\n{2,}/).map(function (para) { return '<p>' + esc(para) + '</p>'; }).join('') +
      '<div class="wc-model-notes"><h4>这篇为什么是 ' + model.band + ' 分</h4><ul>' +
      model.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="wc-model-meta">' + E.countWords(model.text) + ' 词</div>' +
      '</div>' : '';

    var attempts = history().filter(function (h) { return h.promptId === p.id; });

    host.innerHTML =
      '<header class="wc-bar">' +
      '<button class="wc-btn ghost small" data-home>← 题库</button>' +
      '<div class="wc-bar-title">批改结果 · ' + esc(p.title) + '</div>' +
      (attempts.length >= 2 ? '<button class="wc-btn ghost small" data-compare>对比最近两次</button>' : '') +
      '<button class="wc-btn ghost small" data-rewrite>再写一次</button>' +
      '</header>' +

      '<section class="wc-card wc-score">' +
      '<div class="wc-score-band"><strong>' + r.band + '</strong><span>/ 15 分档</span>' +
      '<em>' + esc(r.bandLabel) + '</em>' +
      '<p>折合 106.5 分制约 <b>' + r.score + '</b> 分 · ' + r.stats.words + ' 词</p></div>' +
      '<div class="wc-dims">' + dimHtml + '</div>' +
      '</section>' +

      '<div class="wc-report-actions">' +
      '<button class="wc-btn primary" data-aibatch>' + (rep.ai ? '重新 AI 批改' : 'AI 批改') + '</button>' +
      '<span class="wc-muted small">用 DeepSeek 按四级标准批一次，约 5–15 秒，会产生少量 API 费用</span>' +
      '</div>' +
      '<div class="wc-ai-error" id="wc-ai-error" hidden></div>' +
      (rep.ai ? aiCardHtml(rep.ai, r) : '') +

      '<div class="wc-report-grid">' +
      '<section class="wc-card wc-annotate">' +
      '<div class="wc-row"><h3>逐句批注</h3><span class="wc-muted">' + r.issues.length + ' 处待改</span></div>' +
      '<div class="wc-sent-list">' + sentHtml + '</div>' +
      '</section>' +
      '<aside class="wc-side">' +
      '<section class="wc-card"><h3>题目关键点</h3>' + kwHtml + '</section>' +
      '<section class="wc-card"><h3>改进建议</h3><ul class="wc-tips">' + tipsHtml + '</ul></section>' +
      '<section class="wc-card"><h3>可以升级的表达</h3>' + upsHtml + '</section>' +
      '</aside>' +
      '</div>' +

      '<section class="wc-card wc-models">' +
      '<div class="wc-row"><h3>范文对照</h3><div class="wc-tabs">' + tabs + '</div></div>' +
      modelHtml +
      '</section>';

    qs('[data-home]').addEventListener('click', showHome);
    qs('[data-rewrite]').addEventListener('click', function () { showEditor(p.id); });
    var cmpBtn = qs('[data-compare]');
    if (cmpBtn) cmpBtn.addEventListener('click', function () { showCompare(p.id); });
    var aiBtn = qs('[data-aibatch]');
    if (aiBtn) aiBtn.addEventListener('click', function () { runAI(p, rep.text); });
    qsa('[data-tab]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.tab = +b.getAttribute('data-tab');
        showReport();
      });
    });
  }

  function renderSentences(text, issues) {
    var list = E.sentences(text);
    if (!list.length) return '<p class="wc-muted">没有可分析的句子。</p>';
    return list.map(function (sent, idx) {
      var mine = issues.filter(function (is) {
        return E.norm(sent).indexOf(E.norm(is.text)) >= 0;
      });
      var html = esc(sent);
      if (mine.length) {
        var ranges = [];
        mine.forEach(function (is) {
          var i = sent.toLowerCase().indexOf(is.text.toLowerCase());
          if (i >= 0) ranges.push({ start: i, end: i + is.text.length });
        });
        ranges.sort(function (a, b) { return a.start - b.start; });
        var kept = [], last = -1;
        ranges.forEach(function (r) { if (r.start >= last) { kept.push(r); last = r.end; } });
        var out = '', cur = 0;
        kept.forEach(function (r) {
          out += esc(sent.slice(cur, r.start));
          out += '<mark>' + esc(sent.slice(r.start, r.end)) + '</mark>';
          cur = r.end;
        });
        out += esc(sent.slice(cur));
        html = out;
      }
      var notes = mine.map(function (is) {
        return '<div class="wc-issue ' + is.severity + '"><span class="wc-issue-tag">' + (is.severity === 'error' ? '语法' : '表达') + '</span>' +
          '<span>' + esc(is.message) + ' → ' + esc(is.fix) + '</span></div>';
      }).join('');
      return '<div class="wc-sent"><span class="wc-sent-no">' + (idx + 1) + '</span>' +
        '<div class="wc-sent-body"><p>' + html + '</p>' + notes + '</div></div>';
    }).join('');
  }

  /* ---------------- AI 批改（DeepSeek） ---------------- */
  function num(v, min, max, def) {
    var n = Number(v);
    if (!isFinite(n)) return def;
    return Math.max(min, Math.min(max, n));
  }

  function normalizeAI(data) {
    var d = data || {};
    var dims = d.dimensions || {};
    return {
      band: Math.round(num(d.band, 2, 14, 8)),
      dims: {
        content: Math.round(num(dims.content, 0, 100, 70)),
        structure: Math.round(num(dims.structure, 0, 100, 70)),
        language: Math.round(num(dims.language, 0, 100, 70)),
        lexicon: Math.round(num(dims.lexicon, 0, 100, 70))
      },
      strengths: (Array.isArray(d.strengths) ? d.strengths : []).slice(0, 4).map(String),
      improvements: (Array.isArray(d.improvements) ? d.improvements : []).slice(0, 5).map(String),
      notes: (Array.isArray(d.sentence_notes) ? d.sentence_notes : []).slice(0, 6).map(function (n) {
        return {
          quote: String((n && n.quote) || ''),
          issue: String((n && n.issue) || ''),
          suggestion: String((n && n.suggestion) || '')
        };
      })
    };
  }

  function aiCardHtml(ai, rule) {
    var dims = [
      { key: 'content', label: '内容切题' },
      { key: 'structure', label: '结构衔接' },
      { key: 'language', label: '语言准确' },
      { key: 'lexicon', label: '词汇句式' }
    ];
    var dimHtml = dims.map(function (d) {
      return '<div class="wc-ai-dim"><span>' + d.label + '</span>' +
        '<div class="wc-ai-bar"><i style="width:' + ai.dims[d.key] + '%"></i></div>' +
        '<strong>' + ai.dims[d.key] + '</strong><em>规则 ' + rule.dims[d.key] + '</em></div>';
    }).join('');

    function list(arr) {
      return '<ul>' + arr.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
    }

    var notes = ai.notes.length
      ? '<div class="wc-ai-notes"><h4>逐句建议</h4>' + ai.notes.map(function (n) {
        return '<div class="wc-ai-note"><p class="wc-ai-q">“' + esc(n.quote) + '”</p>' +
          '<p class="wc-ai-i">' + esc(n.issue) + '</p>' +
          '<p class="wc-ai-s">→ ' + esc(n.suggestion) + '</p></div>';
      }).join('') + '</div>'
      : '';

    return '<section class="wc-card wc-ai">' +
      '<div class="wc-row"><div class="wc-ai-title"><span class="wc-ai-badge">AI</span><h3>DeepSeek 批改</h3></div>' +
      '<span class="wc-muted small">AI 评分仅供参考，以人工阅卷为准</span></div>' +
      '<div class="wc-ai-head"><strong>' + ai.band + '</strong><span>/ 15 分档</span>' +
      '<em>折合 ' + E.score106(ai.band) + ' 分 · 规则引擎给出 ' + rule.band + ' 分档</em></div>' +
      '<div class="wc-ai-dims">' + dimHtml + '</div>' +
      '<div class="wc-ai-cols">' +
      '<div><h4>做得好的</h4>' + (ai.strengths.length ? list(ai.strengths) : '<p class="wc-muted small">—</p>') + '</div>' +
      '<div><h4>优先改进</h4>' + (ai.improvements.length ? list(ai.improvements) : '<p class="wc-muted small">—</p>') + '</div>' +
      '</div>' + notes + '</section>';
  }

  function runAI(prompt, text) {
    var LLM = window.DeepSeekLLM;
    if (!LLM) { toast('AI 模块未加载'); return; }
    if (!LLM.isConfigured()) {
      LLM.settings(function () { runAI(prompt, text); });
      return;
    }
    var btn = qs('[data-aibatch]');
    var errBox = qs('#wc-ai-error');
    if (errBox) { errBox.hidden = true; errBox.textContent = ''; }
    if (btn) { btn.disabled = true; btn.textContent = 'AI 批改中…'; }

    var content = '请按大学英语四级（CET-4）评分标准批改下面这篇作文。\n' +
      '题目：' + prompt.title + '\n' +
      '题目说明：' + prompt.directions + '\n' +
      '词数要求：' + prompt.minWords + '–' + prompt.maxWords + ' 词\n' +
      '学生作文：\n' + text + '\n\n' +
      '要求：满分 15 分，按 14/11/8/5/2 五档给分；四个维度各给 0–100 分。\n' +
      '只输出 JSON，不要输出任何解释：{"band":11,"dimensions":{"content":80,"structure":75,"language":70,"lexicon":65},' +
      '"strengths":["2-3 条优点"],"improvements":["3 条具体、可执行的建议"],' +
      '"sentence_notes":[{"quote":"原文片段","issue":"问题","suggestion":"改写建议"}]}';

    LLM.chatJSON([
      { role: 'system', content: '你是大学英语四级阅卷老师，只输出 JSON，不要输出其他文字。' },
      { role: 'user', content: content }
    ], { maxTokens: 1400 }).then(function (data) {
      state.report.ai = normalizeAI(data);
      showReport();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast('AI 批改完成');
    }).catch(function (err) {
      if (btn) { btn.disabled = false; btn.textContent = 'AI 批改'; }
      if (err.code === 'NO_KEY') {
        LLM.settings(function () { runAI(prompt, text); });
        return;
      }
      toast(err.message, 'danger');
      if (errBox) { errBox.hidden = false; errBox.textContent = err.message; }
    });
  }

  /* ---------------- 同题对比 ---------------- */
  function showCompare(promptId) {
    var p = promptById(promptId);
    if (!p) { showHome(); return; }
    var list = history().filter(function (h) { return h.promptId === promptId; })
      .sort(function (a, b) { return a.at - b.at; });
    if (list.length < 2) { toast('至少写两次才能对比'); return; }
    var prev = list[list.length - 2];
    var now = list[list.length - 1];
    state.view = 'compare';
    state.compare = {
      prompt: p, prev: prev, now: now,
      ra: E.gradeWriting(prev.text, p),
      rb: E.gradeWriting(now.text, p)
    };
    renderCompare();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function diffSide(ops, side) {
    var out = [];
    ops.forEach(function (op) {
      if (op.type === 'eq') out.push(esc(op.text));
      else if (side === 'a' && op.type === 'del') out.push('<del>' + esc(op.text) + '</del>');
      else if (side === 'b' && op.type === 'ins') out.push('<ins>' + esc(op.text) + '</ins>');
    });
    return out.join(' ').replace(/\s+([,.;:!?])/g, '$1');
  }

  function renderCompare() {
    var c = state.compare;
    var p = c.prompt;
    var ra = c.ra, rb = c.rb;
    var delta = rb.score - ra.score;
    var deltaClass = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
    var deltaText = (delta > 0 ? '+' : '') + delta + ' 分 · ' + (rb.band - ra.band > 0 ? '+' : '') + (rb.band - ra.band) + ' 档';

    var dims = [
      { key: 'content', label: '内容切题' },
      { key: 'structure', label: '结构衔接' },
      { key: 'language', label: '语言准确' },
      { key: 'lexicon', label: '词汇句式' }
    ];
    var dimHtml = dims.map(function (d) {
      var a = ra.dims[d.key], b = rb.dims[d.key];
      return '<div class="wc-cmp-dim"><span>' + d.label + '</span>' +
        '<div class="wc-cmp-bars"><i class="old" style="width:' + a + '%"></i><i class="new" style="width:' + b + '%"></i></div>' +
        '<strong>' + a + ' → ' + b + '</strong></div>';
    }).join('');

    var ops = E.diff(c.prev.text, c.now.text);
    var errorsOf = function (r) { return r.issues.filter(function (i) { return i.severity === 'error'; }).length; };
    var summary = [
      { label: '词数', a: ra.stats.words, b: rb.stats.words },
      { label: '规则错误', a: errorsOf(ra), b: errorsOf(rb) },
      { label: '关键词覆盖', a: ra.keywords.filter(function (k) { return k.hitAll; }).length + '/' + ra.keywords.length, b: rb.keywords.filter(function (k) { return k.hitAll; }).length + '/' + rb.keywords.length },
      { label: '低分词', a: ra.upgrades.length, b: rb.upgrades.length }
    ];

    host.innerHTML =
      '<header class="wc-bar">' +
      '<button class="wc-btn ghost small" data-report>← 批改结果</button>' +
      '<div class="wc-bar-title">同题对比 · ' + esc(p.title) + '</div>' +
      '<button class="wc-btn ghost small" data-rewrite>再写一次</button></header>' +

      '<section class="wc-card wc-cmp-head">' +
      '<div class="wc-cmp-att"><span class="wc-cmp-tag">上一次</span><strong>' + ra.band + '</strong>' +
      '<em>' + ra.score + ' 分 · ' + ra.stats.words + ' 词</em><small>' + E.fmtDate(c.prev.at) + '</small></div>' +
      '<div class="wc-cmp-arrow">→</div>' +
      '<div class="wc-cmp-att now"><span class="wc-cmp-tag">这一次</span><strong>' + rb.band + '</strong>' +
      '<em>' + rb.score + ' 分 · ' + rb.stats.words + ' 词</em><small>' + E.fmtDate(c.now.at) + '</small></div>' +
      '<div class="wc-cmp-delta ' + deltaClass + '">' + deltaText + '</div>' +
      '</section>' +

      '<section class="wc-card"><h3>四维对比</h3><div class="wc-cmp-dims">' + dimHtml + '</div></section>' +

      '<section class="wc-card"><div class="wc-row"><h3>文本对比</h3>' +
      '<span class="wc-muted small">红字是删掉的，绿字是新增的</span></div>' +
      '<div class="wc-cmp-text">' +
      '<div class="wc-cmp-col"><span class="wc-cmp-label">上一次</span><p>' + diffSide(ops, 'a') + '</p></div>' +
      '<div class="wc-cmp-col"><span class="wc-cmp-label">这一次</span><p>' + diffSide(ops, 'b') + '</p></div>' +
      '</div></section>' +

      '<section class="wc-card"><h3>变化摘要</h3><div class="wc-cmp-summary">' +
      summary.map(function (s) {
        return '<div><span>' + s.label + '</span><strong>' + s.a + ' <em>→</em> ' + s.b + '</strong></div>';
      }).join('') +
      '</div></section>';

    qs('[data-report]').addEventListener('click', showReport);
    qs('[data-rewrite]').addEventListener('click', function () { showEditor(p.id); });
  }

  /* ---------------- 入口 ---------------- */
  function mount(target, options) {
    host = typeof target === 'string' ? document.querySelector(target) : target;
    if (!host) throw new Error('WritingCoach: 找不到挂载节点');
    if (options && options.data) DATA = options.data;
    host.classList.add('wcoach');
    showHome();
  }

  window.WritingCoach = {
    mount: mount,
    unmount: function () { stopTimer(); },
    grade: E.gradeWriting,
    version: '1.0.0'
  };
})();
