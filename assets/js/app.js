/*
 * 应用外壳与路由：#/ 首页、#/vocab、#/reading/:id、#/listening/:id、#/mistakes、#/settings
 */
window.App = window.App || {};
(function (A) {
  'use strict';

  var ui = A.ui;
  var icon = ui.icon;

  var NAV = [
    { key: 'dashboard', href: '#/', label: '首页', ic: 'home' },
    { key: 'vocab', href: '#/vocab', label: '抽查', ic: 'book' },
    { key: 'wordbook', href: '#/wordbook', label: '单词本', ic: 'bookmark', tab: false },
    { key: 'reading', href: '#/reading', label: '阅读', ic: 'file' },
    { key: 'listening', href: '#/listening', label: '听力', ic: 'headphones' },
    { key: 'translation', href: '#/translation', label: '翻译', ic: 'languages' },
    { key: 'writing', href: '#/writing', label: '写作', ic: 'pen' },
    { key: 'mistakes', href: '#/mistakes', label: '错题本', ic: 'alert' },
    { key: 'settings', href: '#/settings', label: '设置', ic: 'settings' }
  ];

  var TITLES = {
    dashboard: '首页', vocab: '抽查单词', wordbook: '单词本', reading: '阅读', listening: '听力', translation: '翻译', writing: '写作',
    readingRunner: '仔细阅读', listeningRunner: '听力练习', translationRunner: '翻译练习',
    clozeRunner: '选词填空', matchingRunner: '长篇匹配',
    mistakes: '错题本', settings: '设置', notFound: '页面不存在'
  };

  function shellHtml() {
    var nav = NAV.map(function (n) {
      return '<a class="nav-item" data-nav="' + n.key + '" href="' + n.href + '">' +
        icon(n.ic) + '<span>' + n.label + '</span>' +
        (n.key === 'vocab' ? '<em class="nav-badge" id="nav-due" hidden>0</em>' : '') +
        '</a>';
    }).join('');

    var tabs = NAV.filter(function (n) { return n.tab !== false && n.key !== 'settings'; }).map(function (n) {
      return '<a class="tab-item" data-nav="' + n.key + '" href="' + n.href + '">' + icon(n.ic) + '<span>' + n.label + '</span></a>';
    }).join('');

    var themeItem = '<button class="nav-item nav-theme" data-theme-toggle>' + icon('moon') + '<span>深色模式</span></button>';

    return '<div class="shell">' +
      '<aside class="sidebar">' +
      '<a class="brand" href="#/">' +
      '<span class="brand-mark">四</span>' +
      '<span class="brand-text"><strong>四级冲刺</strong><span>CET-4 SPRINT</span></span>' +
      '</a>' +
      '<nav class="nav">' + nav + themeItem + '</nav>' +
      '<div class="side-foot">' +
      '<div class="side-count"><strong id="side-days">—</strong><span>天后考试</span></div>' +
      '<div class="side-streak">' + icon('flame') + '连续打卡 <strong id="side-streak">0</strong> 天</div>' +
      '<div class="side-tip">每天 20 分钟，胜过考前熬夜。</div>' +
      '</div>' +
      '</aside>' +
      '<main class="main">' +
      '<header class="topbar">' +
      '<a class="brand mini" href="#/"><span class="brand-mark">四</span><span class="brand-text"><strong>四级冲刺</strong></span></a>' +
      '<div class="topbar-right">' +
      '<a class="icon-btn" href="#/wordbook" aria-label="单词本">' + icon('bookmark') + '</a>' +
      '<button class="icon-btn" data-theme-toggle aria-label="切换深色模式">' + icon('moon') + '</button>' +
      '<a class="icon-btn" href="#/settings" aria-label="设置">' + icon('settings') + '</a>' +
      '</div>' +
      '</header>' +
      '<div class="view" id="view" tabindex="-1"></div>' +
      '<div class="sr-only" id="a11y-live" aria-live="polite" aria-atomic="true"></div>' +
      '</main>' +
      '<nav class="tabbar">' + tabs + '</nav>' +
      '</div>';
  }

  function parseHash() {
    var raw = (location.hash || '').replace(/^#\/?/, '');
    var qi = raw.indexOf('?');
    var path = qi >= 0 ? raw.slice(0, qi) : raw;
    var query = {};
    if (qi >= 0) {
      raw.slice(qi + 1).split('&').forEach(function (pair) {
        if (!pair) return;
        var kv = pair.split('=');
        query[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
      });
    }
    var parts = path.split('/').filter(Boolean);
    return { parts: parts, query: query, path: path };
  }

  function resolve(p) {
    var parts = p.parts;
    if (!parts.length) return { view: 'dashboard', params: {} };
    var head = parts[0];
    if (head === 'vocab' || head === 'wordbook' || head === 'mistakes' || head === 'settings') return { view: head, params: {} };
    if (head === 'writing') {
      if (parts[1]) return { view: 'writingRunner', params: { id: parts[1] } };
      return { view: 'writing', params: {} };
    }
    if (head === 'reading') {
      if (parts[1]) return { view: 'readingRunner', params: { id: parts[1] } };
      return { view: 'reading', params: {} };
    }
    if (head === 'cloze') {
      if (parts[1]) return { view: 'clozeRunner', params: { id: parts[1] } };
      return { view: 'reading', params: {} };
    }
    if (head === 'matching') {
      if (parts[1]) return { view: 'matchingRunner', params: { id: parts[1] } };
      return { view: 'reading', params: {} };
    }
    if (head === 'listening') {
      if (parts[1]) return { view: 'listeningRunner', params: { id: parts[1] } };
      return { view: 'listening', params: {} };
    }
    if (head === 'translation') {
      if (parts[1]) return { view: 'translationRunner', params: { id: parts[1] } };
      return { view: 'translation', params: {} };
    }
    return { view: 'notFound', params: {} };
  }

  function navKeyOf(view) {
    if (view === 'readingRunner' || view === 'clozeRunner' || view === 'matchingRunner') return 'reading';
    if (view === 'listeningRunner') return 'listening';
    if (view === 'translationRunner') return 'translation';
    return view;
  }

  function setActive(view) {
    var key = navKeyOf(view);
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      var on = a.getAttribute('data-nav') === key;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  function refreshNav() {
    if (!A.core || !A.core.getState) return;
    var s = A.core.getState();
    var due = A.core.dueList().length;
    var badge = document.getElementById('nav-due');
    if (badge) {
      badge.textContent = due;
      badge.hidden = due === 0;
    }
    var daysEl = document.getElementById('side-days');
    if (daysEl) {
      var info = A.core.examInfo();
      daysEl.textContent = info.days == null ? '—' : Math.max(0, info.days);
    }
    var streakEl = document.getElementById('side-streak');
    if (streakEl) streakEl.textContent = A.core.streak();
  }

  var viewEl = null;
  var current = null;
  var lastView = null;
  var lastPath = null;
  var lastParams = null;
  var LIST_VIEWS = { reading: 1, listening: 1, translation: 1, writing: 1, wordbook: 1 };
  var RUNNER_VIEWS = { readingRunner: 1, clozeRunner: 1, matchingRunner: 1, listeningRunner: 1 };

  function storageGet(key) {
    try { return window.sessionStorage.getItem(key); } catch (e) { return null; }
  }
  function storageSet(key, val) {
    try { window.sessionStorage.setItem(key, val); } catch (e) { /* ignore */ }
  }

  function highlightSet(setId) {
    if (!setId) return;
    var card = document.querySelector('.set-card[data-set-id="' + setId + '"]');
    if (!card) return;
    if (card.hidden) {
      card.hidden = false;
      var group = card.closest('.reading-group');
      if (group) group.hidden = false;
    }
    card.classList.add('set-flash');
    setTimeout(function () { card.classList.remove('set-flash'); }, 1500);
  }

  function render() {
    var p = parseHash();
    var route = resolve(p);
    var fn = (A.views && A.views[route.view]) || A.views.notFound;
    var ctx = { params: route.params || {}, query: p.query, path: p.path };
    var mainEl = document.querySelector('.main');
    var prevScroll = {
      main: mainEl ? mainEl.scrollTop : 0,
      win: window.scrollY || document.documentElement.scrollTop || 0
    };
    var backToSet = null;
    var restoreScroll = null;

    if (lastView && LIST_VIEWS[lastView] && lastPath) {
      storageSet('scroll:' + lastPath, JSON.stringify(prevScroll));
    }
    if (lastView && RUNNER_VIEWS[lastView] && LIST_VIEWS[route.view]) {
      backToSet = lastParams && lastParams.id;
      restoreScroll = storageGet('scroll:' + p.path);
    }

    if (current && typeof current.destroy === 'function') {
      try { current.destroy(); } catch (e) { /* ignore */ }
    }

    var out = fn(ctx) || { html: '' };
    if (out.html) viewEl.innerHTML = out.html;
    current = out;
    if (typeof out.mount === 'function') out.mount(viewEl, ctx);

    setActive(route.view);
    refreshNav();
    document.title = (TITLES[route.view] || '四级冲刺') + ' · 四级冲刺';
    window.scrollTo(0, 0);
    if (mainEl) mainEl.scrollTop = 0;

    if (restoreScroll) {
      requestAnimationFrame(function () {
        var sc = null;
        try { sc = JSON.parse(restoreScroll); } catch (e) { sc = null; }
        if (sc) {
          if (mainEl && mainEl.scrollHeight > mainEl.clientHeight + 4 && getComputedStyle(mainEl).overflowY !== 'visible') {
            mainEl.scrollTop = sc.main || 0;
          } else {
            window.scrollTo(0, sc.win || 0);
          }
        }
        highlightSet(backToSet);
      });
    }

    lastView = route.view;
    lastPath = p.path;
    lastParams = route.params;

    var pageName = TITLES[route.view] || '页面';
    if (viewEl) {
      viewEl.setAttribute('tabindex', '-1');
      try { viewEl.focus({ preventScroll: true }); } catch (e) { viewEl.focus(); }
    }
    var live = document.getElementById('a11y-live');
    if (live) {
      live.textContent = '';
      setTimeout(function () { live.textContent = '已进入 ' + pageName; }, 50);
    }
  }

  function refreshThemeButtons() {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      var isNav = b.classList.contains('nav-theme');
      b.innerHTML = icon(dark ? 'sun' : 'moon') +
        (isNav ? '<span>' + (dark ? '浅色模式' : '深色模式') + '</span>' : '');
      b.setAttribute('aria-label', dark ? '切换到浅色模式' : '切换到深色模式');
      b.title = dark ? '切换到浅色模式' : '切换到深色模式';
    });
  }

  function bindThemeToggles() {
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      if (b.__themeBound) return;
      b.__themeBound = true;
      b.addEventListener('click', function () {
        var dark = A.core.applyTheme();
        A.core.setThemeMode(dark ? 'light' : 'dark');
        refreshThemeButtons();
      });
    });
  }

  A.app = { refreshNav: refreshNav, refreshTheme: refreshThemeButtons };

  function boot() {
    A.core.load();
    var app = document.getElementById('app');
    app.innerHTML = shellHtml();
    viewEl = document.getElementById('view');
    refreshThemeButtons();
    bindThemeToggles();
    ui.tts.init();
    window.addEventListener('hashchange', render);
    if (!location.hash) location.replace('#/');
    render();
    // 后台预读语音列表
    setTimeout(function () { if (ui.tts.init) ui.tts.init(); }, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window.App);
