let currentUnits = 'metric';
let lastCity     = '';


const WMO_CONDITIONS = {
  '0':  { text: 'Clear Sky',       icon: '☀️' },
  '1':  { text: 'Mainly Clear',    icon: '🌤️' },
  '2':  { text: 'Partly Cloudy',   icon: '⛅' },
  '3':  { text: 'Overcast',        icon: '☁️' },
  '45': { text: 'Fog',             icon: '🌫️' },
  '48': { text: 'Icy Fog',         icon: '🌫️' },
  '51': { text: 'Light Drizzle',   icon: '🌦️' },
  '53': { text: 'Drizzle',         icon: '🌦️' },
  '55': { text: 'Heavy Drizzle',   icon: '🌧️' },
  '61': { text: 'Light Rain',      icon: '🌧️' },
  '63': { text: 'Rain',            icon: '🌧️' },
  '65': { text: 'Heavy Rain',      icon: '🌧️' },
  '71': { text: 'Light Snow',      icon: '❄️' },
  '73': { text: 'Snow',            icon: '❄️' },
  '75': { text: 'Heavy Snow',      icon: '🌨️' },
  '77': { text: 'Snow Grains',     icon: '🌨️' },
  '80': { text: 'Light Showers',   icon: '🌦️' },
  '81': { text: 'Showers',         icon: '🌧️' },
  '82': { text: 'Heavy Showers',   icon: '🌧️' },
  '85': { text: 'Snow Showers',    icon: '🌨️' },
  '86': { text: 'Heavy Snow Showers', icon: '🌨️' },
  '95': { text: 'Thunderstorm',    icon: '⛈️' },
  '96': { text: 'Thunderstorm',    icon: '⛈️' },
  '99': { text: 'Thunderstorm',    icon: '⛈️' },
};

function getCondition(code) {
  return WMO_CONDITIONS[String(code)] || { text: 'Unknown', icon: '🌡️' };
}


window.addEventListener('DOMContentLoaded', () => {
  startClock();
  bindEvents();
  const banner = document.getElementById('keyBanner');
  if (banner) banner.classList.add('hidden');
  loadCity('Nairobi');
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


function setUnits(u) {
  currentUnits = u;
  document.getElementById('btnC').classList.toggle('active', u === 'metric');
  document.getElementById('btnF').classList.toggle('active', u === 'imperial');
  if (lastCity) loadCity(lastCity);
}

function toF(c) { return c == null ? null : Math.round(c * 9/5 + 32); }
function displayTemp(c, u) {
  if (c == null) return '—';
  return u ? Math.round(c) : toF(c);
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


async function fetchWeather(city) {
  showState('loading');
  try {
    const geo = await geocode(city);
    const url =
      `/.netlify/functions/weather` +
      `?lat=${geo.lat}&lon=${geo.lon}` +
      `&days=7&ai=true&units=metric`; 

    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || body.error || `API error (${res.status})`);
    }
    const data = await res.json();
    renderAll(data, geo);
  } catch (err) {
    showError(err.message);
  }
}


function renderAll(data, geo) {
  const u = currentUnits === 'metric';
  renderCurrent(data, geo, u);
  renderStats(data, u);
  renderAI(data.ai_summary || data.summary || '');
  renderForecast(data.forecast || [], u);
  renderHourly(data.hourly || [], u);
  renderDetails(data, u);
  showState('results');
}


function renderCurrent(data, geo, u) {
  const cur  = data.current || {};
  const code = cur.condition_code;
  const cond = getCondition(code);

  document.getElementById('rCity').textContent    = geo.city.toUpperCase();
  document.getElementById('rCountry').textContent = geo.country;
  document.getElementById('rUnit').textContent    = u ? '°C' : '°F';
  document.getElementById('rTemp').textContent    = displayTemp(cur.temperature, u);
  document.getElementById('rDesc').textContent    = cond.icon + '  ' + cond.text.toUpperCase();

  
  const day0 = (data.forecast || [])[0];
  const hi = day0?.temperature_max != null ? displayTemp(day0.temperature_max, u) : '—';
  const lo = day0?.temperature_min != null ? displayTemp(day0.temperature_min, u) : '—';
  document.getElementById('rHighLow').textContent = `H: ${hi}°  L: ${lo}°`;

  
  const glow = document.getElementById('weatherGlow');
  const t = cond.text.toLowerCase();
  if (t.includes('clear') || t.includes('sunny')) {
    glow.style.background = 'radial-gradient(circle, rgba(251,191,36,0.22) 0%, transparent 70%)';
  } else if (t.includes('rain') || t.includes('drizzle') || t.includes('shower')) {
    glow.style.background = 'radial-gradient(circle, rgba(96,165,250,0.20) 0%, transparent 70%)';
  } else if (t.includes('snow')) {
    glow.style.background = 'radial-gradient(circle, rgba(186,230,253,0.20) 0%, transparent 70%)';
  } else if (t.includes('thunder') || t.includes('storm')) {
    glow.style.background = 'radial-gradient(circle, rgba(167,139,250,0.22) 0%, transparent 70%)';
  } else {
    glow.style.background = 'radial-gradient(circle, rgba(148,163,184,0.15) 0%, transparent 70%)';
  }
}


function renderStats(data, u) {
  const cur = data.current || {};

  const feels    = cur.feels_like   != null ? displayTemp(cur.feels_like, u) + (u ? '°C' : '°F') : '—';
  const humidity = cur.humidity     != null ? cur.humidity + '%' : '—';
  const wind     = cur.wind_speed   != null ? (u ? Math.round(cur.wind_speed) + ' km/h' : Math.round(cur.wind_speed * 0.621) + ' mph') : '—';
  const uv       = cur.uv_index     != null ? Math.round(cur.uv_index) : '—';
  const vis      = data.hourly?.[0]?.visibility != null
    ? (u ? Math.round(data.hourly[0].visibility) + ' km' : Math.round(data.hourly[0].visibility * 0.621) + ' mi')
    : '—';
  const pressure = cur.pressure     != null ? Math.round(cur.pressure) + ' mb' : '—';

  document.getElementById('sFeels').textContent    = feels;
  document.getElementById('sHumidity').textContent = humidity;
  document.getElementById('sWind').textContent     = wind;
  document.getElementById('sUV').textContent       = uv;
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


function renderForecast(days, u) {
  const row = document.getElementById('forecastRow');
  row.innerHTML = '';

  days.slice(0, 7).forEach((day, i) => {
    const date    = day.date ? new Date(day.date + 'T12:00:00') : new Date(Date.now() + i * 86400000);
    const dayName = i === 0 ? 'TODAY' : date.toLocaleDateString('en', { weekday: 'short' }).toUpperCase();
    const cond    = getCondition(day.condition_code);
    const hi      = displayTemp(day.temperature_max, u);
    const lo      = displayTemp(day.temperature_min, u);
    const rain    = day.precipitation_probability ?? 0;

    const card = document.createElement('div');
    card.className = 'fc-card' + (i === 0 ? ' today' : '');
    card.innerHTML = `
      <div class="fc-day-name">${dayName}</div>
      <div class="fc-icon">${cond.icon}</div>
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

 
  const now  = new Date();
  const next24 = hours
    .filter(h => new Date(h.time) >= now)
    .slice(0, 24);

  const pts = next24.map(h => ({
    t:    u ? h.temperature : toF(h.temperature),
    label: new Date(h.time).getHours() + ':00',
    rain: h.precipitation_probability ?? 0,
  }));

  if (!pts.length) return;

  const temps = pts.map(p => p.t);
  const minT  = Math.min(...temps);
  const maxT  = Math.max(...temps);
  const range = maxT - minT || 1;

  const cx = i => PX + (i / (pts.length - 1)) * (W - PX * 2);
  const cy = t => PT + (1 - (t - minT) / range) * (H - PT - PB);

  svg.innerHTML = `
    <defs>
      <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="#60a5fa" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="#60a5fa" stop-opacity="0"/>
      </linearGradient>
    </defs>
  `;

  const linePts = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${cx(i)},${cy(p.t)}`).join(' ');
  const areaD   = `${linePts} L${cx(pts.length-1)},${H} L${cx(0)},${H} Z`;

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
    hourLabel.textContent = i === 0 ? 'Now' : p.label;
    svg.appendChild(hourLabel);
  });
}


function renderDetails(data, u) {
  const cur     = data.current  || {};
  const day0    = (data.forecast || [])[0] || {};
  const hourly0 = (data.hourly  || [])[0]  || {};

  const wind_dir = cur.wind_direction != null ? bearingToDir(cur.wind_direction) : '—';
  const gust     = cur.wind_gust  != null
    ? (u ? Math.round(cur.wind_gust) + ' km/h' : Math.round(cur.wind_gust * 0.621) + ' mph')
    : '—';
  const sunrise  = day0.sunrise  || '—';
  const sunset   = day0.sunset   || '—';
  const moon     = day0.moon_phase || '—';
  const precip   = day0.precipitation != null
    ? (u ? day0.precipitation + ' mm' : (day0.precipitation * 0.0394).toFixed(2) + ' in')
    : '—';
  const cloud    = hourly0.cloud_cover != null ? hourly0.cloud_cover + '%' : '—';
  const dew      = hourly0.dew_point   != null
    ? displayTemp(hourly0.dew_point, u) + (u ? '°C' : '°F')
    : '—';

  const rows = [
    { lbl: '🌅 Sunrise',      val: sunrise  },
    { lbl: '🌇 Sunset',       val: sunset   },
    { lbl: '🌙 Moon Phase',   val: moon     },
    { lbl: '💧 Dew Point',    val: dew      },
    { lbl: '💨 Wind Gust',    val: gust     },
    { lbl: '🧭 Wind Dir',     val: wind_dir },
    { lbl: '☁️ Cloud Cover',  val: cloud    },
    { lbl: '🌧️ Precip',      val: precip   },
  ];

  document.getElementById('detailList').innerHTML = rows
    .map(r => `
      <div class="detail-row">
        <span class="detail-lbl">${r.lbl}</span>
        <span class="detail-val">${r.val}</span>
      </div>
    `).join('');
}


function bearingToDir(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
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