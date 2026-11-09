/*
 * 选词填空 / 长篇匹配 题库（原创模拟题，非真题）
 *
 * 选词填空：
 *   passage 用 {{1}}…{{10}} 标记空格；bank 为 15 个备选词（A–O）
 *   blanks[].answer 为备选词字母，explain 为解析
 *
 * 长篇匹配：
 *   paragraphs 为带字母的段落；statements[].answer 为目标段落字母
 */
window.CET4_CLOZE = [
  {
    id: 'c1',
    type: '选词填空',
    title: 'Social Media and Mental Health',
    topic: '数字生活',
    level: '中等',
    minutes: 10,
    passage: 'Social media has changed the way young people communicate, but it has also created new {{1}} for their mental health. A recent survey of 2,000 college students found that those who spent more than three hours a day on social apps were twice as likely to report feeling {{2}} and lonely.\n\nResearchers do not {{3}} that social media can be harmful. Used carefully, it helps students stay in touch with friends and {{4}} ideas. The real problem is {{5}}: users see the best moments of other people\'s lives, which makes their own life seem {{6}}.\n\nSome students have started to {{7}} their habits. They turn off notifications, set a time {{8}} for each app, or leave their phones in another room while studying. These small {{9}} seem to work better than sudden, dramatic ones.\n\nExperts {{10}} that the goal is not to quit social media but to use it with intention.',
    bank: [
      { k: 'A', w: 'adjust', pos: 'v.' },
      { k: 'B', w: 'anxious', pos: 'adj.' },
      { k: 'C', w: 'benefit', pos: 'n.' },
      { k: 'D', w: 'challenges', pos: 'n.' },
      { k: 'E', w: 'changes', pos: 'n.' },
      { k: 'F', w: 'comparison', pos: 'n.' },
      { k: 'G', w: 'curious', pos: 'adj.' },
      { k: 'H', w: 'deny', pos: 'v.' },
      { k: 'I', w: 'exchange', pos: 'v.' },
      { k: 'J', w: 'limit', pos: 'n.' },
      { k: 'K', w: 'ordinary', pos: 'adj.' },
      { k: 'L', w: 'pressure', pos: 'n.' },
      { k: 'M', w: 'refuse', pos: 'v.' },
      { k: 'N', w: 'replace', pos: 'v.' },
      { k: 'O', w: 'suggest', pos: 'v.' }
    ],
    blanks: [
      { no: 1, answer: 'D', explain: 'created new ___ 需要名词复数作宾语；challenges 表示「挑战」，符合语境。' },
      { no: 2, answer: 'B', explain: 'feel ___ and lonely，与 lonely 并列，需要形容词；anxious 表示「焦虑的」。' },
      { no: 3, answer: 'H', explain: 'do not ___ that... 后接宾语从句，需要动词原形；deny 表示「否认」，与下文「用得好也有帮助」形成转折。' },
      { no: 4, answer: 'I', explain: 'stay in touch with friends and ___ ideas，与前面动词并列；exchange ideas 是固定搭配「交流想法」。' },
      { no: 5, answer: 'F', explain: '冒号后解释「总看到别人生活里最好的时刻」，这正是 comparison（比较）。' },
      { no: 6, answer: 'K', explain: 'make their own life seem ___，需要形容词作表语；ordinary 表示「平淡无奇的」，与前文「别人的高光时刻」对比。' },
      { no: 7, answer: 'A', explain: 'started to ___ their habits，需要动词原形；adjust 表示「调整」。' },
      { no: 8, answer: 'J', explain: 'a time ___ for each app，需要名词；time limit 表示「时间限制」。' },
      { no: 9, answer: 'E', explain: 'These small ___ 需要复数名词，指上文那些小调整；changes 表示「改变」。' },
      { no: 10, answer: 'O', explain: 'Experts ___ that... 后接宾语从句，需要动词原形；suggest 表示「建议、指出」。' }
    ]
  },
  {
    id: 'c2',
    type: '选词填空',
    title: 'Why Cities Need Green Space',
    topic: '城市与环境',
    level: '中等',
    minutes: 10,
    passage: 'More than half of the world\'s population now lives in cities, and that number is still {{1}}. As cities grow, the value of green space becomes easier to {{2}}. A park is not simply a place to relax; it also helps to {{3}} air pollution and keep summer temperatures {{4}}.\n\nStudies show that people who live within a short walk of a park are more {{5}} to exercise regularly. Children who play outdoors develop better {{6}} and sleep longer. Even a few trees along a street can make a {{7}} to how a neighbourhood feels.\n\nHowever, green space is not {{8}} distributed. Wealthier districts often have more parks, while poorer areas may have none. City planners are now trying to {{9}} that every resident can reach a park within ten minutes.\n\nThe {{10}} is money, but the benefits are long-lasting.',
    bank: [
      { k: 'A', w: 'attention', pos: 'n.' },
      { k: 'B', w: 'challenge', pos: 'n.' },
      { k: 'C', w: 'difference', pos: 'n.' },
      { k: 'D', w: 'equally', pos: 'adv.' },
      { k: 'E', w: 'ensure', pos: 'v.' },
      { k: 'F', w: 'falling', pos: 'v.-ing' },
      { k: 'G', w: 'ignore', pos: 'v.' },
      { k: 'H', w: 'increase', pos: 'v.' },
      { k: 'I', w: 'likely', pos: 'adj.' },
      { k: 'J', w: 'lower', pos: 'adj.' },
      { k: 'K', w: 'rarely', pos: 'adv.' },
      { k: 'L', w: 'recognise', pos: 'v.' },
      { k: 'M', w: 'reduce', pos: 'v.' },
      { k: 'N', w: 'rising', pos: 'v.-ing' },
      { k: 'O', w: 'solution', pos: 'n.' }
    ],
    blanks: [
      { no: 1, answer: 'N', explain: 'is still ___ 表示「仍在上升」，用现在分词 rising 构成进行时。' },
      { no: 2, answer: 'L', explain: 'easier to ___ 需要动词原形；recognise 表示「认识到」，与 as cities grow 呼应。' },
      { no: 3, answer: 'M', explain: 'helps to ___ air pollution 需要动词原形；reduce pollution 是固定搭配「减少污染」。' },
      { no: 4, answer: 'J', explain: 'keep summer temperatures ___ 需要形容词作宾补；lower 表示「更低的」。' },
      { no: 5, answer: 'I', explain: 'be more ___ to do sth 是固定结构「更有可能做某事」，填 likely。' },
      { no: 6, answer: 'A', explain: 'develop better ___ 需要名词；attention 表示「注意力」，与儿童发展话题一致。' },
      { no: 7, answer: 'C', explain: 'make a ___ to 是固定搭配「对……产生影响」，填 difference。' },
      { no: 8, answer: 'D', explain: 'is not ___ distributed 需要副词修饰过去分词；equally 表示「平等地」。' },
      { no: 9, answer: 'E', explain: 'trying to ___ that... 需要动词原形；ensure 表示「确保」。' },
      { no: 10, answer: 'B', explain: 'The ___ is money 需要单数名词作主语；challenge 表示「挑战」，与 but the benefits... 形成转折。' }
    ]
  }
];

window.CET4_MATCHING = [
  {
    id: 'm1',
    type: '长篇匹配',
    title: 'How Cities Are Rethinking Public Space',
    topic: '城市生活',
    level: '稍难',
    minutes: 15,
    paragraphs: [
      { k: 'A', text: 'For most of the last century, city streets were designed around one purpose: moving cars. Today, planners in many cities are asking a different question — what would happen if streets were designed around people instead? The answers are reshaping neighbourhoods, and not always without conflict.' },
      { k: 'B', text: 'The change began during the pandemic. When indoor dining closed, cities from New York to Seoul let restaurants set tables on the street. What was meant to be temporary proved popular: outdoor seating brought life back to quiet blocks and gave pedestrians more room. Many cities have since made these permits permanent.' },
      { k: 'C', text: 'Barcelona has gone further with its "superblocks". Several streets are closed to through traffic and turned into public squares, with benches, trees and small playgrounds where parking spaces used to be. Early studies report less noise, cleaner air and more people walking. Similar experiments are under way in Madrid and Vienna.' },
      { k: 'D', text: 'Schools are another source of space. In Paris, more than 100 schoolyards have been redesigned and opened to the public after class hours. The yards now contain gardens, climbing structures and shaded seats. City officials say the project gives children in crowded districts somewhere to play and gives parents a safe place to meet.' },
      { k: 'E', text: 'The health arguments are strong. Research links regular access to green space with lower stress, better sleep and more physical activity. A park within a ten-minute walk is now used as a measure of a healthy neighbourhood in several countries. Doctors in some cities even write "park prescriptions" for patients with mild anxiety.' },
      { k: 'F', text: 'Not everyone is convinced. Shop owners in several districts have complained that removing parking spaces drives away customers who arrive by car. Delivery drivers say narrower streets make their work slower. City governments respond that pedestrian areas usually increase foot traffic and sales, but the evidence is mixed and the transition can take years.' },
      { k: 'G', text: 'Safety is a common concern, especially for women and older residents. Studies suggest that well-lit streets, clear sightlines and a mix of activities matter more than the number of police cameras. A square that is used at different times of day — by children after school, by workers in the evening — tends to feel safer than an empty one.' },
      { k: 'H', text: 'Community gardens have become one of the most popular forms of shared space. In Berlin, residents can apply to turn vacant land into gardens where they grow vegetables and flowers. The waiting lists are long, and the gardens often become social centres, with cooking evenings and classes for children.' },
      { k: 'I', text: 'Street markets offer another model. In Bangkok, night markets occupy roads that are closed to traffic after dark; in Mexico City, Sunday markets take over main avenues. Vendors pay a small fee, and the city gains a lively public space at almost no construction cost.' },
      { k: 'J', text: 'Money remains the hardest question. Few cities can afford large new parks, so many projects combine public budgets with national funds, private donations and money from developers who are required to contribute when they build nearby. Maintenance is often the greater challenge: a park that is not looked after quickly loses visitors.' },
      { k: 'K', text: 'Some cities are now using data to guide small decisions. Sensors count pedestrians, maps show where shade is missing, and apps let residents report broken benches. The information helps officials place a tree or a bench where it will actually be used, rather than where it is easiest to install.' },
      { k: 'L', text: 'The lesson across these experiments is consistent. Public space works best when residents are involved in designing it, when it is cared for over time, and when it serves more than one group. A street is not simply a pipe for cars; it is the largest public room a city owns.' }
    ],
    statements: [
      {
        id: 'm1s1',
        text: 'Regular contact with green space is associated with less stress and better sleep.',
        answer: 'E',
        explain: 'E 段开头即指出「研究把经常接触绿地与压力更低、睡眠更好、活动更多联系起来」，并提到 park prescriptions。'
      },
      {
        id: 'm1s2',
        text: 'Some shop owners worry that removing parking spaces will cost them customers who drive.',
        answer: 'F',
        explain: 'F 段第二句：店主抱怨取消停车位会赶走开车来的顾客（drives away customers who arrive by car）。'
      },
      {
        id: 'm1s3',
        text: 'Cities collect information to decide where a bench or tree is really needed.',
        answer: 'K',
        explain: 'K 段说城市用传感器、地图和 App 收集数据，帮助官员把树种在「真正会被使用的地方」。'
      },
      {
        id: 'm1s4',
        text: 'Opening school playgrounds after class provides space for children and parents.',
        answer: 'D',
        explain: 'D 段讲巴黎把 100 多个校园操场改造并在课后向公众开放，给孩子玩耍空间、给家长安全的见面场所。'
      },
      {
        id: 'm1s5',
        text: 'Residents can use empty land to grow vegetables and flowers.',
        answer: 'H',
        explain: 'H 段：柏林居民可以申请把空地变成菜园，种蔬菜和花，等待名单很长。'
      },
      {
        id: 'm1s6',
        text: 'Public space projects are usually paid for by several different sources.',
        answer: 'J',
        explain: 'J 段列出公共预算、国家资金、私人捐赠和开发商出资等多种来源（combine ... with ...）。'
      },
      {
        id: 'm1s7',
        text: 'Outdoor dining started as a temporary measure and later became permanent.',
        answer: 'B',
        explain: 'B 段：疫情时允许餐厅在街上摆桌，本意是临时的，后来许多城市把许可永久化（made these permits permanent）。'
      },
      {
        id: 'm1s8',
        text: 'Good lighting and a mix of activities are more important for safety than cameras.',
        answer: 'G',
        explain: 'G 段明确比较：照明好、视线通透、活动多样比摄像头数量更重要（matter more than the number of police cameras）。'
      },
      {
        id: 'm1s9',
        text: 'Public space works best when local people help design and look after it.',
        answer: 'L',
        explain: 'L 段总结：居民参与设计、长期维护、服务多类人群时，公共空间效果最好。'
      },
      {
        id: 'm1s10',
        text: 'Some cities have replaced parking spaces with places to sit and play.',
        answer: 'C',
        explain: 'C 段：巴塞罗那把街道改成公共广场，长椅、树木和小游乐场就建在原来的停车位上。'
      }
    ]
  }
];
