/*
 * DeepSeekLLM v1.0
 * DeepSeek 官方 API 的浏览器客户端：配置、设置弹窗、Chat / JSON 调用、错误提示。
 * 配置保存在 localStorage（键 llm:config），不经过任何第三方服务器。
 */
window.DeepSeekLLM = (function () {
  'use strict';

  var KEY = 'llm:config';
  var DEFAULTS = { baseURL: 'https://api.deepseek.com', apiKey: '', model: 'deepseek-chat' };
  var MODELS = [
    { id: 'deepseek-chat', label: 'deepseek-chat（速度快，推荐）' },
    { id: 'deepseek-reasoner', label: 'deepseek-reasoner（推理更强，较慢）' }
  ];

  // 每个学习档案一份 Key；没有档案系统时回退到全局
  function configKey() {
    try {
      if (window.App && window.App.core && window.App.core.profileId) {
        return KEY + ':' + window.App.core.profileId();
      }
    } catch (e) { /* ignore */ }
    return KEY;
  }

  function readRaw() {
    var k = configKey();
    var raw = null;
    try { raw = window.localStorage.getItem(k); } catch (e) { raw = null; }
    // 只有默认档案才继承旧版的全局 Key，避免新建档案“继承”别人的 Key
    var isDefault = true;
    try {
      if (window.App && window.App.core && window.App.core.defaultProfileId) {
        isDefault = window.App.core.profileId() === window.App.core.defaultProfileId();
      }
    } catch (e) { isDefault = true; }
    if (!raw && k !== KEY && isDefault) {
      try { raw = window.localStorage.getItem(KEY); } catch (e) { raw = null; }
      if (raw) { try { window.localStorage.setItem(k, raw); } catch (e) { /* ignore */ } }
    }
    return raw;
  }

  function getConfig() {
    var raw = {};
    try { raw = JSON.parse(readRaw() || '{}'); } catch (e) { raw = {}; }
    return {
      baseURL: (raw.baseURL || DEFAULTS.baseURL).replace(/\/+$/, ''),
      apiKey: raw.apiKey || '',
      model: raw.model || DEFAULTS.model
    };
  }

  function saveConfig(cfg) {
    var next = {
      baseURL: (cfg.baseURL || DEFAULTS.baseURL).replace(/\/+$/, ''),
      apiKey: (cfg.apiKey || '').trim(),
      model: cfg.model || DEFAULTS.model
    };
    try { window.localStorage.setItem(configKey(), JSON.stringify(next)); } catch (e) { /* ignore */ }
    return next;
  }

  function isConfigured() { return !!getConfig().apiKey; }

  function endpoint(baseURL) {
    var b = (baseURL || DEFAULTS.baseURL).replace(/\/+$/, '');
    if (/\/chat\/completions$/.test(b)) return b;
    return b + '/chat/completions';
  }

  function friendly(status, msg) {
    if (status === 401) return 'API Key 无效或已失效，请在「AI 设置」里检查。';
    if (status === 402) return 'DeepSeek 账户余额不足，请先充值。';
    if (status === 429) return '请求太频繁，等几秒再试。';
    if (status === 400 || status === 422) return '请求被拒绝：' + (msg || '模型名或参数可能不对');
    if (status >= 500) return 'DeepSeek 服务暂时不可用，稍后再试。';
    return msg || ('请求失败（HTTP ' + status + '）');
  }

  function request(cfg, messages, opts) {
    opts = opts || {};
    if (!cfg.apiKey) {
      var noKey = new Error('还没有配置 DeepSeek API Key');
      noKey.code = 'NO_KEY';
      return Promise.reject(noKey);
    }
    var isReasoner = /reasoner/i.test(cfg.model);
    var body = {
      model: cfg.model,
      messages: messages,
      max_tokens: opts.maxTokens || 1200,
      stream: false
    };
    if (!isReasoner) {
      body.temperature = opts.temperature == null ? 0.2 : opts.temperature;
      if (opts.json) body.response_format = { type: 'json_object' };
    }
    return fetch(endpoint(cfg.baseURL), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + cfg.apiKey
      },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.text().then(function (text) {
        var data = null;
        try { data = JSON.parse(text); } catch (e) { data = null; }
        if (!res.ok) {
          var msg = data && data.error && data.error.message;
          var err = new Error(friendly(res.status, msg));
          err.status = res.status;
          err.code = 'HTTP';
          throw err;
        }
        if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
          throw new Error('DeepSeek 返回格式异常，请稍后重试');
        }
        return data.choices[0].message.content || '';
      });
    }).catch(function (err) {
      if (err.code) throw err;
      var e = new Error('网络请求失败：' + (err.message || '请检查网络或 Base URL'));
      e.code = 'NETWORK';
      throw e;
    });
  }

  function chat(messages, opts) {
    return request(getConfig(), messages, opts);
  }

  function chatJSON(messages, opts) {
    return request(getConfig(), messages, Object.assign({}, opts, { json: true })).then(function (text) {
      try { return JSON.parse(text); } catch (e) {
        var m = /\{[\s\S]*\}/.exec(text);
        if (m) {
          try { return JSON.parse(m[0]); } catch (e2) { /* fallthrough */ }
        }
        throw new Error('AI 返回的不是合法 JSON，请重试');
      }
    });
  }

  function probe(cfg) {
    return request(cfg, [{ role: 'user', content: '回复两个字：可用' }], { maxTokens: 8, temperature: 0 })
      .then(function (text) { return { ok: true, text: text }; })
      .catch(function (err) { return { ok: false, error: err.message }; });
  }

  /* ---------------- 设置弹窗 ---------------- */
  function injectStyle() {
    if (document.getElementById('dsl-style')) return;
    var css = ''
      + '.dsl-mask{position:fixed;inset:0;z-index:200;display:grid;place-items:center;padding:20px;background:rgba(20,34,30,.45);backdrop-filter:blur(3px)}'
      + '.dsl-card{width:100%;max-width:480px;background:#fffdf8;border:1px solid #e4dfd2;border-radius:20px;box-shadow:0 40px 80px -40px rgba(0,0,0,.5);font-family:"Inter","Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:#1b2a27;overflow:hidden}'
      + '.dsl-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px 0}'
      + '.dsl-head h3{margin:0;font-size:16px}'
      + '.dsl-x{border:none;background:transparent;font-size:20px;line-height:1;color:#78848a;cursor:pointer}'
      + '.dsl-body{padding:14px 20px 4px;display:flex;flex-direction:column;gap:14px}'
      + '.dsl-field{display:flex;flex-direction:column;gap:6px;font-size:13px}'
      + '.dsl-field>span{font-weight:600;color:#3d4c48}'
      + '.dsl-field input,.dsl-field select{width:100%;padding:10px 12px;border:1px solid #e4dfd2;border-radius:10px;background:#faf7ef;font-size:13.5px;font-family:inherit;color:#1b2a27;outline:none}'
      + '.dsl-field input:focus,.dsl-field select:focus{border-color:#1b7d6c;background:#fff;box-shadow:0 0 0 3px rgba(27,125,108,.1)}'
      + '.dsl-field em{font-style:normal;font-size:11px;color:#78848a;line-height:1.6}'
      + '.dsl-adv{font-size:12px;color:#78848a}'
      + '.dsl-adv summary{cursor:pointer;margin-bottom:8px}'
      + '.dsl-adv input{width:100%;padding:9px 12px;border:1px solid #e4dfd2;border-radius:10px;background:#faf7ef;font-size:12.5px;font-family:inherit;outline:none}'
      + '.dsl-status{font-size:12px;line-height:1.6;min-height:18px}'
      + '.dsl-status.ok{color:#2f7d5f}.dsl-status.err{color:#b4473a}.dsl-status.busy{color:#78848a}'
      + '.dsl-foot{display:flex;align-items:center;gap:10px;padding:18px 20px}'
      + '.dsl-spacer{flex:1}'
      + '.dsl-btn{border:1px solid transparent;border-radius:10px;padding:9px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;background:transparent}'
      + '.dsl-btn.primary{background:#12655a;color:#fff}'
      + '.dsl-btn.primary:hover{background:#1b7d6c}'
      + '.dsl-btn.ghost{border-color:#e4dfd2;color:#3d4c48}'
      + '.dsl-btn:disabled{opacity:.6;cursor:default}';
    var s = document.createElement('style');
    s.id = 'dsl-style';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function settings(onSaved) {
    injectStyle();
    var cfg = getConfig();
    var mask = document.createElement('div');
    mask.className = 'dsl-mask';
    mask.innerHTML =
      '<div class="dsl-card" role="dialog" aria-modal="true" aria-label="AI 设置">' +
      '<div class="dsl-head"><h3>AI 批改设置 · DeepSeek</h3><button class="dsl-x" data-close aria-label="关闭">×</button></div>' +
      '<div class="dsl-body">' +
      '<label class="dsl-field"><span>DeepSeek API Key</span>' +
      '<input type="password" data-key placeholder="sk-..." autocomplete="off" spellcheck="false">' +
      '<em>在 platform.deepseek.com 创建。Key 只保存在本机浏览器，除了 DeepSeek 不会发给任何服务器；公共电脑请不要保存。留空保存即关闭 AI 功能。</em></label>' +
      '<label class="dsl-field"><span>模型</span><select data-model>' +
      MODELS.map(function (m) { return '<option value="' + m.id + '">' + m.label + '</option>'; }).join('') +
      '</select></label>' +
      '<details class="dsl-adv"><summary>高级：自定义 Base URL（默认官方地址）</summary>' +
      '<input type="text" data-base placeholder="https://api.deepseek.com"></details>' +
      '<div class="dsl-status" data-status></div>' +
      '</div>' +
      '<div class="dsl-foot"><button class="dsl-btn ghost" data-test>测试连接</button><span class="dsl-spacer"></span>' +
      '<button class="dsl-btn ghost" data-close>取消</button>' +
      '<button class="dsl-btn primary" data-save>保存</button></div>' +
      '</div>';

    document.body.appendChild(mask);
    var keyInput = mask.querySelector('[data-key]');
    var modelSel = mask.querySelector('[data-model]');
    var baseInput = mask.querySelector('[data-base]');
    var status = mask.querySelector('[data-status]');
    keyInput.value = cfg.apiKey;
    modelSel.value = cfg.model;
    baseInput.value = cfg.baseURL;

    function close() { if (mask.parentNode) mask.parentNode.removeChild(mask); }
    function read() {
      return { apiKey: keyInput.value.trim(), model: modelSel.value, baseURL: baseInput.value.trim() || DEFAULTS.baseURL };
    }
    function setStatus(text, cls) { status.className = 'dsl-status' + (cls ? ' ' + cls : ''); status.textContent = text; }

    mask.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', close); });
    mask.addEventListener('click', function (e) { if (e.target === mask) close(); });

    var testBtn = mask.querySelector('[data-test]');
    testBtn.addEventListener('click', function () {
      var c = read();
      if (!c.apiKey) { setStatus('先填 API Key', 'err'); return; }
      testBtn.disabled = true;
      setStatus('正在连接 DeepSeek…', 'busy');
      probe(c).then(function (r) {
        testBtn.disabled = false;
        if (r.ok) setStatus('连接成功 · ' + c.model, 'ok');
        else setStatus(r.error, 'err');
      });
    });

    mask.querySelector('[data-save]').addEventListener('click', function () {
      var c = read();
      if (!c.apiKey) { setStatus('已关闭 AI 功能（未保存 Key）', 'busy'); }
      saveConfig(c);
      close();
      if (onSaved) onSaved(getConfig());
    });

    setTimeout(function () { keyInput.focus(); }, 40);
  }

  return {
    getConfig: getConfig,
    saveConfig: saveConfig,
    isConfigured: isConfigured,
    settings: settings,
    chat: chat,
    chatJSON: chatJSON,
    probe: probe,
    models: MODELS
  };
})();
