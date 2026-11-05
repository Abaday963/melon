import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALL_ITEMS, COURSE } from '../js/course.js';
import {
  buildLessonSteps, buildReviewSteps, checkTyped, dueItems, levelInfo, normalize, srsAnswer, tilesOf, weekKey,
} from '../js/core.js';

function seeded(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

test('каждая фраза курса встречается один раз и заполнена', () => {
  const seen = new Set();
  for (const item of ALL_ITEMS) {
    assert.ok(item.en && item.ru && item.pron, `пустое поле: ${item.en}`);
    const key = normalize(item.en);
    assert.ok(!seen.has(key), `повтор: ${item.en}`);
    seen.add(key);
  }
});

test('диалоги заканчиваются твоей репликой, варианты не совпадают с ответом', () => {
  for (const lesson of COURSE) {
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
  for (const lesson of COURSE) {
    for (let seed = 1; seed <= 25; seed++) {
      for (const step of buildLessonSteps(lesson, ALL_ITEMS, seeded(seed))) {
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
