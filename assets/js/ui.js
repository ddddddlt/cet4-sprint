/*
 * UI 基础库：HTML 转义、图标、提示条、弹窗、进度环、热力图、语音合成
 */
window.App = window.App || {};
(function (A) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var ICONS = {
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    headphones: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    alert: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    checkCircle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    pause: '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
    volume: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>',
    rotate: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
    arrowLeft: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    arrowRight: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    trend: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    chevron: '<polyline points="9 18 15 12 9 6"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.7 1.9L21.6 17.6l-1.9.7L19 20.2l-.7-1.9L16.4 17.6l1.9-.7z"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    bar: '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
    award: '<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
    menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
    trendDown: '<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>',
    activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    languages: '<path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/>'
  };

  function icon(name, cls) {
    var body = ICONS[name] || '';
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  }

  /* ---------------- 提示条 ---------------- */
  function toast(msg, tone) {
    var root = document.getElementById('toast-root');
    if (!root) return;
    var el = document.createElement('div');
    el.className = 'toast toast-' + (tone || 'default');
    el.innerHTML = (tone === 'success' ? icon('checkCircle') : tone === 'danger' ? icon('alert') : icon('info')) + '<span>' + esc(msg) + '</span>';
    root.appendChild(el);
    setTimeout(function () { el.classList.add('out'); }, 2300);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 2700);
  }

  /* ---------------- 弹窗 ---------------- */
  function modal(opts) {
    var root = document.getElementById('modal-root');
    if (!root) return;
    var o = opts || {};
    root.innerHTML =
      '<div class="modal-mask">' +
      '<div class="modal" role="dialog" aria-modal="true">' +
      '<div class="modal-head"><h3>' + esc(o.title || '') + '</h3>' +
      '<button class="icon-btn" data-close aria-label="关闭">' + icon('x') + '</button></div>' +
      '<div class="modal-body">' + (o.body || '') + '</div>' +
      '<div class="modal-foot">' +
      (o.cancelText === null ? '' : '<button class="btn btn-ghost" data-close>' + esc(o.cancelText || '取消') + '</button>') +
      '<button class="btn ' + (o.danger ? 'btn-danger' : 'btn-primary') + '" data-ok>' + esc(o.okText || '确定') + '</button>' +
      '</div></div></div>';
    root.classList.add('open');
    function close() { root.classList.remove('open'); root.innerHTML = ''; }
    root.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', close); });
    var ok = root.querySelector('[data-ok]');
    if (ok) ok.addEventListener('click', function () {
      if (o.onOk && o.onOk(root) === false) return;
      close();
    });
    root.querySelector('.modal-mask').addEventListener('click', function (e) {
      if (e.target === e.currentTarget) close();
    });
    return { close: close, root: root };
  }

  /* ---------------- 进度环 ---------------- */
  function ring(pct, size, stroke) {
    size = size || 120;
    stroke = stroke || 9;
    var r = (size - stroke) / 2;
    var c = 2 * Math.PI * r;
    var p = Math.max(0, Math.min(1, pct || 0));
    return '<svg class="ring" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
      '<circle class="ring-bg" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke-width="' + stroke + '"/>' +
      '<circle class="ring-fg" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke-width="' + stroke + '" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + (c * (1 - p)).toFixed(1) + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/>' +
      '</svg>';
  }

  /* ---------------- 热力图 ---------------- */
  function heatLevel(n) {
    if (!n) return 0;
    if (n < 10) return 1;
    if (n < 25) return 2;
    if (n < 50) return 3;
    return 4;
  }
  function heat(data) {
    var cells = data.cells.map(function (c) {
      var d = new Date(c.ts);
      var label = (d.getMonth() + 1) + '月' + d.getDate() + '日';
      var title = label + ' · ' + (c.count ? c.count + ' 个学习点' : '没有学习记录');
      return '<div class="heat-cell lv' + heatLevel(c.count) + (c.future ? ' future' : '') + '" title="' + esc(title) + '"></div>';
    }).join('');
    return '<div class="heat"><div class="heat-grid">' + cells + '</div>' +
      '<div class="heat-legend"><span>少</span><i class="lv0"></i><i class="lv1"></i><i class="lv2"></i><i class="lv3"></i><i class="lv4"></i><span>多</span></div></div>';
  }

  /* ---------------- 语音合成 ---------------- */
  var tts = {
    supported: typeof window !== 'undefined' && 'speechSynthesis' in window,
    voices: [],
    voice: null,
    _bound: false,
    init: function () {
      if (!tts.supported || tts._bound) return;
      tts._bound = true;
      var load = function () {
        try { tts.voices = window.speechSynthesis.getVoices() || []; } catch (e) { tts.voices = []; }
        var list = tts.voices;
        tts.voice =
          list.filter(function (v) { return /en[-_]US/i.test(v.lang); })[0] ||
          list.filter(function (v) { return /^en[-_]GB/i.test(v.lang); })[0] ||
          list.filter(function (v) { return /^en/i.test(v.lang); })[0] ||
          null;
      };
      load();
      if (window.speechSynthesis.addEventListener) {
        window.speechSynthesis.addEventListener('voiceschanged', load);
      } else {
        window.speechSynthesis.onvoiceschanged = load;
      }
    },
    hasEnglish: function () {
      if (!tts.supported) return false;
      if (!tts.voice && !tts.voices.length) tts.init();
      return !!tts.voice;
    },
    speak: function (text, opts) {
      if (!tts.supported || !text) return null;
      var o = opts || {};
      try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = o.rate || 1;
      u.pitch = 1;
      u.volume = 1;
      if (!tts.voice) tts.init();
      if (tts.voice) u.voice = tts.voice;
      if (o.onstart) u.onstart = o.onstart;
      if (o.onend) u.onend = o.onend;
      u.onerror = function () { if (o.onend) o.onend(); };
      window.speechSynthesis.speak(u);
      return u;
    },
    cancel: function () {
      if (!tts.supported) return;
      try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    },
    pause: function () { if (tts.supported) window.speechSynthesis.pause(); },
    resume: function () { if (tts.supported) window.speechSynthesis.resume(); },
    speaking: function () { return tts.supported && window.speechSynthesis.speaking; }
  };

  /* ---------------- 格式化 ---------------- */
  function mmss(sec) {
    sec = Math.max(0, Math.round(sec));
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
  }
  function dateLabel(ts) {
    var d = new Date(ts);
    var week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    return (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日 · 周' + week;
  }
  function relDay(ts) {
    var diff = Math.round((A.core.startOfDay(ts) - A.core.todayStart()) / A.core.DAY);
    if (diff === 0) return '今天';
    if (diff === 1) return '明天';
    if (diff === 2) return '后天';
    if (diff < 0) return '逾期 ' + (-diff) + ' 天';
    return diff + ' 天后';
  }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function sample(arr, n, exclude) {
    var ex = exclude || [];
    var pool = arr.filter(function (x) { return ex.indexOf(x) < 0; });
    return shuffle(pool).slice(0, n);
  }

  /* ---------------- 点词查义 ---------------- */
  var popEl = null;

  function closePopover() {
    if (popEl && popEl.parentNode) popEl.parentNode.removeChild(popEl);
    popEl = null;
  }

  function popover(anchor, html) {
    closePopover();
    var el = document.createElement('div');
    el.className = 'popover';
    el.innerHTML = html;
    document.body.appendChild(el);
    var r = anchor.getBoundingClientRect();
    var w = el.offsetWidth;
    var h = el.offsetHeight;
    var left = Math.min(Math.max(10, r.left + r.width / 2 - w / 2), window.innerWidth - w - 10);
    var top = r.bottom + 8;
    if (top + h > window.innerHeight - 10) top = Math.max(10, r.top - h - 8);
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    popEl = el;

    function cleanup() {
      document.removeEventListener('click', onDoc, true);
      document.removeEventListener('keydown', onKey, true);
    }
    function onDoc(e) { if (!el.contains(e.target)) { closePopover(); cleanup(); } }
    function onKey(e) { if (e.key === 'Escape') { closePopover(); cleanup(); } }
    setTimeout(function () {
      document.addEventListener('click', onDoc, true);
      document.addEventListener('keydown', onKey, true);
    }, 0);
    return el;
  }

  function linkWords(text) {
    var s = String(text == null ? '' : text);
    var out = '';
    var last = 0;
    var re = /[A-Za-z][A-Za-z'’-]*/g;
    var m;
    while ((m = re.exec(s))) {
      if (m.index > last) out += esc(s.slice(last, m.index));
      var w = m[0];
      out += '<span class="w" data-w="' + esc(w.toLowerCase()) + '">' + esc(w) + '</span>';
      last = m.index + w.length;
    }
    out += esc(s.slice(last));
    return out;
  }

  A.ui = {
    esc: esc,
    icon: icon,
    toast: toast,
    modal: modal,
    ring: ring,
    heat: heat,
    heatLevel: heatLevel,
    tts: tts,
    mmss: mmss,
    dateLabel: dateLabel,
    relDay: relDay,
    shuffle: shuffle,
    sample: sample,
    linkWords: linkWords,
    popover: popover,
    closePopover: closePopover
  };
})(window.App);
