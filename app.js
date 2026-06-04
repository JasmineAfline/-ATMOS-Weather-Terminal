/* =============================================
   ATMOS — app.js  |  Full logic v3
   ============================================= */

let currentUnits = 'metric';
let lastCity     = '';

// ── WMO condition codes ───────────────────────
const WMO = {
  '0':  { text:'Clear Sky',         icon:'☀️'  },
  '1':  { text:'Mainly Clear',      icon:'🌤️'  },
  '2':  { text:'Partly Cloudy',     icon:'⛅'  },
  '3':  { text:'Overcast',          icon:'☁️'  },
  '45': { text:'Fog',               icon:'🌫️'  },
  '48': { text:'Icy Fog',           icon:'🌫️'  },
  '51': { text:'Light Drizzle',     icon:'🌦️'  },
  '53': { text:'Drizzle',           icon:'🌦️'  },
  '55': { text:'Heavy Drizzle',     icon:'🌧️'  },
  '61': { text:'Light Rain',        icon:'🌧️'  },
  '63': { text:'Rain',              icon:'🌧️'  },
  '65': { text:'Heavy Rain',        icon:'🌧️'  },
  '71': { text:'Light Snow',        icon:'❄️'  },
  '73': { text:'Snow',              icon:'❄️'  },
  '75': { text:'Heavy Snow',        icon:'🌨️'  },
  '80': { text:'Light Showers',     icon:'🌦️'  },
  '81': { text:'Showers',           icon:'🌧️'  },
  '82': { text:'Heavy Showers',     icon:'🌧️'  },
  '95': { text:'Thunderstorm',      icon:'⛈️'  },
  '99': { text:'Thunderstorm',      icon:'⛈️'  },
};
function getCond(code) { return WMO[String(code)] || { text:'Unknown', icon:'🌡️' }; }

// ── Init ──────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  startClock();
  bindEvents();
  loadTheme();
  renderRecent();
  const banner = document.getElementById('keyBanner');
  if (banner) banner.classList.add('hidden');
  loadCity('Nairobi');
});

// ── Clock ─────────────────────────────────────
function startClock() {
  const tick = () => {
    const el = document.getElementById('lastUpdated');
    if (el) el.textContent = new Date().toUTCString().slice(0, 25);
  };
  tick(); setInterval(tick, 1000);
}

// ── Events ────────────────────────────────────
function bindEvents() {
  document.getElementById('searchBtn').addEventListener('click', search);
  document.getElementById('cityInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') search();
  });
}

// ── Theme ─────────────────────────────────────
function loadTheme() {
  const saved = localStorage.getItem('atmos_theme') || 'dark';
  setTheme(saved);
}
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  setTheme(current === 'dark' ? 'light' : 'dark');
}
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('atmos_theme', t);
  document.getElementById('themeBtn').textContent = t === 'dark' ? '🌙' : '☀️';
}

// ── Units ─────────────────────────────────────
function setUnits(u) {
  currentUnits = u;
  document.getElementById('btnC').classList.toggle('active', u === 'metric');
  document.getElementById('btnF').classList.toggle('active', u === 'imperial');
  if (lastCity) loadCity(lastCity);
}
function toF(c) { return c == null ? null : +(c * 9/5 + 32).toFixed(1); }
function dispTemp(c, u) {
  if (c == null) return '—';
  return u ? Math.round(c) : Math.round(toF(c));
}

// ── Search ────────────────────────────────────
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
  saveRecent(city);
  fetchWeather(city);
}

function clearError() { showState('empty'); }

// ── Recent Searches ───────────────────────────
function saveRecent(city) {
  let list = getRecent();
  list = [city, ...list.filter(c => c.toLowerCase() !== city.toLowerCase())].slice(0, 5);
  localStorage.setItem('atmos_recent', JSON.stringify(list));
  renderRecent();
}
function getRecent() {
  try { return JSON.parse(localStorage.getItem('atmos_recent') || '[]'); } catch { return []; }
}
function clearRecent() {
  localStorage.removeItem('atmos_recent');
  renderRecent();
}
function renderRecent() {
  const list = getRecent();
  const wrap = document.getElementById('recentWrap');
  const el   = document.getElementById('recentList');
  if (!list.length) { wrap.classList.add('hidden'); return; }
  wrap.classList.remove('hidden');
  el.innerHTML = list.map(c =>
    `<button class="recent-chip" onclick="loadCity('${c}')">${c}</button>`
  ).join('');
}

// ── GPS Location ──────────────────────────────
function detectLocation() {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser.');
    return;
  }
  showState('loading');
  navigator.geolocation.getCurrentPosition(
    async pos => {
      const { latitude: lat, longitude: lon } = pos.coords;
      try {
        // Reverse geocode to get city name
        const res  = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
          { headers: { 'Accept-Language': 'en-US,en' } }
        );
        const data = await res.json();
        const addr = data.address || {};
        const city = addr.city || addr.town || addr.village || addr.county || 'My Location';
        lastCity = city;
        document.getElementById('cityInput').value = city;
        fetchWeatherByCoords(lat, lon, city, addr.country || '');
      } catch {
        fetchWeatherByCoords(lat, lon, 'My Location', '');
      }
    },
    () => { showError('Location access denied. Please allow location access and try again.'); }
  );
}

// ── Geocoding ─────────────────────────────────
async function geocode(city) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1&addressdetails=1`;
  const res  = await fetch(url, { headers: { 'Accept-Language': 'en-US,en' } });
  if (!res.ok) throw new Error('Geocoding service unavailable.');
  const data = await res.json();
  if (!data.length) throw new Error(`City not found: "${city}"`);
  const place = data[0], addr = place.address || {};
  return {
    lat:     parseFloat(place.lat),
    lon:     parseFloat(place.lon),
    city:    addr.city || addr.town || addr.village || addr.county || city,
    country: addr.country || '',
  };
}

// ── Fetch ─────────────────────────────────────
async function fetchWeather(city) {
  showState('loading');
  try {
    const geo = await geocode(city);
    await fetchWeatherByCoords(geo.lat, geo.lon, geo.city, geo.country);
  } catch (err) { showError(err.message); }
}

async function fetchWeatherByCoords(lat, lon, city, country) {
  try {
    const url = `/.netlify/functions/weather?lat=${lat}&lon=${lon}&days=7&ai=true&units=metric`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || body.error || `API error (${res.status})`);
    }
    const data = await res.json();
    renderAll(data, { lat, lon, city, country });
  } catch (err) { showError(err.message); }
}

// ── Render All ────────────────────────────────
function renderAll(data, geo) {
  const u = currentUnits === 'metric';
  renderCurrent(data, geo, u);
  renderStats(data, u);
  renderAI(data.ai_summary || data.summary || '');
  renderRecommendations(data, u);
  renderForecast(data.forecast || [], u);
  renderHourly(data.hourly || [], u);
  renderDetails(data, u);
  showState('results');
}

// ── Current ───────────────────────────────────
function renderCurrent(data, geo, u) {
  const cur  = data.current || {};
  const cond = getCond(cur.condition_code);
  document.getElementById('rCity').textContent    = geo.city.toUpperCase();
  document.getElementById('rCountry').textContent = geo.country;
  document.getElementById('rUnit').textContent    = u ? '°C' : '°F';
  document.getElementById('rTemp').textContent    = dispTemp(cur.temperature, u);
  document.getElementById('rDesc').textContent    = cond.icon + '  ' + cond.text.toUpperCase();

  const day0 = (data.forecast || [])[0];
  const hi   = day0?.temperature_max != null ? dispTemp(day0.temperature_max, u) : '—';
  const lo   = day0?.temperature_min != null ? dispTemp(day0.temperature_min, u) : '—';
  document.getElementById('rHighLow').textContent = `H: ${hi}°  L: ${lo}°`;

  const glow = document.getElementById('weatherGlow');
  const t = cond.text.toLowerCase();
  if (t.includes('clear') || t.includes('sunny'))
    glow.style.background = 'radial-gradient(circle, rgba(251,191,36,0.22) 0%, transparent 70%)';
  else if (t.includes('rain') || t.includes('drizzle') || t.includes('shower'))
    glow.style.background = 'radial-gradient(circle, rgba(96,165,250,0.20) 0%, transparent 70%)';
  else if (t.includes('snow'))
    glow.style.background = 'radial-gradient(circle, rgba(186,230,253,0.20) 0%, transparent 70%)';
  else if (t.includes('thunder'))
    glow.style.background = 'radial-gradient(circle, rgba(167,139,250,0.22) 0%, transparent 70%)';
  else
    glow.style.background = 'radial-gradient(circle, rgba(148,163,184,0.15) 0%, transparent 70%)';
}

// ── Stats ─────────────────────────────────────
function renderStats(data, u) {
  const cur = data.current || {};
  document.getElementById('sFeels').textContent    = cur.feels_like  != null ? dispTemp(cur.feels_like, u)  + (u ? '°C' : '°F') : '—';
  document.getElementById('sHumidity').textContent = cur.humidity    != null ? cur.humidity + '%' : '—';
  document.getElementById('sWind').textContent     = cur.wind_speed  != null ? (u ? Math.round(cur.wind_speed) + ' km/h' : Math.round(cur.wind_speed * 0.621) + ' mph') : '—';
  document.getElementById('sUV').textContent       = cur.uv_index    != null ? Math.round(cur.uv_index) : '—';
  document.getElementById('sVis').textContent      = '—'; // not in current payload
  document.getElementById('sPressure').textContent = cur.pressure    != null ? Math.round(cur.pressure) + ' mb' : '—';
}

// ── AI Summary ────────────────────────────────
function renderAI(text) {
  const el = document.getElementById('aiSummary');
  el.textContent = '';
  el.classList.add('ai-cursor');
  const content = text || 'No AI summary available for this location.';
  let i = 0;
  const typer = setInterval(() => {
    el.textContent = content.slice(0, ++i);
    if (i >= content.length) { el.classList.remove('ai-cursor'); clearInterval(typer); }
  }, 18);
}

// ── Smart Recommendations ─────────────────────
function renderRecommendations(data, u) {
  const cur  = data.current || {};
  const cond = getCond(cur.condition_code);
  const t    = cond.text.toLowerCase();
  const temp = cur.temperature ?? 20;
  const uv   = cur.uv_index   ?? 0;
  const wind = cur.wind_speed  ?? 0;
  const hum  = cur.humidity    ?? 0;
  const rain = (data.forecast?.[0]?.precipitation_probability ?? 0);

  const recs = [];

  // Umbrella
  if (t.includes('rain') || t.includes('drizzle') || t.includes('shower') || rain > 50)
    recs.push({ icon:'🌂', title:'Carry an umbrella', sub:'Rain expected today' });

  // Sunscreen
  if (uv >= 6)
    recs.push({ icon:'🧴', title:'Apply sunscreen', sub:`UV index is high (${Math.round(uv)})` });
  else if (uv >= 3)
    recs.push({ icon:'🕶️', title:'Wear sunglasses', sub:`UV index is moderate (${Math.round(uv)})` });

  // Jacket
  if (temp < 10)
    recs.push({ icon:'🧥', title:'Wear a heavy jacket', sub:`It\'s cold at ${dispTemp(temp, u)}°` });
  else if (temp < 18)
    recs.push({ icon:'🧣', title:'Bring a light jacket', sub:`Cool conditions today` });

  // Wind
  if (wind > 40)
    recs.push({ icon:'💨', title:'Strong winds today', sub:'Secure loose items outside' });

  // Humidity
  if (hum > 80)
    recs.push({ icon:'💧', title:'High humidity', sub:'Stay hydrated and cool' });

  // Clear sky
  if (t.includes('clear') || t.includes('sunny'))
    recs.push({ icon:'🌳', title:'Great for outdoors', sub:'Perfect weather to go outside' });

  // Snow
  if (t.includes('snow'))
    recs.push({ icon:'🧤', title:'Bundle up', sub:'Snow conditions — dress warm' });

  // Thunder
  if (t.includes('thunder'))
    recs.push({ icon:'⚡', title:'Stay indoors', sub:'Thunderstorm warning in effect' });

  // Fallback
  if (!recs.length)
    recs.push({ icon:'✅', title:'All clear today', sub:'Comfortable conditions outside' });

  const row = document.getElementById('recommendationsRow');
  row.innerHTML = recs.map(r => `
    <div class="rec-card">
      <div class="rec-icon">${r.icon}</div>
      <div class="rec-body">
        <div class="rec-title">${r.title}</div>
        <div class="rec-sub">${r.sub}</div>
      </div>
    </div>
  `).join('');
}

// ── Forecast ──────────────────────────────────
function renderForecast(days, u) {
  const row = document.getElementById('forecastRow');
  row.innerHTML = '';
  days.slice(0, 7).forEach((day, i) => {
    const date    = day.date ? new Date(day.date + 'T12:00:00') : new Date(Date.now() + i * 86400000);
    const dayName = i === 0 ? 'TODAY' : date.toLocaleDateString('en', { weekday:'short' }).toUpperCase();
    const cond    = getCond(day.condition_code);
    const hi      = dispTemp(day.temperature_max, u);
    const lo      = dispTemp(day.temperature_min, u);
    const rain    = day.precipitation_probability ?? 0;
    const card    = document.createElement('div');
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

// ── Hourly Chart ──────────────────────────────
function renderHourly(hours, u) {
  const svg = document.getElementById('hourlySvg');
  svg.innerHTML = '';
  if (!hours.length) {
    svg.innerHTML = `<text x="50%" y="50%" fill="#4a6585" font-size="12" text-anchor="middle" dominant-baseline="middle" font-family="DM Sans,sans-serif">No hourly data available</text>`;
    return;
  }
  const W = 700, H = 130, PT = 24, PB = 28, PX = 20;
  const now    = new Date();
  const next24 = hours.filter(h => new Date(h.time) >= now).slice(0, 24);
  if (!next24.length) return;

  const pts   = next24.map(h => ({ t: u ? h.temperature : toF(h.temperature), label: new Date(h.time).getHours() + ':00' }));
  const temps = pts.map(p => p.t);
  const minT  = Math.min(...temps), maxT = Math.max(...temps), range = maxT - minT || 1;
  const cx    = i => PX + (i / (pts.length - 1)) * (W - PX * 2);
  const cy    = t => PT + (1 - (t - minT) / range) * (H - PT - PB);

  svg.innerHTML = `<defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#60a5fa" stop-opacity="0.25"/><stop offset="100%" stop-color="#60a5fa" stop-opacity="0"/></linearGradient></defs>`;

  const lp  = pts.map((p, i) => `${i===0?'M':'L'}${cx(i)},${cy(p.t)}`).join(' ');
  const area = document.createElementNS('http://www.w3.org/2000/svg','path');
  area.setAttribute('d', `${lp} L${cx(pts.length-1)},${H} L${cx(0)},${H} Z`);
  area.setAttribute('fill','url(#tg)');
  svg.appendChild(area);

  const line = document.createElementNS('http://www.w3.org/2000/svg','path');
  line.setAttribute('d', lp);
  line.setAttribute('fill','none');
  line.setAttribute('stroke','#60a5fa');
  line.setAttribute('stroke-width','1.8');
  line.setAttribute('stroke-linejoin','round');
  line.setAttribute('stroke-linecap','round');
  svg.appendChild(line);

  pts.forEach((p, i) => {
    if (i % 3 !== 0) return;
    const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
    c.setAttribute('cx', cx(i)); c.setAttribute('cy', cy(p.t));
    c.setAttribute('r','3'); c.setAttribute('fill','#60a5fa'); c.setAttribute('opacity','0.85');
    svg.appendChild(c);

    const tl = document.createElementNS('http://www.w3.org/2000/svg','text');
    tl.setAttribute('x', cx(i)); tl.setAttribute('y', cy(p.t)-8);
    tl.setAttribute('text-anchor','middle'); tl.setAttribute('fill','#dce8f5');
    tl.setAttribute('font-size','10'); tl.setAttribute('font-family','DM Sans,sans-serif');
    tl.textContent = Math.round(p.t) + '°';
    svg.appendChild(tl);

    const hl = document.createElementNS('http://www.w3.org/2000/svg','text');
    hl.setAttribute('x', cx(i)); hl.setAttribute('y', H-6);
    hl.setAttribute('text-anchor','middle'); hl.setAttribute('fill','#4a6585');
    hl.setAttribute('font-size','9'); hl.setAttribute('font-family','DM Sans,sans-serif');
    hl.textContent = i === 0 ? 'Now' : p.label;
    svg.appendChild(hl);
  });
}

// ── Details ───────────────────────────────────
function renderDetails(data, u) {
  const cur  = data.current   || {};
  const day0 = (data.forecast || [])[0] || {};

  const gust    = cur.wind_gust      != null ? (u ? Math.round(cur.wind_gust) + ' km/h' : Math.round(cur.wind_gust * 0.621) + ' mph') : '—';
  const windDir = cur.wind_direction != null ? bearingToDir(cur.wind_direction) : '—';
  const sunrise = day0.sunrise       || '—';
  const sunset  = day0.sunset        || '—';
  const moon    = day0.moon_phase    || '—';
  const precip  = day0.precipitation != null ? (u ? day0.precipitation + ' mm' : (day0.precipitation * 0.0394).toFixed(2) + ' in') : '—';
  const uvCat   = uvCategory(cur.uv_index);

  const rows = [
    { lbl:'🌅 Sunrise',     val: sunrise  },
    { lbl:'🌇 Sunset',      val: sunset   },
    { lbl:'🌙 Moon Phase',  val: moon     },
    { lbl:'💨 Wind Gust',   val: gust     },
    { lbl:'🧭 Wind Dir',    val: windDir  },
    { lbl:'🌧️ Precip',     val: precip   },
    { lbl:'☀️ UV Category', val: uvCat    },
  ];

  document.getElementById('detailList').innerHTML = rows.map(r => `
    <div class="detail-row">
      <span class="detail-lbl">${r.lbl}</span>
      <span class="detail-val">${r.val}</span>
    </div>
  `).join('');
}

// ── Helpers ───────────────────────────────────
function bearingToDir(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}
function uvCategory(uv) {
  if (uv == null) return '—';
  if (uv < 3)  return 'Low';
  if (uv < 6)  return 'Moderate';
  if (uv < 8)  return 'High';
  if (uv < 11) return 'Very High';
  return 'Extreme';
}

// ── State ─────────────────────────────────────
function showState(state) {
  ['stateEmpty','stateLoading','stateError','results'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  document.getElementById({ empty:'stateEmpty', loading:'stateLoading', error:'stateError', results:'results' }[state]).classList.remove('hidden');
}
function showError(msg) {
  document.getElementById('errorMsg').textContent = msg;
  showState('error');
}