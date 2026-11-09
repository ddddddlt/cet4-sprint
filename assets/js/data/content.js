/*
 * 阅读 / 听力练习内容：按四级题型编写的原创模拟题（非真题）
 * 阅读：passage 用 \n\n 分段；每题 evidence 需为 passage 中的原文片段，用于「定位句」高亮
 * 听力：transcript 由浏览器语音合成朗读，question.evidence 为原文关键句
 */
window.CET4_READING = [
  {
    id: 'r1',
    title: 'The Attention Trade',
    type: '仔细阅读',
    level: '中等',
    minutes: 8,
    intro: '数字生活 · 注意力经济',
    passage: `Every morning, Li Wei opens his phone to check the time and finds himself still scrolling twenty minutes later. Like millions of college students, he has noticed that his ability to sit with a book has quietly weakened. The culprit is not a lack of willpower but a system designed to capture attention.

Short videos work on the brain in a simple way. Each swipe delivers a small, unpredictable reward: a joke, a recipe, a surprising fact. Psychologists call this variable reward, the same mechanism that makes slot machines so hard to leave. Because the next video might be the best one yet, the brain keeps asking for one more. Over time, the habit becomes automatic: boredom of any kind is met with a reach for the phone.

The cost is easy to miss because it is paid in small amounts. A student who checks his phone every fifteen minutes may still finish his homework, but he finishes it with less depth. Studies of reading comprehension suggest that interruptions do not merely delay understanding; they change the way people read. When we expect to be interrupted, we skim rather than absorb.

Some students have begun to fight back with simple rules. One popular method is the phone prison: a drawer, a bag, or a friend's desk where the phone stays during study hours. Another is to replace the habit rather than resist it. Since the brain reaches for the phone when it feels bored, a five-minute walk or a glass of water can satisfy the same need.

None of these tricks is a cure. Attention, like a muscle, improves with practice and weakens with neglect. But the first step is to see the trade clearly: every minute of scrolling is a minute not spent on something that requires patience. The choice, once visible, becomes easier to make.`,
    questions: [
      {
        id: 'r1q1',
        stem: 'According to the author, what is the main reason students keep scrolling?',
        options: [
          'They have too much free time after class.',
          'The apps are designed to capture their attention.',
          'They lack basic time-management skills.',
          'Their homework is too easy to interest them.'
        ],
        answer: 1,
        evidence: 'The culprit is not a lack of willpower but a system designed to capture attention.',
        explain: '首段明确否定「缺乏意志力」，指出真正原因是「一个被设计来抓取注意力的系统」，对应 B。A、C、D 均未在文中作为主因出现。'
      },
      {
        id: 'r1q2',
        stem: 'Why does the author compare short videos to slot machines?',
        options: [
          'Both are banned on campus.',
          'Both require users to pay money.',
          'Both give rewards that users cannot predict.',
          'Both are designed for older audiences.'
        ],
        answer: 2,
        evidence: 'Psychologists call this variable reward, the same mechanism that makes slot machines so hard to leave.',
        explain: '原文关键词 variable reward（可变奖励）说明两者都靠「不可预测的奖励」让人停不下来，对应 C。注意同义替换：unpredictable ≈ variable。'
      },
      {
        id: 'r1q3',
        stem: 'What happens when readers expect to be interrupted?',
        options: [
          'They read more carefully to save time.',
          'They remember more details than usual.',
          'They give up reading altogether.',
          'They skim instead of absorbing the text.'
        ],
        answer: 3,
        evidence: 'When we expect to be interrupted, we skim rather than absorb.',
        explain: '定位句直接给出答案：预期被打断时，人会「略读而非吸收」，对应 D。skim（略读）与 absorb（吸收）是本题的考点词。'
      },
      {
        id: 'r1q4',
        stem: 'What is the "phone prison"?',
        options: [
          'An app that locks the phone for hours.',
          'A place where the phone is kept during study.',
          'A school rule against using phones.',
          'A punishment for students who scroll in class.'
        ],
        answer: 1,
        evidence: "a drawer, a bag, or a friend's desk where the phone stays during study hours",
        explain: '原文用抽屉、书包、朋友的桌子来定义 phone prison，即「学习期间手机待着的地方」，是物理隔离而非软件或校规，故选 B。'
      },
      {
        id: 'r1q5',
        stem: 'What is the author\'s attitude toward attention?',
        options: [
          'It is fixed and cannot be changed.',
          'It can be trained like a muscle.',
          'It matters less than willpower.',
          'It is damaged forever by phones.'
        ],
        answer: 1,
        evidence: 'Attention, like a muscle, improves with practice and weakens with neglect.',
        explain: '末段把注意力比作肌肉：练习会增强，荒废会减弱，说明注意力可以通过训练改善，对应 B。'
      }
    ]
  },
  {
    id: 'r2',
    title: 'Why Paper Still Matters',
    type: '仔细阅读',
    level: '中等',
    minutes: 8,
    intro: '阅读方式 · 纸质与屏幕',
    passage: `Few predictions have failed as completely as the death of the printed book. A decade ago, analysts were confident that e-readers would replace paper within a few years. Today, print still accounts for most book sales, and young readers are often the ones pushing back.

The reasons are partly physical. A printed page does not glow, buzz, or offer a link to somewhere else. That limitation turns out to be a feature. When researchers compare reading on paper and on screen, they often find a small but consistent advantage for paper in understanding and memory, especially for longer texts. One explanation is that paper gives readers a sense of place: the mind remembers that an argument appeared near the top of a left-hand page. Screens, which scroll, offer no such landmarks.

Digital reading is not the enemy, however. For searching, highlighting, and carrying hundreds of books, nothing beats a tablet. The problem begins when the same device is used for study and for entertainment. The moment a message arrives, the reader must decide whether to respond, and each decision costs a little attention.

Publishers have noticed. Some now sell digital-plus-paper bundles, and a few experimental bookstores have opened on campuses, offering quiet rooms as much as books. The message is not that technology is bad, but that different tools suit different tasks. A student reviewing for an exam may do better with a printed review sheet; the same student researching a topic will be far faster online.

The debate, in the end, is less about paper than about intention. A book, printed or digital, asks for a kind of attention that few screens are designed to protect. Choosing where to read may be the simplest way to choose how well we read.`,
    questions: [
      {
        id: 'r2q1',
        stem: 'What did analysts wrongly predict about e-readers?',
        options: [
          'They would be too expensive for students.',
          'They would replace printed books quickly.',
          'They would damage readers\' eyesight.',
          'They would be banned in bookstores.'
        ],
        answer: 1,
        evidence: 'A decade ago, analysts were confident that e-readers would replace paper within a few years.',
        explain: '首段说分析人士曾确信电子阅读器会在几年内取代纸质书，而事实并非如此，对应 B。wrongly predict 与原文 failed 呼应。'
      },
      {
        id: 'r2q2',
        stem: 'Why does paper help readers remember according to the passage?',
        options: [
          'It is lighter to carry than a tablet.',
          'It uses larger and clearer fonts.',
          'It gives readers a sense of place.',
          'It costs less than digital books.'
        ],
        answer: 2,
        evidence: 'paper gives readers a sense of place',
        explain: '第二段解释纸质书优势时说它给读者「空间感」——能记住某个论点在左页上方，而滚动的屏幕没有这种地标，对应 C。'
      },
      {
        id: 'r2q3',
        stem: 'What advantage of digital reading does the author admit?',
        options: [
          'It improves memory for long texts.',
          'It is better for searching and carrying books.',
          'It protects readers from interruptions.',
          'It makes reading more intentional.'
        ],
        answer: 1,
        evidence: 'For searching, highlighting, and carrying hundreds of books, nothing beats a tablet.',
        explain: '第三段开头让步：检索、标注、携带大量书籍，平板无可替代，对应 B。作者态度是「各有适用场景」，不是全盘否定。'
      },
      {
        id: 'r2q4',
        stem: 'What problem does the author point out in paragraph 3?',
        options: [
          'Tablets are too heavy for students to carry.',
          'The same device mixes study with entertainment.',
          'Publishers refuse to sell paper books.',
          'Digital books are poorly edited.'
        ],
        answer: 1,
        evidence: 'The problem begins when the same device is used for study and for entertainment.',
        explain: '定位句指出问题始于「同一台设备既用于学习又用于娱乐」，消息一来自制力就被消耗，对应 B。'
      },
      {
        id: 'r2q5',
        stem: 'What is the main message of the passage?',
        options: [
          'Paper books are always better than screens.',
          'Technology has made reading less serious.',
          'Different tools suit different tasks, and intention matters.',
          'Bookstores will soon replace online libraries.'
        ],
        answer: 2,
        evidence: 'Choosing where to read may be the simplest way to choose how well we read.',
        explain: '第四段明说「不是技术不好，而是不同工具适合不同任务」，末段落到「意图」：选择在哪读，就是选择读得多好。C 概括最全面。'
      }
    ]
  }
];

window.CET4_LISTENING = [
  {
    id: 'l1',
    title: 'Choosing a Volunteer Program',
    type: '长对话',
    level: '中等',
    seconds: 110,
    intro: '校园对话 · 暑期志愿项目',
    transcript: `M: Professor Chen, do you have a minute? I am trying to choose a volunteer program for the summer.

W: Of course. Which ones are you considering?

M: There are two. One is teaching English in a rural school for six weeks. The other is helping at an animal shelter in the city for three weeks.

W: What matters more to you, the experience or the time?

M: I need to be back by August because of my internship. But I also want something I can write about in my application.

W: Then think about what you can actually describe. At the shelter you will work with staff and handle animals, which gives you concrete stories. At the school you will plan lessons, which shows organization.

M: I had not thought about it that way. The teaching one also requires a training weekend before we leave.

W: That is actually a good sign. Programs that train volunteers usually support them better.

M: So you would choose the teaching one?

W: I would choose the one you can commit to fully. Six weeks is long, but if you are excited about it, the time will pass quickly.

M: You are right. I will apply for the teaching program tonight.`,
    questions: [
      {
        id: 'l1q1',
        stem: 'What is the man trying to decide?',
        options: [
          'Which internship to apply for.',
          'Which volunteer program to join.',
          'Whether to study abroad this summer.',
          'How to train animals at a shelter.'
        ],
        answer: 1,
        evidence: 'I am trying to choose a volunteer program for the summer.',
        explain: '对话开头男士直接说明来意：在选暑期志愿项目，对应 B。internship 是他八月必须回来的原因，不是讨论对象。'
      },
      {
        id: 'l1q2',
        stem: 'Why does the man need to return by August?',
        options: [
          'His internship starts then.',
          'The new school term begins.',
          'His family needs his help.',
          'He has booked a trip with friends.'
        ],
        answer: 0,
        evidence: 'I need to be back by August because of my internship.',
        explain: '男士明确说因为实习必须在八月前回来，对应 A。听力题要注意「原因」信号词 because。'
      },
      {
        id: 'l1q3',
        stem: 'What does the woman suggest the man consider?',
        options: [
          'The pay offered by each program.',
          'The distance from the campus.',
          'Which program he can fully commit to.',
          'How many volunteers each program takes.'
        ],
        answer: 2,
        evidence: 'I would choose the one you can commit to fully.',
        explain: '女士的建议是「选你能全力投入的那个」，对应 C。commit to 是本题的核心短语。'
      }
    ]
  },
  {
    id: 'l2',
    title: 'The Four-Day Week',
    type: '听力篇章',
    level: '稍难',
    seconds: 95,
    intro: '社会话题 · 工作制度',
    transcript: `Could a four-day workweek become normal? In several countries, companies have tested the idea by paying employees the same salary for one fewer day of work.

The results have surprised even the organizers. Most companies reported that productivity stayed the same or improved, and employees reported far less stress. Meetings became shorter because there was less time to fill. Workers also said they used their extra day for errands and rest, which made the remaining four days more focused.

Critics point out that the tests involved mostly office jobs, where output is easy to measure and flexible. Hospitals, factories, and restaurants cannot simply close for an extra day. There is also the question of customers: if a company is closed on Friday, someone must still answer the phone.

Still, the experiments have changed the conversation. Instead of asking whether people work enough hours, managers are now asking whether those hours are used well. For students, the lesson may be the same: a longer study session is not automatically a better one.`,
    questions: [
      {
        id: 'l2q1',
        stem: 'What did most companies report about the four-day week?',
        options: [
          'Productivity fell sharply.',
          'Salaries had to be cut.',
          'Productivity stayed the same or improved.',
          'Most employees quit.'
        ],
        answer: 2,
        evidence: 'Most companies reported that productivity stayed the same or improved',
        explain: '原文直接给出结果：多数公司报告生产率持平或提高，对应 C。注意 stayed the same or improved 的并列结构。'
      },
      {
        id: 'l2q2',
        stem: 'What is one criticism of the idea?',
        options: [
          'It only works for hospitals.',
          'It cannot be applied to all kinds of jobs.',
          'Employees dislike the extra day off.',
          'It makes meetings much longer.'
        ],
        answer: 1,
        evidence: 'Critics point out that the tests involved mostly office jobs',
        explain: '批评者指出试验多为办公室岗位，医院、工厂、餐厅无法整体多休一天，即「并非所有工作都适用」，对应 B。'
      },
      {
        id: 'l2q3',
        stem: 'What lesson does the speaker draw for students?',
        options: [
          'Longer study sessions are not always better.',
          'Students should study fewer hours each week.',
          'Group study is more effective than solo study.',
          'Rest should be avoided before exams.'
        ],
        answer: 0,
        evidence: 'a longer study session is not automatically a better one',
        explain: '结尾把话题迁移到学生：更长的学习时段不等于更好，对应 A。这是篇章题常见的「结尾引申」考法。'
      }
    ]
  }
];
