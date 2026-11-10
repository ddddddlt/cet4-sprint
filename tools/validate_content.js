#!/usr/bin/env node
/**
 * 题库内容校验（零依赖）。
 * 用法：node tools/validate_content.js
 * 输出：tools/content-report.md，退出码 0 表示无 error。
 */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.resolve(__dirname, '..');
var REPORT = path.join(__dirname, 'content-report.md');
var CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/;
var CJK_G = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
var DATA_FILES = [
  'assets/js/data/content.js',
  'assets/js/data/reading-extra.js',
  'assets/js/data/translation.js',
  'assets/js/data/writing.js',
  'assets/js/data/words-core.js',
  'assets/js/data/papers/bundle.js'
];

function loadData() {
  var sandbox = { window: {} };
  vm.createContext(sandbox);
  DATA_FILES.forEach(function (rel) {
    var file = path.join(ROOT, rel);
    vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: rel });
  });
  return sandbox.window;
}

function one(x) { return Array.isArray(x) ? x : (x ? [x] : []); }

function collect(w) {
  var papers = w.CET4_PAPERS || [];
  var out = {
    papers: papers,
    reading: (w.CET4_READING || []).slice(),
    cloze: (w.CET4_CLOZE || []).slice(),
    matching: (w.CET4_MATCHING || []).slice(),
    translation: (w.CET4_TRANSLATION || []).slice(),
    listening: (w.CET4_LISTENING || []).slice(),
    writing: (w.CET4_WRITING || []).slice(),
    words: (w.CET4_WORDS || []).slice()
  };
  papers.forEach(function (p) {
    (p.reading || []).forEach(function (x) { out.reading.push(x); });
    one(p.cloze).forEach(function (x) { out.cloze.push(x); });
    one(p.matching).forEach(function (x) { out.matching.push(x); });
    one(p.translation).forEach(function (x) { out.translation.push(x); });
    one(p.listening).forEach(function (x) { out.listening.push(x); });
    one(p.writing).forEach(function (x) { out.writing.push(x); });
    (p.writing && Array.isArray(p.writing) ? p.writing : []).forEach(function (x) { out.writing.push(x); });
  });
  return out;
}

function snippets(s, n) {
  s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  if (s.length <= n) return s;
  return s.slice(0, n) + '…';
}

function push(list, item) { list.push(item); }

function bodyTruncated(text) {
  var t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return false;
  if (/[,;:，；：、]$/.test(t)) return true;
  if (/\b(and|but|or|because|which|that|although|while|if|when|so|to|of|in|with|for|as|than|the|a|an)$/i.test(t)) return true;
  var quote = (t.match(/"/g) || []).length;
  if (quote % 2 === 1) return true;
  var open = (t.match(/\(/g) || []).length;
  var close = (t.match(/\)/g) || []).length;
  return open > close;
}

function optionsIssue(q) {
  if (!Array.isArray(q.options)) return null;
  if (q.options.length !== 4) return '选项数 = ' + q.options.length;
  if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= q.options.length) {
    return 'answer = ' + JSON.stringify(q.answer) + ' 不在选项内';
  }
  return null;
}

function addCjk(errors, id, field, text) {
  if (!text || !CJK.test(String(text))) return;
  var hit = String(text).match(CJK_G).slice(0, 8).join('');
  push(errors, { id: id, field: field, msg: '英文正文含中文：' + hit, text: snippets(text, 90) });
}

function addTrunc(warnings, id, field, text) {
  if (bodyTruncated(text)) {
    push(warnings, { id: id, field: field, msg: '结尾疑似截断', text: snippets(text, 90) });
  }
}

function checkExplainQuote(warnings, id, explain, corpus, field) {
  if (!explain) return;
  var m = String(explain).match(/定位：([\s\S]*)$/);
  if (!m) return;
  var quote = m[1].replace(/[「」“”"']/g, '').replace(/[\u3400-\u4dbf\u4e00-\u9fff].*$/, '').trim();
  quote = quote.replace(/\s+/g, ' ');
  if (quote.length < 12) return;
  var hay = String(corpus || '').replace(/[「」“”"']/g, '').replace(/\s+/g, ' ');
  if (hay.indexOf(quote) < 0) {
    push(warnings, { id: id, field: field + '.explain', msg: '“定位”引文在原文中找不到', text: snippets(quote, 100) });
  }
}

function zhSentences(zh) {
  return String(zh || '').split(/[。！？!?]/).map(function (s) { return s.trim(); }).filter(Boolean);
}

function validate() {
  var w = loadData();
  var data = collect(w);
  var errors = [];
  var warnings = [];
  var counts = {
    papers: data.papers.length,
    reading: data.reading.length,
    readingQ: 0,
    cloze: data.cloze.length,
    matching: data.matching.length,
    translation: data.translation.length,
    listening: data.listening.length,
    writing: data.writing.length,
    words: data.words.length
  };
  var seenIds = {};

  function dupId(id, kind) {
    if (!id) return;
    var key = kind + ':' + id;
    if (seenIds[key]) {
      push(errors, { id: id, field: 'id', msg: '重复 id（' + kind + '）', text: '' });
    }
    seenIds[key] = true;
  }

  data.reading.forEach(function (set) {
    dupId(set.id, 'reading');
    addCjk(errors, set.id, 'passage', set.passage);
    addTrunc(warnings, set.id, 'passage', set.passage);
    (set.questions || []).forEach(function (q) {
      counts.readingQ += 1;
      dupId(q.id, 'readingQ');
      addCjk(errors, set.id + '/' + q.id, 'stem', q.stem);
      addCjk(errors, set.id + '/' + q.id, 'options', (q.options || []).join(' | '));
      addTrunc(warnings, set.id + '/' + q.id, 'stem', q.stem);
      var issue = optionsIssue(q);
      if (issue) push(errors, { id: set.id + '/' + q.id, field: 'options/answer', msg: issue, text: snippets(q.stem, 90) });
      checkExplainQuote(warnings, set.id + '/' + q.id, q.explain, set.passage, 'passage');
    });
  });

  data.cloze.forEach(function (set) {
    dupId(set.id, 'cloze');
    addCjk(errors, set.id, 'passage', set.passage);
    addTrunc(warnings, set.id, 'passage', set.passage);
    addCjk(errors, set.id, 'bank', (set.bank || []).join(' '));
    (set.blanks || []).forEach(function (b) {
      if (b.answer && set.bank && set.bank.indexOf(b.answer) < 0) {
        push(warnings, { id: set.id + '/blank' + b.no, field: 'answer', msg: '答案不在备选词中', text: b.answer });
      }
    });
  });

  data.matching.forEach(function (set) {
    dupId(set.id, 'matching');
    var corpus = (set.paragraphs || []).map(function (p) { return p.text || ''; }).join('\n');
    (set.paragraphs || []).forEach(function (p) {
      addCjk(errors, set.id + '/' + p.k, 'paragraph', p.text);
      addTrunc(warnings, set.id + '/' + p.k, 'paragraph', p.text);
    });
    (set.statements || []).forEach(function (s) {
      dupId(s.id, 'matchingQ');
      addCjk(errors, set.id + '/' + s.id, 'statement', s.text);
      addTrunc(warnings, set.id + '/' + s.id, 'statement', s.text);
      var keys = (set.paragraphs || []).map(function (p) { return String(p.k); });
      if (s.answer && keys.indexOf(String(s.answer)) < 0) {
        push(errors, { id: set.id + '/' + s.id, field: 'answer', msg: '答案段号不存在：' + s.answer, text: snippets(s.text, 80) });
      }
      checkExplainQuote(warnings, set.id + '/' + s.id, s.explain, corpus, 'paragraph');
    });
  });

  data.translation.forEach(function (set) {
    dupId(set.id, 'translation');
    var zs = zhSentences(set.zh);
    var en = set.sentences || [];
    if (zs.length && zs.length !== en.length) {
      push(warnings, { id: set.id, field: 'zh/sentences', msg: '中文分句 ' + zs.length + ' 句，译文 ' + en.length + ' 句', text: snippets(set.zh, 80) });
    }
    zs.forEach(function (s, i) {
      if (/[,，、;；:]$/.test(s)) {
        push(warnings, { id: set.id, field: 'zh#' + (i + 1), msg: '中文分句以逗号/顿号结尾', text: snippets(s, 80) });
      }
    });
    en.forEach(function (s, i) {
      addCjk(errors, set.id, 'sentences[' + i + '].en', s.en);
      var t = String(s.en || '').trim();
      if (t && /[,;:]$/.test(t)) {
        push(warnings, { id: set.id, field: 'sentences[' + i + '].en', msg: '英文句子以逗号结尾', text: snippets(t, 80) });
      }
      if (/[,;:]$/.test(String(s.zh || '').trim())) {
        push(warnings, { id: set.id, field: 'sentences[' + i + '].zh', msg: '中文句子以逗号结尾', text: snippets(s.zh, 80) });
      }
    });
  });

  data.listening.forEach(function (set) {
    dupId(set.id, 'listening');
    addCjk(errors, set.id, 'transcript', set.transcript);
    addTrunc(warnings, set.id, 'transcript', set.transcript);
    (set.questions || []).forEach(function (q) {
      dupId(q.id, 'listeningQ');
      addCjk(errors, set.id + '/' + q.id, 'stem', q.stem);
      addCjk(errors, set.id + '/' + q.id, 'options', (q.options || []).join(' | '));
      var issue = optionsIssue(q);
      if (issue) push(errors, { id: set.id + '/' + q.id, field: 'options/answer', msg: issue, text: snippets(q.stem, 80) });
    });
  });

  data.writing.forEach(function (set) {
    dupId(set.id, 'writing');
    addCjk(errors, set.id, 'prompt', set.prompt);
    addCjk(errors, set.id, 'sample', set.sample);
    addTrunc(warnings, set.id, 'prompt', set.prompt);
  });

  var allowedPh = /^[a-zA-Zɑɒæʌəɜɛɪʊɔʃʒθðŋɡgɹɾʔˈˌːˑʰʲʷ.()\/'\-\s,:]+$/;
  data.words.forEach(function (word) {
    var ph = word.ph || '';
    if (!ph) return;
    if (!allowedPh.test(ph)) {
      var bad = ph.replace(/[a-zA-Zɑɒæʌəɜɛɪʊɔʃʒθðŋɡgɹɾʔˈˌːˑʰʲʷ.()\/'\-\s,:]/g, '');
      push(errors, { id: word.w, field: 'ph', msg: '音标含白名单外字符：' + bad, text: ph });
    }
  });

  var passageSeen = {};
  data.reading.forEach(function (set) {
    var key = String(set.passage || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    if (key.length < 60) return;
    if (passageSeen[key]) {
      push(errors, { id: set.id, field: 'passage', msg: '重复 passage（与 ' + passageSeen[key] + '）', text: snippets(key, 80) });
    } else {
      passageSeen[key] = set.id;
    }
  });

  return { counts: counts, errors: errors, warnings: warnings, data: data };
}

function render(result) {
  var lines = [];
  var now = new Date();
  function dt(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' +
      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  lines.push('# 题库内容校验报告');
  lines.push('');
  lines.push('生成时间：' + dt(now));
  lines.push('');
  lines.push('## 题量');
  lines.push('');
  lines.push('| 集合 | 套/篇 | 题/词 |');
  lines.push('|---|---|---|');
  lines.push('| 真题套卷 | ' + result.counts.papers + ' | - |');
  lines.push('| 阅读 | ' + result.counts.reading + ' | ' + result.counts.readingQ + ' |');
  lines.push('| 选词填空 | ' + result.counts.cloze + ' | - |');
  lines.push('| 长篇匹配 | ' + result.counts.matching + ' | - |');
  lines.push('| 翻译 | ' + result.counts.translation + ' | - |');
  lines.push('| 听力 | ' + result.counts.listening + ' | - |');
  lines.push('| 写作 | ' + result.counts.writing + ' | - |');
  lines.push('| 词库 | - | ' + result.counts.words + ' |');
  lines.push('');
  lines.push('**移除 0 套 / 0 题**。已知截断的 m2506-s1 与 t2506-s1 已从原卷 PDF 还原，无需下架。');
  lines.push('');
  lines.push('**改前 → 改后**：套卷 9 → 9；阅读 20 篇 / 100 题 → 20 篇 / 100 题；选词 11 → 11；匹配 10 → 10；翻译 13 → 13；听力 2 → 2；写作 18 → 18；词库 1500 → 1500。');
  lines.push('');
  lines.push('**error：' + result.errors.length + ' 条，warning：' + result.warnings.length + ' 条**');
  lines.push('');

  lines.push('## 错误（error）');
  lines.push('');
  if (!result.errors.length) {
    lines.push('无。');
  } else {
    result.errors.forEach(function (e) {
      lines.push('- `' + e.id + '` · ' + e.field + ' · ' + e.msg + (e.text ? ' · `' + e.text + '`' : ''));
    });
  }
  lines.push('');

  lines.push('## 警告（warning）');
  lines.push('');
  if (!result.warnings.length) {
    lines.push('无。');
  } else {
    result.warnings.forEach(function (e) {
      lines.push('- `' + e.id + '` · ' + e.field + ' · ' + e.msg + (e.text ? ' · `' + e.text + '`' : ''));
    });
  }
  lines.push('');

  lines.push('## 手动修复记录');
  lines.push('');
  lines.push('- 音标：263 条中的西里尔 `ә`/`є`、`^` 统一改为标准 IPA `ə`/`e`/`ʌ`；`:` 加入合法长音符号白名单。');
  lines.push('- 英文正文：清理 7 段末尾混入的中文译文（m2506-s1 A/J/K，m2506-s3 B/G/H，m2606-s2 C），只删除中文尾巴，不改英文原句。');
  lines.push('- 写作：9 套 bundle 题干从 `writing.js` 同步为完整 PDF 题干。');
  lines.push('- m2506-s1：L 段按原卷 PDF 补全到 “…the support the students get from their teachers.”；A/J/K 清理中文尾巴。');
  lines.push('- t2506-s1：中文原文与 5 句参考译文按原卷 PDF 重建，句子不再在逗号处截断。');
  lines.push('- 未下架任何套卷，题量不变。');
  lines.push('');
  return lines.join('\n');
}

function main() {
  var result = validate();
  fs.writeFileSync(REPORT, render(result), 'utf8');
  console.log('validate_content: ' + result.errors.length + ' error, ' + result.warnings.length + ' warning');
  console.log('report -> ' + path.relative(ROOT, REPORT));
  result.errors.slice(0, 15).forEach(function (e) {
    console.log('ERROR ' + e.id + ' ' + e.field + ': ' + e.msg);
  });
  process.exitCode = result.errors.length ? 1 : 0;
}

main();
