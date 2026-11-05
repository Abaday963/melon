// Мини-игры. Игра в слова: уровни и раскладка кроссворда.
// Слово: [английское, перевод]. Что не поместилось в сетку, засчитывается как бонусное.

const word = (en, ru) => ({ en, ru });

export const WORD_LEVELS = [
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
].map(([letters, words], i) => ({ id: i + 1, letters, words }));

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

// Жадная раскладка: длинные слова первыми, затем лучшее пересечение и самая компактная сетка.
export function layoutWords(list) {
  const queue = [...list].sort((a, b) => b.en.length - a.en.length || a.en.localeCompare(b.en));
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
    bonus: pending,
    width: box.maxX - box.minX + 1,
    height: box.maxY - box.minY + 1,
    minX: box.minX,
    minY: box.minY,
  };
}

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
