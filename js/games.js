// Мини-игры. Игра в слова: уровни и раскладка кроссворда.
// Слово: [английское, перевод]. Что не поместилось в сетку, засчитывается как бонусное.

const word = (en, ru) => ({ en, ru });

const HAND_MADE_LEVELS = [
  ['CAT', [word('cat', 'кот'), word('act', 'действовать')]],
  ['DOG', [word('dog', 'собака'), word('god', 'бог'), word('go', 'идти')]],
  ['SUN', [word('sun', 'солнце'), word('us', 'нас')]],
  ['TEA', [word('tea', 'чай'), word('eat', 'есть'), word('ate', 'съел')]],
  ['CARE', [word('care', 'забота'), word('car', 'машина'), word('race', 'гонка'), word('ear', 'ухо'), word('are', 'есть (они)')]],
  ['PLAY', [word('play', 'играть'), word('pay', 'платить'), word('lay', 'класть')]],
  ['HOME', [word('home', 'дом'), word('me', 'мне'), word('he', 'он')]],
  ['GAME', [word('game', 'игра'), word('age', 'возраст'), word('me', 'мне')]],
  ['TIME', [word('time', 'время'), word('item', 'предмет'), word('it', 'это'), word('me', 'мне')]],
  ['READ', [word('read', 'читать'), word('dear', 'дорогой'), word('red', 'красный'), word('ear', 'ухо'), word('are', 'есть (они)')]],
  ['LIVE', [word('live', 'жить'), word('evil', 'зло'), word('lie', 'врать')]],
  ['STOP', [word('stop', 'стоп'), word('spot', 'пятно'), word('post', 'пост'), word('top', 'верх'), word('pot', 'кастрюля'), word('so', 'так'), word('to', 'к')]],
  ['NAME', [word('name', 'имя'), word('mean', 'значить'), word('man', 'мужчина'), word('men', 'мужчины'), word('me', 'мне')]],
  ['TEAM', [word('team', 'команда'), word('meat', 'мясо'), word('mate', 'приятель'), word('eat', 'есть'), word('tea', 'чай'), word('me', 'мне')]],
  ['HEAR', [word('hear', 'слышать'), word('hare', 'заяц'), word('ear', 'ухо'), word('her', 'её'), word('he', 'он')]],
  ['SHOT', [word('shot', 'выстрел'), word('host', 'хозяин'), word('hot', 'горячий'), word('so', 'так'), word('to', 'к')]],
  ['WATER', [word('water', 'вода'), word('wet', 'мокрый'), word('war', 'война'), word('eat', 'есть'), word('tea', 'чай'), word('rat', 'крыса'), word('art', 'искусство'), word('ear', 'ухо')]],
  ['SMILE', [word('smile', 'улыбка'), word('mile', 'миля'), word('slim', 'стройный'), word('lime', 'лайм'), word('lie', 'врать'), word('is', 'есть (он)'), word('me', 'мне')]],
  ['HOUSE', [word('house', 'дом'), word('shoe', 'туфля'), word('use', 'использовать'), word('she', 'она'), word('he', 'он'), word('so', 'так'), word('us', 'нас')]],
  ['ROUND', [word('round', 'раунд'), word('our', 'наш'), word('run', 'бежать'), word('nor', 'ни'), word('on', 'на'), word('no', 'нет')]],
  ['TRAIN', [word('train', 'поезд'), word('rain', 'дождь'), word('art', 'искусство'), word('rat', 'крыса'), word('ant', 'муравей'), word('tin', 'олово'), word('in', 'в'), word('it', 'это'), word('at', 'у')]],
  ['PLANET', [word('planet', 'планета'), word('plant', 'растение'), word('plane', 'самолёт'), word('plan', 'план'), word('net', 'сеть'), word('pen', 'ручка'), word('pet', 'питомец'), word('tea', 'чай'), word('ant', 'муравей')]],
  ['FRIEND', [word('friend', 'друг'), word('find', 'найти'), word('fine', 'хорошо'), word('fire', 'огонь'), word('end', 'конец'), word('red', 'красный'), word('die', 'умереть'), word('in', 'в')]],
  ['STRONG', [word('strong', 'сильный'), word('song', 'песня'), word('sort', 'вид'), word('not', 'не'), word('no', 'нет'), word('on', 'на'), word('so', 'так'), word('to', 'к')]],
  ['PLAYER', [word('player', 'игрок'), word('play', 'играть'), word('year', 'год'), word('pear', 'груша'), word('real', 'настоящий'), word('pay', 'платить'), word('ear', 'ухо'), word('are', 'есть (они)')]],
  ['MONEY', [word('money', 'деньги'), word('one', 'один'), word('men', 'мужчины'), word('my', 'мой'), word('on', 'на'), word('no', 'нет'), word('me', 'мне')]],
  ['BATTLE', [word('battle', 'битва'), word('table', 'стол'), word('late', 'поздний'), word('belt', 'ремень'), word('bat', 'летучая мышь'), word('eat', 'есть'), word('let', 'позволять'), word('tea', 'чай')]],
  ['WINNER', [word('winner', 'победитель'), word('wine', 'вино'), word('win', 'победить'), word('new', 'новый'), word('in', 'в'), word('we', 'мы')]],
  ['SHIELD', [word('shield', 'щит'), word('slide', 'скользить'), word('side', 'сторона'), word('hide', 'прятать'), word('she', 'она'), word('lie', 'врать'), word('he', 'он'), word('is', 'есть (он)')]],
  ['DANGER', [word('danger', 'опасность'), word('garden', 'сад'), word('range', 'дальность'), word('read', 'читать'), word('dear', 'дорогой'), word('and', 'и'), word('end', 'конец'), word('age', 'возраст'), word('red', 'красный')]],
];

// Можно ли собрать слово из букв уровня, учитывая сколько каждой буквы есть.
export function canBuild(text, letters) {
  const left = [...letters.toLowerCase()];
  for (const letter of text.toLowerCase()) {
    const at = left.indexOf(letter);
    if (at < 0) return false;
    left.splice(at, 1);
  }
  return true;
}

// Словарь для автоматических уровней: каждое слово можно собрать только из букв слова уровня.
const DICTIONARY = `
am=есть (я); an=один; as=как; at=у; be=быть; by=около; do=делать; go=идти; he=он; if=если; in=в; is=есть (он); it=это; me=мне; my=мой; no=нет; of=из; on=на; or=или; so=так; to=к; up=вверх; us=нас; we=мы
act=действовать; add=добавить; age=возраст; ago=назад; aim=цель; air=воздух; all=все; and=и; ant=муравей; any=любой; arm=рука; art=искусство; ask=спросить; ate=съел; bad=плохой; bag=сумка; bar=бар; bat=бита; bed=кровать; bee=пчела; bet=спорить; big=большой; bit=кусочек; box=коробка; boy=мальчик; bus=автобус; but=но; buy=купить; can=мочь; cap=кепка; car=машина; cat=кот; cow=корова; cry=плакать; cup=чашка; cut=резать; dad=папа; day=день; die=умереть; dog=собака; dry=сухой; ear=ухо; eat=есть; egg=яйцо; end=конец; eye=глаз; fan=фанат; far=далеко; few=мало; fit=подходить; fix=чинить; fly=летать; for=для; fox=лиса; fun=веселье; gas=бензин; get=получить; god=бог; gun=пушка; guy=парень; hat=шляпа; her=её; him=ему; hit=ударить; hot=горячий; how=как; ice=лёд; ink=чернила; its=его; jam=варенье; job=работа; joy=радость; key=ключ; kid=ребёнок; leg=нога; let=позволять; lie=врать; lip=губа; lot=много; low=низкий; mad=злой; man=мужчина; map=карта; men=мужчины; mix=смешивать; mom=мама; net=сеть; new=новый; nor=ни; not=не; now=сейчас; nut=орех; oil=масло; old=старый; one=один; our=наш; out=наружу; own=свой; pan=сковорода; pay=платить; pen=ручка; pet=питомец; pie=пирог; pig=свинья; pin=булавка; pot=кастрюля; put=класть; ran=бежал; rat=крыса; raw=сырой; red=красный; rob=грабить; row=ряд; run=бежать; sad=грустный; sat=сидел; saw=видел; say=сказать; sea=море; see=видеть; set=набор; she=она; sit=сидеть; six=шесть; sky=небо; son=сын; sun=солнце; tax=налог; tea=чай; ten=десять; tie=галстук; tin=олово; tip=совет; toe=палец ноги; too=тоже; top=верх; toy=игрушка; try=пробовать; two=два; use=использовать; van=фургон; war=война; was=был; way=путь; wet=мокрый; who=кто; why=почему; win=победить; won=победил; yes=да; yet=ещё; you=ты; zoo=зоопарк
able=способный; also=также; area=район; army=армия; away=прочь; baby=малыш; back=назад; ball=мяч; bank=банк; base=база; bath=ванна; bear=медведь; beat=бить; beer=пиво; bell=звонок; belt=ремень; best=лучший; bike=велосипед; bird=птица; blue=синий; boat=лодка; body=тело; bone=кость; book=книга; boss=начальник; both=оба; bowl=миска; burn=гореть; busy=занятой; cake=торт; call=звонить; calm=спокойный; came=пришёл; camp=лагерь; card=карта; care=забота; case=случай; cash=наличные; city=город; club=клуб; coal=уголь; coat=пальто; code=код; cold=холодный; come=приходить; cook=готовить; cool=крутой; cost=стоить; dark=тёмный; date=дата; dead=мёртвый; dear=дорогой; deep=глубокий; desk=стол; diet=диета; dirt=грязь; door=дверь; down=вниз; draw=рисовать; drop=ронять; drug=лекарство; duck=утка; dust=пыль; duty=долг; each=каждый; earn=зарабатывать; east=восток; easy=лёгкий; edge=край; else=ещё; even=даже; ever=когда-либо; evil=зло; face=лицо; fact=факт; fail=провал; fair=честный; fall=падать; farm=ферма; fast=быстрый; fear=страх; feel=чувствовать; feet=ноги; file=файл; film=фильм; find=найти; fine=хорошо; fire=огонь; fish=рыба; five=пять; flag=флаг; flat=плоский; food=еда; foot=ступня; form=форма; four=четыре; free=свободный; from=из; fuel=топливо; full=полный; game=игра; gate=ворота; gift=подарок; girl=девочка; give=давать; glad=рад; goal=гол; gold=золото; good=хороший; gray=серый; grow=расти; hair=волосы; half=половина; hall=зал; hand=рука; hard=трудный; hate=ненавидеть; have=иметь; head=голова; hear=слышать; heat=жара; help=помощь; here=здесь; hero=герой; hide=прятать; high=высокий; hill=холм; hint=подсказка; hold=держать; hole=дыра; home=дом; hope=надежда; horn=рог; host=хозяин; hour=час; huge=огромный; hunt=охотиться; hurt=ранить; idea=идея; into=внутрь; iron=железо; item=предмет; join=присоединиться; joke=шутка; jump=прыгать; just=просто; keep=держать; kick=пинать; kill=убить; kind=добрый; king=король; kiss=поцелуй; knee=колено; know=знать; lake=озеро; land=земля; last=последний; late=поздний; lazy=ленивый; lead=вести; left=слева; less=меньше; life=жизнь; lift=лифт; like=нравиться; line=линия; lion=лев; list=список; live=жить; load=грузить; lock=замок; long=длинный; look=смотреть; lose=терять; lost=потерянный; loud=громкий; love=любовь; luck=удача; mail=почта; main=главный; make=делать; many=много; mark=отметка; mask=маска; mate=приятель; meal=еда; mean=значить; meat=мясо; meet=встречать; menu=меню; mile=миля; milk=молоко; mind=разум; mine=мой; miss=скучать; mode=режим; moon=луна; more=больше; most=больше всего; move=двигаться; much=много; must=должен; name=имя; near=рядом; neck=шея; need=нужно; nest=гнездо; news=новости; next=следующий; nice=милый; nine=девять; nose=нос; note=заметка; once=однажды; only=только; open=открытый; over=над; pack=пачка; page=страница; pain=боль; pair=пара; park=парк; part=часть; pass=передать; past=прошлое; path=тропа; peak=вершина; pick=выбрать; pink=розовый; plan=план; play=играть; poor=бедный; port=порт; post=пост; pull=тянуть; pure=чистый; push=толкать; race=гонка; rain=дождь; rank=ранг; rate=оценка; read=читать; real=настоящий; rest=отдых; rice=рис; rich=богатый; ride=ехать; ring=кольцо; rise=подниматься; road=дорога; rock=скала; role=роль; roof=крыша; room=комната; root=корень; rope=верёвка; rose=роза; rule=правило; safe=безопасный; sail=парус; salt=соль; same=такой же; sand=песок; save=спасти; seat=сиденье; seed=семя; seek=искать; self=сам; sell=продавать; send=отправить; ship=корабль; shoe=туфля; shop=магазин; shot=выстрел; show=показать; shut=закрыть; sick=больной; side=сторона; sign=знак; silk=шёлк; sing=петь; size=размер; skin=кожа; slow=медленный; snow=снег; soft=мягкий; soil=почва; some=несколько; song=песня; soon=скоро; sort=вид; soul=душа; soup=суп; star=звезда; stay=оставаться; step=шаг; stop=стоп; such=такой; suit=костюм; sure=конечно; swim=плавать; take=брать; talk=говорить; tall=высокий; tank=танк; task=задача; team=команда; tell=сказать; term=термин; test=тест; text=текст; than=чем; that=тот; them=их; then=потом; they=они; thin=тонкий; this=этот; tide=прилив; time=время; tire=шина; tone=тон; tool=инструмент; tour=тур; town=городок; tree=дерево; trip=поездка; true=правда; tune=мелодия; turn=поворот; type=тип; unit=единица; used=использованный; user=пользователь; very=очень; view=вид; vote=голос; wait=ждать; wake=будить; walk=гулять; wall=стена; want=хотеть; warm=тёплый; wash=мыть; wave=волна; weak=слабый; wear=носить; week=неделя; well=хорошо; west=запад; what=что; when=когда; wide=широкий; wife=жена; wild=дикий; will=будет; wind=ветер; wine=вино; wing=крыло; wire=провод; wise=мудрый; wish=желание; with=с; wolf=волк; wood=дерево; word=слово; work=работа; yard=двор; year=год; your=твой; zero=ноль; zone=зона
about=о; above=над; actor=актёр; after=после; again=снова; agree=согласен; alarm=тревога; album=альбом; alone=один; along=вдоль; angel=ангел; angry=злой; apple=яблоко; area=район; argue=спорить; arrow=стрела; audio=звук; award=награда; beach=пляж; begin=начинать; below=ниже; black=чёрный; blame=винить; blind=слепой; block=блок; blood=кровь; board=доска; bonus=бонус; brain=мозг; brand=бренд; bread=хлеб; break=ломать; brick=кирпич; bring=приносить; brown=коричневый; build=строить; candy=конфета; carry=нести; catch=ловить; cause=причина; chain=цепь; chair=стул; cheap=дешёвый; check=проверить; chest=сундук; chief=глава; child=ребёнок; class=класс; clean=чистый; clear=ясный; climb=лезть; clock=часы; close=закрыть; cloud=облако; coach=тренер; coast=берег; color=цвет; count=считать; court=суд; cover=обложка; crash=авария; crazy=сумасшедший; cream=сливки; crime=преступление; cross=крест; crowd=толпа; crown=корона; dance=танец; death=смерть; delay=задержка; dirty=грязный; doubt=сомнение; dream=мечта; dress=платье; drink=пить; drive=ехать; early=рано; earth=земля; eight=восемь; empty=пустой; enemy=враг; enjoy=наслаждаться; enter=входить; event=событие; every=каждый; extra=лишний; false=ложный; fence=забор; field=поле; fight=драться; final=финал; first=первый; flash=вспышка; floor=пол; focus=фокус; force=сила; found=нашёл; frame=рамка; fresh=свежий; front=перед; fruit=фрукт; funny=смешной; ghost=призрак; glass=стекло; grade=оценка; grain=зерно; grand=великий; grass=трава; great=отличный; green=зелёный; group=группа; guard=охрана; guess=угадать; guest=гость; guide=гид; habit=привычка; happy=счастливый; heart=сердце; heavy=тяжёлый; hello=привет; horse=лошадь; hotel=отель; hours=часы; house=дом; human=человек; image=картинка; inner=внутренний; joint=сустав; judge=судья; juice=сок; knife=нож; known=известный; large=большой; later=позже; laugh=смеяться; layer=слой; learn=учить; least=наименее; leave=уходить; level=уровень; light=свет; limit=предел; local=местный; lucky=удачливый; lunch=обед; magic=магия; major=главный; march=марш; match=матч; maybe=может быть; metal=металл; might=мог бы; money=деньги; month=месяц; mouse=мышь; mouth=рот; movie=фильм; music=музыка; never=никогда; night=ночь; noise=шум; north=север; nurse=медсестра; ocean=океан; offer=предложение; often=часто; order=заказ; other=другой; owner=владелец; paint=краска; panel=панель; paper=бумага; party=вечеринка; peace=мир; phone=телефон; photo=фото; piece=кусок; pilot=пилот; place=место; plane=самолёт; plant=растение; plate=тарелка; point=очко; power=сила; press=нажать; price=цена; pride=гордость; print=печатать; proof=доказательство; quick=быстрый; quiet=тихий; radio=радио; raise=поднять; range=дальность; reach=достичь; ready=готовый; reply=ответ; right=правый; river=река; robot=робот; rough=грубый; round=раунд; route=маршрут; royal=королевский; scene=сцена; score=счёт; sense=смысл; seven=семь; shade=тень; shake=трясти; shape=форма; share=делиться; sharp=острый; sheep=овца; shine=сиять; shirt=рубашка; shoot=стрелять; short=короткий; shout=кричать; sight=зрение; since=с тех пор; skill=навык; sleep=спать; slide=скользить; slope=склон; small=маленький; smart=умный; smell=запах; smile=улыбка; smoke=дым; snake=змея; solid=твёрдый; sorry=извини; sound=звук; south=юг; space=космос; speak=говорить; speed=скорость; spend=тратить; spike=шип; spoon=ложка; sport=спорт; staff=персонал; stage=сцена; stair=ступенька; stand=стоять; start=начало; state=штат; steal=красть; steel=сталь; stick=палка; still=всё ещё; stone=камень; store=магазин; storm=буря; story=история; strip=полоса; study=учиться; style=стиль; sugar=сахар; sweet=сладкий; table=стол; teach=учить; tears=слёзы; thank=благодарить; their=их; there=там; thick=толстый; thing=вещь; think=думать; three=три; throw=бросать; tiger=тигр; tired=усталый; title=название; today=сегодня; tooth=зуб; total=итог; touch=трогать; tough=жёсткий; tower=башня; trade=торговля; train=поезд; trash=мусор; treat=угощение; trial=суд; trick=трюк; truck=грузовик; trust=доверие; truth=правда; twice=дважды; uncle=дядя; under=под; until=пока; upset=расстроенный; using=используя; video=видео; visit=посетить; voice=голос; waste=тратить зря; watch=смотреть; water=вода; wheel=колесо; where=где; which=который; while=пока; white=белый; whole=целый; woman=женщина; world=мир; worry=волноваться; write=писать; wrong=неверный; young=молодой
animal=животное; answer=ответ; artist=художник; basket=корзина; battle=битва; beauty=красота; before=перед; behind=позади; better=лучше; bottle=бутылка; bridge=мост; bright=яркий; broken=сломанный; button=кнопка; camera=камера; candle=свеча; castle=замок; change=менять; cheese=сыр; choose=выбирать; church=церковь; client=клиент; closet=шкаф; coffee=кофе; corner=угол; cousin=двоюродный брат; create=создать; danger=опасность; dinner=ужин; doctor=врач; double=двойной; dragon=дракон; driver=водитель; easily=легко; engine=двигатель; family=семья; father=отец; flower=цветок; forest=лес; friend=друг; frozen=замёрзший; garden=сад; golden=золотой; ground=земля; guitar=гитара; health=здоровье; hunter=охотник; island=остров; jacket=куртка; kitten=котёнок; leader=лидер; letter=письмо; listen=слушать; market=рынок; master=мастер; memory=память; minute=минута; mobile=мобильный; monkey=обезьяна; mother=мать; nature=природа; number=число; orange=апельсин; parent=родитель; people=люди; planet=планета; player=игрок; please=пожалуйста; pocket=карман; prison=тюрьма; rabbit=кролик; school=школа; screen=экран; second=секунда; shield=щит; silver=серебро; singer=певец; sister=сестра; spider=паук; spring=весна; street=улица; strong=сильный; summer=лето; ticket=билет; tomato=помидор; travel=путешествие; winner=победитель; winter=зима; window=окно; worker=работник; writer=писатель; yellow=жёлтый
brother=брат; holiday=праздник; kitchen=кухня; monster=монстр; picture=картинка; soldier=солдат; student=студент; teacher=учитель; tonight=сегодня вечером
`.trim().split(/[;\n]/).map((entry) => entry.trim()).filter(Boolean).map((entry) => {
  const [en, ru] = entry.split('=');
  return word(en, ru);
}).filter((entry, i, all) => all.findIndex((other) => other.en === entry.en) === i);

// Сначала слова попроще и покороче, потом длиннее. Новые добавлять только в конец списка:
// номер уровня у игрока хранится числом, и порядок старых уровней менять нельзя.
const BASES = `
beach black board bread bring brown chair cheap clean clear close coast count cream dance dream drink earth eight fight
first floor fresh front fruit ghost great green group guard heart horse hotel knife later learn least light lunch magic
match metal month mouse mouth music night north nurse ocean paint party phone place plant plate point power price quiet
right river route score shape share shirt short sleep small sound south space speak sport stage start stone store storm
story sugar sweet table teach thing think tiger today tower trade truck trust truth under voice watch white woman world
write young
animal answer artist basket beauty bottle bridge bright broken button camera candle castle change client closet corner
cousin create dinner doctor double dragon driver engine family father flower forest frozen garden golden ground guitar
health hunter island jacket leader letter listen market master memory minute mobile monkey mother nature number orange
parent pocket prison rabbit school screen second silver singer sister spider spring street summer ticket travel winter
window worker writer yellow
brother holiday kitchen monster picture soldier student teacher tonight
`.trim().split(/\s+/);

const MAX_WORDS_PER_LEVEL = 12;

function buildLevelWords(base) {
  return DICTIONARY
    .filter((entry) => entry.en !== base && canBuild(entry.en, base))
    .sort((a, b) => b.en.length - a.en.length || a.en.localeCompare(b.en))
    .slice(0, MAX_WORDS_PER_LEVEL - 1);
}

const GENERATED_LEVELS = BASES.map((base) => {
  const entry = DICTIONARY.find((item) => item.en === base);
  return { letters: base.toUpperCase(), words: [entry, ...buildLevelWords(base)] };
}).filter((level) => level.words.length >= 4);

export const WORD_LEVELS = [
  ...HAND_MADE_LEVELS.map(([letters, words]) => ({ letters, words })),
  ...GENERATED_LEVELS,
].map((level, i) => ({ id: i + 1, ...level }));

export const DICTIONARY_SIZE = DICTIONARY.length;

const key = (x, y) => `${x},${y}`;

function cellsOf(text, x, y, dir) {
  return [...text].map((letter, i) => ({
    letter,
    x: dir === 'h' ? x + i : x,
    y: dir === 'h' ? y : y + i,
  }));
}

// Можно ли положить слово: только пересекаться, не прилипать к соседям и не продолжать чужое слово.
function crossings(grid, text, x, y, dir) {
  const dx = dir === 'h' ? 1 : 0;
  const dy = dir === 'h' ? 0 : 1;
  if (grid.has(key(x - dx, y - dy))) return -1;
  if (grid.has(key(x + dx * text.length, y + dy * text.length))) return -1;
  let crossed = 0;
  for (const cell of cellsOf(text, x, y, dir)) {
    const existing = grid.get(key(cell.x, cell.y));
    if (existing) {
      if (existing !== cell.letter) return -1;
      crossed++;
    } else if (grid.has(key(cell.x + dy, cell.y + dx)) || grid.has(key(cell.x - dy, cell.y - dx))) {
      return -1;
    }
  }
  return crossed;
}

function bounds(cells) {
  const xs = cells.map(([x]) => x);
  const ys = cells.map(([, y]) => y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

const MAX_SIDE = 10;
const MAX_GRID_WORDS = 9;

// Жадная раскладка: длинные слова первыми, затем лучшее пересечение и самая компактная сетка.
export function layoutWords(list) {
  const sorted = [...list].sort((a, b) => b.en.length - a.en.length || a.en.localeCompare(b.en));
  // Самые короткие слова сверх лимита не занимают сетку, а засчитываются как бонусные.
  const queue = sorted.slice(0, MAX_GRID_WORDS);
  const extra = sorted.slice(MAX_GRID_WORDS);
  const first = queue.shift();
  const grid = new Map();
  const placed = [];

  const place = (item, x, y, dir) => {
    const cells = cellsOf(item.en, x, y, dir);
    for (const cell of cells) grid.set(key(cell.x, cell.y), cell.letter);
    placed.push({ ...item, cells: cells.map((cell) => key(cell.x, cell.y)) });
  };
  place(first, 0, 0, 'h');

  let pending = queue;
  let progress = true;
  while (progress && pending.length) {
    progress = false;
    const later = [];
    for (const item of pending) {
      let best = null;
      for (const [spot, letter] of grid) {
        const [gx, gy] = spot.split(',').map(Number);
        for (let i = 0; i < item.en.length; i++) {
          if (item.en[i] !== letter) continue;
          for (const dir of ['h', 'v']) {
            const x = dir === 'h' ? gx - i : gx;
            const y = dir === 'h' ? gy : gy - i;
            const crossed = crossings(grid, item.en, x, y, dir);
            if (crossed < 1) continue;
            const all = [...grid.keys(), ...cellsOf(item.en, x, y, dir).map((c) => key(c.x, c.y))]
              .map((k) => k.split(',').map(Number));
            const box = bounds(all);
            const width = box.maxX - box.minX + 1;
            const height = box.maxY - box.minY + 1;
            if (Math.max(width, height) > MAX_SIDE) continue;
            const score = crossed * 100 - width * height;
            if (!best || score > best.score) best = { score, x, y, dir };
          }
        }
      }
      if (best) {
        place(item, best.x, best.y, best.dir);
        progress = true;
      } else {
        later.push(item);
      }
    }
    pending = later;
  }

  const box = bounds([...grid.keys()].map((k) => k.split(',').map(Number)));
  return {
    grid,
    words: placed,
    bonus: [...pending, ...extra],
    width: box.maxX - box.minX + 1,
    height: box.maxY - box.minY + 1,
    minX: box.minX,
    minY: box.minY,
  };
}
