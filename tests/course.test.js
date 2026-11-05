import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALL_ITEMS, COURSE } from '../js/course.js';
import { MEDIA, MEDIA_ITEMS } from '../js/media.js';
import { GRAMMAR } from '../js/grammar.js';
import { WORD_LEVELS, canBuild, layoutWords } from '../js/games.js';
import {
  BENCHMARKS, EXAM_SIZE, buildBlitzStep, buildExamSteps, buildGrammarSteps, buildLessonSteps, buildPairs,
  buildReviewSteps, checkTyped, countWords, dueItems, levelInfo, monthWeeks, neededToPass, normalize, srsAnswer,
  streaks, tilesOf, weekKey,
} from '../js/core.js';

const POOL = [...ALL_ITEMS, ...MEDIA_ITEMS];

function seeded(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

test('каждая фраза курса встречается один раз и заполнена', () => {
  const seen = new Set();
  for (const item of POOL) {
    assert.ok(item.en && item.ru && item.pron, `пустое поле: ${item.en}`);
    const key = normalize(item.en);
    assert.ok(!seen.has(key), `повтор: ${item.en}`);
    seen.add(key);
  }
});

test('диалоги заканчиваются твоей репликой, варианты не совпадают с ответом', () => {
  for (const lesson of [...COURSE, ...MEDIA.filter((entry) => entry.dialog.length)]) {
    assert.equal(lesson.dialog.at(-1).who, 'me', lesson.title);
    for (const turn of lesson.dialog) {
      assert.ok(turn.en && turn.ru, lesson.title);
      for (const [wrong, why] of turn.wrong ?? []) {
        assert.ok(why, `нет объяснения: ${wrong}`);
        assert.notEqual(normalize(wrong), normalize(turn.en), lesson.title);
      }
    }
  }
});

test('напечатанная реплика диалога принимает сама себя', () => {
  for (const lesson of COURSE) {
    for (const turn of lesson.dialog.filter((t) => t.who === 'me' && !t.wrong)) {
      assert.equal(checkTyped(turn.en, [turn.en]).result, 'exact', turn.en);
    }
  }
});

test('упражнения собираются правильно при любом перемешивании', () => {
  for (const lesson of [...COURSE, ...MEDIA]) {
    for (let seed = 1; seed <= 25; seed++) {
      for (const step of buildLessonSteps(lesson, POOL, seeded(seed))) {
        if (['pickRu', 'pickEn', 'listen'].includes(step.kind)) {
          assert.equal(step.options.length, 4, `${lesson.title}: ${step.item.en}`);
          assert.equal(new Set(step.options.map((o) => o.ru)).size, 4, 'повтор перевода');
          assert.ok(step.options.includes(step.item));
        }
        if (step.kind === 'build') {
          const tiles = [...step.tiles];
          for (const word of tilesOf(step.item.en)) {
            const at = tiles.indexOf(word);
            assert.ok(at >= 0, `нет плитки ${word} для ${step.item.en}`);
            tiles.splice(at, 1);
          }
          assert.equal(tiles.length, 2, `лишних плиток должно быть две: ${step.item.en}`);
        }
      }
    }
  }
});

test('урок укладывается в короткое занятие', () => {
  for (const lesson of COURSE) {
    const count = buildLessonSteps(lesson, ALL_ITEMS, seeded(1)).length;
    assert.ok(count >= 15 && count <= 45, `${lesson.title}: ${count} шагов`);
  }
});

test('сокращения, регистр и знаки препинания не мешают', () => {
  assert.equal(checkTyped("i am good", ["I'm good."]).result, 'exact');
  assert.equal(checkTyped('I’M GOOD!', ["I'm good."]).result, 'exact');
  assert.equal(checkTyped('do not know', ["don't know"]).result, 'exact');
  assert.equal(checkTyped('cant hear you', ["can't hear you"]).result, 'wrong');
});

test('мелкая опечатка прощается, а другое слово — нет', () => {
  assert.equal(checkTyped('Thnks', ['Thanks']).result, 'typo');
  assert.equal(checkTyped('tomorow', ['Tomorrow']).result, 'typo');
  assert.equal(checkTyped('She is nice', ['He is nice']).result, 'wrong');
  assert.equal(checkTyped('I can help', ["I can't help"]).result, 'wrong');
  assert.equal(checkTyped('He is my', ['He is my friend']).result, 'wrong');
  assert.equal(checkTyped('', ['Hi']).result, 'wrong');
});

test('любой из одинаковых переводов верен', () => {
  const lesson = COURSE[0];
  const steps = buildLessonSteps({ ...lesson, index: 5 }, ALL_ITEMS, seeded(3));
  const step = steps.find((s) => s.kind === 'type' && s.item.ru === 'Привет');
  assert.equal(checkTyped('Hi', step.accepted).result, 'exact');
  assert.equal(checkTyped('Hello', step.accepted).result, 'exact');
});

test('уровни растут по порогам', () => {
  assert.equal(levelInfo(0).level, 1);
  assert.equal(levelInfo(99).level, 1);
  assert.equal(levelInfo(100).level, 2);
  assert.equal(levelInfo(299).level, 2);
  assert.equal(levelInfo(300).level, 3);
  assert.equal(levelInfo(300).into, 0);
});

test('повторение: верно — дальше, ошибка — обратно', () => {
  const first = srsAnswer(undefined, true, 100);
  assert.deepEqual(first, { box: 1, due: 101 });
  assert.deepEqual(srsAnswer(first, true, 101), { box: 2, due: 104 });
  assert.deepEqual(srsAnswer({ box: 4, due: 100 }, false, 100), { box: 1, due: 101 });
  assert.deepEqual(srsAnswer({ box: 5, due: 100 }, true, 100), { box: 5, due: 135 });
});

test('в очередь попадают только фразы, срок которых пришёл', () => {
  const srs = { Hi: { box: 1, due: 10 }, Bye: { box: 1, due: 11 } };
  const items = [{ en: 'Hi' }, { en: 'Bye' }, { en: 'Yes' }];
  assert.deepEqual(dueItems(srs, items, 10).map((i) => i.en), ['Hi']);
});

test('повторение собирается для всех фраз и всех ступеней', () => {
  for (const box of [1, 2, 3, 5]) {
    const srs = Object.fromEntries(ALL_ITEMS.map((i) => [i.en, { box, due: 0 }]));
    const steps = buildReviewSteps(ALL_ITEMS, srs, ALL_ITEMS, seeded(box));
    assert.equal(steps.length, ALL_ITEMS.length);
  }
});

test('неделя начинается в понедельник', () => {
  const day = (y, m, d) => Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  assert.equal(weekKey(day(2026, 11, 2)), day(2026, 11, 2)); // понедельник
  assert.equal(weekKey(day(2026, 11, 8)), day(2026, 11, 2)); // воскресенье
  assert.equal(weekKey(day(2026, 11, 9)), day(2026, 11, 9));
});

test('разборы заполнены: у песен видео и слова на слух, у кино и мемов источник', () => {
  const ids = new Set();
  for (const entry of MEDIA) {
    assert.ok(!ids.has(entry.id), entry.id);
    ids.add(entry.id);
    assert.ok(entry.title && entry.about && entry.tip, entry.id);
    assert.ok(entry.items.length >= 5, entry.id);
    if (entry.kind === 'song') {
      assert.match(entry.video, /^[\w-]{11}$/);
      assert.ok(entry.catchWords.length >= 4, entry.id);
    } else {
      assert.ok(entry.items.every((item) => item.note), `${entry.id}: нет источника`);
    }
  }
});

test('тест этапа: 20 вопросов, 85% — это 17 верных', () => {
  assert.equal(EXAM_SIZE, 20);
  assert.equal(neededToPass(20), 17);
  assert.equal(neededToPass(13), 12);
  for (const unit of [0, 1, 2, 3, 4, 5]) {
    const items = COURSE.filter((l) => l.unit === unit).flatMap((l) => l.items);
    for (let seed = 1; seed <= 10; seed++) {
      const steps = buildExamSteps(items, ALL_ITEMS, seeded(seed));
      assert.equal(steps.length, Math.min(20, items.length));
      assert.equal(new Set(steps.map((s) => s.item.en)).size, steps.length, 'вопрос повторился');
      assert.ok(steps.every((s) => !['tip', 'intro', 'dialog'].includes(s.kind)), 'подсказка в тесте');
      assert.ok(steps.every((s) => items.includes(s.item)), 'вопрос не из этого этапа');
    }
  }
});

test('блиц выдаёт вопрос даже при малом числе фраз', () => {
  const few = ALL_ITEMS.slice(0, 2);
  for (let seed = 1; seed <= 20; seed++) {
    const step = buildBlitzStep(few, ALL_ITEMS, seeded(seed));
    assert.equal(step.options.length, 4);
    assert.ok(step.options.includes(step.item));
  }
});

test('подсчёт слов: сокращения раскрываются, повторы не считаются', () => {
  assert.equal(countWords([{ en: "I'm good." }, { en: 'I am good!' }]), 3);
  assert.equal(countWords([{ en: "It's over 9000" }]), 3);
  assert.equal(countWords([]), 0);
});

test('ориентиры уровней растут и не больше числа этапов', () => {
  for (let i = 1; i < BENCHMARKS.length; i++) {
    assert.ok(BENCHMARKS[i].words > BENCHMARKS[i - 1].words);
  }
  assert.ok(BENCHMARKS.every((b) => b.units <= 6));
});

test('грамматика: у задания есть пропуск, верный ответ не среди неверных, есть объяснение', () => {
  const ids = new Set();
  for (const topic of GRAMMAR) {
    assert.ok(!ids.has(topic.id), topic.id);
    ids.add(topic.id);
    assert.ok(topic.rule && topic.rows.length >= 2, topic.title);
    assert.ok(topic.tasks.length >= 6, topic.title);
    for (const task of topic.tasks) {
      assert.equal(task.text.split('___').length, 2, task.text);
      assert.ok(!task.wrong.includes(task.answer), task.text);
      assert.equal(new Set(task.wrong).size, task.wrong.length, task.text);
      assert.ok(task.ru && task.why, task.text);
    }
  }
});

test('грамматика: сначала правило, потом выбор, в конце печать', () => {
  for (const topic of GRAMMAR) {
    const steps = buildGrammarSteps(topic, seeded(5));
    assert.equal(steps[0].kind, 'rule');
    assert.equal(steps.length, topic.tasks.length + 1);
    const gaps = steps.slice(1);
    assert.equal(gaps.filter((step) => !step.options).length, 3);
    assert.ok(gaps.slice(0, -3).every((step) => step.options.includes(step.answer)));
    assert.ok(gaps.every((step) => step.item.en.includes(step.answer) && !step.item.en.includes('___')));
  }
});

test('шаг урока переживает сохранение и восстановление', () => {
  const steps = buildLessonSteps(COURSE[3], ALL_ITEMS, seeded(2));
  const restored = JSON.parse(JSON.stringify(steps));
  restored.forEach((step, i) => {
    assert.equal(step.kind, steps[i].kind);
    if (step.options && step.item) {
      assert.equal(step.options.filter((option) => option.en === step.item.en).length, 1);
    }
  });
});

test('задания вслух есть в уроках с фразами, но не в тесте и не в повторении', () => {
  const steps = buildLessonSteps(COURSE[1], ALL_ITEMS, seeded(1));
  assert.equal(steps.filter((step) => step.kind === 'speak').length, 2);
  const exam = buildExamSteps(COURSE[1].items, ALL_ITEMS, seeded(1));
  assert.ok(!exam.some((step) => step.kind === 'speak'));
});

test('Deadlock: у каждого набора свой диалог и своя ссылка на YouTube', () => {
  const packs = MEDIA.filter((entry) => entry.kind === 'deadlock');
  assert.equal(packs.length, 3);
  for (const pack of packs) {
    assert.ok(pack.search && pack.who);
    assert.ok(buildLessonSteps(pack, POOL, seeded(1)).some((step) => step.kind === 'dialog'));
  }
});

test('игра «Слова»: слова собираются из букв и не повторяются', () => {
  for (const level of WORD_LEVELS) {
    const seen = new Set();
    for (const word of level.words) {
      assert.ok(canBuild(word.en, level.letters), `${level.letters}: ${word.en}`);
      assert.ok(word.ru, word.en);
      assert.ok(word.en.length >= 2, word.en);
      assert.ok(!seen.has(word.en), word.en);
      seen.add(word.en);
    }
  }
  assert.equal(canBuild('tall', 'TAL'), false);
  assert.equal(canBuild('battle', 'BATTLE'), true);
});

test('игра «Слова»: сетка без наложений и прилипших слов', () => {
  for (const level of WORD_LEVELS) {
    const { grid, words, bonus, width, height } = layoutWords(level.words);
    assert.equal(words.length + bonus.length, level.words.length, level.letters);
    assert.ok(words.length >= 2, `${level.letters}: мало слов в сетке`);
    assert.ok(width <= 10 && height <= 10, level.letters);
    for (const word of words) {
      const read = word.cells.map((cell) => grid.get(cell)).join('');
      assert.equal(read, word.en, level.letters);
    }
    // Всякая цепочка из двух и более букв подряд в сетке должна быть одним из слов.
    const known = new Set(words.map((word) => word.en));
    const keys = [...grid.keys()].map((key) => key.split(',').map(Number));
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      for (const [x, y] of keys) {
        if (grid.has(`${x - dx},${y - dy}`)) continue;
        let text = '';
        for (let i = 0; grid.has(`${x + dx * i},${y + dy * i}`); i++) text += grid.get(`${x + dx * i},${y + dy * i}`);
        if (text.length >= 2) assert.ok(known.has(text), `${level.letters}: лишняя цепочка ${text}`);
      }
    }
  }
});

test('игра «Пары»: у каждой карточки есть пара', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const cards = buildPairs(ALL_ITEMS, 6, seeded(seed));
    assert.equal(cards.length, 12);
    for (let pair = 0; pair < 6; pair++) {
      const both = cards.filter((card) => card.pair === pair);
      assert.deepEqual(both.map((card) => card.lang).sort(), ['en', 'ru']);
    }
  }
});

test('календарь: месяц с понедельника, ноябрь 2026 начинается в воскресенье', () => {
  const weeks = monthWeeks(2026, 10);
  assert.ok(weeks.every((week) => week.length === 7));
  const first = Date.UTC(2026, 10, 1) / 86400000;
  assert.equal(weeks[0][6], first);
  assert.equal(weeks[0][5], null);
  assert.equal(weeks.flat().filter((day) => day !== null).length, 30);
});

test('серии дней: сегодняшний пропуск ещё не обрывает', () => {
  assert.deepEqual(streaks([], 100), { current: 0, best: 0 });
  assert.deepEqual(streaks([98, 99, 100], 100), { current: 3, best: 3 });
  assert.deepEqual(streaks([98, 99], 100), { current: 2, best: 2 });
  assert.deepEqual(streaks([90, 91, 92, 93, 98], 100), { current: 0, best: 4 });
});
