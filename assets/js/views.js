/*
 * 页面视图：首页 / 背单词 / 阅读 / 听力 / 错题本 / 设置
 * 每个视图返回 { html, mount(root, ctx), destroy() }
 */
window.App = window.App || {};
(function (A) {
  'use strict';

  var ui = A.ui;
  var esc = ui.esc;
  var icon = ui.icon;
  var views = {};

  function S() { return A.core.getState(); }
  function word(id) { return A.core.getWord(id); }

  /* ================= 通用组件 ================= */
  function pageHead(title, sub, extra) {
    return '<header class="page-head"><div class="ph-text"><h1>' + esc(title) + '</h1>' +
      (sub ? '<p>' + sub + '</p>' : '') + '</div>' +
      (extra ? '<div class="ph-actions">' + extra + '</div>' : '') + '</header>';
  }

  function sectionHead(title, sub, extra) {
    return '<div class="section-head"><div><h2>' + esc(title) + '</h2>' +
      (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (extra || '') + '</div>';
  }

  function bar(pct, cls) {
    var p = Math.max(0, Math.min(1, pct || 0)) * 100;
    return '<div class="bar ' + (cls || '') + '"><i style="width:' + p.toFixed(1) + '%"></i></div>';
  }

  function emptyState(iconName, title, text, action) {
    return '<div class="empty">' + icon(iconName) + '<h3>' + esc(title) + '</h3>' +
      '<p>' + esc(text || '') + '</p>' + (action || '') + '</div>';
  }

  function storageBanner() {
    if (A.core.storageOK()) return '';
    return '<div class="banner warn">' + icon('alert') +
      '<div><strong>当前是临时模式</strong><span>浏览器禁止本地存储，学习记录不会保存。请用 start.cmd 通过本地服务打开。</span></div></div>';
  }

  function greeting() {
    var h = new Date().getHours();
    if (h < 6) return '夜深了';
    if (h < 12) return '早上好';
    if (h < 18) return '下午好';
    return '晚上好';
  }

  /* ---------------- 阅读点词查义 ---------------- */
  function popHtml(w, raw, freq) {
    var label = { high: '高频', mid: '中频', low: '低频', outside: '词库外' }[freq];
    if (!w) {
      return '<div class="pop-head"><strong>' + esc(raw) + '</strong>' +
        '<span class="freq-badge ' + freq + '">' + label + '</span></div>' +
        '<div class="pop-dict" data-dict="' + esc(raw) + '"><p class="pop-empty">查词中…</p></div>';
    }
    var senses = A.core.sensesOf(w).map(function (s, i) {
      return '<div class="pop-sense"><span>' + (i + 1) + '</span>' + esc(s) + '</div>';
    }).join('');
    return '<div class="pop-head"><strong>' + esc(w.w) + '</strong>' +
      '<button class="pop-say" data-say="' + esc(w.w) + '" aria-label="朗读">' + icon('volume') + '</button>' +
      '<span class="freq-badge ' + freq + '">' + label + '</span></div>' +
      '<div class="pop-ipa">' + esc(w.ph) + ' · ' + esc(w.pos) + '</div>' +
      '<div class="pop-senses">' + senses + '</div>' +
      (w.ex ? '<div class="pop-ex">' + esc(w.ex) + '</div>' : '');
  }

  function bindWordPopover(container) {
    if (!container || container.__wordBound) return;
    container.__wordBound = true;
    container.addEventListener('click', function (e) {
      var el = e.target && e.target.closest ? e.target.closest('.w') : null;
      if (!el || !container.contains(el)) return;
      var raw = el.getAttribute('data-w');
      var w = A.core.lookupWord(raw);
      var freq = A.core.freqOf(raw);
      ['high', 'mid', 'low', 'outside'].forEach(function (k) { el.classList.remove('freq-' + k); });
      el.classList.add('freq-' + freq);
      var pop = ui.popover(el, popHtml(w, raw, freq));
      var dictBox = pop.querySelector('[data-dict]');
      if (dictBox) {
        A.core.lookupDict(raw, function (hit) {
          if (!dictBox.isConnected) return;
          dictBox.innerHTML = hit ? dictPopHtml(hit) : '<p class="pop-empty">ECDICT 未收录</p>';
        });
      }
      var say = pop.querySelector('[data-say]');
      if (say) say.addEventListener('click', function () { ui.tts.speak(say.getAttribute('data-say'), { rate: 0.95 }); });
    });
  }

  function openWordCard(w, opts) {
    opts = opts || {};
    if (!w) return;
    var freq = A.core.freqOf(w.w);
    var label = { high: '高频', mid: '中频', low: '低频', outside: '词库外' }[freq];
    var senses = A.core.sensesOf(w);
    var ctx = A.core.contextSentences(w.w, 2);
    var body = '<div class="wc-head"><div class="wc-title"><strong>' + esc(w.w) + '</strong>' +
      '<span class="freq-badge ' + freq + '">' + label + '</span></div>' +
      '<button class="pop-say" data-say="' + esc(w.w) + '" aria-label="朗读">' + icon('volume') + '</button></div>' +
      '<div class="wc-ipa">' + esc(w.ph) + ' · ' + esc(w.pos) + '</div>' +
      '<div class="wc-senses">' + senses.map(function (s, i) {
        return '<div class="wc-sense"><span>' + (i + 1) + '</span>' + esc(s) + '</div>';
      }).join('') + '</div>' +
      '<div class="wc-src">释义综合参考牛津 / 朗文 / 柯林斯</div>' +
      (w.ex ? '<div class="wc-ex">' + esc(w.ex) + '<span>' + esc(w.exZh || '') + '</span></div>' : '') +
      (w.note ? '<div class="wc-note">' + icon('sparkles') + '<span>' + esc(w.note) + '</span></div>' : '') +
      (ctx.length
        ? '<div class="wc-ctx-head">语境用法</div>' + ctx.map(function (c) {
          return '<div class="wc-ctx"><p>' + esc(c.text) + '</p><span>' + esc(c.source) + '</span></div>';
        }).join('')
        : '<div class="wc-ctx-empty">暂无真题语境例句，可参考上方例句</div>');

    var m = ui.modal({
      title: '单词详情',
      body: body,
      okText: opts.inBook ? '移出单词本' : '加入错题本',
      cancelText: '关闭',
      onOk: function () {
        if (opts.inBook) {
          A.core.wordbookRemove(w.id);
          ui.toast('已移出单词本');
        } else {
          A.core.addCustom({ kind: 'word', title: w.w, body: senses.join('；'), note: '词库' });
          ui.toast('已加入自定义错题本', 'success');
        }
        if (opts.onChange) opts.onChange();
      }
    });
    var say = m.root.querySelector('[data-say]');
    if (say) say.addEventListener('click', function () { ui.tts.speak(w.w, { rate: 0.95 }); });
  }

  function dictPopHtml(hit) {
    var e = hit.e;
    var lines = String(e[2] || '').split('；').filter(Boolean).slice(0, 3);
    return '<div class="pop-ipa">' + (e[0] ? '/' + esc(e[0]) + '/' : '') +
      (e[1] ? ' · ' + esc(e[1]) : '') + '</div>' +
      '<div class="pop-zh">' + lines.map(function (l) { return esc(l); }).join('<br>') + '</div>' +
      (hit.inflected ? '<div class="pop-meta">由 ' + esc(hit.inflected) + ' 变形查得</div>' : '') +
      '<div class="pop-meta">ECDICT · MIT</div>';
  }

  function dictCardHtml(hit) {
    var e = hit.e;
    var lines = String(e[2] || '').split('；').filter(Boolean);
    var tags = String(e[5] || '').split(/\s+/).filter(Boolean).map(function (t) {
      return ({ cet4: 'CET-4', cet6: 'CET-6', ky: '考研', gk: '高考', zk: '中考', toefl: '托福', ielts: '雅思', gre: 'GRE' })[t] || t.toUpperCase();
    });
    var meta = [];
    if (e[4]) meta.push('牛津核心');
    if (e[3]) meta.push('柯林斯 ' + e[3] + ' 星');
    if (e[6]) meta.push('BNC ' + e[6]);
    if (e[7]) meta.push('当代 ' + e[7]);
    return '<div class="wc-head"><div class="wc-title"><strong>' + esc(hit.word) + '</strong>' +
      '<span class="freq-badge outside">ECDICT</span></div></div>' +
      '<div class="wc-ipa">' + (e[0] ? '/' + esc(e[0]) + '/' : '') + (e[1] ? ' · ' + esc(e[1]) : '') + '</div>' +
      '<div class="wc-senses">' + lines.map(function (s, i) {
        return '<div class="wc-sense"><span>' + (i + 1) + '</span>' + esc(s) + '</div>';
      }).join('') + '</div>' +
      (tags.length ? '<div class="dict-tags">' + tags.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>' : '') +
      (meta.length ? '<div class="wc-src">' + esc(meta.join(' · ')) + '</div>' : '') +
      (e[8] ? '<div class="wc-src">变形：' + esc(e[8]) + '</div>' : '') +
      (hit.inflected ? '<div class="wc-src">由 ' + esc(hit.inflected) + ' 变形查得</div>' : '');
  }

  function openDictCard(word) {
    var hitRef = null;
    var m = ui.modal({
      title: 'ECDICT 查词',
      body: '<p class="muted small">正在查询 ' + esc(word) + ' …</p>',
      okText: '加入错题本',
      cancelText: '关闭',
      onOk: function () {
        if (!hitRef) { ui.toast('还没查到这个词'); return false; }
        A.core.addCustom({ kind: 'word', title: hitRef.word, body: hitRef.e[2], note: 'ECDICT' });
        ui.toast('已加入自定义错题本', 'success');
      }
    });
    var body = m.root.querySelector('.modal-body');
    A.core.lookupDict(word, function (hit) {
      hitRef = hit;
      body.innerHTML = hit ? dictCardHtml(hit) : '<p class="muted">ECDICT 未收录「' + esc(word) + '」</p>';
    });
  }

  /* ================= 首页 ================= */
  views.dashboard = function () {
    var s = S();
    var exam = examInfoSafe();
    var rec = A.core.todayRecord();
    var due = A.core.dueList().length;
    var newLeft = A.core.newRemaining();
    var mastered = A.core.masteredCount();
    var streak = A.core.streak();
    var words = A.core.allWords().length;
    var acc = rec.reviews ? Math.round((rec.correct / rec.reviews) * 100) : 0;
    var minutes = Math.round((rec.seconds || 0) / 60);
    var name = s.settings.name ? esc(s.settings.name) + '，' : '';

    var days = exam.days;
    var daysText = days == null ? '—' : (days >= 0 ? days : 0);
    var heroSub = days == null ? '请在设置中填写考试日期'
      : days > 0 ? '按今天的节奏走，过线并不难。'
        : days === 0 ? '今天就是考试日，沉着应考。'
          : '考试已结束，可以开始准备下一场了。';

    var checkTarget = A.core.checkTarget();
    var checkDone = rec.checkDone || 0;
    var tasks = [
      {
        title: '抽查 ' + checkTarget + ' 个单词',
        meta: checkDone + ' / ' + checkTarget + ' 已完成 · ' + Math.ceil(checkTarget / 10) + ' 组',
        done: checkDone >= checkTarget, pct: Math.min(1, checkDone / checkTarget),
        href: '#/vocab?start=1', iconName: 'rotate'
      },
      {
        title: '完成 1 篇仔细阅读', meta: rec.reading ? '已完成 ' + rec.reading + ' 篇' : '推荐用时 8 分钟',
        done: rec.reading >= 1, pct: Math.min(1, rec.reading), href: '#/reading', iconName: 'file'
      },
      {
        title: '完成 1 段听力', meta: rec.listening ? '已完成 ' + rec.listening + ' 段' : '推荐用时 5 分钟',
        done: rec.listening >= 1, pct: Math.min(1, rec.listening), href: '#/listening', iconName: 'headphones'
      },
      {
        title: '完成 1 段翻译', meta: (rec.translation || 0) ? '已完成 ' + rec.translation + ' 段' : '推荐用时 15 分钟',
        done: (rec.translation || 0) >= 1, pct: Math.min(1, rec.translation || 0),
        href: '#/translation', iconName: 'languages'
      }
    ];
    var doneCount = tasks.filter(function (t) { return t.done; }).length;

    var taskHtml = tasks.map(function (t) {
      return '<a class="task ' + (t.done ? 'done' : '') + '" href="' + t.href + '">' +
        '<span class="task-ic">' + icon(t.done ? 'check' : t.iconName) + '</span>' +
        '<span class="task-main"><strong>' + esc(t.title) + '</strong><span>' + esc(t.meta) + '</span>' +
        bar(t.pct) + '</span>' +
        '<span class="task-go">' + icon('chevron') + '</span></a>';
    }).join('');

    var tiles = [
      { href: '#/vocab', ic: 'book', title: '词汇', text: words + ' 词 · 已掌握 ' + mastered, tone: 'teal' },
      { href: '#/reading', ic: 'file', title: '阅读', text: '三题型 · 定位句解析', tone: 'amber' },
      { href: '#/listening', ic: 'headphones', title: '听力', text: '长对话 · 听力篇章', tone: 'blue' },
      { href: '#/translation', ic: 'languages', title: '翻译', text: '汉译英 · 逐句对照', tone: 'plum' }
    ].map(function (t) {
      return '<a class="tile tone-' + t.tone + '" href="' + t.href + '">' +
        '<span class="tile-ic">' + icon(t.ic) + '</span>' +
        '<span class="tile-txt"><strong>' + esc(t.title) + '</strong><span>' + esc(t.text) + '</span></span>' +
        icon('arrowRight', 'tile-arrow') + '</a>';
    }).join('');

    var html = storageBanner() +
      '<section class="hero">' +
      '<div class="hero-main">' +
      '<div class="hero-eyebrow">' + icon('calendar') + '大学英语四级 · ' + esc(exam.label || '') + '</div>' +
      '<h1>' + esc(name) + '距离考试还有 <em>' + daysText + '</em> 天</h1>' +
      '<p>' + esc(heroSub) + '</p>' +
      '<div class="hero-actions">' +
      '<a class="btn btn-light" href="#/vocab?start=1">' + icon('zap') + '开始今日抽查</a>' +
      '<a class="btn btn-outline-light" href="#/reading">做一篇阅读</a>' +
      '</div>' +
      '</div>' +
      '<div class="hero-side">' +
      '<div class="hero-ring">' + ui.ring(exam.progress, 132, 9) +
      '<div class="hero-ring-label"><strong>' + Math.round(exam.progress * 100) + '%</strong><span>备考进度</span></div></div>' +
      '<div class="hero-note">' + icon('flame') + '连续打卡 <strong>' + streak + '</strong> 天</div>' +
      '</div>' +
      '</section>' +

      '<section class="stats">' +
      statCard('flame', '连续打卡', streak + ' 天', '保持节奏最重要', 'tone-amber') +
      statCard('activity', '今日学习', (rec.reviews + rec.newWords > 0 ? rec.reviews + ' 次' : '未开始'), acc ? '正确率 ' + acc + '%' : '做完一组会自动统计', 'tone-teal') +
      statCard('rotate', '待复习', due + ' 个', due ? '间隔重复已排好' : '今日已清空', 'tone-blue') +
      statCard('award', '已掌握', mastered + ' 个', '共 ' + words + ' 词', 'tone-plum') +
      '</section>' +

      '<div class="grid-2">' +
      '<section class="card plan-card">' +
      sectionHead('今日计划', doneCount + ' / ' + tasks.length + ' 已完成', '') +
      '<div class="tasks">' + taskHtml + '</div>' +
      '</section>' +
      '<section class="card heat-card">' +
      sectionHead('学习热力图', '近 12 周', '') +
      ui.heat(A.core.heat(12)) +
      '<div class="heat-foot"><span>' + icon('clock') + '本周 ' + A.core.weekMinutes() + ' 分钟</span>' +
      '<span>' + icon('target') + '今日 ' + minutes + ' 分钟</span></div>' +
      '</section>' +
      '</div>' +

      '<section class="card tiles-card">' +
      sectionHead('专项练习', '按四级题型拆分，哪里弱练哪里', '') +
      '<div class="tiles">' + tiles + '</div>' +
      '</section>';

    return { html: html };
  };

  function examInfoSafe() {
    try { return A.core.examInfo(); } catch (e) { return { days: null, progress: 0, label: '' }; }
  }

  function statCard(ic, label, value, sub, tone) {
    return '<div class="stat ' + (tone || '') + '">' +
      '<span class="stat-ic">' + icon(ic) + '</span>' +
      '<div class="stat-body"><span class="stat-label">' + esc(label) + '</span>' +
      '<strong class="stat-value">' + esc(value) + '</strong>' +
      '<span class="stat-sub">' + esc(sub) + '</span></div></div>';
  }

  /* ================= 抽查单词（费曼式） ================= */
  var checkSession = null;
  var checkKeys = null;

  views.vocab = function () {
    var root = null;

    function landing() {
      var rec = A.core.todayRecord();
      var target = A.core.checkTarget();
      var done = rec.checkDone || 0;
      var left = Math.max(0, target - done);
      var groups = Math.ceil(target / 10);
      var rate = rec.reviews ? Math.round((rec.correct / rec.reviews) * 100) : 0;
      var due = A.core.dueList().length;
      var mastered = A.core.masteredCount();
      var total = A.core.allWords().length;

      return pageHead('抽查单词', '费曼式回忆 · 每天 ' + target + ' 个 · 10 个一组') +
        '<a class="card wb-entry" href="#/wordbook">' +
        '<span class="wb-entry-ic">' + icon('bookmark') + '</span>' +
        '<span class="wb-entry-main"><strong>单词本</strong><span>收藏不熟的词，按费曼法单独复习</span></span>' +
        '<span class="wb-entry-count">' + A.core.wordbookCount() + ' 词</span>' +
        icon('chevron') +
        '</a>' +
        '<div class="vocab-top">' +
        '<section class="card start-card">' +
        '<div class="start-top">' +
        '<span class="start-badge">' + icon('sparkles') + '今日抽查</span>' +
        '<h2>' + (left ? '还有 ' + left + ' 个单词等你' : '今天的抽查完成了') + '</h2>' +
        '<p>先自己说出释义，再翻面自评。记得的拉长复习间隔，模糊和忘记的会自动回到队列。</p>' +
        '</div>' +
        '<div class="check-progress">' +
        '<div class="big-num">' + done + '<span> / ' + target + '</span></div>' +
        bar(Math.min(1, done / target)) +
        '<div class="check-meta">' + groups + ' 组 × 10 个 · 已完成 ' + Math.floor(done / 10) + ' 组</div>' +
        '</div>' +
        '<div class="start-actions">' +
        '<button class="btn btn-primary btn-lg" data-start>' + icon('play') + (done ? '继续抽查' : '开始抽查') + '</button>' +
        '<button class="btn btn-ghost" data-add>+10 个</button>' +
        '<span class="muted small">释义综合参考《牛津高阶》《朗文当代》《柯林斯高阶》</span>' +
        '</div>' +
        '</section>' +
        '<section class="card today-card">' +
        sectionHead('今日进度', '') +
        '<div class="today-row"><span>抽查</span><strong>' + done + ' / ' + target + '</strong></div>' +
        '<div class="today-row"><span>记得率</span><strong>' + (rate ? rate + '%' : '—') + '</strong></div>' +
        '<div class="today-row"><span>待复习</span><strong>' + due + ' 个</strong></div>' +
        '<div class="today-row"><span>已掌握</span><strong>' + mastered + ' 个</strong></div>' +
        '<p class="muted small">词库共 ' + total + ' 词；每天抽查量可在设置里调整。</p>' +
        '</section>' +
        '</div>' +
        wordCard();
    }

    function wordCard() {
      var search = '<div class="search">' + icon('search') +
        '<input id="word-search" type="search" placeholder="搜索单词或释义" autocomplete="off"></div>';
      return '<section class="card word-card">' +
        sectionHead('词库', A.core.allWords().length + ' 个四级核心词', search) +
        '<div class="word-list" id="word-list">' + wordRows('') + '</div>' +
        '</section>';
    }

    function wordRows(q) {
      var keyword = (q || '').trim().toLowerCase();
      var s = S();
      var rows = [];
      var words = A.core.allWords();
      var today = A.core.todayStart();
      for (var i = 0; i < words.length; i++) {
        var w = words[i];
        if (keyword && w.w.toLowerCase().indexOf(keyword) < 0 && w.zh.indexOf(keyword) < 0) continue;
        var card = s.cards[w.id];
        var status = { text: '未抽查', cls: 'new' };
        if (card) {
          if (card.S >= 21) status = { text: '已掌握', cls: 'ok' };
          else if (card.due <= today) status = { text: '待复习', cls: 'due' };
          else status = { text: ui.relDay(card.due), cls: 'later' };
        }
        rows.push('<div class="wrow" data-wid="' + esc(w.id) + '">' +
          '<div class="w-main"><strong>' + esc(w.w) + '</strong><span class="w-ipa">' + esc(w.ph) + '</span>' +
          '<span class="w-zh">' + esc(w.zh) + '</span></div>' +
          '<span class="chip status-' + status.cls + '">' + esc(status.text) + '</span>' +
          '<span class="wrow-go">' + icon('chevron') + '</span>' +
          '</div>');
        if (rows.length >= 120) break;
      }
      if (rows.length) {
        return rows.join('') + (keyword ? '' :
          '<p class="muted small pad">仅显示前 120 个，输入关键词可搜索全部 ' + A.core.allWords().length + ' 词</p>');
      }
      var q = String(keyword || '').trim();
      return q
        ? '<div class="pad"><p class="muted small">词库里没有「' + esc(q) + '」</p>' +
          '<button class="btn btn-ghost small" data-dict-lookup="' + esc(q) + '">查 ECDICT</button></div>'
        : '<p class="muted small pad">没有匹配的单词</p>';
    }

    function bindLanding(r) {
      var start = r.querySelector('[data-start]');
      if (start) start.addEventListener('click', function () { startSession(r); });
      var add = r.querySelector('[data-add]');
      if (add) add.addEventListener('click', function () {
        A.core.addCheckGroup(10);
        ui.toast('已加 10 个，今天共 ' + A.core.checkTarget() + ' 个', 'success');
        r.innerHTML = storageBanner() + landing();
        bindLanding(r);
      });
      var input = r.querySelector('#word-search');
      var list = r.querySelector('#word-list');
      if (input && list) {
        var searchTimer = null;
        input.addEventListener('input', function () {
          if (searchTimer) clearTimeout(searchTimer);
          searchTimer = setTimeout(function () {
            list.innerHTML = wordRows(input.value);
          }, 120);
        });
      }
      if (list) {
        list.addEventListener('click', function (e) {
          var db = e.target && e.target.closest ? e.target.closest('[data-dict-lookup]') : null;
          if (db) { openDictCard(db.getAttribute('data-dict-lookup')); return; }
          var row = e.target && e.target.closest ? e.target.closest('[data-wid]') : null;
          if (!row) return;
          var w = A.core.getWord(row.getAttribute('data-wid'));
          if (w) openWordCard(w);
        });
      }
    }

    function startSession(r) {
      var ids = A.core.buildCheckQueue();
      if (!ids.length) {
        ui.toast('今天的抽查已完成，可以点「+10 个」继续');
        return;
      }
      checkSession = {
        ids: ids, idx: 0, flipped: false,
        stats: { 1: 0, 2: 0, 3: 0 },
        group: { 1: 0, 2: 0, 3: 0 },
        pendingBreak: false,
        startTs: Date.now()
      };
      renderCard(r);
    }

    function bar2() {
      var target = A.core.checkTarget();
      var done = A.core.todayRecord().checkDone || 0;
      return bar(Math.min(1, done / target));
    }

    function renderCard(r) {
      if (!checkSession) { r.innerHTML = storageBanner() + landing(); bindLanding(r); return; }
      var s = checkSession;
      if (s.idx >= s.ids.length) { renderSummary(r); return; }
      if (s.pendingBreak && s.idx % 10 === 0) { renderBreak(r); return; }

      var w = A.core.getWord(s.ids[s.idx]);
      if (!w) { s.idx += 1; renderCard(r); return; }
      var total = A.core.checkTarget();
      var done = A.core.todayRecord().checkDone || 0;
      var groupNo = Math.floor(s.idx / 10) + 1;
      var senses = A.core.sensesOf(w);

      var head = '<div class="study-bar">' +
        '<button class="icon-btn" data-quit aria-label="退出">' + icon('arrowLeft') + '</button>' +
        '<div class="study-mid">' + bar2() + '<span class="study-count">' + done + ' / ' + total + '</span></div>' +
        '<span class="chip">第 ' + groupNo + ' 组</span>' +
        '</div>';

      var front = '<div class="check-front">' +
        '<div class="q-type">先自己说一遍意思</div>' +
        '<h2 class="word">' + esc(w.w) + '</h2>' +
        '<div class="word-row center"><span class="ipa">' + esc(w.ph) + '</span>' +
        '<button class="audio-btn small" data-play>' + icon('volume') + '</button></div>' +
        '<button class="btn btn-ghost small book-btn" data-book>' + icon('bookmark') +
        (A.core.wordbookHas(w.id) ? '已在单词本' : '加入单词本') + '</button>' +
        '<p class="hint">在心里造句、讲给自己听，再翻面核对</p>' +
        '<button class="btn btn-primary btn-lg" data-flip>' + icon('eye') + '显示释义（空格）</button>' +
        '</div>';

      var sensesHtml = senses.map(function (x, i) {
        return '<div class="sense"><span class="sense-no">' + (i + 1) + '</span><span>' + esc(x) + '</span></div>';
      }).join('');

      var back = '<div class="check-back">' +
        '<div class="check-back-head"><h2 class="word">' + esc(w.w) + '</h2>' +
        '<button class="audio-btn small" data-play>' + icon('volume') + '</button>' +
        '<span class="ipa">' + esc(w.ph) + '</span><span class="pos">' + esc(w.pos) + '</span></div>' +
        '<div class="senses">' + sensesHtml + '</div>' +
        '<div class="sense-src">释义综合参考牛津 / 朗文 / 柯林斯</div>' +
        (w.ex ? '<div class="wd-ex">' + esc(w.ex) + '</div><div class="wd-exzh">' + esc(w.exZh || '') + '</div>' : '') +
        (w.note ? '<div class="wd-note">' + icon('sparkles') + '<span>' + esc(w.note) + '</span></div>' : '') +
        '<div class="rate-row">' +
        '<button class="rate-btn bad" data-grade="1"><strong>忘了</strong><span>明天再来</span></button>' +
        '<button class="rate-btn mid" data-grade="2"><strong>模糊</strong><span>几天后</span></button>' +
        '<button class="rate-btn good" data-grade="3"><strong>记得</strong><span>拉长间隔</span></button>' +
        '</div>' +
        '<p class="hint">按 1 / 2 / 3 也可以</p>' +
        '</div>';

      r.innerHTML = storageBanner() + '<div class="study check">' + head +
        '<div class="check-card' + (s.flipped ? ' flipped' : '') + '">' + (s.flipped ? back : front) + '</div></div>';

      r.querySelector('[data-quit]').addEventListener('click', function () {
        checkSession = null;
        r.innerHTML = storageBanner() + landing();
        bindLanding(r);
      });
      r.querySelectorAll('[data-play]').forEach(function (b) {
        b.addEventListener('click', function () { ui.tts.speak(w.w, { rate: 0.95 }); });
      });
      var bookBtn = r.querySelector('[data-book]');
      if (bookBtn) bookBtn.addEventListener('click', function () {
        if (A.core.wordbookHas(w.id)) {
          A.core.wordbookRemove(w.id);
          ui.toast('已从单词本移出');
        } else {
          A.core.wordbookAdd(w.id, 'manual');
          ui.toast('已加入单词本', 'success');
        }
        renderCard(r);
      });
      var flip = r.querySelector('[data-flip]');
      if (flip) flip.addEventListener('click', function () { s.flipped = true; renderCard(r); });
      r.querySelectorAll('[data-grade]').forEach(function (b) {
        b.addEventListener('click', function () { grade(+b.getAttribute('data-grade'), r); });
      });
    }

    function grade(g, r) {
      var s = checkSession;
      var id = s.ids[s.idx];
      A.core.reviewWord(id, g);
      s.stats[g] += 1;
      s.group[g] += 1;
      s.idx += 1;
      s.flipped = false;
      if (s.idx % 10 === 0 && s.idx < s.ids.length) { s.pendingBreak = true; renderBreak(r); return; }
      if (s.idx >= s.ids.length) { renderSummary(r); return; }
      renderCard(r);
    }

    function renderBreak(r) {
      var s = checkSession;
      s.pendingBreak = false;
      var n = s.idx / 10;
      var g = s.group;
      s.group = { 1: 0, 2: 0, 3: 0 };
      r.innerHTML = storageBanner() +
        '<div class="group-break card">' +
        '<div class="gb-badge">第 ' + n + ' 组完成</div>' +
        '<h2>先歇 20 秒</h2>' +
        '<div class="gb-stats">' +
        '<div><strong>' + g[3] + '</strong><span>记得</span></div>' +
        '<div><strong>' + g[2] + '</strong><span>模糊</span></div>' +
        '<div><strong>' + g[1] + '</strong><span>忘了</span></div>' +
        '</div>' +
        '<div class="se-actions">' +
        '<button class="btn btn-primary btn-lg" data-next-group>' + icon('play') + '继续下一组</button>' +
        '<button class="btn btn-ghost" data-rest>先休息</button>' +
        '</div></div>';
      r.querySelector('[data-next-group]').addEventListener('click', function () { renderCard(r); });
      r.querySelector('[data-rest]').addEventListener('click', function () {
        checkSession = null;
        r.innerHTML = storageBanner() + landing();
        bindLanding(r);
      });
    }

    function renderSummary(r) {
      var s = checkSession;
      var n = s.stats[1] + s.stats[2] + s.stats[3];
      var rate = n ? Math.round(((s.stats[2] + s.stats[3]) / n) * 100) : 0;
      var mins = Math.max(1, Math.round((Date.now() - s.startTs) / 60000));
      r.innerHTML = storageBanner() +
        '<div class="session-end card">' +
        '<div class="se-ring">' + ui.ring(rate / 100, 120, 8) +
        '<div class="se-ring-label"><strong>' + rate + '%</strong><span>记得率</span></div></div>' +
        '<h2>本轮抽查完成</h2>' +
        '<p class="muted">记得 ' + s.stats[3] + ' · 模糊 ' + s.stats[2] + ' · 忘了 ' + s.stats[1] + ' · ' + mins + ' 分钟</p>' +
        '<div class="se-actions">' +
        '<button class="btn btn-primary" data-add10>+10 个</button>' +
        '<button class="btn btn-ghost" data-again>' + icon('rotate') + '再抽查一轮</button>' +
        '<button class="btn btn-ghost" data-home>回到词库</button>' +
        '</div></div>';
      checkSession = null;
      r.querySelector('[data-add10]').addEventListener('click', function () {
        A.core.addCheckGroup(10);
        startSession(r);
      });
      r.querySelector('[data-again]').addEventListener('click', function () { startSession(r); });
      r.querySelector('[data-home]').addEventListener('click', function () {
        r.innerHTML = storageBanner() + landing();
        bindLanding(r);
      });
    }

    return {
      html: '',
      mount: function (r, c) {
        root = r;
        checkSession = null;
        r.innerHTML = storageBanner() + landing();
        bindLanding(r);
        if (c && c.query && c.query.start) setTimeout(function () { startSession(r); }, 30);
        checkKeys = function (e) {
          if (!checkSession) return;
          var tag = (e.target && e.target.tagName) || '';
          if (/INPUT|TEXTAREA/.test(tag)) return;
          var s = checkSession;
          if (e.key === ' ' || e.key === 'Enter') {
            if (!s.flipped) { e.preventDefault(); s.flipped = true; renderCard(r); }
            return;
          }
          if (s.flipped && /^[123]$/.test(e.key)) {
            e.preventDefault();
            grade(+e.key, r);
          }
        };
        document.addEventListener('keydown', checkKeys);
      },
      destroy: function () {
        checkSession = null;
        ui.tts.cancel();
        if (checkKeys) { document.removeEventListener('keydown', checkKeys); checkKeys = null; }
      }
    };
  };

  /* ================= 单词本 ================= */
  views.wordbook = function () {
    var root = null;
    var session = null;

    function render() {
      if (!root) return;
      if (session) renderRunner();
      else renderList();
    }

    function renderList() {
      var list = A.core.wordbookList().sort(function (a, b) {
        return (b.meta.at || 0) - (a.meta.at || 0);
      });
      var rows = list.map(function (item) {
        return '<div class="wb-row" data-wb-open="' + esc(item.id) + '">' +
          '<div class="wb-main"><strong>' + esc(item.w.w) + '</strong>' +
          '<span class="w-ipa">' + esc(item.w.ph) + '</span>' +
          '<span class="w-zh">' + esc(item.w.zh) + '</span></div>' +
          '<span class="chip">' + (item.meta.source === 'wrong' ? '错词' : '手动') + '</span>' +
          '<button class="icon-btn" data-wb-del="' + esc(item.id) + '" aria-label="移出">' + icon('trash') + '</button>' +
          '</div>';
      }).join('');

      root.innerHTML = pageHead('单词本', '收藏不熟的词 · 费曼式单独复习') +
        '<div class="wb-toolbar">' +
        '<button class="btn btn-primary" data-wb-start' + (list.length ? '' : ' disabled') + '>' + icon('play') + '开始复习</button>' +
        '<a class="btn btn-ghost" href="#/vocab">去抽查</a>' +
        (list.length ? '<button class="btn btn-danger-ghost" data-wb-clear>' + icon('trash') + '清空</button>' : '') +
        '</div>' +
        (list.length
          ? '<section class="card wb-list">' + rows + '</section>'
          : '<div class="card">' + emptyState('bookmark', '单词本还是空的',
            '抽查时遇到不熟的词点「加入单词本」；答错的词会自动收进来',
            '<a class="btn btn-primary" href="#/vocab">去抽查</a>') + '</div>');

      var start = root.querySelector('[data-wb-start]');
      if (start) start.addEventListener('click', function () {
        var ids = A.core.wordbookQueue();
        if (!ids.length) { ui.toast('单词本里还没有词'); return; }
        session = { ids: ids, idx: 0, flipped: false, stats: { 1: 0, 2: 0, 3: 0 }, startTs: Date.now() };
        render();
      });

      var clear = root.querySelector('[data-wb-clear]');
      if (clear) clear.addEventListener('click', function () {
        ui.modal({
          title: '清空单词本？',
          body: '<p>只清空单词本，不影响抽查进度和错题记录。</p>',
          okText: '清空', danger: true,
          onOk: function () {
            A.core.wordbookList().forEach(function (item) { A.core.wordbookRemove(item.id); });
            render();
            ui.toast('单词本已清空');
          }
        });
      });

      root.querySelectorAll('[data-wb-del]').forEach(function (b) {
        b.addEventListener('click', function () {
          A.core.wordbookRemove(b.getAttribute('data-wb-del'));
          render();
          ui.toast('已移出单词本');
        });
      });

      root.querySelectorAll('[data-wb-open]').forEach(function (row) {
        row.addEventListener('click', function (e) {
          if (e.target && e.target.closest && e.target.closest('[data-wb-del]')) return;
          var w = A.core.getWord(row.getAttribute('data-wb-open'));
          if (w) openWordCard(w, { inBook: true, onChange: render });
        });
      });
    }

    function renderRunner() {
      var s = session;
      if (s.idx >= s.ids.length) { renderSummary(); return; }
      var w = A.core.getWord(s.ids[s.idx]);
      if (!w) { s.idx += 1; renderRunner(); return; }
      var senses = A.core.sensesOf(w).map(function (x, i) {
        return '<div class="sense"><span class="sense-no">' + (i + 1) + '</span><span>' + esc(x) + '</span></div>';
      }).join('');

      root.innerHTML = '<div class="study wb-study">' +
        '<div class="study-bar">' +
        '<button class="icon-btn" data-wb-back aria-label="返回">' + icon('arrowLeft') + '</button>' +
        '<div class="study-mid">' + bar((s.idx + 1) / s.ids.length) +
        '<span class="study-count">' + (s.idx + 1) + ' / ' + s.ids.length + '</span></div>' +
        '<span class="chip">单词本</span>' +
        '</div>' +
        '<div class="check-card' + (s.flipped ? ' flipped' : '') + '">' +
        (s.flipped
          ? '<div class="check-back">' +
            '<div class="check-back-head"><h2 class="word" data-wb-detail>' + esc(w.w) + '</h2>' +
            '<button class="audio-btn small" data-play>' + icon('volume') + '</button>' +
            '<span class="ipa">' + esc(w.ph) + '</span><span class="pos">' + esc(w.pos) + '</span></div>' +
            '<div class="senses">' + senses + '</div>' +
            (w.ex ? '<div class="wd-ex">' + esc(w.ex) + '</div><div class="wd-exzh">' + esc(w.exZh || '') + '</div>' : '') +
            '<div class="rate-row">' +
            '<button class="rate-btn bad" data-wb-grade="1"><strong>忘了</strong><span>明天再来</span></button>' +
            '<button class="rate-btn mid" data-wb-grade="2"><strong>模糊</strong><span>几天后</span></button>' +
            '<button class="rate-btn good" data-wb-grade="3"><strong>记得</strong><span>拉长间隔</span></button>' +
            '</div><p class="hint">按 1 / 2 / 3 也可以</p></div>'
          : '<div class="check-front">' +
            '<div class="q-type">先自己说一遍意思</div>' +
            '<h2 class="word" data-wb-detail>' + esc(w.w) + '</h2>' +
            '<div class="word-row center"><span class="ipa">' + esc(w.ph) + '</span>' +
            '<button class="audio-btn small" data-play>' + icon('volume') + '</button></div>' +
            '<p class="hint">在心里造句、讲给自己听，再翻面核对</p>' +
            '<button class="btn btn-primary btn-lg" data-wb-flip>' + icon('eye') + '显示释义（空格）</button>' +
            '</div>') +
        '</div></div>';

      root.querySelector('[data-wb-back]').addEventListener('click', function () {
        session = null;
        render();
      });
      root.querySelectorAll('[data-play]').forEach(function (b) {
        b.addEventListener('click', function () { ui.tts.speak(w.w, { rate: 0.95 }); });
      });
      root.querySelectorAll('[data-wb-detail]').forEach(function (el) {
        el.addEventListener('click', function (e) {
          e.stopPropagation();
          openWordCard(w, { inBook: true });
        });
      });
      var flip = root.querySelector('[data-wb-flip]');
      if (flip) flip.addEventListener('click', function () { s.flipped = true; renderRunner(); });
      root.querySelectorAll('[data-wb-grade]').forEach(function (b) {
        b.addEventListener('click', function () { gradeWord(+b.getAttribute('data-wb-grade')); });
      });
    }

    function gradeWord(g) {
      var s = session;
      A.core.reviewWord(s.ids[s.idx], g, { daily: false });
      s.stats[g] += 1;
      s.idx += 1;
      s.flipped = false;
      if (s.idx >= s.ids.length) renderSummary();
      else renderRunner();
    }

    function renderSummary() {
      var s = session;
      root.innerHTML = pageHead('单词本复习完成', '这一轮 ' + s.ids.length + ' 个词') +
        '<section class="card wb-summary">' +
        '<div class="tr-nums">' +
        '<div><strong>' + s.stats[3] + '</strong><span>记得</span></div>' +
        '<div><strong>' + s.stats[2] + '</strong><span>模糊</span></div>' +
        '<div><strong>' + s.stats[1] + '</strong><span>忘了</span></div>' +
        '</div>' +
        '<p class="muted small">忘了的词会留在错词本和单词本里，明天回到复习队列。</p>' +
        '<div class="wb-summary-actions">' +
        '<button class="btn btn-primary" data-wb-again>' + icon('rotate') + '再来一轮</button>' +
        '<button class="btn btn-ghost" data-wb-done>返回单词本</button>' +
        '</div></section>';
      root.querySelector('[data-wb-again]').addEventListener('click', function () {
        session = { ids: A.core.wordbookQueue(), idx: 0, flipped: false, stats: { 1: 0, 2: 0, 3: 0 }, startTs: Date.now() };
        if (!session.ids.length) { session = null; render(); return; }
        render();
      });
      root.querySelector('[data-wb-done]').addEventListener('click', function () {
        session = null;
        render();
      });
    }

    var wbKeys = null;
    function bindKeys() {
      wbKeys = function (e) {
        if (!session) return;
        if (e.key === ' ' || e.key === 'Enter') {
          if (!session.flipped) {
            e.preventDefault();
            session.flipped = true;
            renderRunner();
          }
          return;
        }
        if (session.flipped && /^[123]$/.test(e.key)) {
          e.preventDefault();
          gradeWord(+e.key);
        }
      };
      document.addEventListener('keydown', wbKeys);
    }

    return {
      html: '',
      mount: function (r) { root = r; render(); bindKeys(); },
      destroy: function () {
        session = null;
        ui.tts.cancel();
        if (wbKeys) { document.removeEventListener('keydown', wbKeys); wbKeys = null; }
      }
    };
  };

  /* ================= 阅读 ================= */
  views.reading = function () {
    var careful = window.CET4_READING || [];
    var cloze = window.CET4_CLOZE || [];
    var matching = window.CET4_MATCHING || [];
    var all = careful.length + cloze.length + matching.length;

    function card(set, route, metaHtml) {
      var att = A.core.attempt('reading', set.id);
      var status = att
        ? '<span class="chip status-ok">已完成 ' + att.best + ' / ' + att.total + '</span>'
        : '<span class="chip">未开始</span>';
      return '<article class="set-card">' +
        '<div class="set-top"><span class="chip chip-type">' + esc(set.type) + '</span>' + status + '</div>' +
        '<h3>' + esc(set.title) + '</h3>' +
        '<p class="set-intro">' + esc(set.topic || set.intro || '') + '</p>' +
        '<div class="set-meta">' + metaHtml + '<span class="dot">' + esc(set.level) + '</span></div>' +
        '<a class="btn btn-soft" href="#/' + route + '/' + set.id + '">' + (att ? '再做一遍' : '开始练习') + icon('arrowRight') + '</a>' +
        '</article>';
    }

    function group(title, weight, sets, route, metaFn) {
      if (!sets.length) return '';
      return '<section class="reading-group">' +
        '<div class="group-head"><h2>' + esc(title) + '</h2><span>' + esc(weight) + '</span></div>' +
        '<div class="set-grid">' + sets.map(function (s) { return card(s, route, metaFn(s)); }).join('') + '</div>' +
        '</section>';
    }

    var tip = '<div class="banner tip">' + icon('sparkles') +
      '<div><strong>三种题型，分值差很多</strong><span>仔细阅读每题约 14.2 分，长篇匹配每题约 7.1 分，选词填空每题约 3.55 分。时间不够时，先保仔细阅读，选词填空最后做。</span></div></div>';

    var body = group('仔细阅读', '20% · 每题约 14.2 分', careful, 'reading', function (set) {
      return '<span>' + icon('file') + set.questions.length + ' 题</span>' +
        '<span>' + icon('clock') + '约 ' + set.minutes + ' 分钟</span>';
    }) + group('长篇匹配', '10% · 每题约 7.1 分', matching, 'matching', function (set) {
      return '<span>' + icon('layers') + set.statements.length + ' 题</span>' +
        '<span>' + icon('file') + set.paragraphs.length + ' 段</span>' +
        '<span>' + icon('clock') + '约 ' + set.minutes + ' 分钟</span>';
    }) + group('选词填空', '5% · 每题约 3.55 分', cloze, 'cloze', function (set) {
      return '<span>' + icon('pen') + set.blanks.length + ' 空</span>' +
        '<span>' + icon('layers') + set.bank.length + ' 选词</span>' +
        '<span>' + icon('clock') + '约 ' + set.minutes + ' 分钟</span>';
    });

    return {
      html: pageHead('阅读', '仔细阅读 · 长篇匹配 · 选词填空') + tip +
        (all ? body : emptyState('file', '还没有阅读题', '在 assets/js/data/ 中添加题目即可'))
    };
  };

  views.readingRunner = function (ctx) {
    var set = (window.CET4_READING || []).filter(function (x) { return x.id === ctx.params.id; })[0];
    var interval = null;
    if (!set) {
      return { html: pageHead('题目不存在', '回到阅读列表重新选择') + '<a class="btn btn-primary" href="#/reading">返回阅读</a>' };
    }
    var answers = {};
    var submitted = false;
    var review = !!(ctx.query && ctx.query.review === '1');
    var wrongIds = review ? A.core.wrongQuestions().filter(function (e) {
      return e.kind === 'reading' && e.setId === set.id;
    }).map(function (e) { return e.qid; }) : [];
    var startedAt = Date.now();
    var elapsed = 0;
    var result = null;

    function showAnswer() { return submitted || review; }

    function scrollToTarget(el, smooth) {
      if (!el) return;
      var main = document.querySelector('.main');
      var rect = el.getBoundingClientRect();
      var behavior = 'auto';
      if (main && main.scrollHeight > main.clientHeight + 4 && getComputedStyle(main).overflowY !== 'visible') {
        var mrect = main.getBoundingClientRect();
        var top = main.scrollTop + rect.top - mrect.top - Math.min(140, main.clientHeight * 0.3);
        main.scrollTo({ top: Math.max(0, top), behavior: behavior });
      } else {
        window.scrollTo({ top: Math.max(0, window.scrollY + rect.top - 120), behavior: behavior });
      }
    }

    function jumpToQ(rootEl, qid, instant) {
      var mark = rootEl.querySelector('mark[data-q="' + qid + '"]') ||
        rootEl.querySelector('.q-mark[data-q="' + qid + '"]');
      if (!mark) return;
      scrollToTarget(mark, !instant);
      mark.classList.add('pulse');
      if (mark.classList.contains('q-mark')) mark.classList.add('hit');
      setTimeout(function () {
        mark.classList.remove('pulse');
        mark.classList.remove('hit');
      }, 1800);
    }

    function sentenceStart(p, idx) {
      var cut = Math.max(p.lastIndexOf('. ', idx), p.lastIndexOf('? ', idx), p.lastIndexOf('! ', idx));
      return cut >= 0 ? cut + 2 : 0;
    }

    function passageHtml() {
      var marks;
      if (review) {
        marks = set.questions.map(function (q, idx) {
          return { qid: q.id, text: q.evidence || '', no: idx + 1, wrong: wrongIds.indexOf(q.id) >= 0 };
        });
        return set.passage.split(/\n{2,}/).map(function (p) {
          return '<p>' + markParagraph(p, marks, true) + '</p>';
        }).join('');
      }
      if (!showAnswer()) {
        return set.passage.split(/\n{2,}/).map(function (p) { return '<p>' + ui.linkWords(p) + '</p>'; }).join('');
      }
      marks = set.questions.map(function (q, idx) {
        return { qid: q.id, text: q.evidence || '', no: idx + 1, wrong: answers[q.id] !== q.answer };
      }).filter(function (m) { return m.wrong; });
      return set.passage.split(/\n{2,}/).map(function (p) { return '<p>' + markParagraph(p, marks, false) + '</p>'; }).join('');
    }

    function markParagraph(p, marks, withMarkers) {
      var items = [];
      marks.forEach(function (m) {
        if (!m.text) return;
        var i = p.indexOf(m.text);
        if (i < 0) return;
        items.push({
          start: i, end: i + m.text.length, qid: m.qid, no: m.no, wrong: m.wrong,
          marker: withMarkers ? sentenceStart(p, i) : -1
        });
      });
      if (!items.length) return ui.linkWords(p);
      items.sort(function (a, b) { return a.start - b.start; });
      var kept = [], last = -1;
      items.forEach(function (r) { if (r.start >= last) { kept.push(r); last = r.end; } });

      var events = [];
      kept.forEach(function (r) {
        if (r.marker >= 0) {
          events.push({
            pos: r.marker,
            html: '<span class="q-mark' + (r.wrong ? ' bad' : '') + '" data-q="' + r.qid + '">' + r.no + '</span>'
          });
        }
        events.push({ pos: r.start, end: r.end, mark: true, qid: r.qid });
      });
      events.sort(function (a, b) { return a.pos - b.pos; });

      var out = '', cur = 0;
      events.forEach(function (ev) {
        if (ev.pos < cur) return;
        out += ui.linkWords(p.slice(cur, ev.pos));
        if (ev.mark) {
          out += '<mark class="ev" data-q="' + ev.qid + '">' + ui.linkWords(p.slice(ev.pos, ev.end)) + '</mark>';
          cur = ev.end;
        } else {
          out += ev.html;
          cur = ev.pos;
        }
      });
      out += ui.linkWords(p.slice(cur));
      return out;
    }

    function optionHtml(q, i) {
      var letter = ['A', 'B', 'C', 'D'][i];
      var cls = 'opt';
      if (showAnswer()) {
        if (i === q.answer) cls += ' correct';
        if (answers[q.id] === i && i !== q.answer) cls += ' wrong';
      } else if (answers[q.id] === i) {
        cls += ' sel';
      }
      return '<button class="' + cls + '" data-q="' + q.id + '" data-i="' + i + '"' + (showAnswer() ? ' disabled' : '') + '>' +
        '<span class="opt-key">' + letter + '</span><span>' + esc(q.options[i]) + '</span></button>';
    }

    function questionHtml() {
      return set.questions.map(function (q, idx) {
        var isWrong = review && wrongIds.indexOf(q.id) >= 0;
        var explain = showAnswer()
          ? '<div class="explain"><div class="ex-row"><span class="ex-label">答案</span><strong>' + ['A', 'B', 'C', 'D'][q.answer] + '</strong></div>' +
          '<p>' + esc(q.explain) + '</p>' +
          '<div class="ex-evidence">' + icon('target') + '<span>定位句已在左侧高亮</span></div></div>'
          : '';
        return '<div class="qcard' + (isWrong ? ' wrong' : '') + '" data-qid="' + q.id + '">' +
          '<div class="q-head"><span class="q-no' + (isWrong ? ' bad' : '') + '" data-jump="' + q.id + '" title="跳到原文对应句">' + (idx + 1) + '</span><p class="q-stem">' + esc(q.stem) + '</p></div>' +
          '<div class="opts">' + q.options.map(function (o, i) { return optionHtml(q, i); }).join('') + '</div>' +
          explain + '</div>';
      }).join('');
    }

    function resultBanner() {
      if (!submitted) return '';
      var pct = Math.round((result.score / result.total) * 100);
      return '<div class="result-banner ' + (pct >= 80 ? 'ok' : pct >= 60 ? 'mid' : 'bad') + '">' +
        '<div class="rb-score"><strong>' + result.score + '</strong><span>/ ' + result.total + '</span></div>' +
        '<div class="rb-text"><h3>答对 ' + result.score + ' 题 · ' + pct + '%</h3>' +
        '<p>用时 ' + ui.mmss(elapsed) + ' · ' + (result.score === result.total ? '全对，状态极佳' : '错题已加入错题本') + '</p></div>' +
        '<div class="rb-actions"><button class="btn btn-ghost" data-retry>' + icon('rotate') + '重做</button>' +
        '<a class="btn btn-primary" href="#/reading">返回列表</a></div>' +
        '</div>';
    }

    function reviewBanner() {
      if (!review) return '';
      return '<div class="result-banner mid">' +
        '<div class="rb-text"><h3>错题回顾 · ' + wrongIds.length + ' 道</h3>' +
        '<p>红色题号是之前做错的题；左侧文章里带数字的句子是对应题的定位句。</p></div>' +
        '<div class="rb-actions"><a class="btn btn-primary" href="#/reading/' + set.id + '">' + icon('rotate') + '重做本篇</a>' +
        '<a class="btn btn-ghost" href="#/mistakes">返回错题本</a></div>' +
        '</div>';
    }

    function shell() {
      return '<div class="runner">' +
        '<div class="runner-top">' +
        '<a class="back-link" href="' + (review ? '#/mistakes' : '#/reading') + '">' + icon('arrowLeft') + (review ? '错题本' : '阅读') + '</a>' +
        '<h1 class="runner-title">' + esc(set.title) + '</h1>' +
        '<span class="chip chip-type">' + esc(review ? '错题回顾' : set.type) + '</span>' +
        '<div class="runner-right">' +
        (review ? '' : '<span class="timer" id="timer">' + icon('clock') + ui.mmss(elapsed) + '</span>') +
        (submitted || review ? '' : '<button class="btn btn-primary" data-submit>交卷</button>') +
        '</div></div>' +
        reviewBanner() +
        resultBanner() +
        '<div class="reading-grid">' +
        '<article class="passage card" id="passage">' + passageHtml() + '</article>' +
        '<div class="questions">' + questionHtml() + '</div>' +
        '</div></div>';
    }

    function bind(root) {
      if (!showAnswer()) {
        root.querySelectorAll('.opt').forEach(function (b) {
          b.addEventListener('click', function () {
            answers[b.getAttribute('data-q')] = +b.getAttribute('data-i');
            root.querySelectorAll('.opt[data-q="' + b.getAttribute('data-q') + '"]').forEach(function (x) { x.classList.remove('sel'); });
            b.classList.add('sel');
            updateSubmitState(root);
          });
        });
      } else {
        root.querySelectorAll('.q-head').forEach(function (h) {
          h.addEventListener('click', function () {
            jumpToQ(root, h.parentNode.getAttribute('data-qid'), false);
          });
        });
        root.querySelectorAll('[data-jump]').forEach(function (b) {
          b.addEventListener('click', function (e) {
            e.stopPropagation();
            jumpToQ(root, b.getAttribute('data-jump'), false);
          });
        });
      }
      root.querySelectorAll('.q-mark').forEach(function (m) {
        m.addEventListener('click', function () {
          var card = root.querySelector('.qcard[data-qid="' + m.getAttribute('data-q') + '"]');
          if (card) {
            scrollToTarget(card, true);
            card.classList.remove('pulse');
            void card.offsetWidth;
            card.classList.add('pulse');
          }
        });
      });
      var submitBtn = root.querySelector('[data-submit]');
      if (submitBtn) submitBtn.addEventListener('click', function () { trySubmit(root); });
      var retry = root.querySelector('[data-retry]');
      if (retry) retry.addEventListener('click', function () { retryAll(root); });
    }

    function updateSubmitState(root) {
      var btn = root.querySelector('[data-submit]');
      if (!btn) return;
      var done = Object.keys(answers).length;
      btn.textContent = done + ' / ' + set.questions.length + ' · 交卷';
    }

    function trySubmit(root) {
      var missing = set.questions.length - Object.keys(answers).length;
      if (missing > 0) {
        ui.modal({
          title: '还有题目未作答', body: '<p>还有 <strong>' + missing + '</strong> 题没有选择，确定要交卷吗？</p>',
          okText: '仍然交卷', onOk: function () { doSubmit(root); }
        });
        return;
      }
      doSubmit(root);
    }

    function doSubmit(root) {
      var score = 0;
      set.questions.forEach(function (q) {
        if (answers[q.id] === q.answer) score += 1;
        else A.core.wrongQuestion(q.id, 'reading', set.id, {
          stem: q.stem,
          answer: ['A', 'B', 'C', 'D'][q.answer] + '. ' + q.options[q.answer],
          explain: q.explain,
          title: set.title,
          type: set.type
        });
      });
      elapsed = Math.round((Date.now() - startedAt) / 1000);
      if (interval) { clearInterval(interval); interval = null; }
      A.core.recordSet('reading', set.id, score, set.questions.length);
      result = { score: score, total: set.questions.length };
      submitted = true;
      render(root);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function retryAll(root) {
      answers = {};
      submitted = false;
      result = null;
      elapsed = 0;
      startedAt = Date.now();
      render(root);
      startTimer(root);
    }

    function render(root) {
      root.innerHTML = storageBanner() + shell();
      bind(root);
    }

    function startTimer(root) {
      if (interval) clearInterval(interval);
      interval = setInterval(function () {
        var t = root.querySelector('#timer');
        if (!t) return;
        elapsed = Math.round((Date.now() - startedAt) / 1000);
        t.innerHTML = icon('clock') + ui.mmss(elapsed);
      }, 1000);
    }

    return {
      html: '',
      mount: function (root) {
        render(root);
        if (!review) startTimer(root);
        bindWordPopover(root);
        if (ctx.query && ctx.query.q) {
          var target = ctx.query.q;
          setTimeout(function () { jumpToQ(root, target, true); }, 250);
        }
      },
      destroy: function () { if (interval) { clearInterval(interval); interval = null; } }
    };
  };

  /* ================= 选词填空 ================= */
  views.clozeRunner = function (ctx) {
    var set = (window.CET4_CLOZE || []).filter(function (x) { return x.id === ctx.params.id; })[0];
    var interval = null;
    if (!set) {
      return { html: pageHead('题目不存在', '回到阅读列表重新选择') + '<a class="btn btn-primary" href="#/reading">返回阅读</a>' };
    }

    var root = null;
    var answers = {};
    var submitted = false;
    var startedAt = Date.now();
    var elapsed = 0;
    var activeBlank = null;

    function bankItem(k) {
      for (var i = 0; i < set.bank.length; i++) if (set.bank[i].k === k) return set.bank[i];
      return null;
    }
    function blankDef(no) {
      for (var i = 0; i < set.blanks.length; i++) if (set.blanks[i].no === no) return set.blanks[i];
      return null;
    }
    function usedAt(k) {
      for (var key in answers) if (answers[key] === k) return +key;
      return 0;
    }
    function filledCount() { return Object.keys(answers).length; }

    function blankHtml(no) {
      var letter = answers[no];
      var cls = 'cloze-blank';
      if (!submitted && activeBlank === no) cls += ' active';
      if (submitted) {
        cls += answers[no] === blankDef(no).answer ? ' correct' : ' wrong';
      }
      var label = letter ? bankItem(letter).w : '';
      return '<button class="' + cls + '" data-blank="' + no + '"' + (submitted ? ' disabled' : '') + '>' +
        '<span class="cb-no">' + no + '</span><span class="cb-word">' + esc(label) + '</span></button>';
    }

    function passageHtml() {
      return set.passage.split(/\n{2,}/).map(function (p) {
        var segs = p.split(/(\{\{\d+\}\})/);
        var inner = segs.map(function (s) {
          var m = /^\{\{(\d+)\}\}$/.exec(s);
          return m ? blankHtml(+m[1]) : ui.linkWords(s);
        }).join('');
        return '<p>' + inner + '</p>';
      }).join('');
    }

    function bankHtml() {
      return set.bank.map(function (item) {
        var used = usedAt(item.k);
        var cls = 'bank-word';
        if (used) cls += ' used';
        if (submitted) cls += ' locked';
        return '<button class="' + cls + '" data-word="' + item.k + '"' + (submitted ? ' disabled' : '') + '>' +
          '<span class="bw-key">' + item.k + '</span>' +
          '<span class="bw-main"><strong>' + esc(item.w) + '</strong><span>' + esc(item.pos) + '</span></span>' +
          '</button>';
      }).join('');
    }

    function topBar() {
      return '<div class="runner-top">' +
        '<a class="back-link" href="#/reading">' + icon('arrowLeft') + '阅读</a>' +
        '<h1 class="runner-title">' + esc(set.title) + '</h1>' +
        '<span class="chip chip-type">选词填空</span>' +
        '<div class="runner-right">' +
        '<span class="timer" id="timer">' + icon('clock') + ui.mmss(elapsed) + '</span>' +
        (submitted ? '' : '<button class="btn btn-primary" data-submit>交卷</button>') +
        '</div></div>';
    }

    function answerShell() {
      return '<div class="runner">' + topBar() +
        '<div class="reading-grid cloze-grid">' +
        '<article class="card passage cloze-passage" id="passage">' + passageHtml() + '</article>' +
        '<div class="cloze-side">' +
        '<section class="card bank-card">' +
        '<div class="section-head"><div><h2>备选词</h2><p>先点空格，再点下面的单词</p></div>' +
        '<span class="wc" id="progress">' + filledCount() + ' / ' + set.blanks.length + '</span></div>' +
        '<div class="bank" id="bank">' + bankHtml() + '</div>' +
        '</section>' +
        '<section class="card mini-tip">' +
        '<h3>' + icon('sparkles') + '选词填空技巧</h3>' +
        '<ul><li>先通读全文，判断每个空要填名词、动词还是形容词。</li>' +
        '<li>注意词形：空格前有 a / the，多半填名词；有 be 动词，多半填形容词。</li>' +
        '<li>先做最有把握的空，用排除法缩小范围。</li></ul>' +
        '</section>' +
        '</div></div></div>';
    }

    function resultShell() {
      var score = 0;
      set.blanks.forEach(function (b) { if (answers[b.no] === b.answer) score += 1; });
      var rows = set.blanks.map(function (b) {
        var mine = answers[b.no];
        var ok = mine === b.answer;
        var item = bankItem(b.answer);
        return '<div class="cloze-res ' + (ok ? 'ok' : 'bad') + '">' +
          '<span class="cr-no">' + b.no + '</span>' +
          '<div class="cr-body"><div class="cr-ans">' + icon(ok ? 'check' : 'x') +
          '<strong>' + b.answer + '. ' + esc(item.w) + '</strong>' +
          '<span class="cr-mine">' + (ok ? '你的选择正确' : '你选了 ' + (mine ? mine + '. ' + esc(bankItem(mine).w) : '空着')) + '</span></div>' +
          '<p>' + esc(b.explain) + '</p></div></div>';
      }).join('');
      return '<div class="runner">' + topBar() +
        '<div class="reading-grid cloze-grid">' +
        '<article class="card passage cloze-passage" id="passage">' + passageHtml() + '</article>' +
        '<div class="cloze-side">' +
        '<section class="card cloze-result">' +
        '<div class="section-head"><div><h2>答对 ' + score + ' / ' + set.blanks.length + '</h2>' +
        '<p>用时 ' + ui.mmss(elapsed) + ' · 错题已加入错题本</p></div>' +
        '<button class="btn btn-ghost small" data-retry>' + icon('rotate') + '重做</button></div>' +
        '<div class="cloze-res-list">' + rows + '</div>' +
        '</section>' +
        '</div></div></div>';
    }

    function bindAnswer() {
      root.querySelectorAll('[data-blank]').forEach(function (b) {
        b.addEventListener('click', function () {
          if (submitted) return;
          var no = +b.getAttribute('data-blank');
          if (answers[no]) { delete answers[no]; activeBlank = no; }
          else activeBlank = (activeBlank === no ? null : no);
          paint();
        });
      });
      root.querySelectorAll('[data-word]').forEach(function (b) {
        b.addEventListener('click', function () {
          if (submitted) return;
          var k = b.getAttribute('data-word');
          var target = activeBlank;
          if (!target) {
            for (var n = 1; n <= set.blanks.length; n++) {
              if (!answers[n]) { target = n; break; }
            }
          }
          if (!target) { ui.toast('先点一个空格，再选单词'); return; }
          var prev = usedAt(k);
          if (prev && prev !== target) delete answers[prev];
          answers[target] = k;
          activeBlank = null;
          paint();
        });
      });
    }

    function paint() {
      var p = root.querySelector('#passage');
      if (p) p.innerHTML = passageHtml();
      var bank = root.querySelector('#bank');
      if (bank) bank.innerHTML = bankHtml();
      var prog = root.querySelector('#progress');
      if (prog) prog.textContent = filledCount() + ' / ' + set.blanks.length;
      bindAnswer();
    }

    function trySubmit() {
      var missing = set.blanks.length - filledCount();
      if (missing > 0) {
        ui.modal({
          title: '还有空格没选', body: '<p>还有 <strong>' + missing + '</strong> 个空没填，确定交卷吗？</p>',
          okText: '仍然交卷', onOk: doSubmit
        });
        return;
      }
      doSubmit();
    }

    function doSubmit() {
      var score = 0;
      set.blanks.forEach(function (b) {
        if (answers[b.no] === b.answer) score += 1;
        else {
          A.core.wrongQuestion(set.id + '-b' + b.no, 'cloze', set.id, {
            stem: '选词填空 · 第 ' + b.no + ' 空',
            answer: b.answer + '. ' + bankItem(b.answer).w,
            explain: b.explain,
            title: set.title,
            type: '选词填空'
          });
        }
      });
      elapsed = Math.round((Date.now() - startedAt) / 1000);
      if (interval) { clearInterval(interval); interval = null; }
      A.core.recordSet('reading', set.id, score, set.blanks.length, elapsed);
      submitted = true;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function retryAll() {
      answers = {};
      submitted = false;
      activeBlank = null;
      elapsed = 0;
      startedAt = Date.now();
      render();
      startTimer();
    }

    function render() {
      root.innerHTML = storageBanner() + (submitted ? resultShell() : answerShell());
      bindAnswer();
      bindWordPopover(root);
      var sb = root.querySelector('[data-submit]');
      if (sb) sb.addEventListener('click', trySubmit);
      var retry = root.querySelector('[data-retry]');
      if (retry) retry.addEventListener('click', retryAll);
      var t = root.querySelector('#timer');
      if (t) t.innerHTML = icon('clock') + ui.mmss(elapsed);
    }

    function startTimer() {
      if (interval) clearInterval(interval);
      interval = setInterval(function () {
        if (submitted) return;
        elapsed = Math.round((Date.now() - startedAt) / 1000);
        var t = root.querySelector('#timer');
        if (t) t.innerHTML = icon('clock') + ui.mmss(elapsed);
      }, 1000);
    }

    return {
      html: '',
      mount: function (r) { root = r; render(); startTimer(); },
      destroy: function () { if (interval) { clearInterval(interval); interval = null; } }
    };
  };

  /* ================= 长篇匹配 ================= */
  views.matchingRunner = function (ctx) {
    var set = (window.CET4_MATCHING || []).filter(function (x) { return x.id === ctx.params.id; })[0];
    var interval = null;
    if (!set) {
      return { html: pageHead('题目不存在', '回到阅读列表重新选择') + '<a class="btn btn-primary" href="#/reading">返回阅读</a>' };
    }

    var root = null;
    var answers = {};
    var submitted = false;
    var startedAt = Date.now();
    var elapsed = 0;

    function letters() { return set.paragraphs.map(function (p) { return p.k; }); }
    function paraText(k) {
      for (var i = 0; i < set.paragraphs.length; i++) if (set.paragraphs[i].k === k) return set.paragraphs[i].text;
      return '';
    }
    function filledCount() { return Object.keys(answers).length; }

    function paragraphsHtml() {
      return set.paragraphs.map(function (p) {
        return '<div class="para" id="para-' + p.k + '">' +
          '<span class="para-key">' + p.k + '</span>' +
          '<p>' + ui.linkWords(p.text) + '</p></div>';
      }).join('');
    }

    function statementsHtml() {
      return set.statements.map(function (st, i) {
        var mine = answers[st.id] || '';
        var cls = 'stmt' + (submitted ? (mine === st.answer ? ' ok' : ' bad') : '');
        var opts = '<option value="">—</option>' + letters().map(function (k) {
          return '<option value="' + k + '"' + (mine === k ? ' selected' : '') + '>' + k + '</option>';
        }).join('');
        var result = submitted
          ? '<div class="stmt-result">' +
            '<span class="sr-ans">' + icon(mine === st.answer ? 'check' : 'x') + '答案 ' + st.answer + '</span>' +
            '<p>' + esc(st.explain) + '</p></div>'
          : '';
        return '<div class="stmt" data-stmt="' + st.id + '">' +
          '<span class="stmt-no">' + (i + 1) + '</span>' +
          '<div class="stmt-body">' +
          '<p class="stmt-text">' + esc(st.text) + '</p>' + result +
          '</div>' +
          '<select class="stmt-select" data-select="' + st.id + '"' + (submitted ? ' disabled' : '') + '>' + opts + '</select>' +
          '</div>';
      }).join('');
    }

    function topBar() {
      return '<div class="runner-top">' +
        '<a class="back-link" href="#/reading">' + icon('arrowLeft') + '阅读</a>' +
        '<h1 class="runner-title">' + esc(set.title) + '</h1>' +
        '<span class="chip chip-type">长篇匹配</span>' +
        '<div class="runner-right">' +
        '<span class="timer" id="timer">' + icon('clock') + ui.mmss(elapsed) + '</span>' +
        (submitted ? '' : '<button class="btn btn-primary" data-submit>交卷</button>') +
        '</div></div>';
    }

    function shell() {
      var score = 0;
      set.statements.forEach(function (st) { if (answers[st.id] === st.answer) score += 1; });
      var banner = submitted
        ? '<div class="result-banner ' + (score >= 8 ? 'ok' : score >= 5 ? 'mid' : 'bad') + '">' +
          '<div class="rb-score"><strong>' + score + '</strong><span>/ ' + set.statements.length + '</span></div>' +
          '<div class="rb-text"><h3>匹配正确 ' + score + ' 题</h3><p>用时 ' + ui.mmss(elapsed) + ' · 点题号可跳到对应段落</p></div>' +
          '<div class="rb-actions"><button class="btn btn-ghost" data-retry>' + icon('rotate') + '重做</button>' +
          '<a class="btn btn-primary" href="#/reading">返回列表</a></div></div>'
        : '';

      return '<div class="runner">' + topBar() + banner +
        '<div class="matching-grid">' +
        '<article class="card matching-passage"><div class="src-head">' + icon('file') + '<span>原文 · ' + set.paragraphs.length + ' 段</span></div>' +
        paragraphsHtml() + '</article>' +
        '<div class="matching-statements">' +
        '<div class="section-head"><div><h2>题目</h2><p>为每句话选择对应的段落字母</p></div>' +
        '<span class="wc" id="progress">' + filledCount() + ' / ' + set.statements.length + '</span></div>' +
        statementsHtml() +
        '</div></div></div>';
    }

    function bind() {
      root.querySelectorAll('[data-select]').forEach(function (sel) {
        sel.addEventListener('change', function () {
          answers[sel.getAttribute('data-select')] = sel.value;
          var prog = root.querySelector('#progress');
          if (prog) prog.textContent = filledCount() + ' / ' + set.statements.length;
        });
      });
      root.querySelectorAll('.stmt-text').forEach(function (p) {
        p.addEventListener('click', function () {
          var row = p.closest('.stmt');
          var id = row.getAttribute('data-stmt');
          var target = submitted ? (set.statements.filter(function (s) { return s.id === id; })[0] || {}).answer : answers[id];
          if (!target) return;
          var el = root.querySelector('#para-' + target);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.remove('flash');
            void el.offsetWidth;
            el.classList.add('flash');
          }
        });
      });
      var sb = root.querySelector('[data-submit]');
      if (sb) sb.addEventListener('click', trySubmit);
      var retry = root.querySelector('[data-retry]');
      if (retry) retry.addEventListener('click', retryAll);
    }

    function trySubmit() {
      var missing = set.statements.length - filledCount();
      if (missing > 0) {
        ui.modal({
          title: '还有题目没选', body: '<p>还有 <strong>' + missing + '</strong> 题没选段落，确定交卷吗？</p>',
          okText: '仍然交卷', onOk: doSubmit
        });
        return;
      }
      doSubmit();
    }

    function doSubmit() {
      var score = 0;
      set.statements.forEach(function (st) {
        if (answers[st.id] === st.answer) score += 1;
        else {
          A.core.wrongQuestion(st.id, 'matching', set.id, {
            stem: st.text,
            answer: st.answer,
            explain: st.explain,
            title: set.title,
            type: '长篇匹配'
          });
        }
      });
      elapsed = Math.round((Date.now() - startedAt) / 1000);
      if (interval) { clearInterval(interval); interval = null; }
      A.core.recordSet('reading', set.id, score, set.statements.length, elapsed);
      submitted = true;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function retryAll() {
      answers = {};
      submitted = false;
      elapsed = 0;
      startedAt = Date.now();
      render();
      startTimer();
    }

    function render() {
      root.innerHTML = storageBanner() + shell();
      bind();
      bindWordPopover(root);
      var t = root.querySelector('#timer');
      if (t) t.innerHTML = icon('clock') + ui.mmss(elapsed);
    }

    function startTimer() {
      if (interval) clearInterval(interval);
      interval = setInterval(function () {
        if (submitted) return;
        elapsed = Math.round((Date.now() - startedAt) / 1000);
        var t = root.querySelector('#timer');
        if (t) t.innerHTML = icon('clock') + ui.mmss(elapsed);
      }, 1000);
    }

    return {
      html: '',
      mount: function (r) { root = r; render(); startTimer(); },
      destroy: function () { if (interval) { clearInterval(interval); interval = null; } }
    };
  };

  /* ================= 听力 ================= */
  views.listening = function () {
    var sets = window.CET4_LISTENING || [];
    var cards = sets.map(function (set) {
      var att = A.core.attempt('listening', set.id);
      var status = att ? '<span class="chip status-ok">已完成 ' + att.best + ' / ' + att.total + '</span>' : '<span class="chip">未开始</span>';
      return '<article class="set-card">' +
        '<div class="set-top"><span class="chip chip-type">' + esc(set.type) + '</span>' + status + '</div>' +
        '<h3>' + esc(set.title) + '</h3>' +
        '<p class="set-intro">' + esc(set.intro) + '</p>' +
        '<div class="set-meta"><span>' + icon('headphones') + set.questions.length + ' 题</span>' +
        '<span>' + icon('clock') + '约 ' + Math.ceil(set.seconds / 60) + ' 分钟</span>' +
        '<span class="dot">' + esc(set.level) + '</span></div>' +
        '<a class="btn btn-soft" href="#/listening/' + set.id + '">' + (att ? '再听一遍' : '开始练习') + icon('arrowRight') + '</a>' +
        '</article>';
    }).join('');

    var tip = '<div class="banner tip">' + icon('headphones') +
      '<div><strong>关于音频</strong><span>练习音频由浏览器语音合成朗读，音色取决于系统。正式备考建议配合真题音频精听。</span></div></div>';

    return {
      html: pageHead('听力', '长对话 · 听力篇章 · 原文精听') + tip +
        (cards ? '<div class="set-grid">' + cards + '</div>' : emptyState('headphones', '还没有听力题', '在 assets/js/data/content.js 中添加题目即可'))
    };
  };

  views.listeningRunner = function (ctx) {
    var set = (window.CET4_LISTENING || []).filter(function (x) { return x.id === ctx.params.id; })[0];
    var interval = null;
    if (!set) {
      return { html: pageHead('题目不存在', '回到听力列表重新选择') + '<a class="btn btn-primary" href="#/listening">返回听力</a>' };
    }
    var answers = {};
    var submitted = false;
    var startedAt = Date.now();
    var elapsed = 0;
    var result = null;
    var rate = 1;
    var showText = false;
    var playing = false;

    function clean(text) {
      return text.replace(/^[MW]:\s*/gm, '').trim();
    }
    function turns() {
      return set.transcript.split(/\n{2,}/).map(function (t) { return t.trim(); }).filter(Boolean);
    }

    function transcriptHtml() {
      return turns().map(function (t) {
        var m = /^([MW]):\s*([\s\S]*)$/.exec(t);
        var who = m ? m[1] : '';
        var text = m ? m[2] : t;
        return '<div class="sent">' +
          (who ? '<span class="sent-who">' + who + '</span>' : '') +
          '<button class="mini-play" data-say="' + esc(text) + '" aria-label="播放这句">' + icon('play') + '</button>' +
          '<span class="sent-text">' + esc(text) + '</span></div>';
      }).join('');
    }

    function optionHtml(q, i) {
      var cls = 'opt';
      if (submitted) {
        if (i === q.answer) cls += ' correct';
        if (answers[q.id] === i && i !== q.answer) cls += ' wrong';
      } else if (answers[q.id] === i) cls += ' sel';
      return '<button class="' + cls + '" data-q="' + q.id + '" data-i="' + i + '"' + (submitted ? ' disabled' : '') + '>' +
        '<span class="opt-key">' + ['A', 'B', 'C', 'D'][i] + '</span><span>' + esc(q.options[i]) + '</span></button>';
    }

    function questionHtml() {
      return set.questions.map(function (q, idx) {
        var explain = submitted
          ? '<div class="explain"><div class="ex-row"><span class="ex-label">答案</span><strong>' + ['A', 'B', 'C', 'D'][q.answer] + '</strong></div>' +
          '<p>' + esc(q.explain) + '</p>' +
          '<div class="ex-evidence">' + icon('volume') + '<span>原文：' + esc(q.evidence) + '</span></div></div>'
          : '';
        return '<div class="qcard" data-qid="' + q.id + '">' +
          '<div class="q-head"><span class="q-no">' + (idx + 1) + '</span><p class="q-stem">' + esc(q.stem) + '</p></div>' +
          '<div class="opts">' + q.options.map(function (o, i) { return optionHtml(q, i); }).join('') + '</div>' +
          explain + '</div>';
      }).join('');
    }

    function resultBanner() {
      if (!submitted) return '';
      var pct = Math.round((result.score / result.total) * 100);
      return '<div class="result-banner ' + (pct >= 80 ? 'ok' : pct >= 60 ? 'mid' : 'bad') + '">' +
        '<div class="rb-score"><strong>' + result.score + '</strong><span>/ ' + result.total + '</span></div>' +
        '<div class="rb-text"><h3>答对 ' + result.score + ' 题 · ' + pct + '%</h3>' +
        '<p>用时 ' + ui.mmss(elapsed) + ' · ' + (result.score === result.total ? '全对，状态极佳' : '错题已加入错题本') + '</p></div>' +
        '<div class="rb-actions"><button class="btn btn-ghost" data-retry>' + icon('rotate') + '重做</button>' +
        '<a class="btn btn-primary" href="#/listening">返回列表</a></div>' +
        '</div>';
    }

    function shell() {
      return '<div class="runner">' +
        '<div class="runner-top">' +
        '<a class="back-link" href="#/listening">' + icon('arrowLeft') + '听力</a>' +
        '<h1 class="runner-title">' + esc(set.title) + '</h1>' +
        '<span class="chip chip-type">' + esc(set.type) + '</span>' +
        '<div class="runner-right">' +
        '<span class="timer" id="timer">' + icon('clock') + ui.mmss(elapsed) + '</span>' +
        (submitted ? '' : '<button class="btn btn-primary" data-submit>交卷</button>') +
        '</div></div>' +
        resultBanner() +
        '<div class="listening-layout">' +
        '<aside class="listening-side">' +
        '<div class="player card">' +
        '<button class="play-btn" id="play" aria-label="播放">' + icon('play') + '</button>' +
        '<div class="player-info"><strong>' + esc(set.title) + '</strong><span>' + esc(set.type) + ' · 约 ' + set.seconds + ' 秒</span></div>' +
        '<div class="rate-group">' +
        '<button class="rate' + (rate === 0.85 ? ' on' : '') + '" data-rate="0.85">0.85×</button>' +
        '<button class="rate' + (rate === 1 ? ' on' : '') + '" data-rate="1">1×</button>' +
        '</div>' +
        '<button class="btn btn-ghost small" id="toggle-text">' + (showText ? '隐藏原文' : '显示原文') + '</button>' +
        '</div>' +
        '<div class="transcript card" id="transcript"' + (showText ? '' : ' hidden') + '>' +
        '<div class="tr-head">' + icon('file') + '<span>原文精听 · 点击句子逐句播放</span></div>' +
        transcriptHtml() + '</div>' +
        '</aside>' +
        '<div class="questions">' + questionHtml() + '</div>' +
        '</div></div>';
    }

    function bind(root) {
      if (!submitted) {
        root.querySelectorAll('.opt').forEach(function (b) {
          b.addEventListener('click', function () {
            answers[b.getAttribute('data-q')] = +b.getAttribute('data-i');
            root.querySelectorAll('.opt[data-q="' + b.getAttribute('data-q') + '"]').forEach(function (x) { x.classList.remove('sel'); });
            b.classList.add('sel');
            var btn = root.querySelector('[data-submit]');
            if (btn) btn.textContent = Object.keys(answers).length + ' / ' + set.questions.length + ' · 交卷';
          });
        });
      }
      var play = root.querySelector('#play');
      if (play) play.addEventListener('click', function () { if (playing) stop() ; else playAll(root); });
      root.querySelectorAll('[data-rate]').forEach(function (b) {
        b.addEventListener('click', function () {
          rate = parseFloat(b.getAttribute('data-rate'));
          root.querySelectorAll('[data-rate]').forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on');
        });
      });
      var toggle = root.querySelector('#toggle-text');
      if (toggle) {
        toggle.addEventListener('click', function () {
          showText = !showText;
          var tr = root.querySelector('#transcript');
          if (tr) tr.hidden = !showText;
          toggle.textContent = showText ? '隐藏原文' : '显示原文';
        });
      }
      root.querySelectorAll('.mini-play').forEach(function (b) {
        b.addEventListener('click', function () { ui.tts.speak(b.getAttribute('data-say'), { rate: rate }); });
      });
      var submitBtn = root.querySelector('[data-submit]');
      if (submitBtn) submitBtn.addEventListener('click', function () { trySubmit(root); });
      var retry = root.querySelector('[data-retry]');
      if (retry) retry.addEventListener('click', function () { retryAll(root); });
    }

    function playAll(root) {
      if (!ui.tts.supported) { ui.toast('当前浏览器不支持语音合成，可以点击「显示原文」做题'); return; }
      if (!ui.tts.hasEnglish()) { ui.toast('未检测到英文语音包，朗读效果可能不理想'); }
      var text = clean(set.transcript);
      playing = true;
      var btn = root.querySelector('#play');
      if (btn) { btn.classList.add('playing'); btn.innerHTML = icon('pause'); }
      ui.tts.speak(text, {
        rate: rate,
        onend: function () { playing = false; var b = root.querySelector('#play'); if (b) { b.classList.remove('playing'); b.innerHTML = icon('play'); } }
      });
    }

    function stop() {
      ui.tts.cancel();
      playing = false;
      var b = document.querySelector('#play');
      if (b) { b.classList.remove('playing'); b.innerHTML = icon('play'); }
    }

    function trySubmit(root) {
      var missing = set.questions.length - Object.keys(answers).length;
      if (missing > 0) {
        ui.modal({
          title: '还有题目未作答', body: '<p>还有 <strong>' + missing + '</strong> 题没有选择，确定要交卷吗？</p>',
          okText: '仍然交卷', onOk: function () { doSubmit(root); }
        });
        return;
      }
      doSubmit(root);
    }

    function doSubmit(root) {
      stop();
      var score = 0;
      set.questions.forEach(function (q) {
        if (answers[q.id] === q.answer) score += 1;
        else A.core.wrongQuestion(q.id, 'listening', set.id, {
          stem: q.stem,
          answer: ['A', 'B', 'C', 'D'][q.answer] + '. ' + q.options[q.answer],
          explain: q.explain,
          title: set.title,
          type: set.type
        });
      });
      elapsed = Math.round((Date.now() - startedAt) / 1000);
      if (interval) { clearInterval(interval); interval = null; }
      A.core.recordSet('listening', set.id, score, set.questions.length);
      result = { score: score, total: set.questions.length };
      submitted = true;
      render(root);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function retryAll(root) {
      answers = {};
      submitted = false;
      result = null;
      elapsed = 0;
      startedAt = Date.now();
      showText = false;
      render(root);
      startTimer(root);
    }

    function render(root) {
      root.innerHTML = storageBanner() + shell();
      bind(root);
    }

    function startTimer(root) {
      if (interval) clearInterval(interval);
      interval = setInterval(function () {
        var t = root.querySelector('#timer');
        if (!t) return;
        elapsed = Math.round((Date.now() - startedAt) / 1000);
        t.innerHTML = icon('clock') + ui.mmss(elapsed);
      }, 1000);
    }

    return {
      html: '',
      mount: function (root) {
        render(root);
        startTimer(root);
      },
      destroy: function () {
        if (interval) { clearInterval(interval); interval = null; }
        ui.tts.cancel();
        playing = false;
      }
    };
  };

  /* ================= 翻译增强：AI 回译 / 规则评分 / 错译 SRS ================= */
  function trSrsList() {
    var s = A.core.getState();
    if (!Array.isArray(s.translationSrs)) s.translationSrs = [];
    return s.translationSrs;
  }
  function trSrsDue() {
    var t = A.core.todayStart();
    return trSrsList().filter(function (c) { return c.due <= t; });
  }
  function trMarks(chars, marks, tag) {
    var html = '';
    var open = false;
    chars.forEach(function (ch, i) {
      var miss = !marks[i];
      if (miss && !open) { html += '<' + tag + '>'; open = true; }
      if (!miss && open) { html += '</' + tag + '>'; open = false; }
      html += esc(ch);
    });
    if (open) html += '</' + tag + '>';
    return html;
  }

  /* ================= 翻译 ================= */
  views.translation = function () {
    var sets = window.CET4_TRANSLATION || [];
    var cards = sets.map(function (set) {
      var att = A.core.attempt('translation', set.id);
      var status = !att
        ? '<span class="chip">未开始</span>'
        : att.graded
          ? '<span class="chip status-ok">自评 ' + att.score + ' / 15</span>'
          : '<span class="chip status-due">待自评</span>';
      var zhCount = (set.zh || '').replace(/\s/g, '').length;
      return '<article class="set-card">' +
        '<div class="set-top"><span class="chip chip-type">汉译英</span>' + status + '</div>' +
        '<h3>' + esc(set.title) + '</h3>' +
        '<p class="set-intro">' + esc(set.topic) + ' · 约 ' + zhCount + ' 字</p>' +
        '<div class="set-meta"><span>' + icon('languages') + set.sentences.length + ' 句</span>' +
        '<span>' + icon('clock') + '约 ' + set.minutes + ' 分钟</span>' +
        '<span class="dot">' + esc(set.level) + '</span></div>' +
        '<a class="btn btn-soft" href="#/translation/' + set.id + '">' + (att ? '再练一次' : '开始翻译') + icon('arrowRight') + '</a>' +
        '</article>';
    }).join('');

    var tip = '<div class="banner tip">' + icon('languages') +
      '<div><strong>翻译占 15%（106.5 分）</strong><span>题材集中在传统文化与数字生活。先找主干（谁 + 做了什么），再用从句、分词补修饰；不会的词用简单表达解释，不要留空。</span></div></div>';

    var due = trSrsDue().length;
    var srsBanner = due
      ? '<div class="ts-srs-banner"><div><strong>待复习 ' + due + ' 个表达</strong>' +
      '<p>来自之前翻译时没译出的得分点，按间隔重复排期</p></div>' +
      '<a class="btn btn-primary small" href="#/translation/review">开始复习</a></div>'
      : '';

    return {
      html: pageHead('翻译', '汉译英 · 得分点检查 · 逐句对照') + tip + srsBanner +
        (cards ? '<div class="set-grid">' + cards + '</div>'
          : emptyState('languages', '还没有翻译题', '在 assets/js/data/translation.js 中添加题目即可'))
    };
  };

  views.translationRunner = function (ctx) {
    var set = (window.CET4_TRANSLATION || []).filter(function (x) { return x.id === ctx.params.id; })[0];
    var interval = null;
    if (!set) {
      return { html: pageHead('题目不存在', '回到翻译列表重新选择') + '<a class="btn btn-primary" href="#/translation">返回翻译</a>' };
    }

    var root = null;
    var idx = 0;
    var answers = [];
    var revealed = [];
    var submitted = false;
    var startedAt = Date.now();
    var elapsed = 0;
    var points = [];
    var gradedBand = null;
    var wasGraded = false;
    var saveTimer = null;
    var aiBack = null;
    var aiLoading = false;
    var aiError = '';

    var BANDS = [
      { v: 14, label: '13–15', desc: '完整准确' },
      { v: 11, label: '10–12', desc: '基本完整' },
      { v: 8, label: '7–9', desc: '有遗漏' },
      { v: 5, label: '4–6', desc: '只译出部分' },
      { v: 2, label: '1–3', desc: '难成句' }
    ];

    function wc(s) {
      var m = String(s || '').trim().match(/[A-Za-z][A-Za-z'’-]*/g);
      return m ? m.length : 0;
    }

    function loadDraft() {
      var raw = A.core.getDraft(set.id) || '';
      if (!raw) return;
      try {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr)) { answers = arr; return; }
      } catch (e) { /* 旧格式 */ }
      answers = [raw];
    }

    function persist() {
      A.core.saveDraft(set.id, JSON.stringify(answers));
    }

    function checkPoints(text) {
      var t = ' ' + String(text).toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ') + ' ';
      return (set.keyPoints || []).map(function (p) {
        var hit = p.en.some(function (v) { return t.indexOf(v.toLowerCase()) >= 0; });
        return { zh: p.zh, en: p.en[0], hit: hit };
      });
    }

    function topBar() {
      return '<div class="runner-top">' +
        '<a class="back-link" href="#/translation">' + icon('arrowLeft') + '翻译</a>' +
        '<h1 class="runner-title">' + esc(set.title) + '</h1>' +
        '<span class="chip chip-type">逐句翻译</span>' +
        '<div class="runner-right">' +
        '<span class="timer" id="timer">' + icon('clock') + ui.mmss(elapsed) + '</span>' +
        '</div></div>';
    }

    function dots() {
      return '<div class="ts-dots">' + set.sentences.map(function (s, i) {
        var cls = 'ts-dot';
        if (i === idx) cls += ' on';
        if (revealed[i]) cls += ' done';
        return '<span class="' + cls + '">' + (i + 1) + '</span>';
      }).join('') + '</div>';
    }

    function sentenceView() {
      var s = set.sentences[idx];
      var shown = !!revealed[idx];
      return '<div class="runner">' + topBar() +
        '<div class="ts-wrap">' + dots() +
        '<section class="card ts-card">' +
        '<div class="q-type">第 ' + (idx + 1) + ' 句 / 共 ' + set.sentences.length + ' 句</div>' +
        '<p class="ts-zh">' + esc(s.zh) + '</p>' +
        '<textarea id="ts-answer" class="answer-area ts-area" spellcheck="false" placeholder="Translate this sentence...">' + esc(answers[idx] || '') + '</textarea>' +
        '<div class="ts-actions">' +
        '<span class="wc" id="ts-wc">' + wc(answers[idx]) + ' 词</span>' +
        (shown ? '' : '<button class="btn btn-primary" data-check>' + icon('languages') + '对照参考译文</button>') +
        '</div>' +
        (shown ? '<div class="ts-ref">' +
          '<div class="ts-ref-head">' + icon('languages') + '<span>参考译文</span></div>' +
          '<p class="ts-ref-en">' + esc(s.en) + '</p>' +
          (s.tip ? '<div class="ts-tip">' + icon('sparkles') + '<span>' + esc(s.tip) + '</span></div>' : '') +
          '</div>' : '') +
        '</section>' +
        '<div class="ts-nav">' +
        '<button class="btn btn-ghost" data-prev' + (idx === 0 ? ' disabled' : '') + '>' + icon('arrowLeft') + '上一句</button>' +
        (idx < set.sentences.length - 1
          ? '<button class="btn btn-primary" data-next>下一句' + icon('arrowRight') + '</button>'
          : '<button class="btn btn-primary" data-finish>' + icon('check') + '完成并查看总结</button>') +
        '</div>' +
        '</div></div>';
    }

    function summaryView() {
      var hit = points.filter(function (p) { return p.hit; }).length;
      var total = points.length;
      var text = answers.join(' ').trim();
      var chips = points.map(function (p) {
        return '<span class="kp ' + (p.hit ? 'hit' : 'miss') + '">' +
          (p.hit ? icon('check') : icon('x')) +
          '<span class="kp-zh">' + esc(p.zh) + '</span>' +
          '<em class="kp-en">' + esc(p.en) + '</em></span>';
      }).join('');
      var rows = set.sentences.map(function (s, i) {
        return '<div class="tcmp-row">' +
          '<span class="tcmp-no">' + (i + 1) + '</span>' +
          '<div class="tcmp-body">' +
          '<p class="tcmp-zh">' + esc(s.zh) + '</p>' +
          '<p class="tcmp-mine">你：' + esc((answers[i] || '').trim() || '（未填写）') + '</p>' +
          '<p class="tcmp-en">' + esc(s.en) + '</p>' +
          (s.tip ? '<p class="tcmp-tip">' + icon('sparkles') + esc(s.tip) + '</p>' : '') +
          '</div></div>';
      }).join('');
      var gradeBtns = BANDS.map(function (b) {
        return '<button class="grade-btn' + (gradedBand === b.v ? ' on' : '') + '" data-band="' + b.v + '">' +
          '<strong>' + b.label + '</strong><span>' + b.desc + '</span></button>';
      }).join('');
      var kpLabel = total ? hit + '/' + total : '—';
      var kpBlock = total
        ? '<div class="kp-list">' + chips + '</div>' +
        '<p class="muted small">得分点按常见译法自动匹配；未命中不代表错，只说明没用上这些表达。</p>'
        : '<p class="muted small">这套题暂未标注得分点，按逐句对照自评即可。</p>';

      return '<div class="runner">' + topBar() +
        '<div class="ts-wrap">' +
        '<section class="card trans-result">' +
        '<div class="tr-nums">' +
        '<div><strong>' + kpLabel + '</strong><span>得分点</span></div>' +
        '<div><strong>' + wc(text) + '</strong><span>词数</span></div>' +
        '<div><strong>' + ui.mmss(elapsed) + '</strong><span>用时</span></div>' +
        '</div>' +
        kpBlock +
        '</section>' +
        '<section class="card cmp-card">' +
        '<div class="section-head"><div><h2>逐句对照</h2><p>参考译文不是唯一答案，重点看结构</p></div></div>' +
        rows +
        '</section>' +
        '<section class="card rule-score">' + ruleCard() + '</section>' +
        '<section class="card ai-back-card">' +
        '<div class="section-head"><div><h2>AI 机器回译</h2><p>把你的英文译回中文，看看和原文差多少</p></div></div>' +
        aiBackBlock() +
        '</section>' +
        '<section class="card grade-card">' +
        '<div class="section-head"><div><h2>自评档位</h2><p>满分 15 分，选择后计入今日记录</p></div></div>' +
        '<div class="grade-row">' + gradeBtns + '</div>' +
        '<p class="grade-note" id="grade-note">' + (wasGraded ? '已记录：' + gradedBand + ' 分档，可重新选择。' : '选择后会计入今日学习记录。') + '</p>' +
        '<div class="ts-nav">' + (points.length ? '<button class="btn btn-ghost" data-add-srs>' + icon('bookmark') + '未命中得分点加入复习</button>' : '') +
        '<button class="btn btn-ghost" data-retry>' + icon('rotate') + '重做</button>' +
        '<a class="btn btn-primary" href="#/translation">返回列表</a></div>' +
        '</section>' +
        '</div></div>';
    }

    function ruleStats() {
      var SE = window.SubjectiveEngine;
      var text = answers.join(' ').trim();
      var hit = points.filter(function (p) { return p.hit; }).length;
      var total = points.length;
      var coverage = total ? hit / total : 0;
      var issues = SE ? SE.runRules(text) : [];
      var errs = issues.filter(function (i) { return i.severity === 'error'; }).length;
      var warns = issues.length - errs;
      var refWords = set.sentences.reduce(function (n, s) { return n + wc(s.en); }, 0);
      var words = wc(text);
      var ratio = refWords ? words / refWords : 0;
      var content = total ? Math.round(coverage * 100) : null;
      var language = Math.max(15, 100 - errs * 9 - warns * 3 - (ratio < 0.6 ? 15 : 0));
      var fluency = 55 + (ratio >= 0.8 && ratio <= 1.3 ? 35 : ratio >= 0.6 && ratio <= 1.5 ? 22 : 8);
      if (words / Math.max(1, set.sentences.length) >= 8) fluency += 10;
      fluency = Math.min(100, fluency);
      var markers = (text.match(/\b(which|that|who|whose|because|although|though|when|while|whereas|if|since|as)\b/gi) || []).length;
      var nonFinite = (text.match(/\b(to\s+\w+|by\s+\w+ing|instead\s+of\s+\w+ing)\b/gi) || []).length;
      var variety = Math.min(100, 55 + markers * 5 + nonFinite * 6);
      var totalScore = content === null
        ? Math.round((language * 0.2 + fluency * 0.18 + variety * 0.17) / 0.55)
        : Math.round(content * 0.45 + language * 0.2 + fluency * 0.18 + variety * 0.17);
      var band = SE ? SE.bandOf(totalScore) : (totalScore >= 86 ? 14 : totalScore >= 72 ? 11 : totalScore >= 52 ? 8 : totalScore >= 38 ? 5 : 2);
      var score = SE ? SE.score106(band) : Math.round(band / 15 * 106.5);
      return {
        content: content, language: language, fluency: fluency, variety: variety,
        band: band, score: score, hit: hit, total: total, hasPoints: total > 0
      };
    }

    function ruleCard() {
      var r = ruleStats();
      var dims = [
        ['信息完整', r.hasPoints ? r.content : null],
        ['语言准确', r.language],
        ['表达流畅', r.fluency],
        ['句式多样', r.variety]
      ];
      return '<div class="section-head"><div><h2>规则评分</h2><p>按信息点、语法规则和长度自动估算，用来对照自评</p></div></div>' +
        '<div class="rs-head"><strong>' + r.band + '</strong><span>/ 15 分档</span>' +
        '<em>折合 ' + r.score + ' 分 · ' + (r.hasPoints ? '信息点 ' + r.hit + '/' + r.total : '这套题未标注得分点') + '</em></div>' +
        '<div class="rs-dims">' + dims.map(function (d) {
          var v = d[1];
          return '<div class="rs-dim"><span>' + d[0] + '</span>' +
            '<div class="rs-bar"><i style="width:' + (v == null ? 0 : v) + '%"></i></div>' +
            '<strong>' + (v == null ? '—' : v) + '</strong></div>';
        }).join('') + '</div>' +
        '<p class="muted small">' +
        (r.hasPoints ? '规则引擎估算，用于定位问题，不等同于阅卷分数。'
          : '这套题没有标注得分点，信息完整不参与评分；分数由语言、流畅度和句式三项估算。') +
        '</p>';
    }

    function aiBackBlock() {
      if (aiLoading) {
        return '<div class="ai-loading"><span class="ai-spinner"></span><span>正在调用 DeepSeek 做机器回译…</span></div>';
      }
      if (aiError) {
        return '<div class="ai-err">' + esc(aiError) + '</div>' +
          '<div class="ai-back-actions" style="margin-top:12px">' +
          '<button class="btn btn-primary" data-ai-back>重试</button>' +
          '<button class="btn btn-ghost" data-ai-settings>AI 设置</button></div>';
      }
      if (aiBack) {
        var avg = aiBack.reduce(function (n, it) { return n + it.sim; }, 0) / Math.max(1, aiBack.length);
        var pct = Math.round(avg * 100);
        var tone = pct >= 80 ? 'ok' : pct >= 55 ? 'mid' : 'bad';
        var rows = aiBack.map(function (it, i) {
          var p = Math.round(it.sim * 100);
          return '<div class="ab-row">' +
            '<div class="ab-head"><span class="ab-no">' + (i + 1) + '</span><span class="ab-sim">还原度 ' + p + '%</span></div>' +
            '<div class="ab-cols">' +
            '<div class="ab-col"><span class="ab-label">中文原文（红字没还原）</span><p>' + trMarks(it.cmp.source, it.cmp.sourceMarks, 'del') + '</p></div>' +
            '<div class="ab-col"><span class="ab-label">AI 回译（绿字原文没有）</span><p>' + trMarks(it.cmp.user, it.cmp.userMarks, 'ins') + '</p></div>' +
            '</div></div>';
        }).join('');
        return '<div class="ab-summary ' + tone + '"><div><strong>' + pct + '%</strong><span>平均还原度</span></div>' +
          '<p>' + (tone === 'ok' ? 'AI 把你的英文译回中文后，和原文基本一致，主要信息都译出来了。'
            : tone === 'mid' ? '大部分信息对上了，但有几处意思跑偏或漏译。'
              : 'AI 回译和原文出入较大，建议对照逐句参考译文再看一遍。') + '</p></div>' +
          rows +
          '<div class="ai-back-actions" style="margin-top:12px">' +
          '<button class="btn btn-ghost" data-ai-back>重新回译</button></div>';
      }
      return '<p class="muted small" style="margin-bottom:12px">把这次写的英文交给 DeepSeek 译回中文，再和原文逐句比对：还原度高说明意思传达到了，低说明有漏译或理解偏差。</p>' +
        '<div class="ai-back-actions"><button class="btn btn-primary" data-ai-back>' + icon('languages') + '开始机器回译</button>' +
        '<span class="muted small">约 3–10 秒，会产生少量 API 费用</span></div>';
    }

    function runAIBack() {
      var LLM = window.DeepSeekLLM;
      var SE = window.SubjectiveEngine;
      if (!LLM || !SE) { ui.toast('AI 模块未加载'); return; }
      if (!LLM.isConfigured()) { LLM.settings(function () { runAIBack(); }); return; }
      aiLoading = true;
      aiError = '';
      render();
      var lines = set.sentences.map(function (s, i) {
        return (i + 1) + '. ' + (String(answers[i] || '').trim() || s.en);
      }).join('\n');
      var content = '把下面每句英文翻译成自然、通顺的中文，保持原意，不要解释，不要遗漏信息。\n' + lines +
        '\n\n只输出 JSON：{"translations":["第1句的中文","第2句的中文"]}';
      LLM.chatJSON([
        { role: 'system', content: '你是英译中翻译，只输出 JSON，不要输出其他文字。' },
        { role: 'user', content: content }
      ], { maxTokens: 1000 }).then(function (data) {
        var arr = (data && data.translations) || [];
        aiBack = set.sentences.map(function (s, i) {
          var zh = String(arr[i] || '').trim();
          return { zh: zh, sim: zh ? SE.zhSimilarity(s.zh, zh) : 0, cmp: SE.charDiff(s.zh, zh) };
        });
        aiLoading = false;
        render();
        ui.toast('机器回译完成');
      }).catch(function (err) {
        aiLoading = false;
        aiError = err.message;
        render();
        ui.toast(err.message, 'danger');
      });
    }

    function addSrs() {
      if (!points.length) { ui.toast('这套题没有标注得分点，暂时无法生成复习卡'); return; }
      var list = trSrsList();
      var seen = {};
      list.forEach(function (c) { seen[c.id] = true; });
      var added = 0;
      points.filter(function (p) { return !p.hit; }).forEach(function (p) {
        var id = 't:' + set.id + ':' + p.zh;
        if (seen[id]) return;
        list.push({
          id: id, front: p.zh, back: p.en, context: set.title,
          due: A.core.todayStart(), interval: 0, ease: 2.5, reps: 0, last: 0
        });
        seen[id] = true;
        added += 1;
      });
      A.core.save();
      ui.toast(added ? '已加入 ' + added + ' 张复习卡' : '这次没有未命中的得分点', added ? 'success' : '');
      render();
    }

    function render() {
      root.innerHTML = storageBanner() + (submitted ? summaryView() : sentenceView());
      if (!submitted) {
        var area = root.querySelector('#ts-answer');
        var wcEl = root.querySelector('#ts-wc');
        area.addEventListener('input', function () {
          answers[idx] = area.value;
          wcEl.textContent = wc(area.value) + ' 词';
          if (saveTimer) clearTimeout(saveTimer);
          saveTimer = setTimeout(persist, 400);
        });
        area.focus();
        var check = root.querySelector('[data-check]');
        if (check) check.addEventListener('click', function () {
          if (!(answers[idx] || '').trim()) { ui.toast('先写一句再对照'); return; }
          revealed[idx] = true;
          persist();
          render();
        });
        var prev = root.querySelector('[data-prev]');
        if (prev) prev.addEventListener('click', function () { if (idx > 0) { idx -= 1; render(); } });
        var next = root.querySelector('[data-next]');
        if (next) next.addEventListener('click', function () { idx += 1; render(); });
        var finish = root.querySelector('[data-finish]');
        if (finish) finish.addEventListener('click', finishAll);
      } else {
        root.querySelector('[data-retry]').addEventListener('click', retryAll);
        root.querySelectorAll('[data-band]').forEach(function (b) {
          b.addEventListener('click', function () { chooseBand(+b.getAttribute('data-band')); });
        });
        root.querySelectorAll('[data-ai-back]').forEach(function (b) {
          b.addEventListener('click', runAIBack);
        });
        var aiSet = root.querySelector('[data-ai-settings]');
        if (aiSet) aiSet.addEventListener('click', function () {
          if (window.DeepSeekLLM) window.DeepSeekLLM.settings(function () { runAIBack(); });
        });
        var srsBtn = root.querySelector('[data-add-srs]');
        if (srsBtn) srsBtn.addEventListener('click', addSrs);
      }
      var t = root.querySelector('#timer');
      if (t) t.innerHTML = icon('clock') + ui.mmss(elapsed);
    }

    function finishAll() {
      elapsed = Math.round((Date.now() - startedAt) / 1000);
      points = checkPoints(answers.join(' '));
      var prev = A.core.attempt('translation', set.id);
      wasGraded = !!(prev && prev.graded);
      gradedBand = wasGraded ? prev.score : null;
      A.core.recordSet('translation', set.id, gradedBand || 0, 15, elapsed);
      persist();
      submitted = true;
      if (interval) { clearInterval(interval); interval = null; }
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function chooseBand(v) {
      gradedBand = v;
      wasGraded = true;
      A.core.gradeTranslation(set.id, v);
      root.querySelectorAll('[data-band]').forEach(function (b) {
        b.classList.toggle('on', +b.getAttribute('data-band') === v);
      });
      var note = root.querySelector('#grade-note');
      if (note) note.textContent = '已记录：' + v + ' 分档，可重新选择。';
      ui.toast('已记录自评分数', 'success');
    }

    function retryAll() {
      answers = [];
      revealed = [];
      idx = 0;
      submitted = false;
      points = [];
      elapsed = 0;
      startedAt = Date.now();
      persist();
      render();
      startTimer();
    }

    function startTimer() {
      if (interval) clearInterval(interval);
      interval = setInterval(function () {
        if (submitted) return;
        elapsed = Math.round((Date.now() - startedAt) / 1000);
        var t = root.querySelector('#timer');
        if (t) t.innerHTML = icon('clock') + ui.mmss(elapsed);
      }, 1000);
    }

    return {
      html: '',
      mount: function (r) {
        root = r;
        loadDraft();
        render();
        startTimer();
      },
      destroy: function () {
        if (saveTimer) clearTimeout(saveTimer);
        if (interval) { clearInterval(interval); interval = null; }
      }
    };
  };

  /* ================= 错译表达复习（SRS） ================= */
  views.translationReview = function () {
    var root = null;
    var queue = [];
    var idx = 0;
    var revealed = false;
    var ok = 0;
    var again = {};

    function find(id) {
      var list = trSrsList();
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      return null;
    }

    function start() {
      var due = trSrsDue();
      if (!due.length) {
        root.innerHTML = pageHead('错译复习', '来自翻译里没译出的得分点') +
          emptyState('checkCircle', '没有到期卡片', '去翻译页做完一套，点「未命中得分点加入复习」',
            '<a class="btn btn-primary" href="#/translation">去翻译</a>');
        return;
      }
      queue = due.map(function (c) { return c.id; });
      idx = 0;
      revealed = false;
      ok = 0;
      again = {};
      renderCard();
    }

    function rate(g) {
      var card = find(queue[idx]);
      if (card) {
        if (g === 1) {
          card.interval = 0;
          card.ease = Math.max(1.3, (card.ease || 2.5) - 0.2);
          card.due = A.core.todayStart();
        } else {
          card.ease = Math.min(3, (card.ease || 2.5) + (g === 3 ? 0.1 : -0.05));
          card.interval = card.reps
            ? Math.max(1, Math.round((card.interval || 1) * card.ease))
            : (g === 3 ? 3 : 1);
          card.due = A.core.addDays(A.core.todayStart(), card.interval);
        }
        card.reps = (card.reps || 0) + 1;
        card.last = Date.now();
        A.core.save();
      }
      if (g === 1 && !again[queue[idx]]) {
        again[queue[idx]] = true;
        queue.push(queue[idx]);
      }
      if (g >= 2) ok += 1;
      idx += 1;
      revealed = false;
      renderCard();
    }

    function renderCard() {
      if (idx >= queue.length) return renderDone();
      var card = find(queue[idx]);
      if (!card) { idx += 1; return renderCard(); }
      root.innerHTML = '<div class="runner">' +
        '<div class="runner-top"><a class="back-link" href="#/translation">' + icon('arrowLeft') + '翻译</a>' +
        '<h1 class="runner-title">错译复习</h1><span class="chip chip-type">中译英</span>' +
        '<div class="runner-right"><span class="timer">' + (idx + 1) + ' / ' + queue.length + '</span></div></div>' +
        '<div class="srs-wrap"><section class="card srs-card">' +
        '<span class="srs-tag">得分点</span>' +
        '<h2 class="srs-front">' + esc(card.front) + '</h2>' +
        (card.context ? '<p class="srs-context">' + esc(card.context) + '</p>' : '') +
        (revealed
          ? '<div class="srs-answer"><span class="srs-label">参考表达</span>' +
          '<p class="srs-back">' + esc(card.back) + '</p></div>' +
          '<div class="srs-rate">' +
          '<button class="btn btn-ghost" data-rate="1">忘记</button>' +
          '<button class="btn btn-ghost" data-rate="2">模糊</button>' +
          '<button class="btn btn-primary" data-rate="3">会了</button></div>'
          : '<button class="btn btn-primary" data-show>显示答案</button>') +
        '</section></div></div>';

      var show = root.querySelector('[data-show]');
      if (show) show.addEventListener('click', function () { revealed = true; renderCard(); });
      root.querySelectorAll('[data-rate]').forEach(function (b) {
        b.addEventListener('click', function () { rate(+b.getAttribute('data-rate')); });
      });
    }

    function renderDone() {
      root.innerHTML = '<div class="runner">' +
        '<div class="runner-top"><a class="back-link" href="#/translation">' + icon('arrowLeft') + '翻译</a>' +
        '<h1 class="runner-title">错译复习</h1></div>' +
        '<section class="card srs-done"><div class="srs-big">' + ok + '</div>' +
        '<h2>本轮复习完成</h2>' +
        '<p class="muted">共 ' + queue.length + ' 张卡，答对 ' + ok + ' 张。选「忘记」的卡片今天会再出现一次。</p>' +
        '<div class="ts-nav"><a class="btn btn-primary" href="#/translation">返回翻译</a>' +
        '<button class="btn btn-ghost" data-again>再复习一轮</button></div></section></div>';
      var againBtn = root.querySelector('[data-again]');
      if (againBtn) againBtn.addEventListener('click', start);
    }

    return {
      html: '',
      mount: function (r) {
        root = r;
        start();
      },
      destroy: function () { }
    };
  };

  /* ================= 错题本 ================= */
  views.mistakes = function () {
    var tab = 'words';
    var root = null;

    function render() {
      var s = S();
      var wordIds = Object.keys(s.wrong.words).filter(function (id) { return !!word(id); });
      var qIds = Object.keys(s.wrong.questions);

      var wordsPane = wordIds.length ? wordIds.map(function (id) {
        var w = word(id);
        var entry = s.wrong.words[id];
        var card = s.cards[id];
        return '<div class="mistake-row">' +
          '<div class="mr-main"><strong>' + esc(w.w) + '</strong><span class="w-ipa">' + esc(w.ph) + '</span>' +
          '<span class="w-zh">' + esc(w.zh) + '</span>' +
          '<span class="mr-note">错 ' + entry.count + ' 次 · ' + (card ? (card.due <= A.core.todayStart() ? '今天该复习' : '下次 ' + ui.relDay(card.due)) : '待复习') + '</span></div>' +
          '<button class="icon-btn" data-say="' + esc(w.w) + '" aria-label="朗读">' + icon('volume') + '</button>' +
          '</div>';
      }).join('') : emptyState('checkCircle', '还没有错词', '背单词时答错的词会自动收进这里');

      function findSet(kind, setId) {
        var list = kind === 'cloze' ? (window.CET4_CLOZE || [])
          : kind === 'matching' ? (window.CET4_MATCHING || [])
            : kind === 'listening' ? (window.CET4_LISTENING || [])
              : (window.CET4_READING || []);
        for (var i = 0; i < list.length; i++) {
          if (list[i].id === setId) return list[i];
        }
        return null;
      }

      function questionNo(kind, set, qid) {
        if (!set) return null;
        var i;
        if (kind === 'reading' || kind === 'listening') {
          for (i = 0; i < (set.questions || []).length; i++) {
            if (set.questions[i].id === qid) return i + 1;
          }
        } else if (kind === 'matching') {
          for (i = 0; i < (set.statements || []).length; i++) {
            if (set.statements[i].id === qid) return i + 1;
          }
        } else if (kind === 'cloze') {
          var m = /-b(\d+)$/.exec(qid);
          if (m) return +m[1];
        }
        return null;
      }

      var qEntries = A.core.wrongQuestions();
      var groups = {};
      qEntries.forEach(function (e) {
        var key = (e.kind || 'reading') + '|' + (e.setId || '');
        var g = groups[key];
        if (!g) {
          g = groups[key] = {
            kind: e.kind || 'reading', setId: e.setId,
            title: e.title, type: e.type, last: e.last, items: []
          };
        }
        g.items.push(e);
        if (e.title) g.title = e.title;
        if (e.type) g.type = e.type;
        if (e.last > g.last) g.last = e.last;
      });

      var groupRows = Object.keys(groups).sort(function (a, b) {
        return (groups[b].last || 0) - (groups[a].last || 0);
      }).map(function (key) {
        var g = groups[key];
        var set = findSet(g.kind, g.setId);
        if (set) { g.title = set.title; g.type = set.type; }
        var pairs = g.items.map(function (e) {
          return { no: questionNo(g.kind, set, e.qid), qid: e.qid };
        }).filter(function (x) { return x.no; }).sort(function (a, b) { return a.no - b.no; });
        var route = g.kind === 'cloze' ? 'cloze'
          : g.kind === 'matching' ? 'matching'
            : g.kind === 'listening' ? 'listening' : 'reading';
        var href = '#/' + route + '/' + g.setId + (g.kind === 'reading' ? '?review=1' : '');
        return '<div class="mistake-group">' +
          '<div class="mg-main">' +
          '<div class="mg-top"><span class="chip chip-type">' + esc(g.type || '题目') + '</span>' +
          '<strong>' + esc(g.title || '未命名题目') + '</strong></div>' +
          '<div class="mg-nums">' + pairs.map(function (x) {
            if (g.kind === 'reading') {
              return '<a class="mg-num" href="#/reading/' + g.setId + '?review=1&q=' + encodeURIComponent(x.qid) + '" title="跳到原文对应句">' + x.no + '</a>';
            }
            return '<a class="mg-num" href="' + href + '">' + x.no + '</a>';
          }).join('') + '</div>' +
          '<span class="mr-note">共 ' + g.items.length + ' 道错题 · 最近 ' + ui.relDay(g.last) + '</span>' +
          '</div>' +
          '<a class="btn btn-ghost small" href="' + href + '">' + icon('arrowRight') + '查看整题</a>' +
          '</div>';
      }).join('');

      var questionsPane = groupRows || emptyState('award', '还没有错题', '做完阅读、听力或匹配题，答错的题会自动收进这里');

      var custom = A.core.customList();
      var customPane = '<div class="mistake-actions"><button class="btn btn-primary" data-add-custom>' + icon('pen') + '添加自定义</button></div>' +
        (custom.length ? custom.map(function (item) {
          return '<div class="custom-item">' +
            '<div class="ci-main"><span class="chip">' + (item.kind === 'word' ? '单词' : '笔记') + '</span>' +
            '<strong>' + esc(item.title) + '</strong>' +
            (item.body ? '<p>' + esc(item.body) + '</p>' : '') +
            (item.note ? '<span class="mr-note">' + esc(item.note) + '</span>' : '') +
            '</div>' +
            '<button class="icon-btn" data-del="' + esc(item.id) + '" aria-label="删除">' + icon('trash') + '</button>' +
            '</div>';
        }).join('') : emptyState('pen', '还没有自定义内容', '点「添加自定义」记下易错点、单词或句子'));

      var html = pageHead('错题本', '自动收集 + 自定义') +
        '<div class="tabs">' +
        '<button class="tab' + (tab === 'words' ? ' on' : '') + '" data-tab="words">错词 <span class="tab-num">' + wordIds.length + '</span></button>' +
        '<button class="tab' + (tab === 'questions' ? ' on' : '') + '" data-tab="questions">错题 <span class="tab-num">' + qIds.length + '</span></button>' +
        '<button class="tab' + (tab === 'custom' ? ' on' : '') + '" data-tab="custom">自定义 <span class="tab-num">' + custom.length + '</span></button>' +
        '</div>' +
        '<section class="card">' +
        (tab === 'words'
          ? (wordIds.length ? '<div class="mistake-actions"><button class="btn btn-primary" data-practice>' + icon('rotate') + '去抽查</button></div>' : '') + wordsPane
          : tab === 'questions' ? questionsPane : customPane) +
        '</section>';

      root.innerHTML = html;
      root.querySelectorAll('[data-tab]').forEach(function (b) {
        b.addEventListener('click', function () { tab = b.getAttribute('data-tab'); render(); });
      });
      var practice = root.querySelector('[data-practice]');
      if (practice) practice.addEventListener('click', function () { location.hash = '#/vocab?start=1'; });
      var addCustomBtn = root.querySelector('[data-add-custom]');
      if (addCustomBtn) addCustomBtn.addEventListener('click', openAddCustom);
      root.querySelectorAll('[data-del]').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-del');
          ui.modal({
            title: '删除这条自定义？',
            body: '<p>删除后无法恢复。</p>',
            okText: '删除', danger: true,
            onOk: function () {
              A.core.removeCustom(id);
              render();
              ui.toast('已删除');
            }
          });
        });
      });
      root.querySelectorAll('[data-say]').forEach(function (b) {
        b.addEventListener('click', function () { ui.tts.speak(b.getAttribute('data-say'), { rate: 0.95 }); });
      });
    }

    function openAddCustom() {
      var m = ui.modal({
        title: '添加自定义错题',
        body: '<label class="field"><span class="field-label">标题</span>' +
          '<input class="input" id="cm-title" placeholder="单词 / 题号 / 知识点"></label>' +
          '<label class="field"><span class="field-label">内容</span>' +
          '<textarea class="input" id="cm-body" rows="4" placeholder="正确答案、易错点、自己的理解……"></textarea></label>' +
          '<label class="field"><span class="field-label">备注（可选）</span>' +
          '<input class="input" id="cm-note" placeholder="来源、复习提醒"></label>',
        okText: '保存',
        onOk: function (rootEl) {
          var title = rootEl.querySelector('#cm-title').value.trim();
          var body = rootEl.querySelector('#cm-body').value.trim();
          if (!title || !body) { ui.toast('标题和内容都要填'); return false; }
          A.core.addCustom({ kind: 'note', title: title, body: body, note: rootEl.querySelector('#cm-note').value.trim() });
          ui.toast('已保存', 'success');
          render();
        }
      });
      setTimeout(function () {
        var t = m.root.querySelector('#cm-title');
        if (t) t.focus();
      }, 50);
    }

    function findQuestion(kind, qid) {
      var sets = kind === 'reading' ? (window.CET4_READING || []) : (window.CET4_LISTENING || []);
      for (var i = 0; i < sets.length; i++) {
        for (var j = 0; j < sets[i].questions.length; j++) {
          if (sets[i].questions[j].id === qid) return { q: sets[i].questions[j], set: sets[i] };
        }
      }
      return null;
    }

    return {
      html: '',
      mount: function (r) { root = r; render(); },
      destroy: function () { ui.tts.cancel(); }
    };
  };

  /* ================= 设置 ================= */
  views.settings = function () {
    var s = S();
    var canStore = A.core.storageOK();
    var syncCfg = A.core.syncConfig();
    var syncFmt = function (t) { return t ? new Date(t).toLocaleString() : '—'; };

    var html = pageHead('设置', '学习计划与数据管理') +
      storageBanner() +
      '<div class="grid-2 settings-grid">' +
      '<section class="card">' +
      sectionHead('学习计划', '影响每日任务和倒计时', '') +
      '<div class="form">' +
      field('考试日期', '<input class="input" type="date" id="exam-date" value="' + esc(s.settings.examDate) + '">', '2026 年 12 月 13 日（以准考证为准）') +
      field('每日抽查量', '<input class="input" type="number" id="check-target" min="10" max="200" step="10" value="' + (s.settings.checkTarget || 50) + '">', '默认 50 个，10 个一组；抽查中可以点「+10 个」临时加量') +
      field('外观', '<select class="input" id="theme-mode">' +
        [['auto', '跟随系统'], ['light', '浅色'], ['dark', '深色']].map(function (o) {
          return '<option value="' + o[0] + '"' + ((s.settings.theme || 'auto') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
        }).join('') + '</select>', '深色模式适合夜间复习') +
      field('昵称（可选）', '<input class="input" type="text" id="nickname" maxlength="12" placeholder="首页会这样称呼你" value="' + esc(s.settings.name) + '">', '') +
      '<div class="form-actions"><button class="btn btn-primary" id="save-settings">' + icon('check') + '保存设置</button></div>' +
      '</div>' +
      '</section>' +
      '<section class="card">' +
      sectionHead('数据', '数据保存在本机浏览器', '') +
      '<div class="data-actions">' +
      '<button class="btn btn-ghost" id="export">' + icon('download') + '导出学习数据</button>' +
      '<label class="btn btn-ghost file-btn">' + icon('upload') + '导入数据<input type="file" id="import" accept="application/json" hidden></label>' +
      '<button class="btn btn-danger-ghost" id="reset">' + icon('trash') + '清空全部数据</button>' +
      '</div>' +
      '<div class="storage-state ' + (canStore ? 'ok' : 'bad') + '">' + icon(canStore ? 'checkCircle' : 'alert') +
      '<span>' + (canStore ? '本地存储可用，记录会自动保存' : '本地存储不可用，当前为临时模式') + '</span></div>' +
      '<div class="about">' +
      '<h4>关于</h4>' +
      '<p>四级冲刺 v1.0 · 一期功能的本地版：词汇间隔重复、阅读三题型、听力与翻译练习、错题本、打卡与热力图。</p>' +
      '<p>内置 1500 个四级核心词、3 类阅读题、4 段听力与 4 段翻译，可在 <code>assets/js/data/</code> 中继续扩充；默认只保存在本机，开启云同步后会上传到你的 GitHub 仓库。</p>' +
      '</div>' +
      '</section>' +
      '<section class="card sync-card">' +
      sectionHead('云同步', '两台设备共用一个仓库进度文件', '') +
      '<div class="form">' +
      field('GitHub Token',
        '<input class="input" type="password" id="sync-token" autocomplete="off" placeholder="' +
        (syncCfg.token ? '已保存，重新粘贴可替换' : 'ghp_...') + '">',
        '只保存在本机浏览器；需要 public_repo 权限，在 github.com/settings/tokens 创建') +
      field('自动上传',
        '<label class="checkline"><input type="checkbox" id="sync-auto"' + (syncCfg.auto !== false ? ' checked' : '') + '> 学习记录变化后自动上传（约 6 秒）</label>',
        '关掉后只能手动点「上传本机进度」') +
      '<div class="form-actions"><button class="btn btn-ghost" id="sync-save-token">' + icon('check') + '保存 Token</button></div>' +
      '</div>' +
      '<div class="data-actions">' +
      '<button class="btn btn-primary" id="sync-push">' + icon('upload') + '上传本机进度</button>' +
      '<button class="btn btn-ghost" id="sync-pull">' + icon('download') + '下载云端进度</button>' +
      '</div>' +
      '<div class="storage-state ' + (syncCfg.token ? 'ok' : 'bad') + '" id="sync-state">' +
      icon(syncCfg.token ? 'checkCircle' : 'alert') +
      '<span>' + (syncCfg.token
        ? '已配置 · 自动上传 ' + (syncCfg.auto !== false ? '开' : '关') +
          ' · 上次上传 ' + esc(syncFmt(syncCfg.lastPush)) + ' · 上次下载 ' + esc(syncFmt(syncCfg.lastPull))
        : '未配置 Token，云同步不可用') + '</span></div>' +
      '</section>' +
      '</div>';

    function field(label, control, hint) {
      return '<label class="field"><span class="field-label">' + esc(label) + '</span>' + control +
        (hint ? '<span class="field-hint">' + esc(hint) + '</span>' : '') + '</label>';
    }

    return {
      html: html,
      mount: function (root) {
        root.querySelector('#save-settings').addEventListener('click', function () {
          var st = S();
          var date = root.querySelector('#exam-date').value || A.core.defaultExamDate();
          var ct = parseInt(root.querySelector('#check-target').value, 10);
          st.settings.examDate = date;
          st.settings.checkTarget = Math.max(10, Math.min(200, isNaN(ct) ? 50 : ct));
          st.settings.name = (root.querySelector('#nickname').value || '').trim();
          A.core.save();
          ui.toast('设置已保存', 'success');
        });

        var themeSel = root.querySelector('#theme-mode');
        if (themeSel) themeSel.addEventListener('change', function () {
          A.core.setThemeMode(themeSel.value);
          if (A.app && A.app.refreshTheme) A.app.refreshTheme();
          ui.toast('外观已切换', 'success');
        });

        root.querySelector('#export').addEventListener('click', function () {
          var blob = new Blob([A.core.exportJSON()], { type: 'application/json' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'cet4-sprint-' + A.core.dateKey(Date.now()) + '.json';
          document.body.appendChild(a);
          a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
        });

        var file = root.querySelector('#import');
        file.addEventListener('change', function () {
          var f = file.files && file.files[0];
          if (!f) return;
          var reader = new FileReader();
          reader.onload = function () {
            try {
              A.core.importJSON(String(reader.result));
              ui.toast('数据已导入', 'success');
              setTimeout(function () { location.reload(); }, 600);
            } catch (e) {
              ui.toast('导入失败：文件格式不正确', 'danger');
            }
          };
          reader.readAsText(f);
        });

        var autoBox = root.querySelector('#sync-auto');
        if (autoBox) autoBox.addEventListener('change', function () {
          A.core.syncSaveConfig({ auto: autoBox.checked });
          ui.toast(autoBox.checked ? '已开启自动上传' : '已关闭自动上传');
        });

        var syncSave = root.querySelector('#sync-save-token');
        if (syncSave) syncSave.addEventListener('click', function () {
          var v = (root.querySelector('#sync-token').value || '').trim();
          if (!v) { ui.toast('先粘贴 GitHub Token'); return; }
          if (!/^(ghp_|github_pat_)/.test(v)) { ui.toast('Token 格式不对'); return; }
          A.core.syncSaveConfig({ token: v });
          ui.toast('Token 已保存', 'success');
          setTimeout(function () { location.reload(); }, 500);
        });

        var syncPushBtn = root.querySelector('#sync-push');
        if (syncPushBtn) syncPushBtn.addEventListener('click', function () {
          if (!A.core.syncConfig().token) { ui.toast('先在设置里保存 Token'); return; }
          ui.toast('正在上传…');
          A.core.syncPush().then(function () {
            ui.toast('已上传到云端', 'success');
            setTimeout(function () { location.reload(); }, 600);
          }).catch(function (e) { ui.toast(e.message || '上传失败', 'danger'); });
        });

        var syncPullBtn = root.querySelector('#sync-pull');
        if (syncPullBtn) syncPullBtn.addEventListener('click', function () {
          ui.toast('正在读取云端…');
          A.core.syncPull().then(function (p) {
            if (!p) { ui.toast('云端还没有进度'); return; }
            ui.modal({
              title: '用云端进度覆盖本机？',
              body: '<p>云端保存时间：' + esc(new Date(p.savedAt).toLocaleString()) + '</p>' +
                '<p class="muted small">本机当前进度会被覆盖，建议先导出备份。</p>',
              okText: '覆盖本机', danger: true,
              onOk: function () {
                A.core.importJSON(JSON.stringify(p.state));
                ui.toast('已同步云端进度', 'success');
                setTimeout(function () { location.reload(); }, 600);
              }
            });
          }).catch(function (e) { ui.toast(e.message || '读取失败', 'danger'); });
        });

        root.querySelector('#reset').addEventListener('click', function () {
          ui.modal({
            title: '清空全部学习数据？',
            body: '<p>词汇进度、错题、打卡记录都会删除，且无法恢复。</p>',
            okText: '确认清空', danger: true,
            onOk: function () {
              A.core.reset();
              ui.toast('已清空');
              setTimeout(function () { location.reload(); }, 500);
            }
          });
        });
      }
    };
  };

  /* ================= 404 ================= */
  views.notFound = function () {
    return {
      html: '<div class="card notfound">' + emptyState('search', '页面不存在', '检查一下地址，或回到首页', '<a class="btn btn-primary" href="#/">回到首页</a>') + '</div>'
    };
  };

  A.views = views;
})(window.App);
