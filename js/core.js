// Логика без интерфейса: проверка ответов, сборка уроков, очки, повторение.

const CONTRACTIONS = {
  "i'm": 'i am', "you're": 'you are', "he's": 'he is', "she's": 'she is', "it's": 'it is',
  "we're": 'we are', "they're": 'they are', "that's": 'that is', "what's": 'what is',
  "where's": 'where is', "how's": 'how is', "who's": 'who is', "let's": 'let us',
  "don't": 'do not', "doesn't": 'does not', "didn't": 'did not', "isn't": 'is not',
  "aren't": 'are not', "wasn't": 'was not', "weren't": 'were not', "haven't": 'have not',
  "can't": 'can not', cannot: 'can not', "won't": 'will not', "i'll": 'i will', "i'd": 'i would',
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

export const POINTS = { correct: 5, review: 3, lesson: 20, perfect: 10 };

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

const KEEP_CASE = /^(I|I'm|I'd|I'll|A|B|English|Alex|Almaty|Kazakhstan)$/;

export function tilesOf(en) {
  return en
    .replace(/[.,!?]/g, '')
    .split(' ')
    .map((word, i) => (i === 0 && !KEEP_CASE.test(word) ? word.toLowerCase() : word));
}

// Все английские варианты с тем же переводом тоже верные: «Привет» — и Hi, и Hello.
export function acceptedFor(item, pool) {
  return pool.filter((other) => other.ru === item.ru).map((other) => other.en);
}

function distractors(item, near, pool, count, rng) {
  const out = [];
  const taken = new Set([item.ru]);
  const takenEn = new Set([normalize(item.en)]);
  for (const other of [...shuffle(near, rng), ...shuffle(pool, rng)]) {
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
