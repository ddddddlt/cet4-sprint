/*
 * 作文题库：3 道题，每题配 8 / 11 / 14 分三档范文与点评
 * 字段：id / type / title / titleZh / directions / chineseHint / minWords / maxWords / minutes
 *      keywords（用于偏题检测）/ outline（写作提纲）/ models（范文，band 为档次）
 */
window.WRITING_DATA = [
  {
    id: 'w1',
    type: '议论文',
    title: 'The Importance of Reading Classics',
    titleZh: '阅读经典的重要性',
    directions: 'For this part, you are allowed 30 minutes to write an essay on the importance of reading classics. You should write at least 120 words but no more than 180 words.',
    chineseHint: '经典作品为什么值得读？在短视频时代，大学生应该怎样把经典重新放回生活里。',
    minWords: 120,
    maxWords: 180,
    minutes: 30,
    keywords: [
      { label: 'reading classics', variants: ['reading classics', 'read classics', 'reading the classics', 'classics'] },
      { label: 'importance', variants: ['importance', 'important', 'significance', 'significant', 'value'] },
      { label: 'college students', variants: ['college students', 'students', 'university students'] }
    ],
    outline: [
      { title: '第一段 · 引入 + 观点', hint: '用「短视频 vs 经典」的对比开头，两句话内点出 reading classics，并给出明确态度。' },
      { title: '第二段 · 两到三条理由', hint: '每条理由后面跟一句解释或例子：文化传承、深度思考、语言积累。' },
      { title: '第三段 · 具体做法 + 扣题', hint: '给可执行的建议（睡前 20 分钟、读书会），最后一句回到 importance。' }
    ],
    models: [
      {
        band: 8,
        text: 'Nowadays, more and more students like to watch short videos on the phone. They do not like to read classics. But I think reading classics is very important for us.\n\nFirst, classics can let us know the history and culture. Second, reading classics can make us think deeply. It is good for our study. Third, classics are written by famous writers, so we can learn many good words from them.\n\nIn a word, we should read more classics. We can read before we go to bed, and we can also borrow books from the library. I believe if we keep reading, we will become better students.',
        notes: [
          '结构完整、三段清楚，但开头只写现象，没有直接说明经典「为什么重要」。',
          '句式几乎都是简单句：can let us / can make us / it is good for，缺少从句和非谓语。',
          '用词偏口语：very important、good words、let us know，换成 vital / vocabulary / help us understand 会更好。',
          '三个理由并列列举，没有例子支撑，论证停在表面。'
        ]
      },
      {
        band: 11,
        text: 'Nowadays, college students are spending more and more time on short videos, while classics are left on the shelf. In my view, reading classics is of great importance to us.\n\nFirst, classics carry the wisdom of generations. When we read a novel or a poem that has survived for centuries, we are not only enjoying a story but also learning how people in the past understood life. Second, reading classics trains our patience and deep thinking, which are exactly what a fast-paced digital life takes away from us.\n\nTherefore, instead of blaming technology, we should make reading a daily habit. Twenty minutes before sleep, or a reading club with friends, can bring classics back into our lives. After all, books that survived time are worth our time.',
        notes: [
          '开头用对比切入，第二句明确表态，符合「两句内点题」。',
          '两个理由都有解释句，且用 which 从句把观点和现实连起来。',
          '结尾给出具体做法（睡前 20 分钟、读书会），再回扣主题。',
          '不足：例子仍然抽象，没有具体书名或数据；great importance 可以升级为 vital。'
        ]
      },
      {
        band: 14,
        text: 'Few habits shape a person\'s mind as profoundly as reading classics. Yet in an age when information arrives in fifteen-second clips, the great books that once anchored our thinking are increasingly left untouched.\n\nThe value of classics lies in their depth. A novel by Dickens or a poem by Du Fu does not simply tell a story; it invites readers to live inside another person\'s choices and consequences. This kind of reading builds empathy and patience, qualities that a scrolling thumb can never develop. Moreover, classics preserve the language at its best. Students who read them absorb sentence patterns and vocabulary that no word list can offer.\n\nAdmittedly, classics can feel slow at first. The solution is not to abandon them but to make them a habit: twenty minutes each night, a shared reading group, or a journal of favorite lines. Once the habit takes root, the reward is a mind that can concentrate, compare and reflect.\n\nIn an age of distraction, reading classics is not old-fashioned; it is a quiet act of independence.',
        notes: [
          '开篇用比较级 + 时代反差，第一段就立住观点，语言有节奏。',
          '论证有层次：不是并列三条，而是「深度 → 共情 → 语言」递进。',
          '具体例子（Dickens、Du Fu）让抽象观点落地。',
          '结尾用短句收束，把「读经典」重新定义为「独立思考」，完成了立意升华。'
        ]
      }
    ]
  },
  {
    id: 'w2',
    type: '书信',
    title: 'A Letter of Advice on a Volunteer Program',
    titleZh: '给朋友的一封建议信',
    directions: 'Suppose your friend Li Ming is hesitating about whether to join a volunteer program this summer. Write a letter to him, giving your advice. You should write at least 120 words but no more than 180 words. Do not sign your own name at the end of the letter; use "Li Hua" instead.',
    chineseHint: '朋友李明在犹豫要不要参加暑期志愿项目。写信给他建议，说明理由并提醒时间安排。',
    minWords: 120,
    maxWords: 180,
    minutes: 30,
    keywords: [
      { label: 'volunteer program', variants: ['volunteer program', 'volunteer', 'volunteering'] },
      { label: 'summer', variants: ['summer'] },
      { label: 'advice', variants: ['advice', 'advise', 'suggest', 'recommend', 'should', 'worth'] }
    ],
    outline: [
      { title: '称呼 + 第一段', hint: 'Dear Li Ming, 说明写信目的：得知你在犹豫，想给你一些建议。' },
      { title: '第二段 · 理由', hint: '两到三条具体理由：走出课堂、认识不同的人、简历加分，每条配一句解释。' },
      { title: '第三段 · 提醒 + 结尾', hint: '提醒规划时间，表达期待回复，最后 Yours, Li Hua。' }
    ],
    models: [
      {
        band: 8,
        text: 'Dear Li Ming,\n\nI hear that you do not know if you should join the volunteer program this summer. I write to give you some advice.\n\nI think you should go. First, it is good for your resume. Second, you can make many friends. Third, you can learn something new. These are all very important for your future.\n\nBut you also need to think about your study. You can make a plan before you go. If you have time, please write back and tell me your decision.\n\nYours,\nLi Hua',
        notes: [
          '书信格式正确，称呼、正文、落款齐全，这是书信题的基本分。',
          '三条理由太笼统：good for your resume / make many friends，没有展开说明。',
          'I write to give you some advice 偏生硬，更自然的是 I am writing to share my advice。',
          '结尾只提醒学习，没有回应朋友的犹豫，少了劝说的力度。'
        ]
      },
      {
        band: 11,
        text: 'Dear Li Ming,\n\nI was glad to hear from you. I know you are still not sure whether to join the volunteer program this summer, so I am writing to share my advice.\n\nIn my opinion, it is worth a try. First, volunteering gives you a chance to leave the classroom and see how the real world works. Second, you will meet people from different backgrounds, which can make you more open-minded. Third, the experience will make your application more competitive when you look for a job.\n\nOf course, you should plan your time carefully so that it will not affect your study. If you decide to go, please tell me and I will help you prepare.\n\nLooking forward to your reply.\n\nYours,\nLi Hua',
        notes: [
          '开头承接来信、点明目的，语气自然。',
          '三条理由各自带一句解释，其中一条用了 which 从句。',
          '考虑到朋友的顾虑（学习），主动提出帮助，符合建议信的功能。',
          '不足：理由仍偏「通用」，如果结合一个具体项目细节会更有说服力。'
        ]
      },
      {
        band: 14,
        text: 'Dear Li Ming,\n\nI was glad to hear from you, though I noticed that you are still hesitating about the volunteer program this summer. Let me tell you why I think it is worth joining.\n\nVolunteering is not merely a line on a resume. When you spend six weeks teaching children in a rural school, you learn to explain ideas clearly, to stay patient when plans fall apart, and to work with people whose lives are very different from yours. These are abilities no classroom can teach. Besides, the friends you make there often become the ones who support you long after the program ends.\n\nWhat worries you, I guess, is the time. A simple schedule — mornings for teaching, afternoons for reading — can keep your study on track. If you still feel uncertain, why not talk to a former volunteer first?\n\nI am looking forward to hearing your decision.\n\nYours,\nLi Hua',
        notes: [
          '开篇一句同时完成「回应来信 + 点出犹豫 + 表明立场」，信息密度高。',
          '把抽象理由写成具体场景（六周、乡村学校、上午教学下午读书），可信度高。',
          '主动猜中朋友的顾虑并给出解决方案，再补一个反问句推动决定。',
          '句式有变化：not merely、when 状语从句、why not 反问，语言得分高。'
        ]
      }
    ]
  },
  {
    id: 'w3',
    type: '议论文',
    title: 'The Impact of Short Videos on College Students',
    titleZh: '短视频对大学生的影响',
    directions: 'For this part, you are allowed 30 minutes to write an essay on the impact of short videos on college students. You may discuss both positive and negative effects. You should write at least 120 words but no more than 180 words.',
    chineseHint: '短视频既带来放松和知识，也偷走注意力。可以讨论正反两面，最后给出你的态度。',
    minWords: 120,
    maxWords: 180,
    minutes: 30,
    keywords: [
      { label: 'short videos', variants: ['short videos', 'short video', 'short-video'] },
      { label: 'college students', variants: ['college students', 'students', 'university students'] },
      { label: 'effects', variants: ['effect', 'effects', 'impact', 'influence', 'positive', 'negative'] }
    ],
    outline: [
      { title: '第一段 · 现象', hint: '用场景或数据开头，说明短视频在校园里有多普遍，最后一句点出「影响值得讨论」。' },
      { title: '第二段 · 正反两面', hint: '正面：放松、获取知识；负面：注意力被切碎、时间被偷走。用 On the one hand / On the other hand 分层。' },
      { title: '第三段 · 态度', hint: '不要停在「应该少看」，给可执行的做法（限时、手机放远），并回扣主题。' }
    ],
    models: [
      {
        band: 8,
        text: 'Nowadays, short videos are very popular among college students. Many students spend hours on them every day. Some people think it is good, and some people think it is bad.\n\nOn the one hand, short videos can help us relax. After a long day of study, watching funny videos is happy. We can also learn some knowledge from them. On the other hand, short videos waste our time. Some students watch them in class, and they cannot finish their homework.\n\nIn my opinion, we should control the time we spend on short videos. We can watch them for half an hour a day. It is good for our study and health.',
        notes: [
          '有「正反两面」的意识，On the one hand / On the other hand 用得对。',
          'watching funny videos is happy 是典型中式表达，应为 makes us happy。',
          'learn some knowledge 搭配不地道，应为 acquire knowledge / learn something。',
          '结尾建议太简单，没有解释为什么半小时合适。'
        ]
      },
      {
        band: 11,
        text: 'Short videos have become part of college life. Almost every student has an app on the phone, and it is common to see people scrolling in the dining hall or on the bus. This habit has both good and bad effects.\n\nOn the positive side, short videos offer quick relaxation and useful information. A five-minute video can explain a science idea or teach a cooking skill, which is convenient for students with little free time. On the negative side, they can take away attention. Many students plan to watch for ten minutes but end up spending an hour, and the time is usually taken from study or sleep.\n\nTherefore, the key is not to refuse short videos but to use them wisely. Setting a time limit, or keeping the phone out of the study room, can help us enjoy the fun without losing control.',
        notes: [
          '开头用校园场景切入，比空泛的 Nowadays 更有画面感。',
          '正反两面各有一个具体例子（五分钟科普、十分钟变一小时），论证有支撑。',
          '结尾用 not…but… 结构收束，态度清楚。',
          '不足：正面影响写得略单薄，可以补一句「算法也会带来信息茧房」。'
        ]
      },
      {
        band: 14,
        text: 'Walk into any campus dining hall and you will see the same scene: dozens of students staring at their phones, laughing at fifteen-second clips. Short videos have quietly become the background music of college life, and their influence deserves a closer look.\n\nTheir benefits are real. A well-made clip can explain a difficult concept in three minutes, or introduce a city you have never visited. For students who are tired after a long day of classes, a few funny videos are an easy way to relax. Yet the costs are equally real. Short videos are designed to be endless, and the brain quickly learns to expect the next reward. A student who opens the app "for a moment" may lose an hour of study time without noticing, and the habit makes deep reading feel unusually slow.\n\nThe solution is not to delete the app but to set boundaries. Keep the phone outside the study room, decide how long to watch before opening it, and leave one hour a day for something that requires patience. Used with discipline, short videos are entertainment; used without it, they become a thief of time.',
        notes: [
          '开篇用第二人称 + 场景描写，读者立刻被拉进画面。',
          '论证不只停在「好/坏」，而是解释机制：endless design、大脑期待下一个奖励。',
          '结尾对仗句（Used with… / used without…）收得漂亮，且没有说教味。',
          '词汇准确：background music、boundaries、a thief of time，都是可迁移的好表达。'
        ]
      }
    ]
  }
];
