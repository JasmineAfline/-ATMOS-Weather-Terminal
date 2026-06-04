# ATMOS — Weather Intelligence Dashboard

A clean, professional weather dashboard built on the [WeatherAI API](https://weather-ai.co).

**Live Demo → [atmos-weather.netlify.app](https://atmos-weather-terminal.netlify.app/)**

---

## Features

- **Real-time weather** — temperature, humidity, wind, UV index, pressure, visibility
- **7-day forecast** — daily high/low with weather icons and rain probability
- **Hourly chart** — SVG temperature curve for the next 24 hours
- **AI summary** — Gemini-powered weather analysis with typewriter animation
- **Smart recommendations** — personalized weather suggestions such as *"Carry an umbrella today"*
- **GPS location detection** — instantly fetch weather for the user's current location
- **Recent searches** — stores and displays the last 5 searched cities
- **Dynamic backgrounds** — UI adapts based on current weather conditions
- **Ambient glow effects** — hero card colors shift to match weather states
- **Light/Dark mode** — user-selectable theme preference
- **Skeleton loading screens** — smooth loading experience while fetching data
- **Unit toggle** — switch between °C and °F instantly
- **7 quick-access cities** — one-click load for popular cities
- **Smooth animations and transitions**
- **Fully responsive** — works on mobile, tablet, and desktop

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Weather Data | WeatherAI REST API |
| AI Insights | Gemini API |
| Geocoding | OpenStreetMap Nominatim (free, no key) |
| Storage | Browser Local Storage |
| Fonts | Outfit + DM Sans (Google Fonts) |
| Hosting | Netlify |

---

## API Integration

This project integrates with the WeatherAI API to retrieve:

- Current weather conditions
- Hourly weather data
- Multi-day forecasts
- Weather intelligence insights

The application transforms raw weather data into a user-friendly dashboard experience with visualizations, AI-generated summaries, and actionable recommendations.

---

## Running Locally

```bash
git clone <https://github.com/JasmineAfline/-ATMOS-Weather-Terminal>
cd atmos
```

Open `index.html` in your browser or run using a local development server.

---

## Author

Afline Jasmine

GitHub: https://github.com/JasmineAfline
