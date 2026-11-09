/*
 * SubjectiveEngine v1.0
 * 作文 / 翻译共用的主观题分析引擎：词数统计、分句、词级 diff、常见错误规则、
 * 低分词升级建议、四维评分与四级分档折算。
 * 无第三方依赖，挂载在 window.SubjectiveEngine。
 */
window.SubjectiveEngine = (function () {
  'use strict';

  /* ---------------- 基础工具 ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }
  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function words(text) {
    var m = String(text || '').match(/[A-Za-z][A-Za-z'\u2019-]*/g);
    return m || [];
  }
  function countWords(text) { return words(text).length; }
  function tokens(text) {
    return words(text).map(function (w) { return w.toLowerCase().replace(/[\u2019']/g, ''); });
  }
  function sentences(text) {
    var s = String(text || '');
    var out = [];
    var buf = '';
    for (var i = 0; i < s.length; i++) {
      buf += s[i];
      if (/[.!?]/.test(s[i])) {
        var next = s[i + 1];
        if (next === undefined || /\s/.test(next)) {
          if (buf.trim()) out.push(buf.trim());
          buf = '';
        }
      }
    }
    if (buf.trim()) out.push(buf.trim());
    return out;
  }
  function paragraphs(text) {
    return String(text || '').split(/\n+/).map(function (p) { return p.trim(); }).filter(Boolean);
  }

  /* ---------------- 词级 diff ---------------- */
  function key(w) { return String(w).toLowerCase().replace(/[^a-z']/g, ''); }

  function diff(a, b) {
    var A = String(a || '').trim().split(/\s+/).filter(Boolean);
    var B = String(b || '').trim().split(/\s+/).filter(Boolean);
    var n = A.length, m = B.length;
    if (!n && !m) return [];
    var dp = [];
    for (var i = 0; i <= n; i++) dp.push(new Uint16Array(m + 1));
    for (i = n - 1; i >= 0; i--) {
      for (var j = m - 1; j >= 0; j--) {
        dp[i][j] = key(A[i]) === key(B[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    var ops = [];
    i = 0; j = 0;
    while (i < n && j < m) {
      if (key(A[i]) === key(B[j])) { ops.push({ type: 'eq', text: A[i] }); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ type: 'del', text: A[i] }); i++; }
      else { ops.push({ type: 'ins', text: B[j] }); j++; }
    }
    while (i < n) ops.push({ type: 'del', text: A[i++] });
    while (j < m) ops.push({ type: 'ins', text: B[j++] });
    return ops;
  }

  function similarity(a, b) {
    var A = String(a || '').trim().split(/\s+/).filter(Boolean);
    var B = String(b || '').trim().split(/\s+/).filter(Boolean);
    if (!A.length || !B.length) return 0;
    var n = A.length, m = B.length;
    var dp = [];
    for (var i = 0; i <= n; i++) dp.push(new Uint16Array(m + 1));
    for (i = n - 1; i >= 0; i--) {
      for (var j = m - 1; j >= 0; j--) {
        dp[i][j] = key(A[i]) === key(B[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    return dp[0][0] / Math.max(n, m);
  }

  /* ---------------- 常见错误规则 ---------------- */
  var RULES = [
    { id: 'cn-punct', re: /[\u3002\uff0c\uff1b\uff1a\uff01\uff1f\u201c\u201d]/g, msg: '正文里出现中文标点', fix: '换成英文标点 , . ; : ? !', severity: 'error' },
    { id: 'a-an', re: /\ba\s+(apple|old|important|interesting|easy|English|example|idea|answer|umbrella|opinion|opportunity|effective|efficient|honest|hour|island|orange|unusual|amazing|ancient|argument|essay)\b/gi, msg: '元音音素前要用 an', fix: '把 a 改成 an', severity: 'error' },
    { id: 'an-consonant', re: /\ban\s+(university|user|useful|European|one|uniform|unique|unit|union)\b/gi, msg: '这些词以辅音音素开头，用 a', fix: '把 an 改成 a', severity: 'error' },
    { id: 'more-comparative', re: /\bmore\s+(better|worse|bigger|smaller|easier|harder|faster|slower|cheaper|higher|lower)\b/gi, msg: '比较级重复', fix: '去掉 more，直接 better / bigger……', severity: 'error' },
    { id: 'in-nowadays', re: /\bin\s+nowadays\b/gi, msg: 'in nowadays 不成立', fix: '直接用 Nowadays 或 Today', severity: 'error' },
    { id: 'learn-knowledge', re: /\b(learn|learns|learned|learnt|learning)\s+(a\s+lot\s+of\s+|much\s+|more\s+|some\s+)?knowledge\b/gi, msg: 'knowledge 不与 learn 搭配', fix: 'acquire / gain / obtain knowledge', severity: 'error' },
    { id: 'open-light', re: /\bopen\s+(the\s+)?(light|lights|TV|television|computer|air\s*conditioner)\b/gi, msg: '电器用 turn on / turn off', fix: 'turn on the light / TV', severity: 'error' },
    { id: 'very-very', re: /\bvery\s+very\b/gi, msg: 'very 重复', fix: 'extremely / particularly + 形容词', severity: 'error' },
    { id: 'people-is', re: /\bpeople\s+(is|was|has)\b/gi, msg: 'people 是复数', fix: 'people are / were / have', severity: 'error' },
    { id: 'there-have', re: /\bthere\s+(have|has)\b/gi, msg: 'there be 句型误用', fix: 'there are / there is', severity: 'error' },
    { id: 'according-me', re: /\baccording\s+to\s+me\b/gi, msg: 'according to 不接 me', fix: 'in my opinion / from my perspective', severity: 'error' },
    { id: 'discuss-about', re: /\bdiscuss\s+about\b/gi, msg: 'discuss 是及物动词', fix: 'discuss sth（去掉 about）', severity: 'error' },
    { id: 'marry-with', re: /\bmarry\s+with\b/gi, msg: 'marry 不与 with 连用', fix: 'marry sb / get married to sb', severity: 'error' },
    { id: 'uncountable', re: /\b(informations|advices|equipments|furnitures|knowledges|researches|progresses)\b/gi, msg: '不可数名词加了复数', fix: '去掉 s，或用 a piece of…', severity: 'error' },
    { id: 'dup-word', re: /\b(\w+)\s+\1\b/gi, msg: '单词重复', fix: '删掉多余的那个词', severity: 'error' },
    { id: 'lower-i', re: /\bi\s+(think|believe|agree|am|was|have|will|can|do|want|hope|feel|should)\b/g, msg: '人称代词 I 必须大写', fix: 'I think / I believe', severity: 'error' },
    { id: 'space-punct', re: /\s+[,.;:!?]/g, msg: '标点前多了空格', fix: '标点紧贴前一个词', severity: 'warn' },
    { id: 'double-space', re: /[^\n] {2,}[^\n]/g, msg: '多余空格', fix: '删掉连续空格', severity: 'warn' },
    { id: 'although-but', re: /although[^.!?]{0,80}?\bbut\b/gi, msg: 'although 与 but 不能同时用', fix: '保留 although 或 but 其中一个', severity: 'warn' },
    { id: 'because-so', re: /because[^.!?]{0,80}?\bso\b/gi, msg: 'because 与 so 不能同时用', fix: '保留一个即可', severity: 'warn' },
    { id: 'opinion-think', re: /\bin\s+my\s+opinion\s*,?\s*i\s+think\b/gi, msg: '表达重复', fix: 'In my opinion, … 或 I think …', severity: 'warn' }
  ];

  function runRules(text) {
    var src = String(text || '');
    var issues = [];
    RULES.forEach(function (rule) {
      var re = new RegExp(rule.re.source, rule.re.flags);
      var m;
      re.lastIndex = 0;
      while ((m = re.exec(src)) !== null) {
        issues.push({
          id: rule.id,
          message: rule.msg,
          fix: rule.fix,
          severity: rule.severity || 'error',
          text: m[0].trim(),
          index: m.index
        });
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    });
    return issues.sort(function (a, b) { return a.index - b.index; });
  }

  /* ---------------- 低分词升级 ---------------- */
  var UPGRADES = {
    good: ['beneficial', 'constructive', 'rewarding'],
    bad: ['harmful', 'undesirable', 'negative'],
    very: ['extremely', 'highly', 'particularly'],
    many: ['numerous', 'a growing number of'],
    think: ['believe', 'hold the view that', 'argue'],
    important: ['crucial', 'vital', 'significant'],
    big: ['considerable', 'substantial'],
    get: ['obtain', 'acquire', 'gain'],
    help: ['facilitate', 'contribute to'],
    show: ['demonstrate', 'indicate'],
    thing: ['factor', 'aspect', 'issue'],
    people: ['individuals', 'the public'],
    but: ['however', 'nevertheless'],
    so: ['therefore', 'consequently']
  };

  function findUpgrades(text) {
    var src = String(text || '');
    var out = [];
    Object.keys(UPGRADES).forEach(function (w) {
      var re = new RegExp('\\b' + w + '\\b', 'gi');
      var m = src.match(re);
      if (m && m.length) {
        out.push({ word: w, count: m.length, suggestions: UPGRADES[w] });
      }
    });
    return out.sort(function (a, b) { return b.count - a.count; });
  }

  /* ---------------- 连接词 / 重复词 / 模板句 ---------------- */
  var CONNECTIVES = [
    'however', 'moreover', 'furthermore', 'therefore', 'thus', 'besides', 'nevertheless',
    'consequently', 'meanwhile', 'first', 'second', 'third', 'firstly', 'secondly', 'thirdly', 'finally', 'yet',
    'admittedly', 'once', 'after all', 'ultimately', 'in the end', 'more importantly',
    'in addition', 'on the other hand', 'as a result', 'for instance', 'for example',
    'in conclusion', 'to sum up', 'in short', 'similarly', 'in contrast', 'overall'
  ];
  var TEMPLATES = [
    'with the development of', 'with the rapid development of', 'every coin has two sides',
    'as we all know', 'it is widely acknowledged that', 'there is no denying that',
    'last but not least', 'in a word', 'all in all'
  ];
  var STOPWORDS = ('a an the and or but if while of to in on at for from with by as is are was were be been being ' +
    'it its this that these those i you he she they we my your his her their our not no do does did have has had ' +
    'can could will would shall should may might must very more most much many some any all each every other into ' +
    'than then so such about over under between during before after up down out off again further once here there ' +
    'when where why how what which who whom whose').split(' ');

  function analyze(text) {
    var src = String(text || '');
    var ws = words(src);
    var ss = sentences(src);
    var ps = paragraphs(src);
    var tk = tokens(src);
    var counts = {};
    tk.forEach(function (w) {
      if (w.length <= 3 || STOPWORDS.indexOf(w) >= 0) return;
      counts[w] = (counts[w] || 0) + 1;
    });
    var repeated = Object.keys(counts).map(function (w) { return { word: w, count: counts[w] }; })
      .filter(function (x) { return x.count >= 4; })
      .sort(function (a, b) { return b.count - a.count; })
      .slice(0, 6);

    var usedConn = [];
    var lower = norm(src);
    CONNECTIVES.forEach(function (c) {
      var re = new RegExp('(^|[^a-z])' + c.replace(/\s+/g, '\\s+') + '([^a-z]|$)', 'i');
      if (re.test(lower)) usedConn.push(c);
    });

    var templates = [];
    TEMPLATES.forEach(function (t) {
      var idx = lower.indexOf(t);
      if (idx >= 0) templates.push(t);
    });

    var longest = { text: '', length: 0 };
    ss.forEach(function (s) {
      var len = words(s).length;
      if (len > longest.length) longest = { text: s, length: len };
    });

    return {
      words: ws.length,
      sentences: ss.length,
      paragraphs: ps.length,
      avgSentence: ss.length ? Math.round(ws.length / ss.length * 10) / 10 : 0,
      ttr: tk.length ? Math.round(new Set(tk).size / tk.length * 100) / 100 : 0,
      connectives: usedConn,
      repeated: repeated,
      templates: templates,
      longest: longest,
      sentenceList: ss
    };
  }

  /* ---------------- 分档 ---------------- */
  function bandOf(total) {
    if (total >= 86) return 14;
    if (total >= 72) return 11;
    if (total >= 52) return 8;
    if (total >= 38) return 5;
    return 2;
  }
  function bandLabel(band) {
    return { 14: '14 分档 · 优秀', 11: '11 分档 · 良好', 8: '8 分档 · 及格', 5: '5 分档 · 较弱', 2: '2 分档 · 待提高' }[band] || band + ' 分档';
  }
  function score106(band) { return Math.round(band / 15 * 106.5); }

  /* ---------------- 作文评分 ---------------- */
  function gradeWriting(text, prompt) {
    var p = prompt || {};
    var src = String(text || '');
    var st = analyze(src);
    var issues = runRules(src);
    var ups = findUpgrades(src);
    var minWords = p.minWords || 120;
    var maxWords = p.maxWords || 180;

    // 关键词覆盖
    var keywords = (p.keywords || []).map(function (k) {
      var variants = k.variants || [k.label];
      var hitAll = variants.some(function (v) { return norm(src).indexOf(norm(v)) >= 0; });
      var first2 = sentences(src).slice(0, 2).join(' ');
      var hitFront = variants.some(function (v) { return norm(first2).indexOf(norm(v)) >= 0; });
      return { label: k.label, hitAll: hitAll, hitFront: hitFront };
    });
    var hitCount = keywords.filter(function (k) { return k.hitAll; }).length;
    var kwRatio = keywords.length ? hitCount / keywords.length : 1;

    // 四维评分
    var lowSet = ['good', 'bad', 'very', 'many', 'think', 'important', 'big', 'thing', 'get', 'help', 'show', 'people'];
    var lowCount = 0;
    lowSet.forEach(function (w) { lowCount += (src.match(new RegExp('\\b' + w + '\\b', 'gi')) || []).length; });
    var lowDensity = st.words ? lowCount / st.words * 100 : 0;

    var lens = st.sentenceList.map(function (s) { return words(s).length; });
    var meanLen = lens.length ? lens.reduce(function (a, b) { return a + b; }, 0) / lens.length : 0;
    var sd = lens.length ? Math.sqrt(lens.reduce(function (a, b) { return a + (b - meanLen) * (b - meanLen); }, 0) / lens.length) : 0;
    var fillerStarts = (src.match(/(^|[.!?]\s+)(I think|I believe|We can|We should|First|Second|Third|In a word|All in all)/gi) || []).length;
    var longRatio = st.words ? words(src).filter(function (w) { return w.replace(/[^A-Za-z]/g, '').length >= 8; }).length / st.words : 0;
    var hasExample = /(for example|for instance|such as|according to|a study|a survey|research|percent|\b\d{4}\b)/i.test(src);
    var dev = hasExample ? 1 : (st.paragraphs >= 3 ? 0.6 : 0.3);
    var topicFront = keywords.length && keywords[0].hitFront ? 1 : 0;

    var content = 35 + 45 * kwRatio + 10 * topicFront + 10 * dev;
    if (st.words < minWords * 0.8) content -= 20;
    else if (st.words < minWords) content -= 10;
    if (st.words > maxWords + 20) content -= 5;
    content = clamp(Math.round(content), 0, 100);

    var lastPara = paragraphs(src).slice(-1)[0] || '';
    var hasConclusion = /(in conclusion|to sum up|in short|all in all|in a word|overall|therefore|ultimately|after all|in the end)/i.test(lastPara);
    var structure = 30;
    if (st.paragraphs >= 3) structure += 22;
    else if (st.paragraphs === 2) structure += 10;
    structure += Math.min(15, st.connectives.length * 5);
    if (hasConclusion) structure += 8;
    if (st.avgSentence >= 11 && st.avgSentence <= 28) structure += 8;
    if (st.avgSentence < 9) structure -= 6;
    structure = clamp(Math.round(structure), 0, 100);

    var errors = issues.filter(function (i) { return i.severity === 'error'; }).length;
    var warns = issues.length - errors;
    var language = 100 - errors * 10 - warns * 4 - Math.min(30, lowDensity * 3) - Math.min(12, fillerStarts * 4);
    if (sd < 4 && st.sentences >= 4) language -= 12;
    language = clamp(Math.round(language), 0, 100);

    var lexicon = 20 + st.ttr * 50 + longRatio * 150 + Math.min(10, ups.length * 3) - Math.min(15, lowDensity * 2);
    lexicon = clamp(Math.round(lexicon), 0, 100);

    var total = Math.round(content * 0.25 + structure * 0.20 + language * 0.25 + lexicon * 0.30);
    var band = bandOf(total);

    // 改进建议
    var tips = [];
    if (st.words < minWords) tips.push({ tone: 'warn', text: '字数不足 ' + minWords + ' 词，四级会直接扣分，建议补到 ' + minWords + '–' + maxWords + ' 词。' });
    if (keywords.length && !(keywords[0] && keywords[0].hitFront)) tips.push({ tone: 'warn', text: '开头两句话内没有点出「' + keywords[0].label + '」，容易被判偏题。' });
    if (st.connectives.length < 3) tips.push({ tone: 'tip', text: '段落之间缺少衔接词，可以加 However / Moreover / Therefore 这类信号词。' });
    if (!hasConclusion) tips.push({ tone: 'tip', text: '结尾段没有收束句，用 In conclusion / To sum up 把观点再扣一次题。' });
    if (ups.length) tips.push({ tone: 'tip', text: '把 ' + ups.slice(0, 3).map(function (u) { return u.word; }).join(' / ') + ' 换成更书面的表达，词汇分会更高。' });
    if (st.templates.length >= 2) tips.push({ tone: 'tip', text: '套话偏多（' + st.templates.slice(0, 2).join('、') + '），阅卷老师容易疲劳，建议换成具体表达。' });
    if (st.longest.length > 38) tips.push({ tone: 'tip', text: '有一句长达 ' + st.longest.length + ' 词，拆成两句更稳：' + st.longest.text.slice(0, 48) + '…' });
    if (!tips.length) tips.push({ tone: 'tip', text: '整体完成度不错，下一步可以尝试把两个简单句合并成定语从句或非谓语结构。' });

    return {
      stats: st,
      keywords: keywords,
      issues: issues,
      upgrades: ups,
      dims: { content: content, structure: structure, language: language, lexicon: lexicon },
      total: total,
      band: band,
      bandLabel: bandLabel(band),
      score: score106(band),
      tips: tips,
      target: { minWords: minWords, maxWords: maxWords }
    };
  }

  /* ---------------- 翻译评分 ---------------- */
  function gradeTranslation(answers, set) {
    var list = (set && set.sentences) || [];
    var answersArr = answers || [];
    var full = answersArr.join(' ').trim();
    var st = analyze(full);
    var issues = runRules(full);

    var points = [];
    list.forEach(function (s, i) {
      (s.points || []).forEach(function (p) {
        var covered = (p.variants || []).some(function (v) {
          return norm(full).indexOf(norm(v)) >= 0;
        });
        points.push({ label: p.label, covered: covered, sentence: i });
      });
    });
    var covered = points.filter(function (p) { return p.covered; }).length;
    var coverage = points.length ? covered / points.length : 0;

    var perSentence = list.map(function (s, i) {
      var en = String(answersArr[i] || '').trim();
      var ref = s.ref || '';
      var ops = en ? diff(en, ref) : [];
      var sim = en ? Math.round(similarity(en, ref) * 100) : 0;
      var sentPoints = points.filter(function (p) { return p.sentence === i; });
      var sentCovered = sentPoints.filter(function (p) { return p.covered; }).length;
      return {
        index: i,
        zh: s.zh,
        en: en,
        ref: ref,
        refHigh: s.refHigh || '',
        ops: ops,
        sim: sim,
        points: sentPoints,
        covered: sentCovered,
        total: sentPoints.length
      };
    });

    var refWords = list.reduce(function (n, s) { return n + countWords(s.ref || ''); }, 0);
    var ratio = refWords ? st.words / refWords : 0;
    var content = Math.round(coverage * 100);

    var noPunct = list.filter(function (s, i) {
      var en = String(answersArr[i] || '').trim();
      return en && !/[.!?]$/.test(en);
    }).length;
    var errors = issues.filter(function (i) { return i.severity === 'error'; }).length;
    var warns = issues.length - errors;
    var language = 100 - errors * 9 - warns * 3 - noPunct * 8;
    if (st.words && st.avgSentence < 6) language -= 10;
    if (ratio < 0.6) language -= 15;
    language = clamp(Math.round(language), 15, 100);

    var fluency = 55;
    if (ratio >= 0.8 && ratio <= 1.3) fluency += 35;
    else if (ratio >= 0.6 && ratio <= 1.5) fluency += 22;
    else fluency += 8;
    if (st.avgSentence >= 8 && st.avgSentence <= 28) fluency += 10;
    fluency = clamp(Math.round(fluency), 0, 100);

    var markers = (full.match(/\b(which|that|who|whose|because|although|though|when|while|whereas|if|since|as)\b/gi) || []).length;
    var nonFinite = (full.match(/\b(to\s+\w+|by\s+\w+ing|instead\s+of\s+\w+ing)\b/gi) || []).length;
    var variety = clamp(55 + markers * 5 + nonFinite * 6, 0, 100);

    var total = Math.round(content * 0.45 + language * 0.20 + fluency * 0.18 + variety * 0.17);
    var band = bandOf(total);

    var tips = [];
    var missing = points.filter(function (p) { return !p.covered; });
    if (missing.length) tips.push({ tone: 'warn', text: '有 ' + missing.length + ' 个信息点没译出来：' + missing.slice(0, 4).map(function (p) { return p.label; }).join('、') + '。漏译是四级翻译扣分最快的地方。' });
    if (ratio < 0.75) tips.push({ tone: 'warn', text: '译文长度只有参考译文的 ' + Math.round(ratio * 100) + '%，可能是漏句或过度简化。' });
    if (ratio > 1.45) tips.push({ tone: 'tip', text: '译文比参考译文长不少，注意不要逐字硬译，英文更讲究简洁。' });
    if (st.connectives.length < 2) tips.push({ tone: 'tip', text: '句与句之间几乎没有连接词，适当用 while / besides / as a result 让段落更连贯。' });
    if (markers < 2) tips.push({ tone: 'tip', text: '句式偏单一，可以尝试用 which 引导的定语从句或 -ing 状语把两句合并。' });
    if (!tips.length) tips.push({ tone: 'tip', text: '信息点覆盖完整，下一步可以对照「高分版」译文，看看同样的意思怎样写得更地道。' });

    return {
      stats: st,
      points: points,
      coverage: coverage,
      covered: covered,
      perSentence: perSentence,
      issues: issues,
      dims: { content: content, language: language, fluency: fluency, variety: variety },
      total: total,
      band: band,
      bandLabel: bandLabel(band),
      score: score106(band),
      tips: tips
    };
  }

  /* ---------------- 中文回译比对 ---------------- */
  var IGNORE_ZH = /[\s\u3000，。、；：""''！？,.;:!?"'()（）【】《》\-—…·]/;

  function charDiff(source, user) {
    var S = Array.from(String(source || ''));
    var U = Array.from(String(user || ''));
    var sIdx = [], sCh = [], uIdx = [], uCh = [];
    S.forEach(function (ch, i) { if (!IGNORE_ZH.test(ch)) { sIdx.push(i); sCh.push(ch); } });
    U.forEach(function (ch, i) { if (!IGNORE_ZH.test(ch)) { uIdx.push(i); uCh.push(ch); } });
    var n = sCh.length, m = uCh.length;
    var dp = [];
    for (var i = 0; i <= n; i++) dp.push(new Uint16Array(m + 1));
    for (i = n - 1; i >= 0; i--) {
      for (var j = m - 1; j >= 0; j--) {
        dp[i][j] = sCh[i] === uCh[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    var matchS = {}, matchU = {}, k = 0;
    i = 0; j = 0;
    while (i < n && j < m) {
      if (sCh[i] === uCh[j]) { matchS[sIdx[i]] = 1; matchU[uIdx[j]] = 1; i++; j++; k++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
      else j++;
    }
    var sMark = S.map(function (ch, idx) { return IGNORE_ZH.test(ch) ? true : !!matchS[idx]; });
    var uMark = U.map(function (ch, idx) { return IGNORE_ZH.test(ch) ? true : !!matchU[idx]; });
    return {
      sim: n ? k / n : (m ? 0 : 1),
      matched: k,
      total: n,
      source: S,
      user: U,
      sourceMarks: sMark,
      userMarks: uMark
    };
  }

  function stripZh(s) {
    return Array.from(String(s || '')).filter(function (ch) { return !IGNORE_ZH.test(ch); });
  }

  // 中文回译还原度：字频 Dice + 相邻二字组覆盖，顺序无关，适合判断「意思有没有对上」
  function zhSimilarity(source, user) {
    var A = stripZh(source);
    var B = stripZh(user);
    if (!A.length) return B.length ? 0 : 1;
    if (!B.length) return 0;
    var ca = {}, cb = {};
    A.forEach(function (c) { ca[c] = (ca[c] || 0) + 1; });
    B.forEach(function (c) { cb[c] = (cb[c] || 0) + 1; });
    var inter = 0, union = 0;
    var keys = {};
    Object.keys(ca).forEach(function (c) { keys[c] = 1; });
    Object.keys(cb).forEach(function (c) { keys[c] = 1; });
    Object.keys(keys).forEach(function (c) {
      inter += Math.min(ca[c] || 0, cb[c] || 0);
      union += Math.max(ca[c] || 0, cb[c] || 0);
    });
    var dice = union ? inter / union : 0;
    var ga = {}, gb = {};
    for (var i = 0; i < A.length - 1; i++) ga[A[i] + A[i + 1]] = 1;
    for (i = 0; i < B.length - 1; i++) gb[B[i] + B[i + 1]] = 1;
    var hit = 0, total = 0;
    Object.keys(ga).forEach(function (g) { total++; if (gb[g]) hit++; });
    var bigram = total ? hit / total : 0;
    return 0.55 * dice + 0.45 * bigram;
  }

  /* ---------------- 本地存储 ---------------- */
  function read(key, fallback) {
    try {
      var v = window.localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) { return fallback; }
  }
  function write(key, val) {
    try { window.localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; }
  }
  function remove(key) {
    try { window.localStorage.removeItem(key); } catch (e) { /* ignore */ }
  }
  function storageOK() {
    try {
      window.localStorage.setItem('__se_test', '1');
      window.localStorage.removeItem('__se_test');
      return true;
    } catch (e) { return false; }
  }

  function fmtDate(ts) {
    var d = new Date(ts);
    function p(n) { return n < 10 ? '0' + n : '' + n; }
    return (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日 ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  return {
    esc: esc,
    norm: norm,
    words: words,
    countWords: countWords,
    sentences: sentences,
    paragraphs: paragraphs,
    diff: diff,
    similarity: similarity,
    charDiff: charDiff,
    zhSimilarity: zhSimilarity,
    runRules: runRules,
    findUpgrades: findUpgrades,
    analyze: analyze,
    bandOf: bandOf,
    bandLabel: bandLabel,
    score106: score106,
    gradeWriting: gradeWriting,
    gradeTranslation: gradeTranslation,
    read: read,
    write: write,
    remove: remove,
    storageOK: storageOK,
    fmtDate: fmtDate,
    clamp: clamp
  };
})();
