// Логика без интерфейса: проверка ответов, сборка уроков, очки, повторение.
import { ALTERNATES } from './alternates.js';

const CONTRACTIONS = {
  "i'm": 'i am', "you're": 'you are', "he's": 'he is', "she's": 'she is', "it's": 'it is',
  "we're": 'we are', "they're": 'they are', "that's": 'that is', "what's": 'what is',
  "where's": 'where is', "how's": 'how is', "who's": 'who is', "let's": 'let us',
  "don't": 'do not', "doesn't": 'does not', "didn't": 'did not', "isn't": 'is not',
  "aren't": 'are not', "wasn't": 'was not', "weren't": 'were not', "haven't": 'have not',
  "can't": 'can not', cannot: 'can not', "won't": 'will not', "i'll": 'i will', "i'd": 'i would',
  "i've": 'i have', gonna: 'going to', wanna: 'want to', gotta: 'have to',
  // Без апострофа тоже считается: на телефоне его часто не ставят.
  im: 'i am', youre: 'you are', hes: 'he is', shes: 'she is', theyre: 'they are', thats: 'that is', whats: 'what is',
  wheres: 'where is', hows: 'how is', whos: 'who is', lets: 'let us', dont: 'do not', doesnt: 'does not',
  didnt: 'did not', isnt: 'is not', arent: 'are not', wasnt: 'was not', werent: 'were not', havent: 'have not',
  cant: 'can not', wont: 'will not', ive: 'i have',
};

export function normalize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[’`´]/g, "'")
    .replace(/[.,!?;:"«»—–-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => CONTRACTIONS[word] ?? word)
    .join(' ');
}

function editDistance(a, b) {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    row = next;
  }
  return row[b.length];
}

// Опечатка прощается, только если слово длинное и ошиблись в одной букве:
// so he/she или can/can't не считаются опечаткой и не проходят.
function isTypo(input, answer) {
  const a = input.split(' ');
  const b = answer.split(' ');
  if (a.length !== b.length) return false;
  let typos = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    if (b[i].length < 4 || editDistance(a[i], b[i]) > 1) return false;
    typos++;
  }
  return typos > 0 && typos <= 2;
}

export function checkTyped(input, accepted) {
  const given = normalize(input);
  if (!given) return { result: 'wrong' };
  for (const answer of accepted) {
    if (given === normalize(answer)) return { result: 'exact', match: answer };
  }
  for (const answer of accepted) {
    if (isTypo(given, normalize(answer))) return { result: 'typo', match: answer };
  }
  return { result: 'wrong' };
}

export function shuffle(list, rng = Math.random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---------- Очки и уровни ----------

export const POINTS = {
  correct: 5, repeat: 1, review: 3, lesson: 20, perfect: 10, skippedLesson: 30, blitz: 1,
  wordFound: 3, wordBonus: 1, wordLevel: 10, pair: 1,
};

// До уровня 2 нужно 100 семечек, до уровня 3 ещё 200, до уровня 4 ещё 300.
export function levelInfo(xp) {
  let level = 1;
  let start = 0;
  while (xp >= start + level * 100) {
    start += level * 100;
    level++;
  }
  const need = level * 100;
  return { level, into: xp - start, need, ratio: (xp - start) / need };
}

export function dayNumber(date = new Date()) {
  return Math.floor((date.getTime() - date.getTimezoneOffset() * 60000) / 86400000);
}

// Номер понедельника текущей недели. 1 января 1970 был четвергом (день 0).
export function weekKey(day = dayNumber()) {
  return day - ((day + 3) % 7);
}

// ---------- Повторение ----------

const INTERVALS = [1, 3, 7, 16, 35]; // дней до следующего повтора на каждой ступени

export function srsAnswer(card, correct, today = dayNumber()) {
  const box = correct ? Math.min((card?.box ?? 0) + 1, INTERVALS.length) : 1;
  return { box, due: today + INTERVALS[box - 1] };
}

export function dueItems(srs, items, today = dayNumber()) {
  return items.filter((item) => srs[item.en] && srs[item.en].due <= today);
}

// ---------- Сборка упражнений ----------

const KEEP_CASE = /^(I|I'm|I'd|I'll|I've|A|B|English|Alex|Almaty|Kazakhstan|Houston)$/;

export function tilesOf(en) {
  return en
    .replace(/[.,!?]/g, '')
    .split(' ')
    .map((word, i) => (i === 0 && !KEEP_CASE.test(word) ? word.toLowerCase() : word));
}

// Все английские варианты с тем же переводом тоже верные: «Привет» — и Hi, и Hello.
export function withAlternates(en) {
  return [en, ...(ALTERNATES[en] ?? [])];
}

export function acceptedFor(item, pool) {
  const same = pool.filter((other) => other.ru === item.ru).map((other) => other.en);
  return [...new Set([...same, ...withAlternates(item.en)])];
}

// Форма фразы: чтобы неверные варианты не выдавали верный.
// Вопрос — среди вопросов, предложение — среди предложений, число — среди чисел.
const NUMBERS = /^(one|two|three|four|five|six|seven|eight|nine|ten)$/i;

function shapeDistance(a, b) {
  const words = (x) => x.en.split(' ').length;
  const isQuestion = (x) => x.en.endsWith('?');
  const isNumber = (x) => NUMBERS.test(x.en);
  let distance = Math.abs(words(a) - words(b));
  if (isQuestion(a) !== isQuestion(b)) distance += 100;
  if ((words(a) === 1) !== (words(b) === 1)) distance += 50;
  if (isNumber(a) !== isNumber(b)) distance += 8;
  return distance;
}

function distractors(item, near, pool, count, rng) {
  const out = [];
  const taken = new Set([item.ru]);
  const takenEn = new Set([normalize(item.en)]);
  const nearby = new Set(near.map((other) => other.en));
  // Ближе к началу — похожие по форме; при равенстве фразы из этого же урока. Случайность меняет набор.
  const score = (other) => shapeDistance(item, other) + (nearby.has(other.en) ? -2 : 0) + rng() * 1.5;
  const ranked = [...near, ...pool]
    .map((other) => ({ other, order: score(other) }))
    .sort((a, b) => a.order - b.order)
    .map(({ other }) => other);
  for (const other of ranked) {
    if (out.length === count) break;
    if (taken.has(other.ru) || takenEn.has(normalize(other.en))) continue;
    taken.add(other.ru);
    takenEn.add(normalize(other.en));
    out.push(other);
  }
  return out;
}

// from: 'en' — видишь английский, выбираешь перевод; 'ru' — наоборот.
function pickStep(kind, item, near, pool, rng) {
  const options = shuffle([item, ...distractors(item, near, pool, 3, rng)], rng);
  return { kind, item, options };
}

function buildStep(item, near, pool, rng) {
  const tiles = tilesOf(item.en);
  const known = new Set(tiles.map((word) => word.toLowerCase()));
  const extra = [];
  for (const other of [...shuffle(near, rng), ...shuffle(pool, rng)]) {
    for (const word of tilesOf(other.en)) {
      if (extra.length < 2 && !known.has(word.toLowerCase())) {
        known.add(word.toLowerCase());
        extra.push(word);
      }
    }
  }
  return { kind: 'build', item, tiles: shuffle([...tiles, ...extra], rng), accepted: acceptedFor(item, pool) };
}

function typeStep(item, pool) {
  return { kind: 'type', item, accepted: acceptedFor(item, pool) };
}

function wordCount(item) {
  return item.en.split(' ').length;
}

// Шагов примерно на 3 минуты: новая фраза → узнать её → вспомнить → собрать или напечатать → диалог.
export function buildLessonSteps(lesson, pool, rng = Math.random) {
  const steps = [];
  const items = lesson.items;
  if (lesson.tip) steps.push({ kind: 'tip', text: lesson.tip });

  for (let i = 0; i < items.length; i += 2) {
    const pair = items.slice(i, i + 2);
    for (const item of pair) steps.push({ kind: 'intro', item });
    for (const item of shuffle(pair, rng)) steps.push(pickStep('pickRu', item, items, pool, rng));
  }

  const canType = lesson.index >= 2;
  for (const item of shuffle(items, rng)) {
    steps.push(pickStep(rng() < 0.5 ? 'listen' : 'pickEn', item, items, pool, rng));
  }
  for (const item of shuffle(items, rng)) {
    if (wordCount(item) >= 2) steps.push(buildStep(item, items, pool, rng));
    else if (canType) steps.push(typeStep(item, pool));
  }
  if (canType) {
    for (const item of shuffle(items, rng).filter((it) => wordCount(it) <= 4).slice(0, 2)) {
      steps.push(typeStep(item, pool));
    }
  }

  for (const item of shuffle(items, rng).filter((it) => wordCount(it) >= 2).slice(0, 2)) {
    steps.push({ kind: 'speak', item });
  }

  lesson.dialog.forEach((turn, i) => {
    if (turn.who !== 'me') return;
    steps.push({
      kind: 'dialog',
      who: lesson.who,
      history: lesson.dialog.slice(0, i),
      turn,
      options: turn.wrong ? shuffle([turn.en, ...turn.wrong.map(([en]) => en)], rng) : null,
    });
  });
  return steps;
}

// Чем лучше фраза закреплена, тем сложнее упражнение.
export function buildReviewSteps(items, srs, pool, rng = Math.random) {
  return shuffle(items, rng).map((item) => {
    const box = srs[item.en]?.box ?? 1;
    if (box >= 3) return typeStep(item, pool);
    if (box === 2 && wordCount(item) >= 2) return buildStep(item, [], pool, rng);
    return pickStep(rng() < 0.5 ? 'listen' : 'pickEn', item, [], pool, rng);
  });
}

// ---------- Тест на пропуск этапа ----------

export const PASS_PERCENT = 85;
export const EXAM_SIZE = 20;

export function neededToPass(total) {
  return Math.ceil((total * PASS_PERCENT) / 100);
}

// Вопросы равномерно по типам и без подсказок: только то, что человек уже должен знать.
export function buildExamSteps(items, pool, rng = Math.random, size = EXAM_SIZE) {
  const kinds = ['pickEn', 'listen', 'build', 'pickRu', 'type'];
  return shuffle(items, rng).slice(0, size).map((item, i) => {
    const kind = kinds[i % kinds.length];
    if (kind === 'type') return typeStep(item, pool);
    if (kind === 'build') {
      return wordCount(item) >= 2 ? buildStep(item, [], pool, rng) : typeStep(item, pool);
    }
    return pickStep(kind, item, items, pool, rng);
  });
}

// ---------- Блиц ----------

export const BLITZ_SECONDS = 60;

export function buildBlitzStep(items, pool, rng = Math.random) {
  const item = items[Math.floor(rng() * items.length)];
  return pickStep(rng() < 0.5 ? 'pickRu' : 'pickEn', item, items, pool, rng);
}

// ---------- Слова и уровни языка ----------

export function countWords(items) {
  const words = new Set();
  for (const item of items) {
    for (const word of normalize(item.en).split(' ')) {
      if (/^[a-z']+$/.test(word)) words.add(word);
    }
  }
  return words.size;
}

// Примерные ориентиры. Слова — распространённая оценка словарного запаса для CEFR,
// этапы и блиц — наша прикидка по этому курсу, а не официальный экзамен.
export const BENCHMARKS = [
  { id: 'A1', words: 500, units: 2, blitz: 15 },
  { id: 'A2', words: 1000, units: 5, blitz: 25 },
  { id: 'B1', words: 2000, units: 6, blitz: 35 },
];

// ---------- Грамматика ----------

// Сначала правило, потом выбор слова, а последние задания нужно напечатать.
export function buildGrammarSteps(topic, rng = Math.random) {
  const tasks = shuffle(topic.tasks, rng);
  const typedFrom = tasks.length - 3;
  return [
    { kind: 'rule', title: topic.title, text: topic.rule, rows: topic.rows },
    ...tasks.map((task, i) => ({
      kind: 'gap',
      topic: topic.id,
      item: { en: task.text.replace('___', task.answer), ru: task.ru, pron: '' },
      text: task.text,
      answer: task.answer,
      why: task.why,
      options: i < typedFrom ? shuffle([task.answer, ...task.wrong], rng) : null,
    })),
  ];
}

// ---------- Пары ----------

export function buildPairs(items, count, rng = Math.random) {
  const seen = new Set();
  const chosen = [];
  for (const item of shuffle(items.filter((it) => wordCount(it) <= 3), rng)) {
    if (chosen.length === count) break;
    if (seen.has(item.ru) || seen.has(item.en)) continue;
    seen.add(item.ru);
    seen.add(item.en);
    chosen.push(item);
  }
  return shuffle(chosen.flatMap((item, pair) => [
    { pair, text: item.en, lang: 'en' },
    { pair, text: item.ru, lang: 'ru' },
  ]), rng);
}

// ---------- Статистика ----------

// Недели месяца с понедельника: номера дней и null в пустых клетках.
export function monthWeeks(year, month) {
  const first = Date.UTC(year, month, 1) / 86400000;
  const last = Date.UTC(year, month + 1, 0) / 86400000;
  const cells = Array.from({ length: (first + 3) % 7 }, () => null);
  for (let day = first; day <= last; day++) cells.push(day);
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// Текущая серия не обрывается, пока сегодняшний день ещё не закончился.
export function streaks(days, today = dayNumber()) {
  const active = new Set(days);
  let best = 0;
  for (const day of active) {
    if (active.has(day - 1)) continue;
    let length = 1;
    while (active.has(day + length)) length++;
    best = Math.max(best, length);
  }
  let current = 0;
  let cursor = active.has(today) ? today : today - 1;
  while (active.has(cursor)) {
    current++;
    cursor--;
  }
  return { current, best };
}
