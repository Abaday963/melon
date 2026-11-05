import { ALL_ITEMS, COURSE, UNITS } from './course.js';
import { MEDIA, MEDIA_ITEMS, MEDIA_KINDS, sceneSearchUrl } from './media.js';
import { GRAMMAR, GRAMMAR_GROUPS, ruleFor, topicById } from './grammar.js';
import { WORD_LEVELS, layoutWords } from './games.js';
import * as cloud from './cloud.js';
import {
  BENCHMARKS, BLITZ_SECONDS, EXAM_SIZE, PASS_PERCENT, POINTS, buildBlitzStep, buildExamSteps, buildGrammarSteps,
  buildLessonSteps, buildPairs, buildReviewSteps, checkTyped, countWords, dayNumber, dueItems, levelInfo, monthWeeks,
  neededToPass, normalize, shuffle, srsAnswer, streaks, weekKey, withAlternates,
} from './core.js';

const POOL = [...ALL_ITEMS, ...MEDIA_ITEMS];

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
  film: svg('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M10 9l5 3-5 3z" fill="currentColor"/>'),
  friends: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5 6.500-5s5.500 1.500 6.500 5"/><path d="M16 4.800a3.500 3.500 0 0 1 0 6.400M18 15.300c1.800.7 3 2.300 3.500 4.700"/>'),
  back: svg('<path d="M15 5l-7 7 7 7"/>'),
  bolt: svg('<path d="M13 2L5 14h6l-1 8 8-12h-6z" fill="currentColor"/>'),
  play: svg('<path d="M8 5l11 7-11 7z" fill="currentColor"/>'),
  bulb: svg('<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.800 10.600c.8.700 1.300 1.500 1.300 2.400h5c0-.9.500-1.700 1.300-2.400A6 6 0 0 0 12 3z"/>'),
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
const WORD_HINTS = 2;
const PAIRS_COUNT = 6;
const SPEAK_PAUSE = 60 * 60 * 1000;

const defaults = () => ({
  xp: 0,
  done: {},
  srs: {},
  week: { key: 0, xp: 0 },
  activeDays: 0,
  lastDay: 0,
  welcomed: false,
  installHidden: false,
  blitzBest: 0,
  account: null,
  ratingCache: [],
  postsCache: [],
  daily: {},
  saved: {},
  noSpeakUntil: 0,
  pairsBest: 0,
  wordGame: { level: 0, found: [], revealed: [], bonus: [], hints: WORD_HINTS },
  settings: { accent: 'melon', bg: 'dark', sound: true, pron: true, speak: true },
});

function merged(saved) {
  const base = defaults();
  return { ...base, ...saved, settings: { ...base.settings, ...saved?.settings } };
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

function recordDay(field, amount) {
  markActiveDay();
  const today = dayNumber();
  const day = state.daily[today] ?? (state.daily[today] = {});
  day[field] = (day[field] ?? 0) + amount;
}

// Время занятий: паузы длиннее минуты не считаем.
function tick() {
  const now = Date.now();
  if (lastAt) recordDay('seconds', Math.round(Math.min(now - lastAt, 60000) / 1000));
  lastAt = now;
}

function addXp(points) {
  state.xp += points;
  recordDay('xp', points);
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
let sheetArg = null; // данные для окна снизу
let appVersion = ''; // номер установленной версии
let updateReady = false; // новая версия скачана, ждём удобного момента
let game = null; // идущая мини-игра
let lastAt = 0;
let statsOpen = false;
let statsMonth = null;
let statsDay = 0;
let courseView = 'lessons';
let mediaOpen = null; // открытый разбор
let videoOn = false;
let friendsView = 'rating';
let friendsMetric = 'week';
let postKind = 'bug';
let busy = false; // кнопка ждёт ответ сервера
let cloudBusy = false;
let cloudOffline = false;
const drafts = { nick: '', pass: '', friend: '', post: '', sheetPass: '' };

const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const seeds = (n) => `<span class="seeds">${ICON.seed}${n}</span>`;
const sayBtn = (text, rate) => (canSpeak() ? `<button class="say" data-act="say" data-text="${esc(text)}" ${rate ? `data-rate="${rate}"` : ''} aria-label="Послушать">${ICON.sound}</button>` : '');
const pron = (item) => (state.settings.pron && item.pron ? `<div class="pron">${esc(item.pron)}</div>` : '');

function nextLesson() {
  return COURSE.find((lesson) => !state.done[lesson.id]) ?? null;
}

function learnedItems() {
  return POOL.filter((item) => state.srs[item.en]);
}

function tabsBar() {
  const entry = (id, icon, label) => `<button class="tab" data-act="tab" data-id="${id}" ${tab === id ? 'aria-current="page"' : ''}>${icon}${label}</button>`;
  return `<nav class="tabs">${entry('path', ICON.path, 'Курс')}${entry('media', ICON.film, 'Actions')}${entry('words', ICON.repeat, 'Повтор')}${entry('friends', ICON.friends, 'Друзья')}${entry('me', ICON.user, 'Профиль')}</nav>`;
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
  const due = dueItems(state.srs, POOL).length;
  const hero = next
    ? `<div class="hero"><small>${esc(next.unitTitle)} · около 3 минут</small><h2>${esc(next.title)}</h2>
        <button class="btn" data-act="lesson" data-id="${next.id}">${state.xp ? 'Продолжить' : 'Начать'}</button></div>`
    : `<div class="hero"><small>Курс пройден</small><h2>Все уроки пройдены</h2>
        <button class="btn" data-act="review">Повторить фразы</button></div>`;
  const quick = `<div class="quick">
      <button class="quick-card" data-act="blitz">${ICON.bolt}<b>Блиц</b><span>${BLITZ_SECONDS} секунд${state.blitzBest ? `, рекорд ${state.blitzBest}` : ''}</span></button>
      <button class="quick-card" data-act="review" ${learnedItems().length ? '' : 'disabled'}>${ICON.repeat}<b>Повторить</b><span>${due ? `Пора: ${due}` : 'Сегодня всё ок'}</span></button>
    </div>`;
  const units = UNITS.map((unit, index) => {
    const finished = unit.lessons.filter((l) => state.done[l.id]).length;
    const rows = unit.lessons.map((lesson) => {
      const done = Boolean(state.done[lesson.id]);
      const now = lesson === next;
      const mark = done ? ICON.check : now ? lesson.index + 1 : ICON.lock;
      const cls = done ? 'done' : now ? 'now' : 'locked';
      const savedRun = state.saved[lesson.id];
      const sub = savedRun ? `Продолжить: ${savedRun.i + 1} из ${savedRun.total}` : done ? (state.done[lesson.id] === 100 ? 'Без ошибок' : `Точность ${state.done[lesson.id]}%`) : `${lesson.items.length} фраз`;
      return `<button class="lesson-row ${cls}" ${done || now ? `data-act="lesson" data-id="${lesson.id}"` : 'aria-disabled="true"'}>
        <span class="dot">${mark}</span><span><b>${esc(lesson.title)}</b><span class="muted small">${sub}</span></span></button>`;
    }).join('');
    const skip = finished < unit.lessons.length
      ? `<button class="skip-btn" data-act="exam" data-unit="${index}">Уже знаешь? Пройди тест и пропусти этап</button>`
      : '';
    return `<h2 class="unit-title">${esc(unit.title)}</h2><div class="unit-sub">${finished} из ${unit.lessons.length}</div>${skip}<div>${rows}</div>`;
  }).join('');
  return `<section class="screen">
    <header class="top">${LOGO}<h1>Melon</h1>${seeds(state.xp)}</header>
    <div class="card">${levelBar()}</div>
    <div class="seg big">
      <button class="seg-btn" data-act="course-view" data-id="lessons" aria-pressed="${courseView === 'lessons'}">Уроки</button>
      <button class="seg-btn" data-act="course-view" data-id="grammar" aria-pressed="${courseView === 'grammar'}">Грамматика</button>
    </div>
    ${courseView === 'grammar' ? grammarList() : `${installNotice()}${hero}${quick}${units}`}
  </section>${tabsBar()}`;
}

function wordsScreen() {
  const learned = learnedItems();
  if (!learned.length) {
    return `<section class="screen"><header class="top"><h1>Повторение</h1></header>
      <div class="card"><b>Пока пусто</b><p class="muted">Пройди первый урок, и его фразы появятся здесь.</p></div>
    </section>${tabsBar()}`;
  }
  const due = dueItems(state.srs, POOL).length;
  const action = due
    ? `<div class="hero"><small>На сегодня</small><h2>${due} ${plural(due, 'фраза', 'фразы', 'фраз')}</h2><button class="btn" data-act="review">Повторить</button></div>`
    : `<div class="card"><b>На сегодня всё повторено</b><p class="muted small" style="margin:4px 0 12px">Фразы вернутся, когда начнут забываться.</p><button class="btn ghost" data-act="review">Потренироваться ещё</button></div>`;
  const rows = learned.map((item) => {
    const box = state.srs[item.en].box;
    const meter = [1, 2, 3, 4, 5].map((n) => `<i class="${n <= box ? 'on' : ''}"></i>`).join('');
    return `<div class="word" data-search="${esc(`${item.en} ${item.ru}`.toLowerCase())}"><div><b>${esc(item.en)}</b><span class="muted small">${esc(item.ru)}</span><div class="meter" aria-label="Закрепление ${box} из 5">${meter}</div></div>${sayBtn(item.en)}</div>`;
  }).join('');
  return `<section class="screen"><header class="top"><h1>Повторение</h1>${seeds(state.xp)}</header>
    ${action}<h2 class="section-title">Мои фразы: ${learned.length}</h2>
    <input class="search" id="wordsearch" type="search" placeholder="Найти фразу" aria-label="Найти фразу" autocomplete="off">
    <div class="card" id="wordlist">${rows}</div>
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
  const doneCount = COURSE.filter((lesson) => state.done[lesson.id]).length;
  const accountBlock = !cloud.hasServer() ? '' : state.account
    ? `<h2 class="section-title">Аккаунт</h2><div class="card notice"><div class="text"><b>${esc(state.account.nick)}</b><span class="muted small">Прогресс сохраняется на сервере</span></div>
        <button class="link-btn" data-act="logout">Выйти</button></div>
        <button class="btn ghost" data-act="delete-account" style="color:var(--bad)">Удалить аккаунт</button>`
    : `<h2 class="section-title">Аккаунт</h2><button class="btn ghost" data-act="tab" data-id="friends">Войти или создать</button>`;
  return `<section class="screen"><header class="top"><h1>Профиль</h1>${seeds(state.xp)}</header>
    <div class="card">${levelBar()}</div>
    <div class="stats three">
      <button class="stat stat-btn" data-act="stats"><b>${weekXp()}</b><span>за неделю</span></button>
      <button class="stat stat-btn" data-act="stats"><b>${doneCount}</b><span>из ${COURSE.length} уроков</span></button>
      <button class="stat stat-btn" data-act="stats"><b>${state.activeDays}</b><span>${plural(state.activeDays, 'день', 'дня', 'дней')} занятий</span></button>
    </div>
    <button class="link-btn stats-link" data-act="stats">Подробная статистика</button>
    <button class="btn ghost" data-act="share">Вызвать друга</button>
    <h2 class="section-title">Цвет</h2><div class="swatches">${accents}</div>
    <h2 class="section-title">Фон</h2><div class="swatches">${backs}</div>
    <h2 class="section-title">Настройки</h2>
    <div class="card" style="padding-block:6px">
      ${toggle('sound', 'Звук', canSpeak() ? 'Выключи, если занимаешься на работе' : 'На этом устройстве нет английского голоса', soundOn(), !canSpeak())}
      ${toggle('speak', 'Задания вслух', speakAllowed() ? 'Скажи фразу вслух, приложение не слушает' : 'Сейчас выключены', speakAllowed())}
      ${toggle('pron', 'Подсказка русскими буквами', 'Отключи, когда начнёшь читать без неё', state.settings.pron)}
    </div>
    ${accountBlock}
    <h2 class="section-title">Прогресс</h2>
    <p class="muted small" style="margin-bottom:12px">${state.account ? 'Код нужен на случай, если сервер недоступен.' : 'Он хранится только на этом телефоне. Код нужен, чтобы перенести его или не потерять.'}</p>
    <button class="btn ghost" data-act="backup">Сохранить код</button>
    <button class="btn ghost" data-act="restore">Вставить код</button>
    <button class="btn ghost" data-act="reset" style="color:var(--bad)">Сбросить всё</button>
    <div class="version"><span>${appVersion ? `Версия ${appVersion}` : ''}</span><button class="link-btn" data-act="check-update">Проверить обновление</button></div>
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
  const home = '<button class="btn ghost" data-act="home">На главную</button>';
  const seedStat = `<div class="stat"><b>+${r.gained}</b><span>${plural(r.gained, 'семечко', 'семечка', 'семечек')}</span></div>`;
  let title;
  let lead = '';
  let stats = `${seedStat}<div class="stat"><b>${r.accuracy}%</b><span>точность</span></div>`;
  let buttons;
  if (r.type === 'exam') {
    title = r.passed ? 'Этап пройден!' : `Пока ${r.accuracy}%`;
    lead = r.passed
      ? `Его уроки засчитаны: ${esc(UNITS[r.unit].title)}.`
      : `Нужно ${PASS_PERCENT}%: ${r.need} верных из ${r.total}, у тебя ${r.right}. Вопросы в новой попытке будут другие.`;
    buttons = r.passed
      ? `<button class="btn" data-act="home">Дальше</button>`
      : `<button class="btn" data-act="exam-go" data-unit="${r.unit}">Ещё раз</button>${home}`;
  } else if (r.type === 'blitz') {
    title = r.record ? 'Новый рекорд!' : 'Время вышло';
    stats = `<div class="stat"><b>${r.right}</b><span>верных ответов</span></div><div class="stat"><b>${state.blitzBest}</b><span>твой рекорд</span></div>`;
    buttons = `<button class="btn" data-act="blitz">Ещё раз</button>${home}`;
  } else {
    title = r.accuracy === 100 ? 'Без ошибок!' : r.type === 'review' ? 'Повторено!' : 'Урок пройден!';
    if (r.grammar) buttons = '<button class="btn" data-act="to-grammar">К грамматике</button>';
    else if (r.media) buttons = '<button class="btn" data-act="to-media">К разборам</button>';
    else if (r.type === 'lesson' && next) buttons = `<button class="btn" data-act="lesson" data-id="${next.id}">Следующий урок</button>${home}`;
    else buttons = '<button class="btn" data-act="home">Готово</button>';
  }
  return `<section class="center"><div class="mid">${LOGO}<h1>${title}</h1>
      ${lead ? `<p class="lead">${lead}</p>` : ''}
      ${r.levelUp ? `<div class="level-up">Новый уровень: ${info.level}</div>` : ''}
      <div class="stats">${stats}</div></div>
    ${buttons}
  </section>`;
}

// ---------- Разборы ----------

function mediaScreen() {
  const open = MEDIA.find((entry) => entry.id === mediaOpen);
  return open ? mediaDetail(open) : mediaList();
}

function mediaList() {
  const game1 = state.wordGame.level >= WORD_LEVELS.length ? 'Все уровни пройдены' : `Уровень ${state.wordGame.level + 1} из ${WORD_LEVELS.length}`;
  const gameRow = (act, icon, title, sub) => `<button class="media-row" data-act="${act}"><span class="thumb thumb-text">${icon}</span>
      <span class="media-text"><b>${title}</b><span class="muted small">${sub}</span></span></button>`;
  const games = `<h2 class="section-title">Мини-игры</h2>
    ${gameRow('open-words', ICON.path, 'Слова', game1)}
    ${gameRow('open-pairs', ICON.repeat, 'Пары', state.pairsBest ? `Рекорд: ${state.pairsBest} с` : 'Фраза и её перевод')}
    ${gameRow('blitz', ICON.bolt, 'Блиц', `${BLITZ_SECONDS} секунд${state.blitzBest ? `, рекорд ${state.blitzBest}` : ''}`)}`;
  const sections = MEDIA_KINDS.map((kind) => {
    const rows = MEDIA.filter((entry) => entry.kind === kind.id).map((entry) => {
      const thumb = entry.video
        ? `<img class="thumb" src="https://i.ytimg.com/vi/${entry.video}/mqdefault.jpg" alt="" loading="lazy">`
        : `<span class="thumb thumb-text">${kind.id === 'movie' ? ICON.film : kind.id === 'deadlock' ? ICON.friends : ICON.bolt}</span>`;
      const done = state.done[entry.id] ? `<span class="media-done">${ICON.check}</span>` : '';
      return `<button class="media-row" data-act="media-open" data-id="${entry.id}">${thumb}
        <span class="media-text"><b>${esc(entry.title)}</b><span class="muted small">${esc(entry.video ? entry.by : state.saved[entry.id] ? `Продолжить: ${state.saved[entry.id].i + 1} из ${state.saved[entry.id].total}` : `${entry.items.length} фраз`)}</span></span>${done}</button>`;
    }).join('');
    return `<h2 class="section-title">${kind.title}</h2>${rows}`;
  }).join('');
  return `<section class="screen"><header class="top"><h1>Actions</h1>${seeds(state.xp)}</header>
    ${games}
    ${sections}
    <p class="muted small" style="margin-top:14px">Разборы работают и без интернета, для клипов нужна сеть.</p>
  </section>${tabsBar()}`;
}

function mediaDetail(entry) {
  const video = !entry.video ? '' : videoOn
    ? `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${entry.video}?autoplay=1&playsinline=1&rel=0" title="${esc(entry.title)}"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
       <a class="link-btn" href="https://www.youtube.com/watch?v=${entry.video}" target="_blank" rel="noopener">Не играет? Открыть в YouTube</a>`
    : `<button class="video video-cover" data-act="video-on" aria-label="Включить клип">
        <img src="https://i.ytimg.com/vi/${entry.video}/hqdefault.jpg" alt=""><span class="play">${ICON.play}</span></button>`;
  const catchBlock = entry.catchWords
    ? `<h2 class="section-title">Поймай на слух</h2><p class="muted small" style="margin-bottom:10px">Включи клип и попробуй услышать эти слова.</p>
       <div class="chips">${entry.catchWords.map((word) => `<span class="chip">${esc(word)}</span>`).join('')}</div>
       <h2 class="section-title">Похожие фразы для жизни</h2>`
    : '<h2 class="section-title">Фразы</h2>';
  const rows = entry.items.map((item) => {
    const scene = entry.kind === 'movie'
      ? `<a class="scene" href="${esc(sceneSearchUrl(item))}" target="_blank" rel="noopener">Найти сцену</a>` : '';
    return `<div class="word"><div><b>${esc(item.en)}</b><span class="muted small">${esc(item.ru)}</span>
      ${item.note ? `<span class="note">${esc(item.note)}</span>` : ''}${scene}</div>${sayBtn(item.en)}</div>`;
  }).join('');
  return `<section class="screen"><header class="top"><button class="icon-btn back" data-act="media-close" aria-label="Назад">${ICON.back}</button><h1 class="h-small">${esc(entry.title)}</h1></header>
    ${video}<p class="about">${esc(entry.about)}</p>
    <button class="btn" data-act="lesson" data-id="${entry.id}">${state.saved[entry.id] ? 'Продолжить' : state.done[entry.id] ? 'Пройти ещё раз' : 'Разобрать'}</button>
    ${entry.search ? `<a class="link-btn" href="https://www.youtube.com/results?search_query=${encodeURIComponent(entry.search)}" target="_blank" rel="noopener">Послушать настоящие реплики на YouTube</a>` : ''}
    ${catchBlock}<div class="card">${rows}</div>
  </section>${tabsBar()}`;
}

// ---------- Друзья: рейтинг и доска ----------

function myStats() {
  return {
    xp: state.xp,
    weekKey: weekKey(),
    weekXp: weekXp(),
    words: countWords(learnedItems()),
    units: UNITS.filter((unit) => unit.lessons.every((lesson) => state.done[lesson.id])).length,
    blitz: state.blitzBest,
  };
}

const METRICS = [
  { id: 'week', label: 'Неделя', value: (row) => row.week_xp },
  { id: 'xp', label: 'Всего', value: (row) => row.xp },
  { id: 'words', label: 'Слова', value: (row) => row.words, ghost: (b) => b.words },
  { id: 'units', label: 'Этапы', value: (row) => row.units, ghost: (b) => b.units },
  { id: 'blitz', label: 'Блиц', value: (row) => row.blitz, ghost: (b) => b.blitz },
];

function ratingRows() {
  const metric = METRICS.find((x) => x.id === friendsMetric);
  const mine = myStats();
  const meRow = { week_xp: mine.weekXp, xp: mine.xp, words: mine.words, units: mine.units, blitz: mine.blitz };
  const people = state.account
    ? state.ratingCache.filter((row) => !row.me).map((row) => ({ nick: row.nick, score: metric.value(row) }))
    : [];
  people.push({ nick: state.account?.nick ?? 'Ты', score: metric.value(meRow), me: true });
  const ghosts = metric.ghost
    ? BENCHMARKS.map((b) => ({ nick: `Уровень ${b.id}`, score: metric.ghost(b), ghost: true }))
    : [];
  const all = [...people, ...ghosts].sort((a, b) => b.score - a.score || (a.ghost ? 1 : -1));
  let place = 0;
  return all.map((row) => {
    if (!row.ghost) place++;
    const remove = !row.ghost && !row.me
      ? `<button class="icon-btn small-x" data-act="friend-remove" data-nick="${esc(row.nick)}" aria-label="Убрать ${esc(row.nick)} из друзей">${ICON.close}</button>` : '';
    return `<div class="rate-row ${row.me ? 'me' : ''} ${row.ghost ? 'ghost' : ''}">
      <span class="place">${row.ghost ? '' : place}</span>
      <span class="rate-nick">${esc(row.nick)}${row.ghost ? '<small>примерный ориентир</small>' : ''}</span>
      <b>${row.score}</b>${remove}</div>`;
  }).join('');
}

function benchmarkCard() {
  const mine = myStats();
  const nextLevel = BENCHMARKS.find((b) => mine.words < b.words);
  const goal = nextLevel ? `<p style="margin-bottom:10px"><b>До ${nextLevel.id}: ещё ${nextLevel.words - mine.words} ${plural(nextLevel.words - mine.words, 'слово', 'слова', 'слов')}</b></p>` : '';
  const rows = BENCHMARKS.map((b) => `<div class="bench"><b>${b.id}</b><span>около ${b.words} слов, ${b.units === UNITS.length ? 'тесты всех этапов' : `тесты этапов 1–${b.units}`} на ${neededToPass(EXAM_SIZE)} из ${EXAM_SIZE}, ${b.blitz}+ в блице</span></div>`).join('');
  return `<h2 class="section-title">Что сможет человек этого уровня</h2>
    <div class="card">${goal}${rows}
    <p class="muted small" style="margin-top:10px">Это примерная оценка, а не официальный экзамен. Сейчас в курсе и разборах всего ${countWords(POOL)} разных ${plural(countWords(POOL), 'слово', 'слова', 'слов')}, так что до этих уровней Melon пока не доводит.</p></div>`;
}

function authBlock() {
  return `<div class="card"><b>Войди, чтобы соревноваться</b>
    <p class="muted small" style="margin:4px 0 12px">Нужны только ник и пароль, без почты и телефона. Прогресс будет храниться на сервере и не потеряется.</p>
    <input class="field" data-bind="nick" value="${esc(drafts.nick)}" placeholder="Ник" aria-label="Ник" autocomplete="username" autocapitalize="off" spellcheck="false" maxlength="16">
    <input class="field" data-bind="pass" value="${esc(drafts.pass)}" type="password" placeholder="Пароль, от 6 символов" aria-label="Пароль" autocomplete="current-password">
    <button class="btn" data-act="auth-login" ${busy ? 'disabled' : ''}>Войти</button>
    <button class="btn ghost" data-act="auth-register" ${busy ? 'disabled' : ''}>Создать аккаунт</button>
    <p class="muted small" style="margin-top:12px">Запиши пароль: восстановить его нельзя, у нас нет твоей почты.</p></div>`;
}

function ratingView() {
  const seg = METRICS.map((x) => `<button class="seg-btn" data-act="metric" data-id="${x.id}" aria-pressed="${friendsMetric === x.id}">${x.label}</button>`).join('');
  let top = '';
  if (!cloud.hasServer()) {
    top = '<div class="card"><b>Рейтинг с друзьями скоро</b><p class="muted small" style="margin-top:4px">Аккаунты включатся, когда подключим сервер. Пока можно сравнить себя с уровнями языка.</p></div>';
  } else if (!state.account) {
    top = authBlock();
  } else {
    top = `<div class="add-friend"><input class="field" data-bind="friend" value="${esc(drafts.friend)}" placeholder="Ник друга" aria-label="Ник друга" autocapitalize="off" spellcheck="false" maxlength="16">
      <button class="btn add-btn" data-act="friend-add" ${busy ? 'disabled' : ''}>Добавить</button></div>
      <p class="muted small" style="margin-bottom:12px">Твой ник: <b>${esc(state.account.nick)}</b>. Скажи его другу или добавь друга сам: вы появитесь в рейтинге друг у друга.</p>
      ${cloudOffline ? '<p class="muted small" style="margin-bottom:12px">Нет связи, показаны последние данные.</p>' : ''}`;
  }
  return `${top}<div class="seg">${seg}</div><div class="card rate-list">${ratingRows()}</div>${benchmarkCard()}`;
}

const POST_KINDS = { bug: 'Ошибка', idea: 'Идея', chat: 'Просто так' };

function boardView() {
  if (!cloud.hasServer()) {
    return '<div class="card"><b>Доска скоро появится</b><p class="muted small" style="margin-top:4px">Здесь можно будет написать об ошибке, предложить идею или просто что-нибудь сказать. Она заработает вместе с аккаунтами.</p></div>';
  }
  const chips = Object.entries(POST_KINDS).map(([id, label]) => `<button class="seg-btn" data-act="post-kind" data-id="${id}" aria-pressed="${postKind === id}">${label}</button>`).join('');
  const compose = state.account
    ? `<div class="seg">${chips}</div>
       <textarea class="field area" data-bind="post" placeholder="Что случилось? Эту запись увидят все" aria-label="Сообщение" maxlength="500">${esc(drafts.post)}</textarea>
       <button class="btn" data-act="post-send" ${busy ? 'disabled' : ''}>Отправить</button>`
    : '<div class="card"><b>Войди, чтобы писать</b><p class="muted small" style="margin:4px 0 10px">Читать можно и без аккаунта.</p><button class="btn ghost" data-act="friends-view" data-id="rating">Войти</button></div>';
  const posts = state.postsCache.map((post) => {
    const when = new Date(post.created_at).toLocaleString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const canDelete = post.mine || post.can_delete;
    const action = canDelete
      ? `<button class="post-act" data-act="post-delete" data-id="${Number(post.id)}">Удалить</button>`
      : state.account ? `<button class="post-act" data-act="post-report" data-id="${Number(post.id)}">Пожаловаться</button>` : '';
    return `<article class="post"><div class="post-head"><b>${esc(post.nick)}</b><span class="post-kind ${esc(post.kind)}">${esc(POST_KINDS[post.kind] ?? '')}</span></div>
      <p>${esc(post.body)}</p><div class="post-foot"><span>${esc(when)}</span>${action}</div></article>`;
  }).join('');
  return `${compose}
    ${cloudOffline ? '<p class="muted small" style="margin-top:12px">Нет связи, показаны последние данные.</p>' : ''}
    <div class="posts">${posts || '<p class="muted" style="text-align:center;padding:24px 0">Пока никто не написал. Будь первым!</p>'}</div>`;
}

function friendsScreen() {
  const views = [['rating', 'Рейтинг'], ['board', 'Доска']].map(([id, label]) => `<button class="seg-btn" data-act="friends-view" data-id="${id}" aria-pressed="${friendsView === id}">${label}</button>`).join('');
  return `<section class="screen"><header class="top"><h1>Друзья</h1>${seeds(state.xp)}</header>
    <div class="seg big">${views}</div>
    ${friendsView === 'rating' ? ratingView() : boardView()}
  </section>${tabsBar()}`;
}

// ---------- Грамматика ----------

function grammarList() {
  const groups = GRAMMAR_GROUPS.map((group) => {
    const rows = GRAMMAR.filter((topic) => topic.group === group).map((topic) => {
      const done = state.done[topic.id];
      const saved = state.saved[topic.id];
      const sub = saved ? `Продолжить: ${saved.i + 1} из ${saved.total}` : done ? `Точность ${done}%` : `${topic.tasks.length} заданий`;
      return `<button class="media-row" data-act="lesson" data-id="${topic.id}">
        <span class="media-text"><b>${esc(topic.title)}</b><span class="muted small">${sub}</span></span>
        ${done ? `<span class="media-done">${ICON.check}</span>` : ''}</button>`;
    }).join('');
    return `<h2 class="section-title">${esc(group)}</h2>${rows}`;
  }).join('');
  return `<p class="muted small">Короткое правило и сразу задания. Темы открыты все, начинай с любой.</p>${groups}`;
}

// ---------- Статистика ----------

const pad = (day) => new Date(day * 86400000);
const dayLabel = (day) => pad(day).toLocaleDateString('ru', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const minutes = (seconds) => Math.round((seconds ?? 0) / 60);

function timeLabel(seconds) {
  const total = minutes(seconds);
  if (total < 60) return `${total} мин`;
  return `${Math.floor(total / 60)} ч ${total % 60} мин`;
}

function dayDetails(day) {
  const data = state.daily[day];
  if (!data) return `<div class="card day-card"><b>${dayLabel(day)}</b><p class="muted small">В этот день занятий не было.</p></div>`;
  const answers = (data.right ?? 0) + (data.wrong ?? 0);
  const accuracy = answers ? Math.round(((data.right ?? 0) / answers) * 100) : 0;
  const lessons = data.lessons ?? 0;
  return `<div class="card day-card"><b>${dayLabel(day)}</b>
    <div class="day-rows">
      <span>Семечки</span><b>${data.xp ?? 0}</b>
      <span>Уроки</span><b>${lessons}</b>
      <span>Ответы</span><b>${answers}</b>
      <span>Точность</span><b>${answers ? `${accuracy}%` : 'нет'}</b>
      <span>Время</span><b>${timeLabel(data.seconds)}</b>
    </div></div>`;
}

function statsCalendar(today) {
  const weeks = monthWeeks(statsMonth.year, statsMonth.month);
  const title = new Date(Date.UTC(statsMonth.year, statsMonth.month, 1)).toLocaleDateString('ru', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const cells = weeks.flat().map((day) => {
    if (day === null) return '<span class="cal-empty"></span>';
    const active = Boolean(state.daily[day]);
    const cls = [active ? 'on' : '', day === today ? 'today' : '', day === statsDay ? 'picked' : ''].join(' ');
    return `<button class="cal-day ${cls}" data-act="stats-day" data-day="${day}" ${day > today ? 'disabled' : ''} aria-label="${dayLabel(day)}${active ? ', были занятия' : ''}">${pad(day).getUTCDate()}</button>`;
  }).join('');
  const heads = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((name) => `<span class="cal-head">${name}</span>`).join('');
  return `<div class="card"><div class="cal-top">
      <button class="icon-btn" data-act="stats-month" data-d="-1" aria-label="Прошлый месяц">${ICON.back}</button>
      <b class="cal-title">${title}</b>
      <button class="icon-btn flip" data-act="stats-month" data-d="1" aria-label="Следующий месяц">${ICON.back}</button>
    </div><div class="cal">${heads}${cells}</div></div>`;
}

function statsChart(today) {
  const days = Array.from({ length: 14 }, (_, i) => today - 13 + i);
  const values = days.map((day) => state.daily[day]?.xp ?? 0);
  const max = Math.max(...values, 1);
  const peak = values.indexOf(Math.max(...values));
  const bars = days.map((day, i) => {
    const value = values[i];
    const height = value ? Math.max((value / max) * 100, 4) : 0;
    return `<button class="bar-col ${day === statsDay ? 'picked' : ''}" data-act="stats-day" data-day="${day}" aria-label="${dayLabel(day)}: ${value}">
      ${value && i === peak ? `<span class="bar-peak" style="bottom:${height}%">${value}</span>` : ''}
      <i style="height:${height}%"></i></button>`;
  }).join('');
  return `<div class="card"><b>Семечки за 14 дней</b><div class="bars">${bars}</div>
    <div class="bars-axis"><span>${dayLabel(days[0])}</span><span>сегодня</span></div></div>`;
}

function statsScreen() {
  const today = dayNumber();
  const days = Object.keys(state.daily).map(Number);
  const { current, best } = streaks(days, today);
  const totals = Object.values(state.daily).reduce((sum, day) => ({
    right: sum.right + (day.right ?? 0),
    wrong: sum.wrong + (day.wrong ?? 0),
    seconds: sum.seconds + (day.seconds ?? 0),
    lessons: sum.lessons + (day.lessons ?? 0),
  }), { right: 0, wrong: 0, seconds: 0, lessons: 0 });
  const answers = totals.right + totals.wrong;
  const learned = learnedItems();
  const boxes = learned.map((item) => state.srs[item.en].box);
  const tile = (value, label) => `<div class="stat"><b>${value}</b><span>${label}</span></div>`;
  const older = state.activeDays - days.length;
  const courseDone = COURSE.filter((lesson) => state.done[lesson.id]).length;
  const row = (label, value) => `<div class="stat-row"><span>${label}</span><b>${value}</b></div>`;
  return `<section class="screen"><header class="top"><button class="icon-btn back" data-act="stats-close" aria-label="Назад">${ICON.back}</button><h1>Статистика</h1></header>
    <div class="stats three">${tile(state.activeDays, plural(state.activeDays, 'день занятий', 'дня занятий', 'дней занятий'))}${tile(current, plural(current, 'день подряд', 'дня подряд', 'дней подряд'))}${tile(best, 'лучшая серия')}</div>
    ${statsCalendar(today)}
    ${older > 0 ? `<p class="muted small" style="margin:-6px 0 14px">Ещё ${older} ${plural(older, 'день был', 'дня было', 'дней было')} до появления календаря, их даты не записывались.</p>` : ''}
    ${dayDetails(statsDay)}
    ${statsChart(today)}
    <h2 class="section-title">Всего</h2>
    <div class="card" style="padding-block:6px">
      ${row('Время', timeLabel(totals.seconds))}
      ${row('Ответов', answers)}
      ${row('Точность', answers ? `${Math.round((totals.right / answers) * 100)}%` : 'нет')}
      ${row('Семечки', state.xp)}
      ${row('Уроки курса', `${courseDone} из ${COURSE.length}`)}
      ${row('Темы грамматики', `${GRAMMAR.filter((topic) => state.done[topic.id]).length} из ${GRAMMAR.length}`)}
      ${row('Разборы', `${MEDIA.filter((entry) => state.done[entry.id]).length} из ${MEDIA.length}`)}
      ${row('Рекорд блица', state.blitzBest)}
      ${row('Уровень в игре «Слова»', Math.min(state.wordGame.level + 1, WORD_LEVELS.length))}
    </div>
    <h2 class="section-title">Фразы</h2>
    <div class="card" style="padding-block:6px">
      ${row('Выучено всего', learned.length)}
      ${row('Разных слов', countWords(learned))}
      ${row('Только начал(а)', boxes.filter((box) => box === 1).length)}
      ${row('Закрепляются', boxes.filter((box) => box === 2 || box === 3).length)}
      ${row('Выучены крепко', boxes.filter((box) => box >= 4).length)}
    </div>
  </section>${tabsBar()}`;
}

// ---------- Игра «Слова» ----------

function openWordGame() {
  const progress = state.wordGame;
  const level = WORD_LEVELS[progress.level];
  game = {
    type: 'words',
    level,
    layout: level ? layoutWords(level.words) : null,
    order: level ? shuffle([...level.letters]) : [],
    path: [],
    gesture: null,
    finished: null,
    pin: null,
  };
  if (level && progress.last) {
    const remembered = level.words.find((entry) => entry.en === progress.last);
    if (remembered) pinWord(game.layout.words.find((entry) => entry.en === progress.last) ?? remembered);
  }
  lastAt = Date.now();
  history.pushState({ game: true }, '');
  render();
}

function pinWord(entry) {
  game.pin = { en: entry.en, ru: entry.ru, cells: entry.cells ?? [] };
  state.wordGame.last = entry.en;
  save();
}

function wordVisibleCells() {
  const { found, revealed } = state.wordGame;
  const cells = new Set(revealed);
  for (const entry of game.layout.words) {
    if (found.includes(entry.en)) entry.cells.forEach((cell) => cells.add(cell));
  }
  return cells;
}

function wordsGameScreen() {
  if (!game.level) {
    return `<section class="center"><div class="mid">${LOGO}<h1>Все уровни пройдены</h1><p class="lead">Новые скоро появятся.</p></div>
      <button class="btn" data-act="game-close">Назад</button></section>`;
  }
  const { layout, level, order } = game;
  const size = Math.floor(Math.min((app.clientWidth - 24) / layout.width, (app.clientHeight - 470) / layout.height, 44));
  const visible = wordVisibleCells();
  const cells = [];
  for (let y = 0; y < layout.height; y++) {
    for (let x = 0; x < layout.width; x++) {
      const spot = `${x + layout.minX},${y + layout.minY}`;
      const letter = layout.grid.get(spot);
      if (!letter) cells.push('<span></span>');
      else if (visible.has(spot)) cells.push(`<button class="cw-cell on ${game.pin?.cells.includes(spot) ? 'pinned' : ''}" data-act="cw-tap" data-cell="${spot}" aria-label="Перевод слова с буквой ${esc(letter)}">${esc(letter.toUpperCase())}</button>`);
      else cells.push('<span class="cw-cell"></span>');
    }
  }
  const letters = order.map((letter, i) => {
    const angle = (i / order.length) * Math.PI * 2 - Math.PI / 2;
    const left = 50 + 36 * Math.cos(angle);
    const top = 50 + 36 * Math.sin(angle);
    return `<span class="wl" data-i="${i}" data-x="${left}" data-y="${top}" style="left:${left}%;top:${top}%">${esc(letter)}</span>`;
  }).join('');
  const hints = state.wordGame.hints;
  const finishSheet = game.finished
    ? `<div class="veil"><div class="sheet"><h2>Уровень ${level.id} пройден!</h2><p>+${game.finished.gained} семечек. Вот что ты собрал(а):</p>
        <div class="found-list">${level.words.map((entry) => `<div class="word"><div><b>${esc(entry.en)}</b><span class="muted small">${esc(entry.ru)}</span></div>${sayBtn(entry.en)}</div>`).join('')}</div>
        <button class="btn" data-act="word-next">Следующий уровень</button><button class="btn ghost" data-act="game-close">Хватит</button></div></div>`
    : '';
  const bonusLeft = layout.bonus.length;
  return `<section class="game">
    <header class="game-top"><button class="icon-btn" data-act="game-close" aria-label="Назад">${ICON.back}</button>
      <b>Уровень ${level.id} из ${WORD_LEVELS.length}</b>${seeds(state.xp)}</header>
    <div class="cw-pin">${game.pin
      ? `<div class="cw-pin-text"><b>${esc(game.pin.en)}</b><span>${esc(game.pin.ru)}</span></div>${sayBtn(game.pin.en)}`
      : '<span class="muted small">Нажми на готовое слово в сетке, и здесь появится перевод</span>'}</div>
    <div class="cw-area"><div class="cw" style="grid-template-columns:repeat(${layout.width},${size}px);grid-auto-rows:${size}px;font-size:${Math.round(size * 0.55)}px">${cells.join('')}</div></div>
    <div class="cw-line"><span id="cwcurrent" class="cw-current"></span>
      <span id="cwtap" class="cw-tap" hidden><button class="link-btn" data-act="word-submit">Проверить</button><button class="link-btn" data-act="word-clear">Стереть</button></span>
      <span id="cwinfo" class="muted small">Проведи по буквам${bonusLeft ? `, есть бонусные слова` : ''}</span></div>
    <div class="wheel-row">
      <button class="round-btn" data-act="word-shuffle" aria-label="Перемешать буквы">${ICON.repeat}</button>
      <div class="wheel" id="wheel"><svg class="wheel-line" viewBox="0 0 100 100" aria-hidden="true"><polyline id="wheelpath" points=""/></svg>${letters}</div>
      <button class="round-btn" data-act="word-hint" ${hints ? '' : 'disabled'} aria-label="Подсказка: открыть букву, осталось ${hints}">${ICON.bulb}<span class="round-count">${hints}</span></button>
    </div>
  </section>${finishSheet}`;
}

function drawWordPath() {
  if (!game?.path) return;
  const wheel = document.getElementById('wheel');
  if (!wheel) return;
  const nodes = [...wheel.querySelectorAll('.wl')];
  nodes.forEach((node, i) => node.classList.toggle('sel', game.path.includes(i)));
  document.getElementById('wheelpath').setAttribute('points', game.path.map((i) => `${nodes[i].dataset.x},${nodes[i].dataset.y}`).join(' '));
  const text = game.path.map((i) => game.order[i]).join('');
  document.getElementById('cwcurrent').textContent = text;
  document.getElementById('cwinfo').hidden = Boolean(text);
  document.getElementById('cwtap').hidden = !(game.path.length && !game.gesture);
}

function letterAt(event) {
  const wheel = document.getElementById('wheel');
  const box = wheel.getBoundingClientRect();
  let best = -1;
  let bestDistance = box.width * 0.17;
  wheel.querySelectorAll('.wl').forEach((node, i) => {
    const dx = event.clientX - (box.left + (Number(node.dataset.x) / 100) * box.width);
    const dy = event.clientY - (box.top + (Number(node.dataset.y) / 100) * box.height);
    const distance = Math.hypot(dx, dy);
    if (distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  });
  return best;
}

function submitWord() {
  const text = game.path.map((i) => game.order[i]).join('').toLowerCase();
  game.path = [];
  if (!text) return;
  tick();
  const progress = state.wordGame;
  const { layout } = game;
  if (progress.found.includes(text) || progress.bonus.includes(text)) {
    const known = [...layout.words, ...layout.bonus].find((entry) => entry.en === text);
    if (known) pinWord(known);
    showToast('Это слово уже есть');
    return;
  }
  const inGrid = layout.words.find((entry) => entry.en === text);
  const inBonus = layout.bonus.find((entry) => entry.en === text);
  if (inGrid) {
    progress.found.push(text);
    addXp(POINTS.wordFound);
    recordDay('right', 1);
    if (soundOn()) speak(text);
    pinWord(inGrid);
    checkWordLevel();
  } else if (inBonus) {
    progress.bonus.push(text);
    addXp(POINTS.wordBonus);
    recordDay('right', 1);
    if (soundOn()) speak(text);
    pinWord(inBonus);
    showToast('Бонусное слово!');
  } else {
    recordDay('wrong', 1);
    showToast(`${text.length < 2 ? 'Нужно хотя бы две буквы' : 'Такого слова в этом уровне нет'}`);
  }
  save();
  render();
}

function checkWordLevel() {
  const progress = state.wordGame;
  const visible = wordVisibleCells();
  for (const entry of game.layout.words) {
    if (!progress.found.includes(entry.en) && entry.cells.every((cell) => visible.has(cell))) progress.found.push(entry.en);
  }
  if (game.layout.words.every((entry) => progress.found.includes(entry.en))) {
    addXp(POINTS.wordLevel);
    recordDay('lessons', 1);
    state.wordGame = { level: progress.level + 1, found: [], revealed: [], bonus: [], hints: WORD_HINTS };
    game.finished = { gained: POINTS.wordLevel + game.layout.words.length * POINTS.wordFound };
  }
  save();
}

// ---------- Игра «Пары» ----------

function openPairs() {
  const learned = learnedItems();
  const source = learned.length >= PAIRS_COUNT ? learned : COURSE.slice(0, 2).flatMap((lesson) => lesson.items);
  game = {
    type: 'pairs',
    cards: buildPairs(source, PAIRS_COUNT),
    open: null,
    wrong: [],
    matched: [],
    misses: 0,
    startedAt: Date.now(),
    finished: null,
  };
  lastAt = Date.now();
  if (!history.state?.game) history.pushState({ game: true }, '');
  render();
}

function pairsScreen() {
  const cards = game.cards.map((card, i) => {
    const matched = game.matched.includes(card.pair);
    const cls = [matched ? 'matched' : '', game.open === i ? 'open' : '', game.wrong.includes(i) ? 'miss' : ''].join(' ');
    return `<button class="pair ${cls}" data-act="pair" data-i="${i}" ${matched ? 'disabled' : ''}>${esc(card.text)}</button>`;
  }).join('');
  const done = game.finished
    ? `<div class="veil"><div class="sheet"><h2>Все пары собраны!</h2><p>${game.finished.seconds} с, ошибок: ${game.misses}. Лучшее время: ${state.pairsBest} с.</p>
        <button class="btn" data-act="pairs-again">Ещё раз</button><button class="btn ghost" data-act="game-close">Хватит</button></div></div>`
    : '';
  return `<section class="game">
    <header class="game-top"><button class="icon-btn" data-act="game-close" aria-label="Назад">${ICON.back}</button>
      <b>Найди пары</b>${seeds(state.xp)}</header>
    <p class="muted small" style="padding:0 18px 10px">Соедини фразу с её переводом.</p>
    <div class="pairs">${cards}</div>
  </section>${done}`;
}

// ---------- Занятие ----------

const speakAllowed = () => state.settings.speak && Date.now() > state.noSpeakUntil;
const runKey = (r) => (r.type === 'exam' ? `exam-${r.unit}` : r.lesson?.id);
const canResume = (r) => r.type === 'lesson' || r.type === 'exam';

// Задание сохраняется после каждого ответа: выход и даже закрытие приложения его не сбрасывают.
function saveRunState() {
  if (!run || !canResume(run)) return;
  const { queue, i, total, asked, firstTryRight, gained, feedback, picked, typed, chosen } = run;
  state.saved[runKey(run)] = { queue, i, total, asked, firstTryRight, gained, feedback, picked, typed, chosen };
}

function skipSpeakSteps() {
  while (current()?.kind === 'speak' && !speakAllowed()) run.i++;
}

function startLesson(id) {
  const lesson = COURSE.find((x) => x.id === id) ?? MEDIA.find((x) => x.id === id) ?? GRAMMAR.find((x) => x.id === id);
  const replay = Boolean(state.done[id]);
  if (state.saved[id]) {
    startRun({ type: 'lesson', lesson, steps: [], replay, restore: state.saved[id] });
    return;
  }
  // В обычные уроки не подмешиваем фразы из мемов и кино как неверные варианты.
  const steps = lesson.grammar ? buildGrammarSteps(lesson) : buildLessonSteps(lesson, lesson.media ? POOL : ALL_ITEMS);
  startRun({ type: 'lesson', lesson, steps, replay });
}

function startExam(unit) {
  const savedExam = state.saved[`exam-${unit}`];
  if (savedExam) {
    startRun({ type: 'exam', unit, steps: [], restore: savedExam });
    return;
  }
  const items = UNITS[unit].lessons.flatMap((lesson) => lesson.items);
  startRun({ type: 'exam', unit, steps: buildExamSteps(items, ALL_ITEMS) });
}

function blitzItems() {
  const learned = learnedItems();
  return learned.length >= 4 ? learned : COURSE[0].items;
}

function startBlitz() {
  const items = blitzItems();
  startRun({ type: 'blitz', steps: [buildBlitzStep(items, POOL)] });
  run.blitzItems = items;
  run.endsAt = Date.now() + BLITZ_SECONDS * 1000;
  const owner = run;
  run.timer = setInterval(() => {
    if (run !== owner) {
      clearInterval(owner.timer);
      return;
    }
    const left = owner.endsAt - Date.now();
    if (left <= 0) {
      finishRun();
      return;
    }
    const bar = document.getElementById('timebar');
    if (bar) bar.style.width = `${(left / (BLITZ_SECONDS * 1000)) * 100}%`;
    const label = document.getElementById('timeleft');
    if (label) label.textContent = Math.ceil(left / 1000);
  }, 200);
  render();
}

function startReview() {
  const due = dueItems(state.srs, POOL);
  const source = due.length ? due : learnedItems();
  if (!source.length) return;
  const items = shuffle(source).slice(0, 10);
  startRun({ type: 'review', steps: buildReviewSteps(items, state.srs, POOL), replay: !due.length });
}

function startRun({ type, lesson = null, steps, unit = null, replay = false, restore = null }) {
  run = {
    type,
    lesson,
    unit,
    replay,
    queue: steps,
    i: 0,
    total: steps.length,
    asked: 0,
    firstTryRight: 0,
    gained: 0,
    startLevel: levelInfo(state.xp).level,
    feedback: null,
    picked: [],
    typed: '',
    chosen: null,
    ...restore,
  };
  result = null;
  sheet = null;
  lastAt = Date.now();
  skipSpeakSteps();
  if (run.i >= run.queue.length) {
    finishRun();
    return;
  }
  saveRunState();
  save();
  history.pushState({ run: true }, '');
  render();
  if (!run.feedback) announceStep();
}

const current = () => run.queue[run.i];
function announceStep() {
  const step = current();
  if (!soundOn() || !step || run.type === 'blitz') return;
  if (step.kind === 'intro' || step.kind === 'listen' || step.kind === 'speak') speak(step.item.en);
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
  const first = !step.retried;
  tick();
  recordDay(correct ? 'right' : 'wrong', 1);
  if (first) run.asked++;
  if (correct && first) {
    run.firstTryRight++;
    const points = pointsPerAnswer();
    run.gained += points;
    addXp(points);
  }
  if (run.type === 'review' && first) {
    state.srs[step.item.en] = srsAnswer(state.srs[step.item.en], correct);
  }
  if (!correct && first && (run.type === 'lesson' || run.type === 'review')) {
    step.retried = true;
    run.queue.push(step);
    run.total++;
  }
  run.feedback = { correct, first, ...extra };
  saveRunState();
  save();
  render();
  if (run.type === 'blitz') {
    const owner = run;
    setTimeout(() => {
      if (run === owner) advance();
    }, correct ? 200 : 650);
    return;
  }
  if (soundOn()) speak(targetOf(step).en);
}

function pointsPerAnswer() {
  if (run.type === 'exam') return 0;
  if (run.type === 'blitz') return POINTS.blitz;
  if (run.replay) return POINTS.repeat;
  return run.type === 'review' ? POINTS.review : POINTS.correct;
}

function advance() {
  tick();
  run.i++;
  run.feedback = null;
  run.picked = [];
  run.typed = '';
  run.chosen = null;
  if (run.type === 'blitz') run.queue.push(buildBlitzStep(run.blitzItems, POOL));
  skipSpeakSteps();
  if (run.i >= run.queue.length) {
    finishRun();
    return;
  }
  saveRunState();
  save();
  render();
  announceStep();
}

function finishRun() {
  const accuracy = run.asked ? Math.round((run.firstTryRight / run.asked) * 100) : 100;
  clearInterval(run.timer);
  if (canResume(run)) delete state.saved[runKey(run)];
  result = { type: run.type, accuracy, unit: run.unit, right: run.firstTryRight, total: run.asked };
  if (run.type === 'lesson') {
    const { lesson } = run;
    result.media = Boolean(lesson.media);
    result.grammar = Boolean(lesson.grammar);
    if (!run.replay) recordDay('lessons', 1);
    if (!run.replay) {
      const bonus = POINTS.lesson + (accuracy === 100 ? POINTS.perfect : 0);
      run.gained += bonus;
      addXp(bonus);
      for (const item of lesson.items) {
        if (!state.srs[item.en]) state.srs[item.en] = srsAnswer(undefined, true);
      }
    }
    state.done[lesson.id] = Math.max(state.done[lesson.id] ?? 0, accuracy);
  }
  if (run.type === 'exam') {
    result.need = neededToPass(run.asked);
    result.passed = run.firstTryRight >= result.need;
    if (result.passed) {
      for (const lesson of UNITS[run.unit].lessons) {
        if (!state.done[lesson.id]) {
          run.gained += POINTS.skippedLesson;
          addXp(POINTS.skippedLesson);
        }
        state.done[lesson.id] = Math.max(state.done[lesson.id] ?? 0, accuracy);
        for (const item of lesson.items) {
          if (!state.srs[item.en]) state.srs[item.en] = srsAnswer({ box: 1 }, true);
        }
      }
    }
  }
  if (run.type === 'blitz') {
    result.record = run.firstTryRight > state.blitzBest;
    state.blitzBest = Math.max(state.blitzBest, run.firstTryRight);
  }
  markActiveDay();
  save();
  result.gained = run.gained;
  result.levelUp = levelInfo(state.xp).level > run.startLevel;
  run = null;
  sheet = null;
  if (history.state?.run) history.back();
  render();
  refreshCloud();
}

function ruleButton(id) {
  const topic = id && topicById(id);
  if (!topic) return '';
  return `<button class="rule-link" data-act="rule" data-id="${topic.id}">Почему так: ${esc(topic.title)}</button>`;
}

function stepBody(step) {
  const locked = Boolean(run.feedback);
  const optionClass = (isRight, isChosen) => (!locked ? '' : isRight ? 'right' : isChosen ? 'wrong' : '');

  if (step.kind === 'tip') {
    return `<div class="tip">${LOGO}<p>${esc(step.text)}</p></div>`;
  }
  if (step.kind === 'rule') {
    const rows = step.rows.map(([formula, example, ru]) => `<div class="rule-row"><code>${esc(formula)}</code><b>${esc(example)}</b><span>${esc(ru)}</span></div>`).join('');
    return `<div class="rule"><h2>${esc(step.title)}</h2><p>${esc(step.text)}</p>${rows}</div>`;
  }
  if (step.kind === 'speak') {
    const { item } = step;
    return `<div class="intro"><div class="speak-tag">Скажи вслух</div>
      <div class="phrase">${esc(item.en)}</div>${pron(item)}<div class="ru">${esc(item.ru)}</div>
      <div class="say-row">${sayBtn(item.en)}</div></div>`;
  }
  if (step.kind === 'gap') {
    const shown = esc(step.text).replace('___', `<span class="blank">${locked ? esc(step.answer) : '&nbsp;'}</span>`);
    const head = `<div class="ask">${step.options ? 'Выбери слово' : 'Напечатай пропущенное слово'}</div>
      <div class="phrase-row"><div><div class="phrase ru">${shown}</div><div class="muted" style="margin-top:6px">${esc(step.item.ru)}</div></div></div>`;
    if (!step.options) return `${head}${typeInput(locked)}`;
    const buttons = step.options.map((option, i) => `<button class="option ${optionClass(option === step.answer, run.chosen === i)}" data-act="gap-pick" data-i="${i}" ${locked ? 'disabled' : ''}>${esc(option)}</button>`).join('');
    return `${head}<div class="options">${buttons}</div>`;
  }
  if (step.kind === 'intro') {
    const { item } = step;
    return `<div class="intro"><div class="tag">Новая фраза</div>
      <div class="phrase">${esc(item.en)}</div>${pron(item)}<div class="ru">${esc(item.ru)}</div>
      ${item.note ? `<div class="note">${esc(item.note)}</div>` : ''}
      ${ruleButton(ruleFor(item.en))}
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
      const isRight = option.en === item.en;
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
  if (run.type === 'blitz') return '';
  const dunno = run.type === 'lesson' || run.type === 'review' ? '<button class="dunno" data-act="dunno">Не знаю</button>' : '';
  if (run.feedback) {
    const f = run.feedback;
    const target = targetOf(step);
    const fix = f.correct
      ? (f.typo ? `<div class="fix">${esc(f.match)}</div><div class="why">Почти! Посмотри, как пишется.</div>` : `<div class="why">${esc(target.en)}</div>`)
      : `${f.given ? `<div class="why">Твой ответ: ${esc(f.given)}</div>` : ''}
         <div class="fix">${esc(target.en)}</div>${state.settings.pron && target.pron ? `<div class="pron">${esc(target.pron)}</div>` : ''}
         ${step.kind === 'dialog' ? '' : `<div class="why">${esc(target.ru)}</div>`}${f.why ? `<div class="why">${esc(f.why)}</div>` : ''}`;
    const help = f.correct || run.type === 'exam' ? '' : ruleButton(step.topic ?? ruleFor(target.en));
    const dispute = !f.correct && f.given && f.first && run.type !== 'exam' && step.kind !== 'gap'
      ? '<button class="post-act dispute" data-act="my-answer-ok">Мой ответ тоже верный</button>' : '';
    return `<div class="feedback ${f.correct ? 'ok' : 'no'}"><h3>${f.correct ? 'Верно!' : f.dontKnow ? 'Вот как правильно:' : 'Правильно так:'}</h3>${fix}${help}${dispute}
      <button class="btn ${f.correct ? '' : 'bad'}" data-act="next">Дальше</button></div>`;
  }
  if (step.kind === 'tip' || step.kind === 'rule') return '<div class="dock"><button class="btn" data-act="next">Понятно</button></div>';
  if (step.kind === 'speak') return '<div class="dock"><button class="btn" data-act="speak-done">Сказал(а)</button><button class="btn ghost" data-act="speak-skip">Не могу сейчас говорить</button></div>';
  if (step.kind === 'intro') return '<div class="dock"><button class="btn" data-act="next">Дальше</button></div>';
  if (step.kind === 'build') return `<div class="dock"><button class="btn" data-act="check-build" ${run.picked.length ? '' : 'disabled'}>Проверить</button>${dunno}</div>`;
  if (step.kind === 'type' || ((step.kind === 'dialog' || step.kind === 'gap') && !step.options)) {
    return `<div class="dock"><button class="btn" data-act="check-type" id="check-type" disabled>Проверить</button>${dunno}</div>`;
  }
  return `<div class="dock" style="padding-top:0">${dunno}</div>`;
}

function lessonScreen() {
  const step = current();
  const ratio = run.i / Math.max(run.total, 1);
  const soundBtn = canSpeak()
    ? `<button class="icon-btn" data-act="toggle" data-id="sound" aria-label="${state.settings.sound ? 'Выключить звук' : 'Включить звук'}">${state.settings.sound ? ICON.sound : ICON.mute}</button>`
    : '';
  const close = `<button class="icon-btn" data-act="quit" aria-label="Выйти">${ICON.close}</button>`;
  let top;
  if (run.type === 'blitz') {
    const left = run.endsAt ? Math.max(run.endsAt - Date.now(), 0) : BLITZ_SECONDS * 1000;
    top = `${close}<div class="bar"><i id="timebar" style="width:${(left / (BLITZ_SECONDS * 1000)) * 100}%;transition:none"></i></div>
      <span class="blitz-info"><span id="timeleft">${Math.ceil(left / 1000)}</span> с · ${seeds(run.firstTryRight)}</span>`;
  } else {
    const count = run.type === 'exam' ? `<span class="exam-count">${run.i + 1}/${run.total}</span>` : '';
    top = `${close}<div class="bar" role="progressbar" aria-valuenow="${Math.round(ratio * 100)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${ratio * 100}%"></i></div>${count}${soundBtn}`;
  }
  return `<section class="lesson">
    <div class="lesson-top">${top}</div>
    <div class="stage">${stepBody(step)}</div>
    ${dock(step)}
  </section>`;
}

function sheetView() {
  if (!sheet) return '';
  if (sheet === 'quit') {
    const resumable = canResume(run);
    return `<div class="veil"><div class="sheet"><h2>Выйти из занятия?</h2><p>${resumable ? 'Ответы сохранятся, и ты продолжишь с этого же места.' : 'Очки останутся, но это занятие не сохранится.'}</p>
      <button class="btn" data-act="sheet-close">Продолжить занятие</button><button class="btn ghost" data-act="quit-yes">Выйти</button>
      ${resumable && run.i > 0 ? '<button class="btn ghost" data-act="quit-restart">Начать заново</button>' : ''}</div></div>`;
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
  if (sheet === 'exam') {
    const unit = UNITS[sheetArg];
    const total = Math.min(EXAM_SIZE, unit.lessons.flatMap((lesson) => lesson.items).length);
    return `<div class="veil"><div class="sheet"><h2>Тест: ${esc(unit.title)}</h2>
      <p>${total} вопросов по всему этапу. Нужно ${neededToPass(total)} верных, это ${PASS_PERCENT}%. Пройдёшь, и все его уроки засчитаются. Не пройдёшь, ничего не потеряешь и сможешь попробовать ещё.</p>
      <button class="btn" data-act="exam-go" data-unit="${sheetArg}">${state.saved[`exam-${sheetArg}`] ? 'Продолжить тест' : 'Начать тест'}</button>
      ${state.saved[`exam-${sheetArg}`] ? `<button class="btn ghost" data-act="exam-restart" data-unit="${sheetArg}">Начать заново</button>` : ''}
      <button class="btn ghost" data-act="sheet-close">Не сейчас</button></div></div>`;
  }
  if (sheet === 'rule') {
    const topic = topicById(sheetArg);
    const rows = topic.rows.map(([formula, example, ru]) => `<div class="rule-row"><code>${esc(formula)}</code><b>${esc(example)}</b><span>${esc(ru)}</span></div>`).join('');
    return `<div class="veil"><div class="sheet rule-sheet"><h2>${esc(topic.title)}</h2><p>${esc(topic.rule)}</p>${rows}
      <p class="muted small" style="margin-top:12px">Потренировать это правило можно в разделе «Курс → Грамматика».</p>
      <button class="btn" data-act="sheet-close">Понятно</button></div></div>`;
  }
  if (sheet === 'friend-remove') {
    return `<div class="veil"><div class="sheet"><h2>Убрать ${esc(sheetArg)}?</h2><p>Вы исчезнете из рейтинга друг у друга.</p>
      <button class="btn ghost" data-act="sheet-close">Отмена</button><button class="btn bad" data-act="friend-remove-yes">Убрать</button></div></div>`;
  }
  if (sheet === 'post-delete' || sheet === 'post-report') {
    const remove = sheet === 'post-delete';
    return `<div class="veil"><div class="sheet"><h2>${remove ? 'Удалить сообщение?' : 'Пожаловаться?'}</h2>
      <p>${remove ? 'Его не получится вернуть.' : 'Если пожалуются двое, сообщение скроется.'}</p>
      <button class="btn ghost" data-act="sheet-close">Отмена</button><button class="btn bad" data-act="${remove ? 'post-delete-yes' : 'post-report-yes'}">${remove ? 'Удалить' : 'Пожаловаться'}</button></div></div>`;
  }
  if (sheet === 'delete-account') {
    return `<div class="veil"><div class="sheet"><h2>Удалить аккаунт?</h2><p>С сервера удалятся прогресс, друзья и твои сообщения. На этом телефоне прогресс останется. Введи пароль, чтобы подтвердить.</p>
      <input class="field" data-bind="sheetPass" type="password" placeholder="Пароль" aria-label="Пароль" autocomplete="current-password" value="${esc(drafts.sheetPass)}">
      <button class="btn ghost" data-act="sheet-close">Отмена</button><button class="btn bad" data-act="delete-account-yes" ${busy ? 'disabled' : ''}>Удалить</button></div></div>`;
  }
  if (sheet === 'reset') {
    return `<div class="veil"><div class="sheet"><h2>Сбросить всё?</h2><p>Уроки, семечки и фразы удалятся с этого телефона, и ты выйдешь из аккаунта. Вернуть их можно кодом или входом в аккаунт.</p>
      <button class="btn ghost" data-act="sheet-close">Отмена</button><button class="btn bad" data-act="reset-yes">Сбросить</button></div></div>`;
  }
  return '';
}

function render() {
  let view;
  if (run) view = lessonScreen();
  else if (game) view = game.type === 'words' ? wordsGameScreen() : pairsScreen();
  else if (result) view = resultScreen();
  else if (!state.welcomed) view = welcomeScreen();
  else if (tab === 'words') view = wordsScreen();
  else if (tab === 'me') view = statsOpen ? statsScreen() : meScreen();
  else if (tab === 'media') view = mediaScreen();
  else if (tab === 'friends') view = friendsScreen();
  else view = pathScreen();
  const scroller = app.querySelector('.screen');
  const keepScroll = scroller && !run ? scroller.scrollTop : 0;
  app.innerHTML = view + sheetView() + (toastText ? `<div class="toast" role="status">${esc(toastText)}</div>` : '');
  const fresh = app.querySelector('.screen');
  if (fresh && keepScroll) fresh.scrollTop = keepScroll;
  if (game?.type === 'words' && game.level) drawWordPath();
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

function progressSnapshot() {
  const { xp, done, srs, week, activeDays, lastDay, settings, blitzBest, daily, pairsBest, wordGame } = state;
  return { xp, done, srs, week, activeDays, lastDay, settings, blitzBest, daily, pairsBest, wordGame };
}

function adoptProgress(progress) {
  const { installHidden, account, ratingCache, postsCache, saved } = state;
  Object.assign(state, merged({ ...progress, welcomed: true, installHidden, account, ratingCache, postsCache, saved }));
  applyTheme();
}

function encodeBackup() {
  const bytes = new TextEncoder().encode(JSON.stringify(progressSnapshot()));
  return btoa(String.fromCharCode(...bytes));
}

function restoreBackup(code) {
  const bytes = Uint8Array.from(atob(code.trim()), (c) => c.charCodeAt(0));
  const data = JSON.parse(new TextDecoder().decode(bytes));
  if (typeof data?.xp !== 'number' || typeof data.done !== 'object' || typeof data.srs !== 'object') {
    throw new Error('bad backup');
  }
  adoptProgress(data);
}

// ---------- Сервер ----------

function renderIfIdle() {
  if (run || sheet || game) return;
  if (document.activeElement?.matches?.('input, textarea')) return;
  render();
}

async function refreshPosts() {
  if (!cloud.hasServer()) return;
  try {
    state.postsCache = await cloud.listPosts(state.account?.token);
    cloudOffline = false;
    save();
  } catch {
    cloudOffline = true;
  }
  renderIfIdle();
}

async function refreshCloud() {
  if (!cloud.hasServer() || !state.account || cloudBusy) return;
  cloudBusy = true;
  const { token } = state.account;
  try {
    const answer = await cloud.sync(token, myStats(), progressSnapshot());
    if (answer?.progress && answer.xp > state.xp) adoptProgress(answer.progress);
    state.ratingCache = await cloud.rating(token, weekKey());
    state.postsCache = await cloud.listPosts(token);
    cloudOffline = false;
    save();
  } catch (error) {
    cloudOffline = true;
    if (error.code === 'bad_token') {
      state.account = null;
      state.ratingCache = [];
      cloudOffline = false;
      save();
      showToast('Войди в аккаунт ещё раз');
    }
  } finally {
    cloudBusy = false;
  }
  renderIfIdle();
}

// Кнопка, которая ждёт сервер: блокируется на время запроса и показывает ошибку.
async function withBusy(work) {
  if (busy) return;
  busy = true;
  render();
  try {
    await work();
  } catch (error) {
    if (error.code === 'bad_token') {
      state.account = null;
      save();
    }
    showToast(error.message);
  } finally {
    busy = false;
    render();
  }
}

async function enterAccount(answer) {
  state.account = { nick: answer.nick, token: answer.token };
  drafts.pass = '';
  drafts.nick = '';
  if (answer.progress && answer.xp > state.xp) adoptProgress(answer.progress);
  save();
  await refreshCloud();
}

// ---------- Действия ----------

const actions = {
  rule(el) {
    sheet = 'rule';
    sheetArg = el.dataset.id;
    render();
  },
  dunno() {
    const step = current();
    if (!step || run.feedback) return;
    run.chosen = null;
    answer(false, { dontKnow: true, why: step.why });
  },
  // Сверить все верные варианты невозможно, поэтому последнее слово за учеником. В тесте кнопки нет.
  'my-answer-ok'() {
    const step = current();
    const at = run.queue.lastIndexOf(step);
    if (at > run.i) {
      run.queue.splice(at, 1);
      run.total--;
    }
    step.retried = false;
    run.firstTryRight++;
    const points = pointsPerAnswer();
    run.gained += points;
    addXp(points);
    recordDay('wrong', -1);
    recordDay('right', 1);
    if (run.type === 'review') state.srs[step.item.en] = srsAnswer({ box: 1 }, true);
    run.feedback = { correct: true, first: false };
    saveRunState();
    save();
    render();
  },
  'cw-tap'(el) {
    const { found } = state.wordGame;
    const words = game.layout.words.filter((entry) => found.includes(entry.en) && entry.cells.includes(el.dataset.cell));
    if (!words.length) {
      showToast('Это слово ещё не собрано');
      return;
    }
    const at = words.findIndex((entry) => entry.en === game.pin?.en);
    pinWord(words[(at + 1) % words.length]);
    if (soundOn()) speak(game.pin.en);
    render();
  },
  async 'check-update'() {
    if (!navigator.onLine) {
      showToast('Для проверки нужен интернет');
      return;
    }
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration.update();
      showToast(registration.installing || registration.waiting ? 'Скачиваю новую версию' : 'Это последняя версия');
    } catch {
      showToast('Не получилось проверить');
    }
  },
  stats() {
    statsOpen = true;
    const now = pad(dayNumber());
    statsMonth = { year: now.getUTCFullYear(), month: now.getUTCMonth() };
    statsDay = dayNumber();
    render();
    app.querySelector('.screen')?.scrollTo(0, 0);
  },
  'stats-close'() {
    statsOpen = false;
    render();
  },
  'stats-month'(el) {
    const shifted = new Date(Date.UTC(statsMonth.year, statsMonth.month + Number(el.dataset.d), 1));
    statsMonth = { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() };
    render();
  },
  'stats-day'(el) {
    statsDay = Number(el.dataset.day);
    render();
  },
  'course-view'(el) {
    courseView = el.dataset.id;
    render();
    app.querySelector('.screen')?.scrollTo(0, 0);
  },
  'to-grammar'() {
    result = null;
    tab = 'path';
    courseView = 'grammar';
    render();
  },
  'speak-done'() {
    addXp(POINTS.repeat);
    save();
    advance();
  },
  'speak-skip'() {
    state.noSpeakUntil = Date.now() + SPEAK_PAUSE;
    save();
    advance();
    showToast('Час без заданий вслух. Вернуть можно в профиле');
  },
  'gap-pick'(el) {
    const step = current();
    const i = Number(el.dataset.i);
    run.chosen = i;
    const right = step.options[i] === step.answer;
    answer(right, right ? {} : { why: step.why });
  },
  'quit-restart'() {
    const { type, lesson, unit } = run;
    clearInterval(run.timer);
    delete state.saved[runKey(run)];
    run = null;
    sheet = null;
    save();
    if (type === 'exam') startExam(unit);
    else startLesson(lesson.id);
  },
  'exam-restart'(el) {
    delete state.saved[`exam-${el.dataset.unit}`];
    result = null;
    startExam(Number(el.dataset.unit));
  },
  'open-words'() { openWordGame(); },
  'open-pairs'() { openPairs(); },
  'game-close'() { closeGame(); },
  'word-next'() {
    openWordGame();
  },
  'word-shuffle'() {
    game.order = shuffle(game.order);
    game.path = [];
    render();
  },
  'word-hint'() {
    const progress = state.wordGame;
    if (!progress.hints) return;
    const hidden = [...game.layout.grid.keys()].filter((cell) => !wordVisibleCells().has(cell));
    if (!hidden.length) return;
    progress.hints--;
    progress.revealed.push(hidden[Math.floor(Math.random() * hidden.length)]);
    checkWordLevel();
    render();
  },
  'word-submit'() { submitWord(); },
  'word-clear'() {
    game.path = [];
    drawWordPath();
  },
  pair(el) {
    const i = Number(el.dataset.i);
    if (game.wrong.length || game.open === i) return;
    const card = game.cards[i];
    if (card.lang === 'en' && soundOn()) speak(card.text);
    if (game.open === null) {
      game.open = i;
      render();
      return;
    }
    const other = game.cards[game.open];
    tick();
    if (other.pair === card.pair) {
      game.matched.push(card.pair);
      game.open = null;
      addXp(POINTS.pair);
      recordDay('right', 1);
      if (game.matched.length === game.cards.length / 2) {
        const seconds = Math.round((Date.now() - game.startedAt) / 1000);
        game.finished = { seconds };
        state.pairsBest = state.pairsBest ? Math.min(state.pairsBest, seconds) : seconds;
      }
      save();
      render();
    } else {
      game.misses++;
      game.wrong = [game.open, i];
      game.open = null;
      recordDay('wrong', 1);
      save();
      render();
      const owner = game;
      setTimeout(() => {
        if (game === owner) {
          game.wrong = [];
          render();
        }
      }, 700);
    }
  },
  'pairs-again'() { openPairs(); },
  exam(el) {
    sheet = 'exam';
    sheetArg = Number(el.dataset.unit);
    render();
  },
  'exam-go'(el) {
    result = null;
    startExam(Number(el.dataset.unit));
  },
  blitz() { startBlitz(); },
  'to-media'() {
    result = null;
    tab = 'media';
    render();
  },
  'media-open'(el) {
    mediaOpen = el.dataset.id;
    videoOn = false;
    render();
    app.querySelector('.screen')?.scrollTo(0, 0);
  },
  'media-close'() {
    mediaOpen = null;
    videoOn = false;
    render();
  },
  'video-on'() {
    if (!navigator.onLine) {
      showToast('Для клипа нужен интернет');
      return;
    }
    videoOn = true;
    render();
  },
  metric(el) {
    friendsMetric = el.dataset.id;
    render();
  },
  'friends-view'(el) {
    friendsView = el.dataset.id;
    render();
    if (friendsView === 'board') refreshPosts();
  },
  'post-kind'(el) {
    postKind = el.dataset.id;
    render();
  },
  'auth-login'() {
    withBusy(async () => enterAccount(await cloud.login(drafts.nick.trim(), drafts.pass)));
  },
  'auth-register'() {
    withBusy(async () => enterAccount(await cloud.register(drafts.nick.trim(), drafts.pass)));
  },
  logout() {
    const token = state.account?.token;
    state.account = null;
    state.ratingCache = [];
    save();
    render();
    cloud.logout(token).catch(() => {});
  },
  'delete-account'() {
    sheet = 'delete-account';
    drafts.sheetPass = '';
    render();
  },
  'delete-account-yes'() {
    withBusy(async () => {
      await cloud.deleteAccount(state.account.token, drafts.sheetPass);
      state.account = null;
      state.ratingCache = [];
      drafts.sheetPass = '';
      sheet = null;
      save();
      showToast('Аккаунт удалён');
    });
  },
  'friend-add'() {
    withBusy(async () => {
      const added = await cloud.addFriend(state.account.token, drafts.friend.trim());
      drafts.friend = '';
      showToast(`${added.nick} теперь в рейтинге`);
      await refreshCloud();
    });
  },
  'friend-remove'(el) {
    sheet = 'friend-remove';
    sheetArg = el.dataset.nick;
    render();
  },
  'friend-remove-yes'() {
    const nick = sheetArg;
    sheet = null;
    withBusy(async () => {
      await cloud.removeFriend(state.account.token, nick);
      await refreshCloud();
    });
  },
  'post-send'() {
    withBusy(async () => {
      await cloud.addPost(state.account.token, postKind, drafts.post);
      drafts.post = '';
      showToast('Опубликовано');
      await refreshPosts();
    });
  },
  'post-delete'(el) {
    sheet = 'post-delete';
    sheetArg = Number(el.dataset.id);
    render();
  },
  'post-delete-yes'() {
    const id = sheetArg;
    sheet = null;
    withBusy(async () => {
      await cloud.deletePost(state.account.token, id);
      await refreshPosts();
    });
  },
  'post-report'(el) {
    sheet = 'post-report';
    sheetArg = Number(el.dataset.id);
    render();
  },
  'post-report-yes'() {
    const id = sheetArg;
    sheet = null;
    withBusy(async () => {
      await cloud.reportPost(state.account.token, id);
      showToast('Жалоба отправлена');
      await refreshPosts();
    });
  },
  welcome() {
    state.welcomed = true;
    save();
    startLesson(COURSE[0].id);
  },
  tab(el) {
    tab = el.dataset.id;
    statsOpen = false;
    mediaOpen = null;
    videoOn = false;
    if (applyUpdate()) return;
    render();
    app.querySelector('.screen')?.scrollTo(0, 0);
    if (tab === 'friends') {
      refreshCloud();
      if (!state.account) refreshPosts();
    }
  },
  lesson(el) { startLesson(el.dataset.id); },
  review() { startReview(); },
  home() {
    result = null;
    tab = 'path';
    if (applyUpdate()) return;
    render();
  },
  say(el) { speak(el.dataset.text, Number(el.dataset.rate) || 0.9); },
  next() { advance(); },
  pick(el) {
    const step = current();
    const i = Number(el.dataset.i);
    run.chosen = i;
    answer(step.options[i].en === step.item.en);
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
    clearInterval(run.timer);
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
    if (id === 'speak') {
      const on = speakAllowed();
      state.settings.speak = !on;
      state.noSpeakUntil = 0;
      save();
      render();
      return;
    }
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
    if (state.account) cloud.logout(state.account.token).catch(() => {});
    Object.assign(state, merged({ welcomed: true, installHidden }));
    save();
    applyTheme();
    sheet = null;
    tab = 'path';
    render();
  },
};

function closeGame() {
  game = null;
  if (history.state?.game) history.back();
  render();
  refreshCloud();
}

function checkTypedAnswer() {
  const input = document.getElementById('typed');
  if (!input || !input.value.trim() || run?.feedback) return;
  run.typed = input.value;
  const step = current();
  // В грамматике опечаток не прощаем: work и works отличаются одной буквой, но это и есть правило.
  if (step.kind === 'gap') {
    const right = normalize(input.value) === normalize(step.answer);
    answer(right, right ? {} : { why: step.why });
    return;
  }
  const accepted = step.kind === 'dialog' ? withAlternates(step.turn.en) : step.accepted;
  const verdict = checkTyped(input.value, accepted);
  answer(verdict.result !== 'wrong', { typo: verdict.result === 'typo', match: verdict.match, given: input.value.trim() });
}

app.addEventListener('click', (event) => {
  const el = event.target.closest('[data-act]');
  if (el && !el.disabled) actions[el.dataset.act]?.(el);
});

app.addEventListener('input', (event) => {
  const { target } = event;
  if (target.id === 'typed') {
    run.typed = target.value;
    syncCheckButton(target);
  }
  if (target.dataset.bind) drafts[target.dataset.bind] = target.value;
  if (target.id === 'wordsearch') {
    const query = target.value.trim().toLowerCase();
    for (const row of app.querySelectorAll('#wordlist .word')) {
      row.hidden = Boolean(query) && !row.dataset.search.includes(query);
    }
  }
});

app.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && event.target.id === 'typed') {
    event.preventDefault();
    checkTypedAnswer();
  }
});

app.addEventListener('pointerdown', (event) => {
  if (game?.type !== 'words' || !event.target.closest?.('#wheel')) return;
  const i = letterAt(event);
  if (i < 0) return;
  event.preventDefault();
  game.gesture = { added: 0 };
  document.getElementById('wheel').setPointerCapture(event.pointerId);
  if (game.path.at(-1) === i) {
    game.path.pop();
    game.gesture.removed = true;
  } else if (!game.path.includes(i)) {
    game.path.push(i);
    game.gesture.added = 1;
  }
  drawWordPath();
});

app.addEventListener('pointermove', (event) => {
  if (!game?.gesture) return;
  const i = letterAt(event);
  if (i < 0) return;
  if (game.gesture.removed && !game.path.includes(i)) game.gesture.removed = false;
  if (!game.path.includes(i)) {
    game.path.push(i);
    game.gesture.added++;
    drawWordPath();
  } else if (game.path.at(-2) === i) {
    game.path.pop();
    drawWordPath();
  }
});

function endWordGesture() {
  if (!game?.gesture) return;
  const swiped = game.gesture.added >= 2;
  game.gesture = null;
  // Провёл пальцем — сразу проверяем. Нажимал по одной букве — ждём кнопку «Проверить».
  if (swiped) submitWord();
  else drawWordPath();
}
app.addEventListener('pointerup', endWordGesture);
app.addEventListener('pointercancel', endWordGesture);

// Кнопка «Назад» на Android не выбрасывает из урока, а спрашивает.
addEventListener('popstate', () => {
  if (game) {
    game = null;
    render();
    return;
  }
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

// Перезагрузка на новую версию только в свободный момент: не посреди урока, игры, ввода или клипа.
function applyUpdate() {
  if (!updateReady || run || game || sheet || result || videoOn) return false;
  if (document.activeElement?.matches?.('input, textarea')) return false;
  location.reload();
  return true;
}

let lastUpdateCheck = 0;

// На iPhone свёрнутое приложение не перезапускается, поэтому проверяем и при возвращении в него.
function checkForUpdate() {
  if (Date.now() - lastUpdateCheck < 60000) return;
  lastUpdateCheck = Date.now();
  navigator.serviceWorker.getRegistration().then((registration) => registration?.update()).catch(() => {});
}

async function readVersion() {
  const keys = await caches.keys();
  const numbers = keys.map((key) => Number(key.match(/^melon-v(\d+)$/)?.[1])).filter(Boolean);
  if (!numbers.length) return;
  appVersion = String(Math.max(...numbers));
  renderIfIdle();
}

if ('serviceWorker' in navigator) {
  const hadWorker = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.register('sw.js').then(readVersion).catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    readVersion();
    if (!hadWorker) return; // первая установка, показывать нечего
    updateReady = true;
    applyUpdate();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (!applyUpdate()) checkForUpdate();
  });
  checkForUpdate();
}
navigator.storage?.persist?.();
addEventListener('online', refreshCloud);
refreshCloud();
