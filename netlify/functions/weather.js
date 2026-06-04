exports.handler = async function (event) {
  const params  = event.queryStringParameters || {};
  const { lat, lon, days, units, ai, lang } = params;

  const apiKey = process.env.WAI_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key not configured on server.' }),
    };
  }

  if (!lat || !lon) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'lat and lon are required.' }),
    };
  }

  const url = new URL('https://api.weather-ai.co/v1/weather');
  url.searchParams.set('lat',   lat);
  url.searchParams.set('lon',   lon);
  url.searchParams.set('days',  days  || '7');
  url.searchParams.set('units', units || 'metric');
  url.searchParams.set('ai',    ai    || 'true');
  if (lang) url.searchParams.set('lang', lang);

  try {
    const res  = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await res.json();

    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Failed to reach WeatherAI API.', detail: err.message }),
    };
  }
};