/*
 * 词频分层（用于阅读点词的着色）
 * high：四级阅读/听力中高频出现的核心词 → 红色
 * mid ：中频 → 黄色
 * 其余词库词 → 绿色（低频）；不在词库的词 → 浅绿（库外）
 * 仅作学习提示，不是严格语料统计。
 */
window.CET4_FREQ = {
  high: 'ability abroad accept account achieve action active actual address admit advance advantage advice affect' +
    'afford agreement aim allow amount apply approach argue arise attach attend attention attitude authority' +
    'available average avoid aware balance base basic bear benefit beyond blame board brief broad budget burden' +
    'calm campaign campus cancel capital career case cause central century certain challenge character charge chief' +
    'claim climate code college combine comfort command comment community company compare compete complain complete' +
    'concern condition conduct confirm conflict connect consider consist constant contain content control cost' +
    'course cover create credit crime crisis critical culture current custom damage data debate decline decrease' +
    'degree delay demand depend describe design detail develop device differ difference direct direction discover' +
    'discuss disease distance divide doubt drop due duty earn economy edge educate effect effective effort elect' +
    'element employ enable encourage energy engage ensure entire environment equal error escape especially' +
    'essential establish estimate event evidence exceed exchange exist expect experience experiment expert explain' +
    'express extend extra factor fail fair familiar feature figure final financial firm fit fix focus force foreign' +
    'former forward freedom frequent fuel function fund gain gap general generation global govern grant guarantee' +
    'guard guide habit handle harm human identify ignore image imagine impact improve include income increase' +
    'indeed independent indicate industry influence inform initial injury insist inspire install instance instead' +
    'intend interest international introduce invest involve issue item judge knowledge lack legal level limit link' +
    'local loss major manage matter measure media memory mention message method model modern natural nature' +
    'necessary network normal note notice occur offer official operate opinion opportunity oppose option organize' +
    'outcome particular partner perform period personal physical policy political popular population position' +
    'positive prepare present president press pressure prevent primary process progress project promise proper' +
    'property protect prove purpose quality raise range rate reality receive recent recognize record reduce refer' +
    'reflect region regular relate relationship release remain remove repeat replace represent require research' +
    'resource respect respond response reveal review risk role score sense serve service shape sign significant' +
    'similar situation society solve source specific staff stage standard state statement strategy structure style' +
    'subject suggest system theory training treatment value various view weight work world write wrong year young',
  mid: 'absorb abstract academic access accompany accomplish accurate acquire adapt adequate adjust admire adopt' +
    'advocate aggressive alternative ambition analyze announce annual anxious apparent appeal appreciate' +
    'appropriate approve arrange artificial aspect assess assign assist assume assure athlete atmosphere attack' +
    'attempt attract audience automatic award background barrier behave behavior belief belong bind bitter blank' +
    'blind block bond border borrow bother branch brand brave breed brilliant broadcast burst bury calculate' +
    'capable capture carbon cash cast casual category celebrate ceremony chain champion channel chapter charity' +
    'chart chase cheat chemical chest chief childhood circumstance citizen civil clarify classic classify clerk' +
    'client cliff clinic clue coach coast coin colleague collect column commercial commit committee communicate' +
    'companion conference confidence confident confuse congratulate connection consequence considerable construct' +
    'consult consume container contest continent contract contrast convert convey convince cooper cope core correct' +
    'correspond corridor cottage cotton council count counter couple courage court crack craft crash crazy creature' +
    'crew crop cross crowd crown cruel crush cure curiosity curve cycle darkness decorate defend define delicate' +
    'deliver department deposit depth desert destination disaster discipline discount distinct distribute district' +
    'disturb domestic dominate drag drama drug dull dust eager ease edit edition electronic embarrass emerge' +
    'emergency emotion employ employee employer employment empty encounter engine engineer enhance enormous' +
    'enterprise entertain enthusiasm entrance entry equip equipment evaluate eventually evil examine excellent' +
    'excite exclude excuse exhaust exhibit exhibition expand expense expensive export extent external extreme' +
    'facility factor fade failure faith false fame fancy fare fashion fate fault favor favourite federal fee' +
    'feedback fellow female festival fever fiction fierce file flame flash flat flavour flee flight float flood' +
    'flow fluent fold folk fond forbid forecast formal formula fortune foundation frame freeze friendship frighten' +
    'fundamental furniture further gather gaze generous gentle gesture giant glance globe goods government grade' +
    'gradual graduate grain grand graph grasp grateful gravity greet grip guilty harmony harsh harvest headline' +
    'heal height hence hero hide highway hint historical hobby honour hook horizon horrible household housing' +
    'hunger hunt hurry hurt idle illegal illustrate imitate immigrant imply impose impression index inevitable' +
    'infect inherit initiative injure innocent input insect insert inspect instant institute instruct instrument' +
    'insurance intense intention internal interpret interrupt interval interview invent invest investigate invite' +
    'island joint journal junior justice justify label laboratory landscape latter lawyer layer lean lecture lend' +
    'length license lifetime lift liquid literature load loan locate lock logic loose loyal luggage luxury magic' +
    'manner manual margin marriage mask mass master match material mature maximum mechanic medical medicine medium' +
    'melt merely metal mild military minimum minister mirror mission mix mixture mobile mode moderate monitor mood' +
    'moral motion motor mount multiple murder muscle mystery myth'
};
