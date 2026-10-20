/* ==========================================================================
   ГАЗЕТА ПОГОДЫ — редакция в кармане
   Данные: Open-Meteo (forecast + geocoding), CC BY 4.0
   ========================================================================== */
(() => {
  'use strict';

  const LS = {
    city: 'gp.city.v1',
    unit: 'gp.unit.v1',
    theme: 'gp.theme.v1',
    cache: 'gp.cache.v1',
    geoDenied: 'gp.geoDenied.v1',
    splash: 'gp.splashShown.v1'
  };
  const DEFAULT_CITY = { name: 'Москва', country: 'Россия', lat: 55.75204, lon: 37.61781, tz: 'Europe/Moscow' };
  const QUICK = [
    { name: 'Москва', lat: 55.75204, lon: 37.61781, country: 'Россия' },
    { name: 'Санкт-Петербург', lat: 59.93863, lon: 30.31413, country: 'Россия' },
    { name: 'Новосибирск', lat: 55.0415, lon: 82.9346, country: 'Россия' },
    { name: 'Сочи', lat: 43.6042, lon: 39.7234, country: 'Россия' },
    { name: 'Лондон', lat: 51.50853, lon: -0.12574, country: 'Великобритания' },
    { name: 'Париж', lat: 48.85341, lon: 2.3488, country: 'Франция' },
    { name: 'Нью-Йорк', lat: 40.71427, lon: -74.00597, country: 'США' },
    { name: 'Токио', lat: 35.6895, lon: 139.69171, country: 'Япония' },
    { name: 'Дубай', lat: 25.07725, lon: 55.30927, country: 'ОАЭ' }
  ];

  const WMO = {
    0: { g: '☀', ru: 'Ясно', en: 'Clear' },
    1: { g: '🌤', ru: 'Преимущественно ясно', en: 'Mainly clear' },
    2: { g: '⛅', ru: 'Переменная облачность', en: 'Partly cloudy' },
    3: { g: '☁', ru: 'Пасмурно', en: 'Overcast' },
    45: { g: '🌫', ru: 'Туман', en: 'Fog' },
    48: { g: '🌫', ru: 'Изморозь, туман', en: 'Rime fog' },
    51: { g: '🌦', ru: 'Слабая морось', en: 'Light drizzle' },
    53: { g: '🌦', ru: 'Морось', en: 'Drizzle' },
    55: { g: '🌧', ru: 'Сильная морось', en: 'Dense drizzle' },
    56: { g: '🌧', ru: 'Ледяная морось', en: 'Freezing drizzle' },
    57: { g: '🌧', ru: 'Сильная ледяная морось', en: 'Dense freezing drizzle' },
    61: { g: '🌦', ru: 'Слабый дождь', en: 'Light rain' },
    63: { g: '🌧', ru: 'Дождь', en: 'Moderate rain' },
    65: { g: '🌧', ru: 'Сильный дождь', en: 'Heavy rain' },
    66: { g: '🌧', ru: 'Ледяной дождь', en: 'Freezing rain' },
    67: { g: '🌧', ru: 'Сильный ледяной дождь', en: 'Heavy freezing rain' },
    71: { g: '🌨', ru: 'Слабый снег', en: 'Light snow' },
    73: { g: '🌨', ru: 'Снег', en: 'Snow' },
    75: { g: '❄', ru: 'Сильный снег', en: 'Heavy snow' },
    77: { g: '🌨', ru: 'Снежные зёрна', en: 'Snow grains' },
    80: { g: '🌦', ru: 'Слабые ливни', en: 'Light showers' },
    81: { g: '🌧', ru: 'Ливни', en: 'Showers' },
    82: { g: '⛈', ru: 'Сильные ливни', en: 'Violent showers' },
    85: { g: '🌨', ru: 'Снежные ливни', en: 'Snow showers' },
    86: { g: '❄', ru: 'Сильные снежные ливни', en: 'Heavy snow showers' },
    95: { g: '⛈', ru: 'Гроза', en: 'Thunderstorm' },
    96: { g: '⛈', ru: 'Гроза с градом', en: 'Thunderstorm with hail' },
    99: { g: '⛈', ru: 'Сильная гроза с градом', en: 'Severe thunderstorm with hail' }
  };
  const wmo = (c) => WMO[c] || { g: '☁', ru: 'Неизвестно', en: 'Unknown' };

  const MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  const MONTHS_NOM = ['ЯНВАРЬ','ФЕВРАЛЬ','МАРТ','АПРЕЛЬ','МАЙ','ИЮНЬ','ИЮЛЬ','АВГУСТ','СЕНТЯБРЬ','ОКТЯБРЬ','НОЯБРЬ','ДЕКАБРЬ'];
  const DAYS = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];
  const DAYS_SHORT = ['ВС','ПН','ВТ','СР','ЧТ','ПТ','СБ'];
  const DIRS = ['С','ССВ','СВ','ВСВ','В','ВЮВ','ЮВ','ЮЮВ','Ю','ЮЮЗ','ЮЗ','ЗЮЗ','З','ЗСЗ','СЗ','ССЗ'];
  // Полные прилагательные в родительном падеже: «ветер северо-восточный»
  const DIRS_FULL = [
    'северный', 'северо-северо-восточный', 'северо-восточный', 'восточно-северо-восточный',
    'восточный', 'восточно-юго-восточный', 'юго-восточный', 'юго-юго-восточный',
    'южный', 'юго-юго-западный', 'юго-западный', 'западно-юго-западный',
    'западный', 'западно-северо-западный', 'северо-западный', 'северо-северо-западный'
  ];
  const DIRS_SHORT_RU = ['С', 'ССВ', 'СВ', 'ВСВ', 'В', 'ВЮВ', 'ЮВ', 'ЮЮВ', 'Ю', 'ЮЮЗ', 'ЮЗ', 'ЗЮЗ', 'З', 'ЗСЗ', 'СЗ', 'ССЗ'];
  const dirIndex = (deg) => (deg == null || isNaN(deg)) ? -1 : Math.round(deg / 22.5) % 16;
  const dirLong = (deg) => { const i = dirIndex(deg); return i < 0 ? '—' : DIRS_FULL[i]; };
  const dirShort = (deg) => { const i = dirIndex(deg); return i < 0 ? '—' : DIRS_SHORT_RU[i]; };

  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const round = (v) => (v == null || isNaN(v) ? null : Math.round(v));
  const one = (v) => (v == null || isNaN(v) ? null : Math.round(v * 10) / 10);

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} },
    del(k) { try { localStorage.removeItem(k); } catch (_) {} }
  };

  const state = {
    city: store.get(LS.city, null) || DEFAULT_CITY,
    unit: store.get(LS.unit, 'C'),
    theme: store.get(LS.theme, null),
    data: null,
    tab: 'headline',
    busy: false,
    lastError: null,
    geoPending: false,
    searchSeq: 0,
    searchTimer: null
  };

  /* ---------------------------------------------------------------- утилиты */

  function native() { return (window.AndroidBridge && typeof window.AndroidBridge === 'object') ? window.AndroidBridge : null; }
  const isNative = () => !!native();

  function toast(msg, ms = 2200) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('is-on'), ms);
  }

  function haptic() {
    try { if (navigator.vibrate) navigator.vibrate(8); } catch (_) {}
  }

  /* --------------------------------------------------------------- единицы */

  function convT(c) { if (c == null || isNaN(c)) return null; return state.unit === 'F' ? c * 9 / 5 + 32 : c; }
  function fmtT(c, withDegree = true) {
    const v = round(convT(c));
    if (v == null) return '—';
    const s = (v > 0 ? '' : '') + v + '°';
    return withDegree ? s + (state.unit === 'F' ? 'F' : 'C') : v + '';
  }
  function fmtTshort(c) { const v = round(convT(c)); return v == null ? '—' : (v > 0 ? '+' : '') + v + '°'; }
  function windUnit() { return state.unit === 'F' ? 'миль/ч' : 'м/с'; }
  function fmtWind(ms) {
    if (ms == null || isNaN(ms)) return '—';
    return state.unit === 'F' ? round(ms * 2.23694) + ' ' + windUnit() : one(ms) + ' ' + windUnit();
  }
  function fmtPress(hpa) { return round(hpa) + ' гПа'; }
  function dirName(deg) {
    if (deg == null || isNaN(deg)) return '—';
    return DIRS[Math.round(deg / 22.5) % 16];
  }
  function beaufort(ms) {
    if (ms == null) return '—';
    const b = [0.3, 1.6, 3.4, 5.5, 8, 10.8, 13.9, 17.2, 20.8, 24.5, 28.5, 32.7];
    let n = 0; while (n < b.length && ms >= b[n]) n++;
    const names = ['штиль', 'тихий', 'лёгкий', 'слабый', 'умеренный', 'свежий', 'сильный', 'крепкий', 'очень крепкий', 'шторм', 'сильный шторм', 'жестокий шторм', 'ураган'];
    return { n, name: names[n] || 'ураган' };
  }

  function dateFromISO(iso) {
    // ISO без зоны: "2026-10-20T07:10" — интерпретируем как локальное время города
    if (!iso) return null;
    const [d, t = '00:00'] = iso.split('T');
    const [y, m, day] = d.split('-').map(Number);
    const [hh, mm] = t.split(':').map(Number);
    return { y, m: m - 1, d: day, hh, mm, date: new Date(y, m - 1, day, hh, mm) };
  }
  function hhmm(iso) {
    if (!iso) return '—';
    const t = iso.split('T')[1] || '';
    return t.slice(0, 5);
  }

  /* ------------------------------------------------------------------ API */

  function apiUrl() {
    const lat = state.city.lat.toFixed(4), lon = state.city.lon.toFixed(4);
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', lat);
    url.searchParams.set('longitude', lon);
    url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m');
    url.searchParams.set('hourly', 'temperature_2m,precipitation_probability,weather_code,apparent_temperature');
    url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset,uv_index_max,daylight_duration');
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', '7');
    url.searchParams.set('wind_speed_unit', 'ms');
    url.searchParams.set('past_days', '1');
    return url.toString();
  }

  async function fetchJSON(url, ms = 12000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try {
      const r = await fetch(url, { signal: ctrl.signal, cache: 'no-store', headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } finally { clearTimeout(timer); }
  }

  async function loadWeather(opts = {}) {
    const { silent = false } = opts;
    if (state.busy) return;
    state.busy = true;
    state.lastError = null;
    setProgress(true);
    if (!silent) { $('liveDot').classList.remove('is-stale'); $('updatedAt').textContent = 'Набираем номер…'; }
    try {
      const data = await fetchJSON(apiUrl());
      if (!data || !data.current || !data.daily) throw new Error('Некорректный ответ сервера');
      state.data = data;
      store.set(LS.cache, { city: state.city, data, savedAt: Date.now() });
      store.set(LS.city, state.city);
      hideError();
      render();
      haptic();
      if (isNative() && native().setSystemBars) { try { native().setSystemBars('Газета погоды', ''); } catch (_) {} }
    } catch (e) {
      state.lastError = e;
      const cached = store.get(LS.cache, null);
      if (cached && cached.city && cached.city.lat === state.city.lat && cached.city.lon === state.city.lon) {
        state.data = cached.data;
        render();
        markStale(cached.savedAt, true);
        showError('Связь с редакцией потеряна', 'Показываем последний полученный выпуск. Проверьте соединение и нажмите «Обновить».', false);
      } else {
        showError('Выпуск задержан', 'Не удалось связаться с редакцией. Проверьте интернет-соединение и попробуйте ещё раз.', !!cached);
        $('updatedAt').textContent = 'Номер не получен';
        $('liveDot').classList.add('is-stale');
      }
    } finally {
      state.busy = false;
      lastLoadAt = Date.now();
      setProgress(false);
    }
  }

  function setProgress(on) { $('progress').hidden = !on; }

  function markStale(savedAt, stale) {
    const d = $('liveDot');
    if (stale) d.classList.add('is-stale'); else d.classList.remove('is-stale');
    if (savedAt) {
      const dt = new Date(savedAt);
      $('updatedAt').textContent = 'Выпуск от ' + dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) + ', ' + dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + (stale ? ' · архив' : '');
    }
  }

  /* ------------------------------------------------------------- отрисовка */

  function render() {
    const d = state.data;
    if (!d) return;
    const c = d.current || {};
    const daily = d.daily || {};
    const now = { t: c.temperature_2m, code: c.weather_code, feels: c.apparent_temperature };
    const code = wmo(c.weather_code);
    const sunrise = daily.sunrise && daily.sunrise[0];
    const sunset = daily.sunset && daily.sunset[0];
    const isDay = c.is_day === 1 || isDaylight(sunrise, sunset);

    // Шапка
    $('todayHuman').textContent = shortDate(new Date());
    // В строке — только город: страна уезжает в подсказку, чтобы не обрезать название
    const country = (state.city.country && state.city.country.toLowerCase() !== state.city.name.toLowerCase())
      ? state.city.country : '';
    $('weatherLine').textContent = state.city.name;
    $('weatherLine').title = [state.city.name, country, code.ru].filter(Boolean).join(' · ');
    updateLocationHint();
    $('cityLabel').textContent = state.city.name;
    $('sbCity').textContent = state.city.name;
    $('sbNow').textContent = fmtT(c.temperature_2m);
    const t0 = round(convT(daily.temperature_2m_min && daily.temperature_2m_min[0]));
    const t1 = round(convT(daily.temperature_2m_max && daily.temperature_2m_max[0]));
    $('sbTemps').textContent = (t1 != null ? '+' + t1 + '°' : '—') + (t0 != null ? ' / ' + t0 + '°' : '');
    $('editionNo').textContent = '№ ' + editionNumber();
    markStale(Date.now(), false);

    applyTheme(d, isDay);

    // Заголовок и текст
    const lead = makeLead(d, isDay);
    const deck = makeDeck(d);

    const hourly = hourlySlice(d, 24);
    const days = dailyRows(d);

    let html = '';

    if (state.tab === 'headline') html = tabHeadline(d, lead, deck, sunrise, sunset, isDay);
    if (state.tab === 'hourly') html = tabHourly(hourly);
    if (state.tab === 'week') html = tabWeek(days);
    if (state.tab === 'details') html = tabDetails(d, sunrise, sunset, isDay);

    const content = $('content');
    content.innerHTML = html;
    bindRendered();
    requestAnimationFrame(() => {
      $$('.lead[data-typed]', content).forEach((el) => { el.removeAttribute('data-typed'); });
    });
  }

  /** Текущий час в часовом поясе города (по смещению utc_offset_seconds) */
  function timeInCity(d) {
    try {
      if (d && d.current && d.current.time) return Number(d.current.time.slice(11, 13));
      if (d && typeof d.utc_offset_seconds === 'number') {
        const shifted = new Date(Date.now() + d.utc_offset_seconds * 1000);
        return shifted.getUTCHours();
      }
    } catch (_) {}
    return null;
  }

  /** Короткая дата для шапки: «вт, 20 октября» */
  function shortDate(dt) {
    return DAYS_SHORT[dt.getDay()].toLowerCase() + ', ' + dt.getDate() + ' ' + MONTHS[dt.getMonth()];
  }

  function longDate(dt) {
    return DAYS[dt.getDay()] + ', ' + dt.getDate() + ' ' + MONTHS[dt.getMonth()] + ' ' + dt.getFullYear();
  }

  function editionNumber() {
    const start = new Date(new Date().getFullYear(), 0, 1);
    return Math.floor((Date.now() - start.getTime()) / 864e5) + 1;
  }

  function isDaylight(sunrise, sunset) {
    if (!sunrise || !sunset) return true;
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = hhmm(sunrise).split(':').map(Number);
    const [eh, em] = hhmm(sunset).split(':').map(Number);
    return mins >= sh * 60 + sm && mins <= eh * 60 + em;
  }

  function hourlySlice(d, count) {
    const h = d.hourly || {};
    if (!h.time) return [];
    const nowIso = (d.current && d.current.time) || h.time[0];
    const nowKey = nowIso.slice(0, 13);
    let start = h.time.findIndex((t) => t.slice(0, 13) === nowKey);
    if (start < 0) start = 0;
    const out = [];
    for (let i = start; i < Math.min(h.time.length, start + count); i++) {
      out.push({
        time: h.time[i],
        temp: h.temperature_2m ? h.temperature_2m[i] : null,
        code: h.weather_code ? h.weather_code[i] : null,
        pop: h.precipitation_probability ? h.precipitation_probability[i] : null,
        isNow: i === start
      });
    }
    return out;
  }

  function dailyRows(d) {
    const dl = d.daily || {};
    if (!dl.time) return [];
    const rows = [];
    for (let i = 0; i < dl.time.length; i++) {
      const dt = dateFromISO(dl.time[i]);
      if (!dt) continue;
      if (dt.date < startOfToday()) continue; // past_days
      rows.push({
        iso: dl.time[i],
        dow: dt.date.getDay(),
        day: dt.date.getDate(),
        month: dt.date.getMonth(),
        code: dl.weather_code[i],
        max: dl.temperature_2m_max[i],
        min: dl.temperature_2m_min[i],
        feels: dl.apparent_temperature_max ? dl.apparent_temperature_max[i] : null,
        precip: dl.precipitation_sum[i],
        pop: dl.precipitation_probability_max ? dl.precipitation_probability_max[i] : null,
        wind: dl.wind_speed_10m_max ? dl.wind_speed_10m_max[i] : null,
        gust: dl.wind_gusts_10m_max ? dl.wind_gusts_10m_max[i] : null,
        uv: dl.uv_index_max ? dl.uv_index_max[i] : null,
        sunrise: dl.sunrise ? dl.sunrise[i] : null,
        sunset: dl.sunset ? dl.sunset[i] : null,
        daylight: dl.daylight_duration ? dl.daylight_duration[i] : null,
        isToday: i === 0
      });
    }
    return rows;
  }

  function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }

  /* --------------------------------------------------- содержание номера */

  function makeDeck(d) {
    const c = d.current || {};
    const daily = d.daily || {};
    const days = dailyRows(d);
    const today = days[0] || {};
    const tomorrow = days[1] || {};
    const code = wmo(c.weather_code);
    const t = round(convT(c.temperature_2m));
    const feels = round(convT(c.apparent_temperature));

    const diff = (c.apparent_temperature != null && c.temperature_2m != null) ? c.apparent_temperature - c.temperature_2m : 0;
    const feelText = feels != null && t != null && Math.abs(diff) >= 1
      ? (diff < 0 ? 'ощущается прохладнее: ' + fmtT(c.apparent_temperature) : 'ощущается теплее: ' + fmtT(c.apparent_temperature))
      : 'ощущения по шкале совпадают';

    const next = tomorrow.code != null ? wmo(tomorrow.code).ru.toLowerCase() : '—';
    const tempLine = (t != null ? (t > 0 ? '+' : '') + t + '°' : '—') + ', ' + feelText + '.';

    let deck = code.ru + ' · ' + tempLine;
    if (tomorrow.code != null) {
      deck += ' Завтра синоптики обещают ' + next;
      if (tomorrow.max != null) deck += ' до ' + fmtTshort(tomorrow.max);
      deck += '.';
    }
    return deck;
  }

  function makeLead(d, isDay) {
    const c = d.current || {};
    const days = dailyRows(d);
    const today = days[0] || {};
    const tomorrow = days[1] || {};
    const code = wmo(c.weather_code);
    const temp = round(convT(c.temperature_2m));
    const wind = beaufort(c.wind_speed_10m);
    const windDir = dirLong(c.wind_direction_10m);
    const pop = today.pop != null ? round(today.pop) : null;
    const rain = today.precip != null ? one(today.precip) : 0;

    const parts = [];
    const hour = timeInCity(d);
    let dayWord;
    if (hour == null) dayWord = 'сейчас';
    else if (!isDay) dayWord = hour >= 21 || hour < 4 ? 'ночью' : 'вечером';
    else if (hour < 6) dayWord = 'под утро';
    else if (hour < 12) dayWord = 'утром';
    else if (hour < 18) dayWord = 'днём';
    else dayWord = 'вечером';

    let op = 'В ' + state.city.name + ' ' + dayWord + ' ' + (temp != null ? (temp > 0 ? '+' : '') + temp + '°' : '—') + ', ' + code.ru.toLowerCase() + '.';
    parts.push(op);

    if (rain > 0.2) {
      parts.push('За сутки обещают до ' + rain + ' мм осадков (вероятность — ' + pop + '%).');
    } else if (pop != null && pop >= 30) {
      parts.push('Осадков не ждут, но вероятность всё же ' + pop + '% — зонт лучше положить в сумку.');
    } else if (code.g === '☀' || c.weather_code === 0) {
      parts.push('Осадков не ожидается: небо над городом ясное.');
    } else {
      parts.push('Существенных осадков не обещают.');
    }

    if (c.wind_speed_10m != null) {
      parts.push('Ветер ' + windDir + ', ' + fmtWind(c.wind_speed_10m) + (c.wind_gusts_10m >= 10 ? ', порывы до ' + fmtWind(c.wind_gusts_10m) : '') + ' — ' + wind.name + '.');
    }

    // завтра
    if (tomorrow.code != null) {
      const tc = wmo(tomorrow.code);
      const delta = (tomorrow.max != null && today.max != null) ? Math.round(convT(tomorrow.max) - convT(today.max)) : 0;
      let trend = 'Столбики термометров останутся на месте';
      if (delta >= 2) trend = 'Температура вырастет примерно на ' + Math.abs(delta) + '°';
      else if (delta <= -2) trend = 'Похолодает примерно на ' + Math.abs(delta) + '°';
      parts.push('Завтра ожидается ' + tc.ru.toLowerCase() + ' и до ' + fmtT(tomorrow.max) + '. ' + trend + '.');
    }

    // ближайшие выходные (только сб/вс в пределах прогноза)
    const w = days.filter((x) => x.dow === 0 || x.dow === 6);
    if (w.length === 1) {
      parts.push('Ближайший выходной — ' + DAYS[w[0].dow] + ', до ' + fmtT(w[0].max) + ', ' + wmo(w[0].code).ru.toLowerCase() + '.');
    } else if (w.length >= 2) {
      const tmax = w.reduce((a, b) => ((b.max ?? -999) > (a.max ?? -999) ? b : a), w[0]);
      const warmDay = tmax.dow === 6 ? 'в субботу' : 'в воскресенье';
      parts.push('На выходных теплее всего ' + warmDay + ': до ' + fmtT(tmax.max) + '.');
    }

    parts.push('Влажность воздуха — ' + round(c.relative_humidity_2m) + '%, давление — ' + fmtPress(c.pressure_msl) + '.');
    return parts.join(' ');
  }

  function factsHTML(d) {
    const c = d.current || {};
    const days = dailyRows(d);
    const today = days[0] || {};
    const items = [
      { k: 'Ощущается', v: fmtT(c.apparent_temperature), s: 'по ветру и влажности' },
      { k: 'Ветер', v: fmtWind(c.wind_speed_10m), s: dirName(c.wind_direction_10m) + ' · порывы ' + fmtWind(c.wind_gusts_10m) },
      { k: 'Влажность', v: round(c.relative_humidity_2m) + '%', s: humidityWord(c.relative_humidity_2m) }
    ];
    if (today.pop != null) items[2] = { k: 'Осадки', v: (today.pop ?? 0) + '%', s: 'за сутки ' + one(today.precip ?? 0) + ' мм' };
    return '<div class="facts">' + items.map((i) =>
      '<div class="fact"><div class="fact__label">' + esc(i.k) + '</div><div class="fact__value">' + esc(i.v) + '</div><div class="fact__sub">' + esc(i.s) + '</div></div>'
    ).join('') + '</div>';
  }

  function humidityWord(h) {
    if (h == null) return '—';
    if (h < 30) return 'сухо';
    if (h < 55) return 'комфортно';
    if (h < 75) return 'влажно';
    return 'очень влажно';
  }

  function wireHTML(d, sunrise, sunset, isDay) {
    const c = d.current || {};
    const days = dailyRows(d);
    const today = days[0] || {};
    const uv = today.uv != null ? one(today.uv) : null;
    const uvText = uv == null ? '—' : uv < 3 ? 'низкий' : uv < 6 ? 'умеренный' : uv < 8 ? 'высокий' : 'очень высокий';
    const items = [
      { k: 'Восход', v: hhmm(sunrise), s: 'солнце встало' },
      { k: 'Закат', v: hhmm(sunset), s: 'долгота дня ' + daylightText(today.daylight) },
      { k: 'УФ-индекс', v: uv == null ? '—' : uv, s: uvText },
      { k: 'Давление', v: round(c.pressure_msl), s: pressureWord(c.pressure_msl) + ', гПа' },
      { k: 'Облачность', v: round(c.cloud_cover) + '%', s: cloudWord(c.cloud_cover) },
      { k: 'Сегодня', v: fmtTshort(today.min) + ' / ' + fmtTshort(today.max), s: 'минимум / максимум' }
    ];
    return '<div class="wire">' + items.map((i) =>
      '<div class="wire__item"><div class="wire__k">' + esc(i.k) + '</div><div class="wire__v">' + esc(i.v) + '</div><div class="wire__s">' + esc(i.s) + '</div></div>'
    ).join('') + '</div>';
  }

  function daylightText(sec) {
    if (sec == null) return '—';
    const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
    return h + ' ч ' + String(m).padStart(2, '0') + ' мин';
  }
  function pressureWord(p) {
    if (p == null) return '—';
    if (p < 1000) return 'пониженное';
    if (p > 1025) return 'повышенное';
    return 'нормальное';
  }
  function cloudWord(c) {
    if (c == null) return '—';
    if (c < 15) return 'чистое небо';
    if (c < 50) return 'небольшая облачность';
    if (c < 85) return 'облачно';
    return 'сплошной покров';
  }

  /* ------------------------------------------------------- вкладки */

  function tabHeadline(d, lead, deck, sunrise, sunset, isDay) {
    const c = d.current || {};
    const code = wmo(c.weather_code);
    const glyph = (c.weather_code === 0 && !isDay) ? '🌙' : (isDay ? code.g : (c.weather_code <= 3 ? '🌙' : code.g));
    const feels = round(convT(c.apparent_temperature));
    const days = dailyRows(d);
    return [
      '<section class="section headline">',
      '<div class="headline__place">', esc(state.city.name), '</div>',
      '<div class="headline__deck">', esc(deck), '</div>',
      '<div class="headline__row">',
      '<div class="headline__main">',
      '<div class="headline__temp">', esc(String(round(convT(c.temperature_2m)))), '<sup>°', state.unit === 'F' ? 'F' : 'C', '</sup></div>',
      '<div class="headline__feel">Ощущается как <b>', esc(fmtT(c.apparent_temperature)), '</b>', feels != null && round(convT(c.temperature_2m)) != null && Math.abs(feels - round(convT(c.temperature_2m))) >= 1 ? '<br>' + (feels < round(convT(c.temperature_2m)) ? 'ветер холодит' : 'теплее на ' + Math.abs(feels - round(convT(c.temperature_2m))) + '°') : '', '</div>',
      '</div>',
      '<div class="headline__fig"><div class="glyph">', glyph, '</div><div class="cond">', esc(code.ru), '</div></div>',
      '</div>',
      '</section>',
      '<p class="lead">', esc(lead), '</p>',
      factsHTML(d),
      wireHTML(d, sunrise, sunset, isDay),
      '<section class="section section--ruled">',
      '<div class="kicker">Коротко о главном</div>',
      '<div class="columns">',
      '<p>', esc(makeColumn1(d, isDay)), '</p>',
      '<p>', esc(makeColumn2(d)), '</p>',
      '</div>',
      '</section>'
    ].join('');
  }

  function tabHourly(hourly) {
    if (!hourly.length) return '<section class="section"><p class="muted">Почасовые данные недоступны.</p></section>';
    const cells = hourly.map((h) => {
      const code = wmo(h.code);
      return '<div class="hour' + (h.isNow ? ' is-now' : '') + '">' +
        '<div class="hour__t">' + (h.isNow ? 'сейчас' : esc(h.time.slice(11, 16))) + '</div>' +
        '<div class="hour__g">' + code.g + '</div>' +
        '<div class="hour__v">' + esc(fmtTshort(h.temp)) + '</div>' +
        '<div class="hour__p">' + (h.pop != null && h.pop >= 10 ? h.pop + '%' : '') + '</div>' +
        '</div>';
    }).join('');
    return [
      '<section class="section">',
      '<div class="kicker">Прогноз на 24 часа</div>',
      '<div class="hourly-scroll">', cells, '</div>',
      '<div class="sparkwrap"><div class="spark-cap">Кривая температуры</div>', sparkline(hourly), '</div>',
      '<div class="sparkwrap" style="margin-top:8px"><div class="spark-cap">Вероятность осадков, %</div>', sparkline(hourly, { key: 'pop', lo: 0, hi: 100, color: 'var(--accent)', fill: true }), '</div>',
      '</section>'
    ].join('');
  }

  function sparkline(hourly, opt = {}) {
    const key = opt.key || 'temp';
    const vals = hourly.map((h) => (key === 'temp' ? convT(h.temp) : h.pop)).filter((v) => v != null);
    if (vals.length < 2) return '<div class="spark-cap">нет данных</div>';
    const W = 320, H = 74, pad = 6;
    let min = opt.lo != null ? opt.lo : Math.min(...vals);
    let max = opt.hi != null ? opt.hi : Math.max(...vals);
    if (min === max) { min -= 1; max += 1; }
    const pts = hourly.map((h, i) => {
      const v = key === 'temp' ? convT(h.temp) : h.pop;
      const x = pad + (i / (hourly.length - 1)) * (W - pad * 2);
      const y = H - pad - ((v != null ? v : min) - min) / (max - min) * (H - pad * 2);
      return [x, y, v];
    });
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const area = line + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + (H - 1) + ' L' + pts[0][0].toFixed(1) + ' ' + (H - 1) + ' Z';
    const color = opt.color || 'var(--accent)';
    const dots = pts.filter((p, i) => i % 3 === 0).map((p) => '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="1.8" fill="' + color + '"/>').join('');
    return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
      (opt.fill ? '<path d="' + area + '" fill="' + color + '" opacity=".14"/>' : '') +
      '<path d="' + line + '" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>' +
      dots + '</svg>';
  }

  function tabWeek(days) {
    if (!days.length) return '<section class="section"><p class="muted">Прогноз недоступен.</p></section>';
    let gmin = Math.min(...days.map((x) => convT(x.min)));
    let gmax = Math.max(...days.map((x) => convT(x.max)));
    if (gmin === gmax) gmax += 1;
    const rows = days.map((x) => {
      const code = wmo(x.code);
      const a = clamp(((convT(x.min) - gmin) / (gmax - gmin)) * 100, 0, 100);
      const b = clamp(((convT(x.max) - gmin) / (gmax - gmin)) * 100, 0, 100);
      const isToday = x.isToday;
      return '<div class="day' + (isToday ? ' is-today' : '') + '">' +
        '<div class="day__name">' + (isToday ? 'Сегодня' : DAYS_SHORT[x.dow]) + '</div>' +
        '<div class="day__mid">' +
        '<div class="day__cond">' + code.g + ' ' + esc(code.ru) + (x.pop != null && x.pop >= 40 ? ' · ' + x.pop + '%' : '') + '</div>' +
        '<div class="day__bar"><span style="left:' + a.toFixed(1) + '%;right:' + (100 - b).toFixed(1) + '%"></span></div>' +
        '</div>' +
        '<div class="day__right"><span class="day__hi">' + esc(fmtTshort(x.max)) + '</span> <span class="day__lo">' + esc(fmtTshort(x.min)) + '</span>' +
        '<div class="day__pop">' + esc(x.day + ' ' + MONTHS[x.month].slice(0, 3)) + '</div></div>' +
        '</div>';
    }).join('');
    return '<section class="section"><div class="kicker">Погода на неделю · ' + esc(state.city.name) + '</div><div class="forecast">' + rows + '</div>' +
      '<p class="muted" style="font-size:.76rem;margin-top:10px;font-style:italic">Шкала — от самой холодной ночи до самого тёплого дня недели. Прогноз обновляется каждый час.</p></section>';
  }

  function tabDetails(d, sunrise, sunset, isDay) {
    const c = d.current || {};
    const days = dailyRows(d);
    const today = days[0] || {};
    const reports = [
      { k: 'Сейчас', v: fmtT(c.temperature_2m), s: wmo(c.weather_code).ru, bar: null },
      { k: 'Ощущается', v: fmtT(c.apparent_temperature), s: 'ветер ' + dirName(c.wind_direction_10m) },
      { k: 'Влажность', v: round(c.relative_humidity_2m) + '%', s: humidityWord(c.relative_humidity_2m), bar: c.relative_humidity_2m },
      { k: 'Облачность', v: round(c.cloud_cover) + '%', s: cloudWord(c.cloud_cover), bar: c.cloud_cover },
      { k: 'Ветер', v: fmtWind(c.wind_speed_10m), s: dirName(c.wind_direction_10m) + ' · ' + beaufort(c.wind_speed_10m).name },
      { k: 'Порывы', v: fmtWind(c.wind_gusts_10m), s: 'максимум' },
      { k: 'Давление', v: round(c.pressure_msl) + ' гПа', s: pressureWord(c.pressure_msl) },
      { k: 'Осадки сегодня', v: one(today.precip ?? 0) + ' мм', s: 'вероятность ' + (today.pop ?? 0) + '%', bar: today.pop },
      { k: 'УФ-индекс', v: today.uv != null ? one(today.uv) : '—', s: 'защита от солнца', bar: today.uv != null ? clamp(today.uv / 11 * 100, 0, 100) : null },
      { k: 'Ветер макс.', v: fmtWind(today.wind), s: 'за сутки' }
    ];
    const grid = reports.map((r) => '<div class="report"><div class="report__k">' + esc(r.k) + '</div><div class="report__v">' + esc(r.v) + '</div><div class="report__s">' + esc(r.s) + '</div>' +
      (r.bar != null ? '<div class="bar"><i style="width:' + clamp(r.bar, 0, 100).toFixed(0) + '%"></i></div>' : '') + '</div>').join('');

    const [sh, sm] = hhmm(sunrise).split(':').map(Number);
    const [eh, em] = hhmm(sunset).split(':').map(Number);
    const arc = sunArc(isDay);

    return [
      '<section class="section"><div class="kicker">Метеосводка</div><div class="report-grid">' + grid + '</div>',
      '<div class="sun-arc">' + arc.svg + '<div class="sun-arc__txt"><div><b>Восход</b> ' + esc(hhmm(sunrise)) + '</div><div><b>Закат</b> ' + esc(hhmm(sunset)) + '</div><div class="muted" style="font-size:.74rem">Долгота дня — ' + esc(daylightText(today.daylight)) + '</div></div></div>',
      '<div class="almanac"><div class="kicker" style="margin-top:14px">Альманах на неделю</div><ul>',
      days.slice(0, 7).map((x) => '<li><span>' + (x.isToday ? 'Сегодня' : DAYS[x.dow] + ', ' + x.day + ' ' + MONTHS[x.month]) + '</span><span>' + esc(fmtTshort(x.min)) + ' … ' + esc(fmtTshort(x.max)) + ' · ' + wmo(x.code).g + ' ' + esc(wmo(x.code).ru) + '</span></li>').join(''),
      '</ul></div>',
      '<p class="muted" style="font-size:.72rem;margin-top:14px;text-align:center;font-style:italic">Источник: Open-Meteo · часовой пояс ' + esc(d.timezone || '—') + '</p>',
      '</section>'
    ].join('');
  }

  function sunArc(isDay) {
    const svg = '<svg viewBox="0 0 100 58" aria-hidden="true">' +
      '<path d="M4 50 A46 46 0 0 1 96 50" fill="none" stroke="var(--hair)" stroke-width="1.5" stroke-dasharray="3 3"/>' +
      '<circle cx="50" cy="' + (isDay ? 20 : 46) + '" r="6" fill="' + (isDay ? 'var(--highlight)' : 'var(--ink-3)') + '" stroke="var(--ink)" stroke-width="1"/>' +
      '<line x1="2" y1="50" x2="98" y2="50" stroke="var(--rule)" stroke-width="1"/></svg>';
    return { svg };
  }

  function makeColumn1(d, isDay) {
    const c = d.current || {};
    const days = dailyRows(d);
    const t = round(convT(c.temperature_2m));
    const known = [];
    if (t != null) known.push('сейчас ' + (t > 0 ? '+' : '') + t + '°');
    if (days[0] && days[0].max != null) known.push('максимум дня ' + fmtT(days[0].max));
    const warmest = days.reduce((a, b) => ((b.max ?? -999) > (a.max ?? -999) ? b : a), days[0] || {});
    const s = [];
    s.push('Термометры города показывают ' + known.join(', ') + '.');
    if (days.length) s.push('Самый тёплый день недели — ' + (warmest.isToday ? 'сегодня' : DAYS[warmest.dow]) + ' (' + fmtT(warmest.max) + '), самый прохладный — ' + coldest(days) + '.');
    s.push('Атмосферное давление — ' + round(c.pressure_msl) + ' гПа, ' + pressureWord(c.pressure_msl) + ', влажность ' + round(c.relative_humidity_2m) + '%.');
    return s.join(' ');
  }

  function makeColumn2(d) {
    const days = dailyRows(d);
    if (!days.length) return 'Данные о неделе временно недоступны.';
    const wet = days.reduce((a, b) => ((b.precip ?? -1) > (a.precip ?? -1) ? b : a), days[0]);
    const windy = days.reduce((a, b) => ((b.wind ?? -1) > (a.wind ?? -1) ? b : a), days[0]);
    const s = [];
    if (wet && wet.precip > 0.1) s.push('Больше всего осадков ожидается ' + (wet.isToday ? 'сегодня' : DAYS[wet.dow]) + ' — до ' + one(wet.precip) + ' мм.');
    else s.push('Неделя обещает быть сухой: существенных осадков синоптики не видят.');
    if (windy) s.push('Самый ветреный день — ' + (windy.isToday ? 'сегодня' : DAYS[windy.dow]) + ', порывы до ' + fmtWind(windy.gust || windy.wind) + '.');
    s.push('Совет редакции: ' + editorialAdvice(days));
    return s.join(' ');
  }

  function coldest(days) {
    const x = days.reduce((a, b) => ((b.min ?? 999) < (a.min ?? 999) ? b : a), days[0]);
    return (x.isToday ? 'сегодня' : DAYS[x.dow]) + ' ночью (' + fmtT(x.min) + ')';
  }

  function editorialAdvice(days) {
    const today = days[0] || {};
    const code = today.code;
    if (code == null) return 'следите за обновлениями выпуска.';
    if (code >= 95) return 'гроза — отложите прогулки и держитесь подальше от высоких деревьев.';
    if ([65, 67, 82].includes(code)) return 'сильный дождь — возьмите зонт и забудьте про белые кроссовки.';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'снег — тёплые ботинки сегодня важнее стиля.';
    if ([51, 53, 55, 61, 63, 80, 81].includes(code)) return 'дождь возможен — компактный зонт не помешает.';
    if (code === 45 || code === 48) return 'туман — водителям стоит снизить скорость.';
    if (code <= 1) return 'хороший день для прогулки: найдите повод выйти из дома.';
    return 'погода переменчивая — одевайтесь слоями.';
  }

  /* ------------------------------------------------------------- система */

  function applyTheme(d, isDay) {
    const root = document.documentElement;
    let theme = state.theme;
    if (!theme) {
      const code = d && d.current ? d.current.weather_code : 0;
      if (!isDay) theme = 'night';
      else if ([61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code)) theme = 'evening';
      else theme = 'print';
    }
    root.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'night' ? '#14120f' : theme === 'evening' ? '#e8ddc6' : '#f3ead6');
    if (isNative() && native().setBarsColor) {
      try {
        native().setBarsColor(theme === 'night' ? '#14120f' : theme === 'evening' ? '#e8ddc6' : '#f3ead6', theme === 'night');
      } catch (_) {}
    }
  }

  /** Баннер «определить местоположение», если ещё не определили */
  function updateLocationHint() {
    const banner = $('locateBanner');
    if (!banner) return;
    const done = !!store.get('gp.geoDone.v1', false);
    banner.hidden = done || state.cityIsGeo === true;
  }

  function setGeoBusy(on) {
    state.geoPending = on;
    const b = $('btnLocate');
    if (b) b.classList.toggle('is-busy', on);
    const row = $('btnGeoRow');
    if (row) row.disabled = on;
  }

  function cycleTheme() {
    const order = ['print', 'evening', 'night'];
    const cur = document.documentElement.dataset.theme || 'print';
    const next = order[(order.indexOf(cur) + 1) % order.length];
    state.theme = next;
    store.set(LS.theme, next);
    document.documentElement.dataset.theme = next;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', next === 'night' ? '#14120f' : next === 'evening' ? '#e8ddc6' : '#f3ead6');
    if (isNative() && native().setBarsColor) { try { native().setBarsColor(next === 'night' ? '#14120f' : next === 'evening' ? '#e8ddc6' : '#f3ead6', next === 'night'); } catch (_) {} }
    toast(next === 'print' ? 'Дневной выпуск' : next === 'evening' ? 'Вечерний выпуск' : 'Ночной выпуск');
  }

  function toggleUnits() {
    state.unit = state.unit === 'C' ? 'F' : 'C';
    store.set(LS.unit, state.unit);
    $('btnUnits').textContent = '°' + state.unit;
    render();
    toast(state.unit === 'F' ? 'По Фаренгейту' : 'По Цельсию');
    haptic();
  }

  /* --------------------------------------------------------- ошибки */

  function showError(title, text, canArchive) {
    const hasData = !!(state.data && $('content').children.length && $('content').querySelector('.section'));
    $('errTitle').textContent = title;
    $('errText').textContent = text;
    $('btnOfflineArchive').hidden = !canArchive;
    const es = $('errorSheet');
    es.hidden = false;
    if (hasData && canArchive) {
      // компактный баннер-предупреждение над архивным номером
      es.classList.add('error-sheet--banner');
      es.querySelector('.error-sheet__icon').textContent = '!';
      es.querySelector('.error-sheet__title').textContent = 'Архивный номер';
      $('content').classList.add('is-archive');
    } else {
      es.classList.remove('error-sheet--banner');
      es.querySelector('.error-sheet__icon').textContent = '☂';
      es.querySelector('.error-sheet__title').textContent = 'Выпуск задержан';
      $('content').innerHTML = '';
    }
  }
  function hideError() { $('errorSheet').hidden = true; $('errorSheet').classList.remove('error-sheet--banner'); }

  /* --------------------------------------------------------- геолокация */

  function locate() {
    if (state.geoPending) { toast('Уже определяем местоположение…'); return; }
    closeSearch();

    // Нативно — предпочтительно: виден системный диалог разрешения
    if (isNative() && native().requestLocation) {
      setGeoBusy(true);
      toast('Запрашиваем разрешение на геолокацию…', 2600);
      try {
        native().requestLocation();
        // страховка, если ответ от нативного слоя не придёт
        setTimeout(() => {
          if (state.geoPending) {
            setGeoBusy(false);
            toast('Геолокация не ответила. Проверьте, что она включена в настройках телефона.', 3200);
          }
        }, 25000);
      } catch (_) {
        setGeoBusy(false);
        toast('Геолокация недоступна на этом устройстве');
      }
      return;
    }

    if (!navigator.geolocation) { toast('Геолокация не поддерживается'); return; }
    setGeoBusy(true);
    toast('Определяем местоположение…', 2600);
    navigator.geolocation.getCurrentPosition(
      (pos) => onGeo(pos.coords.latitude, pos.coords.longitude),
      (err) => {
        setGeoBusy(false);
        toast(err && err.code === 1
          ? 'Доступ к геолокации запрещён. Включите его в настройках приложения.'
          : 'Не удалось определить местоположение. Включите GPS и попробуйте снова.', 3200);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5 * 60 * 1000 }
    );
  }

  // Вызывается из нативного слоя
  window.onNativeLocation = function (lat, lon, error) {
    setGeoBusy(false);
    if (error || lat == null || lon == null) {
      const msg = typeof error === 'string' && error ? error : 'Не удалось определить местоположение';
      // Если разрешение не дали — подробно и понятно, куда идти
      if (msg.indexOf('Разрешение') >= 0 || msg.indexOf('разрешени') >= 0) {
        toast('Геолокация запрещена. Включите её: Настройки → Приложения → Газета погоды → Разрешения → Местоположение', 6000);
      } else {
        toast(msg, 3200);
      }
      return;
    }
    onGeo(Number(lat), Number(lon));
  };

  // Вызывается нативным слоем при возврате в приложение
  window.onAppResume = function () {
    if (!state.busy && state.data) {
      const savedAt = Date.now();
      if (savedAt - lastLoadAt > 20 * 60 * 1000) loadWeather({ silent: true });
    }
  };
  window.onAppBackground = function () {};
  window.onBackPressed = function () {
    if (!$('searchSheet').hidden) { closeSearch(); return true; }
    if (window.scrollY > 40) { window.scrollTo({ top: 0, behavior: 'smooth' }); return true; }
    return false;
  };

  let lastLoadAt = 0;

  /**
   * Приводим официальные мун. названия к человеческим:
   * «Городской округ «город Иркутск»» → «Иркутск»
   * «Муниципальный район «Туапсинский район»» → «Туапсе»/«Туапсинский район»
   * «Городское поселение Мытищи» → «Мытищи»
   */
  function cleanPlaceName(raw) {
    if (!raw) return '';
    let s = String(raw).trim();

    // Извлекаем содержимое кавычек: «...», "..." или '...'
    const quoted = s.match(/[«"„']([^»"“']+)[»"“']/);
    if (quoted && quoted[1].trim()) s = quoted[1].trim();

    let prev;
    do {
      prev = s;
      s = s
        .replace(/^(городской|городского|сельского)\s+округ[аи]?\s*/i, '')
        .replace(/^(муниципальный|муниципального)\s+(район|округ)[аи]?\s*/i, '')
        .replace(/^(городское|сельское)\s+поселени[ея]\s*/i, '')
        .replace(/^(город|пос[её]лок|село|станица|деревня|рабочий пос[её]лок|пгт)\.?\s+/i, '')
        .replace(/^г\.\s*/i, '')
        .replace(/^\s*(город|пос[её]лок)\s+/i, '')
        .trim();
    } while (s !== prev && s.length > 0);

    // «Иркутск» в родительном/прилагательном — оставляем как есть
    s = s.replace(/\s{2,}/g, ' ');
    // Заглавная первая буква
    if (s) s = s.charAt(0).toUpperCase() + s.slice(1);
    return s;
  }

  async function onGeo(lat, lon) {
    const city = { name: 'Моё место', country: '', lat, lon, tz: '' };
    let clean = '';

    try {
      // 1) Обратное геокодирование: ближайший населённый пункт (BigDataCloud, без ключа)
      const r = await fetchJSON('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' + lat.toFixed(4) + '&longitude=' + lon.toFixed(4) + '&localityLanguage=ru', 7000);
      clean = cleanPlaceName(r.city) || cleanPlaceName(r.locality) || '';
      // locality — это район внутри города («Арбат»), берём его только если города нет
      if (!clean) clean = cleanPlaceName(r.locality) || '';
      city.country = r.countryName || '';
      city.admin = cleanPlaceName(r.principalSubdivision) || '';
    } catch (_) { /* пробуем запасной вариант */ }

    // 2) Запасной вариант и уточнение: ближайший город из геокодера Open-Meteo
    if (!clean || /район|округ|поселение/i.test(clean)) {
      try {
        const near = await fetchJSON(
          'https://geocoding-api.open-meteo.com/v1/search?name=&latitude=' + lat.toFixed(3) +
          '&longitude=' + lon.toFixed(3) + '&count=1&language=ru&format=json', 6000);
        const hit = near && near.results && near.results[0];
        if (hit && hit.name) clean = hit.name;
      } catch (_) { }
    }

    if (clean) city.name = clean;
    setCity(city, true);
  }

  function setCity(city, fromGeo) {
    state.city = city;
    state.cityIsGeo = !!fromGeo;
    if (fromGeo) store.set('gp.geoDone.v1', true);
    store.set(LS.city, city);
    $('cityLabel').textContent = city.name;
    closeSearch();
    updateLocationHint();
    loadWeather();
    if (fromGeo) toast('Выпуск для ' + city.name);
  }

  /* --------------------------------------------------------- поиск */

  function openSearch() {
    $('searchSheet').hidden = false;
    renderQuick();
    setTimeout(() => { const i = $('searchInput'); i.focus({ preventScroll: true }); }, 80);
    if (isNative() && native().setStatusBarDark) { try { native().setStatusBarDark(true); } catch (_) {} }
  }
  function closeSearch() {
    $('searchSheet').hidden = true;
    $('searchInput').value = '';
    $('searchClear').hidden = true;
    $('searchHint').hidden = false;
    $('searchResults').hidden = true;
    $('searchEmpty').hidden = true;
    $('searchResults').innerHTML = '';
    if (isNative() && native().hideKeyboard) { try { native().hideKeyboard(); } catch (_) {} }
  }

  function renderQuick() {
    $('quickCities').innerHTML = QUICK.map((c, i) => '<button class="city-pill" type="button" data-q="' + i + '">' + esc(c.name) + '</button>').join('');
    $$('#quickCities [data-q]').forEach((b) => {
      b.addEventListener('click', () => {
        const c = QUICK[Number(b.dataset.q)];
        setCity({ name: c.name, country: c.country, lat: c.lat, lon: c.lon, tz: '' });
        haptic();
      });
    });
  }

  function flagFor(code) {
    if (!code || code.length !== 2) return '📍';
    return String.fromCodePoint(...code.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0)));
  }

  function onSearchInput() {
    const q = $('searchInput').value.trim();
    $('searchClear').hidden = !q;
    clearTimeout(state.searchTimer);
    if (q.length < 2) {
      $('searchHint').hidden = false;
      $('searchResults').hidden = true;
      $('searchEmpty').hidden = true;
      return;
    }
    state.searchTimer = setTimeout(() => doSearch(q), 350);
  }

  async function doSearch(q) {
    const seq = ++state.searchSeq;
    $('searchHint').hidden = true;
    $('searchResults').hidden = false;
    $('searchResults').innerHTML = '<p class="muted" style="font-size:.86rem">Ищем в архиве редакции…</p>';
    try {
      const url = 'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(q) + '&count=10&language=ru&format=json';
      const r = await fetchJSON(url, 10000);
      if (seq !== state.searchSeq) return;
      const list = (r && r.results) || [];
      if (!list.length) {
        $('searchResults').hidden = true;
        $('searchEmpty').hidden = false;
        $('searchEmptyText').textContent = 'По запросу «' + q + '» ничего не найдено. Попробуйте другое название.';
        return;
      }
      $('searchEmpty').hidden = true;
      $('searchResults').innerHTML = list.map((x, i) => {
        const sub = [x.admin1, x.country].filter(Boolean).join(', ');
        return '<button class="result" type="button" data-r="' + i + '">' +
          '<span class="result__flag">' + flagFor(x.country_code) + '</span>' +
          '<span class="result__txt"><span class="result__name">' + esc(x.name) + '</span>' +
          '<span class="result__meta">' + esc(sub || (x.latitude.toFixed(2) + ', ' + x.longitude.toFixed(2))) + '</span></span>' +
          '<span class="result__go">→</span></button>';
      }).join('');
      $$('#searchResults [data-r]').forEach((b) => {
        b.addEventListener('click', () => {
          const x = list[Number(b.dataset.r)];
          setCity({ name: x.name, country: x.country || '', admin: x.admin1 || '', lat: x.latitude, lon: x.longitude, tz: x.timezone || '' });
        });
      });
    } catch (e) {
      if (seq !== state.searchSeq) return;
      $('searchResults').hidden = true;
      $('searchEmpty').hidden = false;
      $('searchEmptyText').textContent = 'Не удалось связаться с архивом. Проверьте соединение.';
    }
  }

  /* --------------------------------------------------------- вкладки */

  function switchTab(tab) {
    if (state.tab === tab) return;
    state.tab = tab;
    $$('#tabs .tab').forEach((b) => b.classList.toggle('is-active', b.dataset.tab === tab));
    if (state.data) render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    haptic();
  }

  /* --------------------------------------------------------- события */

  function bindRendered() {
    // место для будущих интерактивных элементов
  }

  function bindStatic() {
    $('btnSearch').addEventListener('click', openSearch);
    $('btnLocate').addEventListener('click', locate);
    $('btnGeoRow').addEventListener('click', locate);
    $('locateBanner').addEventListener('click', locate);
    $('btnUnits').addEventListener('click', toggleUnits);
    $('btnTheme').addEventListener('click', cycleTheme);
    $('btnRefresh').addEventListener('click', () => loadWeather());
    $('btnForceRefresh').addEventListener('click', () => loadWeather());
    $('btnRetry').addEventListener('click', () => { hideError(); loadWeather(); });
    $('btnOfflineArchive').addEventListener('click', () => {
      const cached = store.get(LS.cache, null);
      if (cached) {
        state.city = cached.city; state.data = cached.data;
        $('cityLabel').textContent = state.city.name;
        hideError(); render(); markStale(cached.savedAt, true);
      }
    });
    $$('#tabs .tab').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));
    $$('#searchSheet [data-close]').forEach((el) => el.addEventListener('click', closeSearch));

    $('searchInput').addEventListener('input', onSearchInput);
    $('searchInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); const q = $('searchInput').value.trim(); if (q.length >= 2) doSearch(q); if (isNative() && native().hideKeyboard) { try { native().hideKeyboard(); } catch (_) {} } }
      if (e.key === 'Escape') closeSearch();
    });
    $('searchClear').addEventListener('click', () => { $('searchInput').value = ''; onSearchInput(); $('searchInput').focus(); });

    // липкая строка статуса
    const masthead = $('masthead');
    const statusbar = $('statusbar');
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(([e]) => statusbar.classList.toggle('is-visible', !e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
      io.observe(masthead);
    } else {
      window.addEventListener('scroll', () => statusbar.classList.toggle('is-visible', window.scrollY > 180), { passive: true });
    }

    // онлайн / офлайн
    window.addEventListener('online', () => { toast('Связь восстановлена'); loadWeather({ silent: true }); });
    window.addEventListener('offline', () => { toast('Нет сети — читаем архив'); $('liveDot').classList.add('is-stale'); });

    // видимость
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && state.data && !state.busy && Date.now() - lastLoadAt > 30 * 60 * 1000) loadWeather({ silent: true });
    });

    // палец вниз — обновление
    let startY = 0, pulling = false;
    window.addEventListener('touchstart', (e) => {
      if (window.scrollY <= 0 && e.touches.length === 1) { startY = e.touches[0].clientY; pulling = true; }
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (!pulling) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 90 && !state.busy) { pulling = false; if (isNative() && native().vibrate) { try { native().vibrate(10); } catch (_) {} } loadWeather(); }
      if (window.scrollY > 0) pulling = false;
    }, { passive: true });
    window.addEventListener('touchend', () => { pulling = false; }, { passive: true });
  }

  /* --------------------------------------------------------- запуск */

  async function boot() {
    // вспомнить тему и единицы
    $('btnUnits').textContent = '°' + state.unit;

    // заставка только при первом показе в сессии
    const splash = $('splash');
    const showSplash = !store.get(LS.splash, false);
    if (!showSplash) splash.classList.add('is-gone');
    else setTimeout(() => store.set(LS.splash, true), 100);

    bindStatic();

    if (isNative() && native().ready) { try { native().ready(); } catch (_) {} }

    // последний выпуск из архива (мгновенно)
    const cached = store.get(LS.cache, null);
    if (cached && cached.data) {
      state.city = store.get(LS.city, cached.city) || cached.city;
      if (cached.city && cached.city.lat === state.city.lat && cached.city.lon === state.city.lon) {
        state.data = cached.data;
        render();
        markStale(cached.savedAt, true);
      }
    }

    // обновляем номер
    lastLoadAt = Date.now();
    await loadWeather({ silent: !!state.data });
    lastLoadAt = Date.now();

    // страховка для тихо загруженного кэша
    setTimeout(() => { if (showSplash) splash.classList.add('is-gone'); }, 500);
    setTimeout(() => { if (showSplash) splash.classList.add('is-gone'); }, 1800);
  }

  document.addEventListener('DOMContentLoaded', boot);
  if (document.readyState !== 'loading') boot();
})();
