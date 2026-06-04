const API_BASE   = 'https://api.weather-ai.co';
let API_KEY      = '';
let currentUnits = 'metric';
let lastCity     = '';


window.addEventListener('DOMContentLoaded', () => {
  startClock();
  loadApiKey();
  bindEvents();
});


function startClock() {
  function tick() {
    const el = document.getElementById('lastUpdated');
    if (el) el.textContent = new Date().toUTCString().slice(0, 25);
  }
  tick();
  setInterval(tick, 1000);
}


function bindEvents() {
  document.getElementById('searchBtn').addEventListener('click', search);
  document.getElementById('cityInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') search();
  });
}

function loadApiKey() {
  const saved = localStorage.getItem('atmos_wai_key');
  if (saved && saved.startsWith('wai_')) {
    API_KEY = saved;
    document.getElementById('keyBanner').classList.add('hidden');
    loadCity('Nairobi');
  } else {
    showKeyBanner();
  }
}

function showKeyBanner() {
  document.getElementById('keyBanner').classList.remove('hidden');
}

function saveKeyFromBanner() {
  const key = document.getElementById('keyInput').value.trim();
  if (!key) {
    alert('Please enter your API key.');
    return;
  }
  if (!key.startsWith('wai_')) {
    alert('Invalid key — must start with wai_\nGet your key at weather-ai.co');
    return;
  }
  API_KEY = key;
  localStorage.setItem('atmos_wai_key', API_KEY);
  document.getElementById('keyBanner').classList.add('hidden');
  loadCity('Nairobi');
}

function promptApiKey() {
  showKeyBanner();
}


function setUnits(u) {
  currentUnits = u;
  document.getElementById('btnC').classList.toggle('active', u === 'metric');
  document.getElementById('btnF').classList.toggle('active', u === 'imperial');
  if (lastCity) loadCity(lastCity);
}


function search() {
  const city = document.getElementById('cityInput').value.trim();
  if (!city) return;
  loadCity(city);
}

function loadCity(city) {
  lastCity = city;
  document.getElementById('cityInput').value = city;

 
  document.querySelectorAll('.qc-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.trim().toLowerCase() === city.toLowerCase());
  });

  fetchWeather(city);
}

function clearError() { showState('empty'); }


async function geocode(city) {
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encodeURIComponent(city)}&format=json&limit=1&addressdetails=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en-US,en' } });
  if (!res.ok) throw new Error('Geocoding service unavailable.');
  const data = await res.json();
  if (!data.length) throw new Error(`City not found: "${city}"`);
  const place = data[0];
  const addr  = place.address || {};
  return {
    lat:     parseFloat(place.lat),
    lon:     parseFloat(place.lon),
    city:    addr.city || addr.town || addr.village || addr.county || city,
    country: addr.country || '',
  };
}


const MOCK_DATA = {
  location: { name: 'Nairobi', country: 'Kenya' },
  current: {
    temp_c: 24, temp_f: 75,
    feelslike_c: 22, feelslike_f: 72,
    humidity: 68,
    wind_kph: 14, wind_mph: 9,
    uv: 5,
    vis_km: 10, vis_miles: 6,
    pressure_mb: 1013,
    condition: { text: 'Partly Cloudy' }
  },
  forecast: {
    forecastday: [
      {
        date: new Date().toISOString().slice(0, 10),
        day: { maxtemp_c: 26, mintemp_c: 16, maxtemp_f: 79, mintemp_f: 61, daily_chance_of_rain: 10, condition: { text: 'Partly Cloudy' } },
        astro: { sunrise: '06:32 AM', sunset: '06:48 PM', moon_phase: 'Waxing Gibbous' },
        hour: Array.from({ length: 24 }, (_, i) => ({
          time: `2024-01-01 ${String(i).padStart(2, '0')}:00`,
          temp_c: 16 + Math.round(Math.sin((i - 6) * Math.PI / 12) * 8),
          temp_f: 61 + Math.round(Math.sin((i - 6) * Math.PI / 12) * 14),
          chance_of_rain: (i > 14 && i < 18) ? 40 : 5
        }))
      },
      { date: '', day: { maxtemp_c: 27, mintemp_c: 17, maxtemp_f: 81, mintemp_f: 63, daily_chance_of_rain: 5,  condition: { text: 'Sunny' } } },
      { date: '', day: { maxtemp_c: 21, mintemp_c: 15, maxtemp_f: 70, mintemp_f: 59, daily_chance_of_rain: 75, condition: { text: 'Heavy Rain' } } },
      { date: '', day: { maxtemp_c: 23, mintemp_c: 15, maxtemp_f: 73, mintemp_f: 59, daily_chance_of_rain: 30, condition: { text: 'Cloudy' } } },
      { date: '', day: { maxtemp_c: 28, mintemp_c: 18, maxtemp_f: 82, mintemp_f: 64, daily_chance_of_rain: 0,  condition: { text: 'Sunny' } } },
      { date: '', day: { maxtemp_c: 22, mintemp_c: 15, maxtemp_f: 72, mintemp_f: 59, daily_chance_of_rain: 60, condition: { text: 'Drizzle' } } },
      { date: '', day: { maxtemp_c: 25, mintemp_c: 16, maxtemp_f: 77, mintemp_f: 61, daily_chance_of_rain: 10, condition: { text: 'Partly Cloudy' } } },
    ]
  },
  ai_summary: 'Comfortable conditions across Nairobi today with partly cloudy skies. Temperatures peak around 26°C in the afternoon before easing to a pleasant 16°C overnight. A brief rain window is possible mid-week — keep a light jacket handy. Weekend looks clear and warm.'
};


async function fetchWeather(city) {
  if (!API_KEY) { promptApiKey(); return; }
  showState('loading');

  try {
    const geo     = await geocode(city);
    const isLocal = location.hostname === '127.0.0.1' || location.hostname === 'localhost';

    

    const url =
      `/.netlify/functions/weather` +
      `?lat=${geo.lat}&lon=${geo.lon}` +
      `&days=7&ai=true&units=${currentUnits}`;

    const res = await fetch(url);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || body.error || `API error (${res.status})`);
    }

    const data = await res.json();
    console.log('FULL API RESPONSE:', JSON.stringify(data, null, 2));
    renderAll(data, geo);

  } catch (err) {
    showError(err.message);
  }
}


function renderAll(data, geo) {
  const current  = data.current || {};
  const forecast = data.forecast?.forecastday || [];
  const aiText   = data.ai_summary || data.summary || '';
  const u        = currentUnits === 'metric';

  renderCurrent(current, geo, u);
  renderStats(current, u);
  renderAI(aiText);
  renderForecast(forecast, u);
  renderHourly(forecast[0]?.hour || [], u);
  renderDetails(current, forecast[0], u);

  showState('results');
}


function renderCurrent(current, geo, u) {
  document.getElementById('rCity').textContent    = geo.city.toUpperCase();
  document.getElementById('rCountry').textContent = geo.country;
  document.getElementById('rUnit').textContent    = u ? '°C' : '°F';

  const temp = u
    ? Math.round(current.temp_c ?? current.temperature ?? 0)
    : Math.round(current.temp_f ?? 0);
  document.getElementById('rTemp').textContent = temp;

  const desc = current.condition?.text || current.description || '';
  document.getElementById('rDesc').textContent = weatherIcon(desc) + '  ' + desc.toUpperCase();

  const hi = u
    ? Math.round(current.maxtemp_c ?? 0)
    : Math.round(current.maxtemp_f ?? 0);
  const lo = u
    ? Math.round(current.mintemp_c ?? 0)
    : Math.round(current.mintemp_f ?? 0);

  document.getElementById('rHighLow').textContent =
    (hi !== 0 || lo !== 0) ? `H: ${hi}°  L: ${lo}°` : '';

  
  const glow = document.getElementById('weatherGlow');
  const d    = desc.toLowerCase();
  if (d.includes('sun') || d.includes('clear')) {
    glow.style.background = 'radial-gradient(circle, rgba(251,191,36,0.22) 0%, transparent 70%)';
  } else if (d.includes('rain') || d.includes('drizzle') || d.includes('shower')) {
    glow.style.background = 'radial-gradient(circle, rgba(96,165,250,0.20) 0%, transparent 70%)';
  } else if (d.includes('snow') || d.includes('blizzard') || d.includes('sleet')) {
    glow.style.background = 'radial-gradient(circle, rgba(186,230,253,0.20) 0%, transparent 70%)';
  } else if (d.includes('thunder') || d.includes('storm')) {
    glow.style.background = 'radial-gradient(circle, rgba(167,139,250,0.22) 0%, transparent 70%)';
  } else if (d.includes('cloud') || d.includes('overcast') || d.includes('mist') || d.includes('fog')) {
    glow.style.background = 'radial-gradient(circle, rgba(148,163,184,0.15) 0%, transparent 70%)';
  } else {
    glow.style.background = 'radial-gradient(circle, rgba(96,165,250,0.15) 0%, transparent 70%)';
  }
}


function renderStats(current, u) {
  const feels = u
    ? Math.round(current.feelslike_c ?? 0) + '°C'
    : Math.round(current.feelslike_f ?? 0) + '°F';

  const wind = u
    ? Math.round(current.wind_kph ?? current.wind_speed ?? 0) + ' km/h'
    : Math.round(current.wind_mph ?? 0) + ' mph';

  const vis = u
    ? Math.round(current.vis_km ?? current.visibility ?? 0) + ' km'
    : Math.round(current.vis_miles ?? 0) + ' mi';

  const pressure = u
    ? Math.round(current.pressure_mb ?? current.pressure ?? 0) + ' mb'
    : Math.round(current.pressure_in ?? 0) + ' in';

  document.getElementById('sFeels').textContent   = feels;
  document.getElementById('sHumidity').textContent = (current.humidity ?? 0) + '%';
  document.getElementById('sWind').textContent     = wind;
  document.getElementById('sUV').textContent       = current.uv ?? current.uv_index ?? '—';
  document.getElementById('sVis').textContent      = vis;
  document.getElementById('sPressure').textContent = pressure;
}


function renderAI(text) {
  const el = document.getElementById('aiSummary');
  el.textContent = '';
  el.classList.add('ai-cursor');

  const content = text || 'No AI summary available for this location.';
  let i = 0;

  const typer = setInterval(() => {
    el.textContent = content.slice(0, ++i);
    if (i >= content.length) {
      el.classList.remove('ai-cursor');
      clearInterval(typer);
    }
  }, 20);
}


const WEATHER_ICONS = {
  'sunny':         '☀️',
  'clear':         '🌙',
  'partly cloudy': '⛅',
  'cloudy':        '☁️',
  'overcast':      '☁️',
  'mist':          '🌫️',
  'fog':           '🌫️',
  'drizzle':       '🌦️',
  'rain':          '🌧️',
  'heavy rain':    '🌧️',
  'shower':        '🌦️',
  'snow':          '❄️',
  'blizzard':      '🌨️',
  'thunder':       '⛈️',
  'sleet':         '🌨️',
};

function weatherIcon(text = '') {
  const t = text.toLowerCase();
  for (const [key, icon] of Object.entries(WEATHER_ICONS)) {
    if (t.includes(key)) return icon;
  }
  return '🌡️';
}

function renderForecast(days, u) {
  const row = document.getElementById('forecastRow');
  row.innerHTML = '';

  days.slice(0, 7).forEach((day, i) => {
    const date     = day.date ? new Date(day.date + 'T12:00:00') : new Date(Date.now() + i * 86400000);
    const dayName  = i === 0 ? 'TODAY' : date.toLocaleDateString('en', { weekday: 'short' }).toUpperCase();
    const desc     = day.day?.condition?.text || '';
    const icon     = weatherIcon(desc);
    const hi       = u ? Math.round(day.day?.maxtemp_c ?? 0) : Math.round(day.day?.maxtemp_f ?? 0);
    const lo       = u ? Math.round(day.day?.mintemp_c ?? 0) : Math.round(day.day?.mintemp_f ?? 0);
    const rain     = day.day?.daily_chance_of_rain ?? 0;

    const card = document.createElement('div');
    card.className = 'fc-card' + (i === 0 ? ' today' : '');
    card.innerHTML = `
      <div class="fc-day-name">${dayName}</div>
      <div class="fc-icon">${icon}</div>
      <div class="fc-hi">${hi}°</div>
      <div class="fc-lo">${lo}°</div>
      <div class="fc-rain">${rain > 0 ? '💧 ' + rain + '%' : '—'}</div>
    `;
    row.appendChild(card);
  });
}


function renderHourly(hours, u) {
  const svg = document.getElementById('hourlySvg');
  svg.innerHTML = '';

  if (!hours.length) {
    svg.innerHTML = `<text x="50%" y="50%" fill="#4a6585" font-size="12"
      text-anchor="middle" dominant-baseline="middle"
      font-family="DM Sans, sans-serif">No hourly data available</text>`;
    return;
  }

  const W = 700, H = 130, PT = 24, PB = 28, PX = 20;
  const pts = hours.slice(0, 24).map((h, i) => ({
    t:    u ? (h.temp_c ?? 0) : (h.temp_f ?? 0),
    hour: i,
    rain: h.chance_of_rain ?? 0,
  }));

  const temps  = pts.map(p => p.t);
  const minT   = Math.min(...temps);
  const maxT   = Math.max(...temps);
  const range  = maxT - minT || 1;

  const cx = i  => PX + (i / 23) * (W - PX * 2);
  const cy = t  => PT + (1 - (t - minT) / range) * (H - PT - PB);

 
  svg.innerHTML = `
    <defs>
      <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="#60a5fa" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="#60a5fa" stop-opacity="0"/>
      </linearGradient>
    </defs>
  `;

  
  const linePts = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${cx(i)},${cy(p.t)}`).join(' ');
  const areaD   = `${linePts} L${cx(23)},${H} L${cx(0)},${H} Z`;

  const area = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  area.setAttribute('d', areaD);
  area.setAttribute('fill', 'url(#tempGrad)');
  svg.appendChild(area);

  
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  line.setAttribute('d', linePts);
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke', '#60a5fa');
  line.setAttribute('stroke-width', '1.8');
  line.setAttribute('stroke-linejoin', 'round');
  line.setAttribute('stroke-linecap', 'round');
  svg.appendChild(line);

  
  pts.forEach((p, i) => {
    if (i % 3 !== 0) return;

   
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', cx(i));
    circle.setAttribute('cy', cy(p.t));
    circle.setAttribute('r', '3');
    circle.setAttribute('fill', '#60a5fa');
    circle.setAttribute('opacity', '0.85');
    svg.appendChild(circle);

   
    const tempLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tempLabel.setAttribute('x', cx(i));
    tempLabel.setAttribute('y', cy(p.t) - 8);
    tempLabel.setAttribute('text-anchor', 'middle');
    tempLabel.setAttribute('fill', '#dce8f5');
    tempLabel.setAttribute('font-size', '10');
    tempLabel.setAttribute('font-family', 'DM Sans, sans-serif');
    tempLabel.textContent = Math.round(p.t) + '°';
    svg.appendChild(tempLabel);

   
    const hourLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    hourLabel.setAttribute('x', cx(i));
    hourLabel.setAttribute('y', H - 6);
    hourLabel.setAttribute('text-anchor', 'middle');
    hourLabel.setAttribute('fill', '#4a6585');
    hourLabel.setAttribute('font-size', '9');
    hourLabel.setAttribute('font-family', 'DM Sans, sans-serif');
    hourLabel.textContent = i === 0 ? 'Now' : `${i}:00`;
    svg.appendChild(hourLabel);
  });
}


function renderDetails(current, day0, u) {
  const astro   = day0?.astro || {};
  const sunrise = astro.sunrise   || '—';
  const sunset  = astro.sunset    || '—';
  const moon    = astro.moon_phase || '—';

  const dew = u
    ? (current.dewpoint_c != null ? Math.round(current.dewpoint_c) + '°C' : '—')
    : (current.dewpoint_f != null ? Math.round(current.dewpoint_f) + '°F' : '—');

  const gust = u
    ? (current.gust_kph   != null ? Math.round(current.gust_kph)   + ' km/h' : '—')
    : (current.gust_mph   != null ? Math.round(current.gust_mph)   + ' mph'  : '—');

  const cloud  = current.cloud       != null ? current.cloud       + '%' : '—';
  const precip = u
    ? (current.precip_mm  != null ? current.precip_mm  + ' mm' : '—')
    : (current.precip_in  != null ? current.precip_in  + ' in' : '—');

  const windDir = current.wind_dir || '—';

  const rows = [
    { lbl: '🌅 Sunrise',     val: sunrise },
    { lbl: '🌇 Sunset',      val: sunset  },
    { lbl: '🌙 Moon Phase',  val: moon    },
    { lbl: '💧 Dew Point',   val: dew     },
    { lbl: '💨 Wind Gust',   val: gust    },
    { lbl: '🧭 Wind Dir',    val: windDir },
    { lbl: '☁️ Cloud Cover', val: cloud   },
    { lbl: '🌧️ Precip',     val: precip  },
  ];

  document.getElementById('detailList').innerHTML = rows
    .map(r => `
      <div class="detail-row">
        <span class="detail-lbl">${r.lbl}</span>
        <span class="detail-val">${r.val}</span>
      </div>
    `).join('');
}


function showState(state) {
  ['stateEmpty', 'stateLoading', 'stateError', 'results'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  const map = {
    empty:   'stateEmpty',
    loading: 'stateLoading',
    error:   'stateError',
    results: 'results',
  };
  document.getElementById(map[state]).classList.remove('hidden');
}

function showError(msg) {
  document.getElementById('errorMsg').textContent = msg;
  showState('error');
}