import { ALL_ITEMS, COURSE, UNITS } from './course.js';
import {
  POINTS, buildLessonSteps, buildReviewSteps, checkTyped, dayNumber, dueItems,
  levelInfo, normalize, shuffle, srsAnswer, weekKey,
} from './core.js';

// ---------- Иконки ----------

const svg = (path, attrs = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${attrs}>${path}</svg>`;
const ICON = {
  path: svg('<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 6H15a3.5 3.5 0 0 1 0 7H9a3.5 3.5 0 0 0 0 7h6.5"/>'),
  repeat: svg('<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>'),
  user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  sound: svg('<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>'),
  mute: svg('<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>'),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 'stroke-width="3"'),
  lock: svg('<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>'),
  star: svg('<path d="M12 4l2.5 5.2 5.7.8-4.1 4 1 5.7L12 17l-5.1 2.7 1-5.7-4.1-4 5.7-.8z" fill="currentColor"/>'),
  seed: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1c3 3.2 5 6 5 8.4A5 5 0 0 1 3 9.400C3 7 5 4.200 8 1z" fill="currentColor"/></svg>',
};

// Форма повторяет присланную иконку; цвет корки следует за выбранным акцентом.
const LOGO = `<svg class="logo" viewBox="0 0 48 48" aria-hidden="true">
  <path d="M33.200 5.800A19.600 19.600 0 1 1 5.800 33.200Z" fill="var(--a)" stroke="var(--a)" stroke-width="1.600" stroke-linejoin="round"/>
  <path d="M29 13.400A10.800 10.800 0 0 1 14.600 28Z" fill="var(--flesh)" stroke="var(--flesh)" stroke-width="1.600" stroke-linejoin="round"/>
  <g fill="var(--bg)"><circle cx="28.600" cy="18.200" r="1.150"/><circle cx="27" cy="21.600" r="1.150"/><circle cx="24" cy="25.400" r="1.150"/><circle cx="20" cy="27.800" r="1.150"/></g>
</svg>`;

// ---------- Оформление ----------

const ACCENTS = [
  { id: 'melon', name: 'Дыня', a: '#c8e06b', deep: '#8fa544', ink: '#1b2108', level: 1 },
  { id: 'honey', name: 'Мёд', a: '#f2d675', deep: '#b39a42', ink: '#2b2606', level: 1 },
  { id: 'mint', name: 'Мята', a: '#8fe3a9', deep: '#59a673', ink: '#0b2614', level: 1 },
  { id: 'lime', name: 'Лайм', a: '#a9f04f', deep: '#73ad2c', ink: '#172605', level: 3 },
  { id: 'peach', name: 'Персик', a: '#ffb98a', deep: '#c07f55', ink: '#331b09', level: 5 },
  { id: 'berry', name: 'Ягода', a: '#c3adff', deep: '#8a74c9', ink: '#1c1138', level: 7 },
];
const BACKGROUNDS = [
  { id: 'dark', name: 'Тёмный', bg: '#11140d', surface: '#1a1e14', surface2: '#252a1c', line: '#31372a' },
  { id: 'black', name: 'Чёрный', bg: '#000000', surface: '#111310', surface2: '#1e211a', line: '#2a2d25' },
  { id: 'forest', name: 'Лес', bg: '#0d1712', surface: '#14211a', surface2: '#1e2e25', line: '#2a3c31' },
];

// ---------- Сохранение ----------

const KEY = 'melon.v1';
const DEFAULTS = {
  xp: 0,
  done: {},
  srs: {},
  week: { key: 0, xp: 0 },
  activeDays: 0,
  lastDay: 0,
  welcomed: false,
  installHidden: false,
  settings: { accent: 'melon', bg: 'dark', sound: true, pron: true },
};

function merged(saved) {
  return { ...DEFAULTS, ...saved, settings: { ...DEFAULTS.settings, ...saved?.settings } };
}

function load() {
  try {
    return merged(JSON.parse(localStorage.getItem(KEY)) ?? {});
  } catch {
    return merged({});
  }
}

const state = load();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    showToast('Не получилось сохранить прогресс');
  }
}

function addXp(points) {
  state.xp += points;
  const key = weekKey();
  if (state.week.key !== key) state.week = { key, xp: 0 };
  state.week.xp += points;
}

function markActiveDay() {
  const today = dayNumber();
  if (state.lastDay !== today) {
    state.lastDay = today;
    state.activeDays++;
  }
}

function weekXp() {
  return state.week.key === weekKey() ? state.week.xp : 0;
}

function applyTheme() {
  const accent = ACCENTS.find((x) => x.id === state.settings.accent) ?? ACCENTS[0];
  const back = BACKGROUNDS.find((x) => x.id === state.settings.bg) ?? BACKGROUNDS[0];
  const style = document.documentElement.style;
  style.setProperty('--a', accent.a);
  style.setProperty('--a-deep', accent.deep);
  style.setProperty('--a-ink', accent.ink);
  style.setProperty('--a-soft', `${accent.a}24`);
  style.setProperty('--bg', back.bg);
  style.setProperty('--surface', back.surface);
  style.setProperty('--surface-2', back.surface2);
  style.setProperty('--line', back.line);
  document.querySelector('meta[name="theme-color"]').content = back.bg;
}

// ---------- Озвучка ----------

let enVoice = null;

function findVoice() {
  if (!('speechSynthesis' in window)) return;
  const voices = speechSynthesis.getVoices().filter((v) => /^en[-_]/i.test(v.lang));
  enVoice = voices.find((v) => /^en[-_]US/i.test(v.lang) && v.localService)
    ?? voices.find((v) => v.localService)
    ?? voices[0]
    ?? null;
}

const canSpeak = () => enVoice !== null;
const soundOn = () => canSpeak() && state.settings.sound;

function speak(text, rate = 0.9) {
  if (!canSpeak()) return;
  speechSynthesis.cancel();
  const line = new SpeechSynthesisUtterance(text);
  line.voice = enVoice;
  line.lang = enVoice.lang;
  line.rate = rate;
  speechSynthesis.speak(line);
}

// ---------- Разметка ----------

const app = document.getElementById('app');
const esc = (text) => String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let tab = 'path';
let run = null; // идущее занятие
let result = null; // экран итогов
let sheet = null; // окно снизу
let toastText = '';
let toastTimer = 0;
let installEvent = null;

const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const seeds = (n) => `<span class="seeds">${ICON.seed}${n}</span>`;
const sayBtn = (text, rate) => (canSpeak() ? `<button class="say" data-act="say" data-text="${esc(text)}" ${rate ? `data-rate="${rate}"` : ''} aria-label="Послушать">${ICON.sound}</button>` : '');
const pron = (item) => (state.settings.pron && item.pron ? `<div class="pron">${esc(item.pron)}</div>` : '');

function nextLesson() {
  return COURSE.find((lesson) => !state.done[lesson.id]) ?? null;
}

function learnedItems() {
  return ALL_ITEMS.filter((item) => state.srs[item.en]);
}

function tabsBar() {
  const entry = (id, icon, label) => `<button class="tab" data-act="tab" data-id="${id}" ${tab === id ? 'aria-current="page"' : ''}>${icon}${label}</button>`;
  return `<nav class="tabs">${entry('path', ICON.path, 'Курс')}${entry('words', ICON.repeat, 'Повторение')}${entry('me', ICON.user, 'Профиль')}</nav>`;
}

function levelBar() {
  const info = levelInfo(state.xp);
  return `<div class="level-row"><span>Уровень ${info.level}</span><span>${info.into} из ${info.need}</span></div>
    <div class="bar"><i style="width:${Math.round(info.ratio * 100)}%"></i></div>`;
}

function installNotice() {
  if (isStandalone() || state.installHidden) return '';
  if (!isIos() && !installEvent) return '';
  return `<div class="card notice">
    <div class="text"><b>Поставь Melon на телефон</b><span class="muted small">Так он будет работать без интернета</span></div>
    <button class="link-btn" data-act="install">Как</button>
    <button class="icon-btn" data-act="install-hide" aria-label="Скрыть">${ICON.close}</button>
  </div>`;
}

function pathScreen() {
  const next = nextLesson();
  const due = dueItems(state.srs, ALL_ITEMS).length;
  const hero = next
    ? `<div class="hero"><small>${esc(next.unitTitle)} · около 3 минут</small><h2>${esc(next.title)}</h2>
        <button class="btn" data-act="lesson" data-id="${next.id}">${state.xp ? 'Продолжить' : 'Начать'}</button></div>`
    : `<div class="hero"><small>Курс пройден</small><h2>Все уроки пройдены</h2>
        <button class="btn" data-act="review">Повторить фразы</button></div>`;
  const reviewCard = due && next
    ? `<div class="card notice"><div class="text"><b>Пора повторить: ${due}</b><span class="muted small">Пара минут, чтобы фразы не забылись</span></div>
        <button class="link-btn" data-act="review">Начать</button></div>`
    : '';
  const units = UNITS.map((unit) => {
    const finished = unit.lessons.filter((l) => state.done[l.id]).length;
    const rows = unit.lessons.map((lesson) => {
      const done = Boolean(state.done[lesson.id]);
      const now = lesson === next;
      const mark = done ? ICON.check : now ? lesson.index + 1 : ICON.lock;
      const cls = done ? 'done' : now ? 'now' : 'locked';
      const sub = done ? (state.done[lesson.id] === 100 ? 'Без ошибок' : `Точность ${state.done[lesson.id]}%`) : `${lesson.items.length} фраз`;
      return `<button class="lesson-row ${cls}" ${done || now ? `data-act="lesson" data-id="${lesson.id}"` : 'aria-disabled="true"'}>
        <span class="dot">${mark}</span><span><b>${esc(lesson.title)}</b><span class="muted small">${sub}</span></span></button>`;
    }).join('');
    return `<h2 class="unit-title">${esc(unit.title)}</h2><div class="unit-sub">${finished} из ${unit.lessons.length}</div><div>${rows}</div>`;
  }).join('');
  return `<section class="screen">
    <header class="top">${LOGO}<h1>Melon</h1>${seeds(state.xp)}</header>
    <div class="card">${levelBar()}</div>
    ${installNotice()}${hero}${reviewCard}${units}
  </section>${tabsBar()}`;
}

function wordsScreen() {
  const learned = learnedItems();
  if (!learned.length) {
    return `<section class="screen"><header class="top"><h1>Повторение</h1></header>
      <div class="card"><b>Пока пусто</b><p class="muted">Пройди первый урок, и его фразы появятся здесь.</p></div>
    </section>${tabsBar()}`;
  }
  const due = dueItems(state.srs, ALL_ITEMS).length;
  const action = due
    ? `<div class="hero"><small>На сегодня</small><h2>${due} ${plural(due, 'фраза', 'фразы', 'фраз')}</h2><button class="btn" data-act="review">Повторить</button></div>`
    : `<div class="card"><b>На сегодня всё повторено</b><p class="muted small" style="margin:4px 0 12px">Фразы вернутся, когда начнут забываться.</p><button class="btn ghost" data-act="review">Потренироваться ещё</button></div>`;
  const rows = learned.map((item) => {
    const box = state.srs[item.en].box;
    const meter = [1, 2, 3, 4, 5].map((n) => `<i class="${n <= box ? 'on' : ''}"></i>`).join('');
    return `<div class="word"><div><b>${esc(item.en)}</b><span class="muted small">${esc(item.ru)}</span><div class="meter" aria-label="Закрепление ${box} из 5">${meter}</div></div>${sayBtn(item.en)}</div>`;
  }).join('');
  return `<section class="screen"><header class="top"><h1>Повторение</h1>${seeds(state.xp)}</header>
    ${action}<h2 class="section-title">Мои фразы: ${learned.length}</h2><div class="card">${rows}</div>
  </section>${tabsBar()}`;
}

function plural(n, one, few, many) {
  const a = n % 100;
  const b = n % 10;
  if (a >= 11 && a <= 14) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
}

function meScreen() {
  const level = levelInfo(state.xp).level;
  const accents = ACCENTS.map((x) => {
    const locked = level < x.level;
    return `<button class="swatch" data-act="accent" data-id="${x.id}" aria-pressed="${state.settings.accent === x.id}" ${locked ? 'disabled' : ''}>
      <i style="background:${x.a}">${locked ? ICON.lock : ''}</i>${esc(x.name)}${locked ? `<br>ур. ${x.level}` : ''}</button>`;
  }).join('');
  const backs = BACKGROUNDS.map((x) => `<button class="swatch" data-act="bg" data-id="${x.id}" aria-pressed="${state.settings.bg === x.id}">
      <i style="background:${x.bg};border:1px solid #3a3f33"></i>${esc(x.name)}</button>`).join('');
  const toggle = (id, title, note, on, disabled) => `<button class="setting" role="switch" aria-checked="${on}" data-act="toggle" data-id="${id}" ${disabled ? 'disabled' : ''}>
      <span>${title}<small>${note}</small></span><span class="switch"></span></button>`;
  const doneCount = Object.keys(state.done).length;
  return `<section class="screen"><header class="top"><h1>Профиль</h1>${seeds(state.xp)}</header>
    <div class="card">${levelBar()}</div>
    <div class="stats three">
      <div class="stat"><b>${weekXp()}</b><span>за неделю</span></div>
      <div class="stat"><b>${doneCount}</b><span>из ${COURSE.length} уроков</span></div>
      <div class="stat"><b>${state.activeDays}</b><span>${plural(state.activeDays, 'день', 'дня', 'дней')} занятий</span></div>
    </div>
    <button class="btn ghost" data-act="share">Вызвать друга</button>
    <h2 class="section-title">Цвет</h2><div class="swatches">${accents}</div>
    <h2 class="section-title">Фон</h2><div class="swatches">${backs}</div>
    <h2 class="section-title">Настройки</h2>
    <div class="card" style="padding-block:6px">
      ${toggle('sound', 'Звук', canSpeak() ? 'Выключи, если занимаешься на работе' : 'На этом устройстве нет английского голоса', soundOn(), !canSpeak())}
      ${toggle('pron', 'Подсказка русскими буквами', 'Отключи, когда начнёшь читать без неё', state.settings.pron)}
    </div>
    <h2 class="section-title">Прогресс</h2>
    <p class="muted small" style="margin-bottom:12px">Он хранится только на этом телефоне. Код нужен, чтобы перенести его или не потерять.</p>
    <button class="btn ghost" data-act="backup">Сохранить код</button>
    <button class="btn ghost" data-act="restore">Вставить код</button>
    <button class="btn ghost" data-act="reset" style="color:var(--bad)">Сбросить всё</button>
  </section>${tabsBar()}`;
}

function welcomeScreen() {
  return `<section class="center"><div class="mid">${LOGO}<h1>Melon</h1>
      <p class="lead">Английский с нуля. По 3 минуты, живыми фразами, и без интернета.</p></div>
    <button class="btn" data-act="welcome">Начать первый урок</button>
  </section>`;
}

function resultScreen() {
  const r = result;
  const info = levelInfo(state.xp);
  const next = nextLesson();
  const title = r.accuracy === 100 ? 'Без ошибок!' : r.type === 'review' ? 'Повторено!' : 'Урок пройден!';
  const nextBtn = r.type === 'lesson' && next
    ? `<button class="btn" data-act="lesson" data-id="${next.id}">Следующий урок</button><button class="btn ghost" data-act="home">На главную</button>`
    : '<button class="btn" data-act="home">Готово</button>';
  return `<section class="center"><div class="mid">${LOGO}<h1>${title}</h1>
      ${r.levelUp ? `<div class="level-up">Новый уровень: ${info.level}</div>` : ''}
      <div class="stats">
        <div class="stat"><b>+${r.gained}</b><span>${plural(r.gained, 'семечко', 'семечка', 'семечек')}</span></div>
        <div class="stat"><b>${r.accuracy}%</b><span>точность</span></div>
      </div></div>
    ${nextBtn}
  </section>`;
}

// ---------- Занятие ----------

function startLesson(id) {
  const lesson = COURSE.find((x) => x.id === id);
  const steps = buildLessonSteps(lesson, ALL_ITEMS);
  startRun({ type: 'lesson', lesson, steps });
}

function startReview() {
  const due = dueItems(state.srs, ALL_ITEMS);
  const source = due.length ? due : learnedItems();
  if (!source.length) return;
  const items = shuffle(source).slice(0, 10);
  startRun({ type: 'review', steps: buildReviewSteps(items, state.srs, ALL_ITEMS) });
}

function startRun({ type, lesson = null, steps }) {
  run = {
    type,
    lesson,
    queue: steps,
    i: 0,
    total: steps.length,
    asked: 0,
    firstTryRight: 0,
    gained: 0,
    startLevel: levelInfo(state.xp).level,
    retried: new Set(),
    feedback: null,
    picked: [],
    typed: '',
    chosen: null,
  };
  result = null;
  sheet = null;
  history.pushState({ run: true }, '');
  render();
  announceStep();
}

const current = () => run.queue[run.i];
const isExercise = (step) => step.kind !== 'tip' && step.kind !== 'intro';

function announceStep() {
  const step = current();
  if (!soundOn() || !step) return;
  if (step.kind === 'intro' || step.kind === 'listen') speak(step.item.en);
  if (step.kind === 'pickRu') speak(step.item.en);
  if (step.kind === 'dialog') {
    const last = step.history.at(-1);
    if (last?.who === 'them') speak(last.en);
  }
}

// Правильный ответ упражнения — для показа и озвучки.
function targetOf(step) {
  return step.kind === 'dialog' ? step.turn : step.item;
}

function answer(correct, extra = {}) {
  const step = current();
  const first = !run.retried.has(step);
  if (first) run.asked++;
  if (correct && first) {
    run.firstTryRight++;
    const points = run.type === 'review' ? POINTS.review : POINTS.correct;
    run.gained += points;
    addXp(points);
  }
  if (run.type === 'review' && first) {
    state.srs[step.item.en] = srsAnswer(state.srs[step.item.en], correct);
  }
  if (!correct && first) {
    run.retried.add(step);
    run.queue.push(step);
    run.total++;
  }
  run.feedback = { correct, ...extra };
  save();
  render();
  if (soundOn()) speak(targetOf(step).en);
}

function advance() {
  run.i++;
  run.feedback = null;
  run.picked = [];
  run.typed = '';
  run.chosen = null;
  if (run.i >= run.queue.length) {
    finishRun();
    return;
  }
  render();
  announceStep();
}

function finishRun() {
  const accuracy = run.asked ? Math.round((run.firstTryRight / run.asked) * 100) : 100;
  if (run.type === 'lesson') {
    const lesson = run.lesson;
    const firstTime = !state.done[lesson.id];
    const bonus = POINTS.lesson + (accuracy === 100 ? POINTS.perfect : 0);
    run.gained += bonus;
    addXp(bonus);
    state.done[lesson.id] = Math.max(state.done[lesson.id] ?? 0, accuracy);
    if (firstTime) {
      for (const item of lesson.items) {
        if (!state.srs[item.en]) state.srs[item.en] = srsAnswer(undefined, true);
      }
    }
  }
  markActiveDay();
  save();
  result = {
    type: run.type,
    gained: run.gained,
    accuracy,
    levelUp: levelInfo(state.xp).level > run.startLevel,
  };
  run = null;
  if (history.state?.run) history.back();
  render();
}

function stepBody(step) {
  const locked = Boolean(run.feedback);
  const optionClass = (isRight, isChosen) => (!locked ? '' : isRight ? 'right' : isChosen ? 'wrong' : '');

  if (step.kind === 'tip') {
    return `<div class="tip">${LOGO}<p>${esc(step.text)}</p></div>`;
  }
  if (step.kind === 'intro') {
    const { item } = step;
    return `<div class="intro"><div class="tag">Новая фраза</div>
      <div class="phrase">${esc(item.en)}</div>${pron(item)}<div class="ru">${esc(item.ru)}</div>
      <div class="say-row">${sayBtn(item.en)}</div></div>`;
  }
  if (step.kind === 'pickRu' || step.kind === 'pickEn' || step.kind === 'listen') {
    const { item, options } = step;
    const listen = step.kind === 'listen' && soundOn();
    const toEnglish = step.kind === 'pickEn';
    let head;
    if (listen) {
      head = `<div class="ask">Что прозвучало?</div><div class="listen-big">
        ${sayBtn(item.en)}<button class="say slow" data-act="say" data-text="${esc(item.en)}" data-rate="0.55" aria-label="Послушать медленно">0.5×</button></div>`;
    } else if (toEnglish) {
      head = `<div class="ask">Как сказать по-английски?</div><div class="phrase-row"><div class="phrase ru">${esc(item.ru)}</div></div>`;
    } else {
      head = `<div class="ask">Что это значит?</div><div class="phrase-row"><div><div class="phrase">${esc(item.en)}</div>${pron(item)}</div>${soundOn() ? sayBtn(item.en) : ''}</div>`;
    }
    const buttons = options.map((option, i) => {
      const isRight = option === item;
      return `<button class="option ${optionClass(isRight, run.chosen === i)}" data-act="pick" data-i="${i}" ${locked ? 'disabled' : ''}>${esc(toEnglish ? option.en : option.ru)}</button>`;
    }).join('');
    return `${head}<div class="options">${buttons}</div>`;
  }
  if (step.kind === 'build') {
    const line = run.picked.map((tileIndex) => `<button class="tile" data-act="untile" data-i="${tileIndex}" ${locked ? 'disabled' : ''}>${esc(step.tiles[tileIndex])}</button>`).join('');
    const bank = step.tiles.map((word, i) => `<button class="tile" data-act="tile" data-i="${i}" ${run.picked.includes(i) ? 'hidden' : ''} ${locked ? 'disabled' : ''}>${esc(word)}</button>`).join('');
    return `<div class="ask">Собери по-английски</div><div class="phrase-row"><div class="phrase ru">${esc(step.item.ru)}</div></div>
      <div class="answer-line">${line}</div><div class="bank">${bank}</div>`;
  }
  if (step.kind === 'type') {
    return `<div class="ask">Напечатай по-английски</div><div class="phrase-row"><div class="phrase ru">${esc(step.item.ru)}</div></div>
      ${typeInput(locked)}`;
  }
  if (step.kind === 'dialog') {
    const { turn, history: past, who } = step;
    const bubbles = past.map((line) => (line.who === 'them'
      ? `<div class="bubble them">${esc(line.en)}<small>${esc(line.ru)}</small></div>`
      : `<div class="bubble me">${esc(line.en)}</div>`)).join('');
    const lastThem = past.at(-1)?.who === 'them' ? past.at(-1).en : null;
    const head = `<div class="chat"><div class="chat-who">Разговор: ${esc(who)}</div>${bubbles}</div>`;
    const repeat = lastThem && soundOn() ? `<div style="margin-bottom:12px">${sayBtn(lastThem)}</div>` : '';
    if (step.options) {
      const buttons = step.options.map((option, i) => {
        const isRight = option === turn.en;
        return `<button class="option ${optionClass(isRight, run.chosen === i)}" data-act="reply" data-i="${i}" ${locked ? 'disabled' : ''}>${esc(option)}</button>`;
      }).join('');
      return `${head}${repeat}<div class="ask" style="margin-bottom:4px">${esc(turn.ru)}</div><div class="options">${buttons}</div>`;
    }
    return `${head}${repeat}<div class="ask" style="margin-bottom:10px">${esc(turn.ru)}</div>${typeInput(locked)}`;
  }
  return '';
}

function typeInput(locked) {
  return `<input class="type-input" id="typed" lang="en" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done"
    placeholder="Пиши здесь" aria-label="Твой ответ" value="${esc(run.typed)}" ${locked ? 'disabled' : ''}>`;
}

function dock(step) {
  if (run.feedback) {
    const f = run.feedback;
    const target = targetOf(step);
    const fix = f.correct
      ? (f.typo ? `<div class="fix">${esc(f.match)}</div><div class="why">Почти! Посмотри, как пишется.</div>` : `<div class="why">${esc(target.en)}</div>`)
      : `<div class="fix">${esc(target.en)}</div>${state.settings.pron && target.pron ? `<div class="pron">${esc(target.pron)}</div>` : ''}
         ${step.kind === 'dialog' ? '' : `<div class="why">${esc(target.ru)}</div>`}${f.why ? `<div class="why">${esc(f.why)}</div>` : ''}`;
    return `<div class="feedback ${f.correct ? 'ok' : 'no'}"><h3>${f.correct ? 'Верно!' : 'Правильно так:'}</h3>${fix}
      <button class="btn ${f.correct ? '' : 'bad'}" data-act="next">Дальше</button></div>`;
  }
  if (step.kind === 'tip') return '<div class="dock"><button class="btn" data-act="next">Понятно</button></div>';
  if (step.kind === 'intro') return '<div class="dock"><button class="btn" data-act="next">Дальше</button></div>';
  if (step.kind === 'build') return `<div class="dock"><button class="btn" data-act="check-build" ${run.picked.length ? '' : 'disabled'}>Проверить</button></div>`;
  if (step.kind === 'type' || (step.kind === 'dialog' && !step.options)) {
    return '<div class="dock"><button class="btn" data-act="check-type" id="check-type" disabled>Проверить</button></div>';
  }
  return '<div class="dock" style="padding-top:0"></div>';
}

function lessonScreen() {
  const step = current();
  const ratio = run.i / Math.max(run.total, 1);
  const soundBtn = canSpeak()
    ? `<button class="icon-btn" data-act="toggle" data-id="sound" aria-label="${state.settings.sound ? 'Выключить звук' : 'Включить звук'}">${state.settings.sound ? ICON.sound : ICON.mute}</button>`
    : '';
  return `<section class="lesson">
    <div class="lesson-top"><button class="icon-btn" data-act="quit" aria-label="Выйти">${ICON.close}</button>
      <div class="bar" role="progressbar" aria-valuenow="${Math.round(ratio * 100)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${ratio * 100}%"></i></div>
      ${soundBtn}</div>
    <div class="stage">${stepBody(step)}</div>
    ${dock(step)}
  </section>`;
}

function sheetView() {
  if (!sheet) return '';
  if (sheet === 'quit') {
    return `<div class="veil"><div class="sheet"><h2>Выйти из занятия?</h2><p>Очки останутся, но урок придётся пройти заново.</p>
      <button class="btn" data-act="sheet-close">Продолжить занятие</button><button class="btn ghost" data-act="quit-yes">Выйти</button></div></div>`;
  }
  if (sheet === 'install') {
    const body = isIos()
      ? `<ol><li>Открой эту страницу в Safari</li><li>Нажми «Поделиться» внизу экрана</li><li>Выбери «На экран “Домой”»</li><li>Открой Melon с новой иконки один раз при интернете</li></ol>
         <p>После этого он будет работать без сети. Прогресс начнётся заново: у приложения с иконки своя память.</p>`
      : '<p>Melon появится на экране телефона и будет открываться без интернета.</p>';
    const action = installEvent ? '<button class="btn" data-act="install-go">Установить</button>' : '';
    return `<div class="veil"><div class="sheet"><h2>Поставить на телефон</h2>${body}${action}<button class="btn ghost" data-act="sheet-close">Закрыть</button></div></div>`;
  }
  if (sheet === 'backup') {
    return `<div class="veil"><div class="sheet"><h2>Твой код</h2><p>Сохрани его в заметках или в чате с собой.</p>
      <textarea id="code" readonly aria-label="Код прогресса">${esc(encodeBackup())}</textarea>
      <button class="btn" data-act="backup-copy">Скопировать</button><button class="btn ghost" data-act="sheet-close">Закрыть</button></div></div>`;
  }
  if (sheet === 'restore') {
    return `<div class="veil"><div class="sheet"><h2>Вставить код</h2><p>Текущий прогресс на этом телефоне заменится.</p>
      <textarea id="code" aria-label="Код прогресса" placeholder="Вставь код сюда"></textarea>
      <button class="btn" data-act="restore-go">Восстановить</button><button class="btn ghost" data-act="sheet-close">Отмена</button></div></div>`;
  }
  if (sheet === 'reset') {
    return `<div class="veil"><div class="sheet"><h2>Сбросить всё?</h2><p>Уроки, семечки и фразы удалятся с этого телефона. Вернуть их можно только кодом.</p>
      <button class="btn ghost" data-act="sheet-close">Отмена</button><button class="btn bad" data-act="reset-yes">Сбросить</button></div></div>`;
  }
  return '';
}

function render() {
  let view;
  if (run) view = lessonScreen();
  else if (result) view = resultScreen();
  else if (!state.welcomed) view = welcomeScreen();
  else if (tab === 'words') view = wordsScreen();
  else if (tab === 'me') view = meScreen();
  else view = pathScreen();
  const scroller = app.querySelector('.screen');
  const keepScroll = scroller && !run ? scroller.scrollTop : 0;
  app.innerHTML = view + sheetView() + (toastText ? `<div class="toast" role="status">${esc(toastText)}</div>` : '');
  const fresh = app.querySelector('.screen');
  if (fresh && keepScroll) fresh.scrollTop = keepScroll;
  const input = document.getElementById('typed');
  if (input && !input.disabled) {
    syncCheckButton(input);
    input.focus({ preventScroll: true });
  }
}

function syncCheckButton(input) {
  const button = document.getElementById('check-type');
  if (button) button.disabled = !input.value.trim();
}

function showToast(text) {
  toastText = text;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastText = '';
    app.querySelector('.toast')?.remove();
  }, 2400);
  render();
}

// ---------- Резервный код ----------

function encodeBackup() {
  const { xp, done, srs, week, activeDays, lastDay, settings } = state;
  const bytes = new TextEncoder().encode(JSON.stringify({ xp, done, srs, week, activeDays, lastDay, settings }));
  return btoa(String.fromCharCode(...bytes));
}

function restoreBackup(code) {
  const bytes = Uint8Array.from(atob(code.trim()), (c) => c.charCodeAt(0));
  const data = JSON.parse(new TextDecoder().decode(bytes));
  if (typeof data?.xp !== 'number' || typeof data.done !== 'object' || typeof data.srs !== 'object') {
    throw new Error('bad backup');
  }
  Object.assign(state, merged({ ...data, welcomed: true, installHidden: state.installHidden }));
}

// ---------- Действия ----------

const actions = {
  welcome() {
    state.welcomed = true;
    save();
    startLesson(COURSE[0].id);
  },
  tab(el) {
    tab = el.dataset.id;
    render();
    app.querySelector('.screen')?.scrollTo(0, 0);
  },
  lesson(el) { startLesson(el.dataset.id); },
  review() { startReview(); },
  home() {
    result = null;
    tab = 'path';
    render();
  },
  say(el) { speak(el.dataset.text, Number(el.dataset.rate) || 0.9); },
  next() { advance(); },
  pick(el) {
    const step = current();
    const i = Number(el.dataset.i);
    run.chosen = i;
    answer(step.options[i] === step.item);
  },
  reply(el) {
    const step = current();
    const i = Number(el.dataset.i);
    const option = step.options[i];
    run.chosen = i;
    if (option === step.turn.en) {
      answer(true);
    } else {
      const why = step.turn.wrong.find(([en]) => en === option)?.[1];
      answer(false, { why });
    }
  },
  tile(el) {
    run.picked.push(Number(el.dataset.i));
    render();
  },
  untile(el) {
    run.picked = run.picked.filter((i) => i !== Number(el.dataset.i));
    render();
  },
  'check-build'() {
    const step = current();
    const given = normalize(run.picked.map((i) => step.tiles[i]).join(' '));
    answer(step.accepted.some((option) => normalize(option) === given));
  },
  'check-type'() { checkTypedAnswer(); },
  quit() {
    sheet = 'quit';
    render();
  },
  'quit-yes'() {
    if (canSpeak()) speechSynthesis.cancel();
    run = null;
    sheet = null;
    if (history.state?.run) history.back();
    render();
  },
  'sheet-close'() {
    sheet = null;
    render();
  },
  accent(el) {
    state.settings.accent = el.dataset.id;
    save();
    applyTheme();
    render();
  },
  bg(el) {
    state.settings.bg = el.dataset.id;
    save();
    applyTheme();
    render();
  },
  toggle(el) {
    const id = el.dataset.id;
    state.settings[id] = !state.settings[id];
    if (id === 'sound' && !state.settings.sound && 'speechSynthesis' in window) speechSynthesis.cancel();
    save();
    render();
  },
  install() {
    sheet = 'install';
    render();
  },
  async 'install-go'() {
    const prompt = installEvent;
    installEvent = null;
    sheet = null;
    render();
    await prompt?.prompt();
  },
  'install-hide'() {
    state.installHidden = true;
    save();
    render();
  },
  async share() {
    const info = levelInfo(state.xp);
    const text = `Я учу английский в Melon: уровень ${info.level}, ${weekXp()} ${plural(weekXp(), 'семечко', 'семечка', 'семечек')} за неделю. Сможешь больше?`;
    const url = location.href.split('#')[0];
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Melon', text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        showToast('Скопировано, отправь другу');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') showToast('Не получилось поделиться');
    }
  },
  backup() {
    sheet = 'backup';
    render();
  },
  async 'backup-copy'() {
    try {
      await navigator.clipboard.writeText(encodeBackup());
      showToast('Код скопирован');
    } catch {
      const area = document.getElementById('code');
      area.focus();
      area.select();
      showToast('Выдели код и скопируй вручную');
    }
  },
  restore() {
    sheet = 'restore';
    render();
  },
  'restore-go'() {
    try {
      restoreBackup(document.getElementById('code').value);
      save();
      applyTheme();
      sheet = null;
      showToast('Прогресс восстановлен');
    } catch {
      showToast('Код не подходит');
    }
  },
  reset() {
    sheet = 'reset';
    render();
  },
  'reset-yes'() {
    const { installHidden } = state;
    Object.assign(state, merged({ welcomed: true, installHidden }));
    save();
    applyTheme();
    sheet = null;
    tab = 'path';
    render();
  },
};

function checkTypedAnswer() {
  const input = document.getElementById('typed');
  if (!input || !input.value.trim() || run?.feedback) return;
  run.typed = input.value;
  const step = current();
  const accepted = step.kind === 'dialog' ? [step.turn.en] : step.accepted;
  const verdict = checkTyped(input.value, accepted);
  answer(verdict.result !== 'wrong', { typo: verdict.result === 'typo', match: verdict.match });
}

app.addEventListener('click', (event) => {
  const el = event.target.closest('[data-act]');
  if (el && !el.disabled) actions[el.dataset.act]?.(el);
});

app.addEventListener('input', (event) => {
  if (event.target.id === 'typed') {
    run.typed = event.target.value;
    syncCheckButton(event.target);
  }
});

app.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && event.target.id === 'typed') {
    event.preventDefault();
    checkTypedAnswer();
  }
});

// Кнопка «Назад» на Android не выбрасывает из урока, а спрашивает.
addEventListener('popstate', () => {
  if (run) {
    history.pushState({ run: true }, '');
    sheet = 'quit';
    render();
  }
});

addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installEvent = event;
  if (!run) render();
});

// ---------- Запуск ----------

applyTheme();
findVoice();
if ('speechSynthesis' in window) {
  speechSynthesis.addEventListener?.('voiceschanged', () => {
    findVoice();
    if (!run) render();
  });
}
render();

// Экранная клавиатура iPhone не сжимает страницу сама: держим кнопку «Проверить» над ней.
window.visualViewport?.addEventListener('resize', () => {
  app.style.height = `${window.visualViewport.height}px`;
  window.scrollTo(0, 0);
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
navigator.storage?.persist?.();
