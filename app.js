const API_BASE = 'https://api.weather-ai.co';
let API_KEY     = '';
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
  if (saved) {
    API_KEY = saved;
    loadCity('Nairobi');
  } else {
    promptApiKey();
  }
}

function promptApiKey() {
  const key = prompt(
    'Welcome to ATMOS\n\n' +
    'Enter your WeatherAI API key to continue.\n' +
    'Get a free key at: https://weather-ai.co\n\n' +
    'Your key starts with "wai_"'
  );
  if (!key) return;
  if (!key.startsWith('wai_')) {
    alert('Invalid key format — keys must start with wai_\nPlease try again.');
    return promptApiKey();
  }
  API_KEY = key.trim();
  localStorage.setItem('atmos_wai_key', API_KEY);
  loadCity('Nairobi');
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
  fetchWeather(city);
}

function clearError() {
  showState('empty');
}


async function geocode(city) {
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encodeURIComponent(city)}&format=json&limit=1&addressdetails=1`;

  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en-US,en' }
  });

  if (!res.ok) throw new Error('Geocoding service unavailable. Try again.');

  const data = await res.json();
  if (!data.length) throw new Error(`City not found: "${city}". Try a different spelling.`);

  const place = data[0];
  const addr  = place.address || {};

  return {
    lat:     parseFloat(place.lat),
    lon:     parseFloat(place.lon),
    city:    addr.city || addr.town || addr.village || addr.county || city,
    country: addr.country || '',
  };
}


// ── MOCK DATA (local development only) ───────
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
      { date: new Date().toISOString().slice(0,10),
        day: { maxtemp_c:26, mintemp_c:16, maxtemp_f:79, mintemp_f:61, daily_chance_of_rain:10, condition:{ text:'Partly Cloudy' } },
        astro: { sunrise:'06:32 AM', sunset:'06:48 PM', moon_phase:'Waxing Gibbous' },
        hour: Array.from({length:24}, (_,i) => ({ time: `2024-01-01 ${String(i).padStart(2,'0')}:00`, temp_c: 16 + Math.round(Math.sin((i-6)*Math.PI/12)*8), temp_f: 61 + Math.round(Math.sin((i-6)*Math.PI/12)*14), chance_of_rain: i > 14 && i < 18 ? 40 : 5 }))
      },
      { date: '', day: { maxtemp_c:27, mintemp_c:17, maxtemp_f:81, mintemp_f:63, daily_chance_of_rain:5,  condition:{ text:'Sunny' } } },
      { date: '', day: { maxtemp_c:21, mintemp_c:15, maxtemp_f:70, mintemp_f:59, daily_chance_of_rain:75, condition:{ text:'Heavy Rain' } } },
      { date: '', day: { maxtemp_c:23, mintemp_c:15, maxtemp_f:73, mintemp_f:59, daily_chance_of_rain:30, condition:{ text:'Cloudy' } } },
      { date: '', day: { maxtemp_c:28, mintemp_c:18, maxtemp_f:82, mintemp_f:64, daily_chance_of_rain:0,  condition:{ text:'Sunny' } } },
      { date: '', day: { maxtemp_c:22, mintemp_c:15, maxtemp_f:72, mintemp_f:59, daily_chance_of_rain:60, condition:{ text:'Drizzle' } } },
      { date: '', day: { maxtemp_c:25, mintemp_c:16, maxtemp_f:77, mintemp_f:61, daily_chance_of_rain:10, condition:{ text:'Partly Cloudy' } } },
    ]
  },
  ai_summary: 'Comfortable conditions across Nairobi today with partly cloudy skies. Temperatures peak around 26°C in the afternoon before easing to a pleasant 16°C overnight. A brief rain window is possible mid-week — keep a light jacket handy. Weekend looks clear and warm.'
};

// ── MAIN FETCH FLOW ──────────────────────────
async function fetchWeather(city) {
  if (!API_KEY) { promptApiKey(); return; }
  showState('loading');

  try {
    // Step 1: Geocode the city name
    const geo = await geocode(city);

    // Step 2: Detect if running locally — use mock data to bypass CORS
    const isLocal = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
    if (isLocal) {
      console.info('ℹ Local mode — using mock data. Real API fires on deployment.');
      await new Promise(r => setTimeout(r, 800)); // simulate loading
      renderAll(MOCK_DATA, geo);
      return;
    }

    // Step 3: Real API call (runs on Netlify / deployed URL)
    const url =
      `${API_BASE}/v1/weather` +
      `?lat=${geo.lat}&lon=${geo.lon}` +
      `&days=7&ai=true&units=${currentUnits}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg  = body.message || body.error || `API error (${res.status})`;
      throw new Error(msg);
    }

    const data = await res.json();
    renderAll(data, geo);

  } catch (err) {
    showError(err.message);
  }
}


function showState(state) {
  document.getElementById('stateEmpty').classList.add('hidden');
  document.getElementById('stateLoading').classList.add('hidden');
  document.getElementById('stateError').classList.add('hidden');
  document.getElementById('results').classList.add('hidden');

  if (state === 'empty')   document.getElementById('stateEmpty').classList.remove('hidden');
  if (state === 'loading') document.getElementById('stateLoading').classList.remove('hidden');
  if (state === 'error')   document.getElementById('stateError').classList.remove('hidden');
  if (state === 'results') document.getElementById('results').classList.remove('hidden');
}

function showError(msg) {
  document.getElementById('errorMsg').textContent = msg;
  showState('error');
}


function renderAll(data, geo) {
  console.log('Weather data received:', data);
  console.log('Geo:', geo);
  showState('results');
  document.getElementById('rCity').textContent    = geo.city.toUpperCase();
  document.getElementById('rCountry').textContent = geo.country;
}