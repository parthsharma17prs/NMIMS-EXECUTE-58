"""
solar_simulator.py  (backend/solar_energy_analysis/)
─────────────────────────────────────────────────────
Modular service that calculates real-time simulated solar energy production
based on live weather data fetched for dynamic GPS coordinates.

Usage:
    from backend.solar_energy_analysis import get_dynamic_solar_kw, fetch_full_weather
    power_kw = get_dynamic_solar_kw(lat=22.9252, lon=75.8655)
    weather  = fetch_full_weather(lat=22.9252, lon=75.8655)

All functions are decoupled from Flask — import freely into any route/module.
"""

import requests
from datetime import datetime, timezone
import math

# ─── Static Constants (Standard Commercial Rooftop Array) ────────────────────
P_CAPACITY   = 100     # System size in kW
PR           = 0.75    # Performance ratio (accounts for inverter/wiring losses)
GAMMA        = 0.004   # Temperature coefficient (%/°C) for crystalline-Si
CLEAR_SKY_GHI = 1000   # Maximum Global Horizontal Irradiance in W/m²

# Free weather API — no key required
_OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

# WMO Weather interpretation codes → human descriptions
_WMO_CODES = {
    0: "Clear Sky", 1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast",
    45: "Foggy", 48: "Depositing Rime Fog",
    51: "Light Drizzle", 53: "Moderate Drizzle", 55: "Heavy Drizzle",
    61: "Light Rain", 63: "Moderate Rain", 65: "Heavy Rain",
    66: "Light Freezing Rain", 67: "Heavy Freezing Rain",
    71: "Light Snowfall", 73: "Moderate Snowfall", 75: "Heavy Snowfall",
    77: "Snow Grains", 80: "Light Rain Showers", 81: "Moderate Rain Showers",
    82: "Heavy Rain Showers", 85: "Light Snow Showers", 86: "Heavy Snow Showers",
    95: "Thunderstorm", 96: "Thunderstorm + Light Hail", 99: "Thunderstorm + Heavy Hail",
}


def _wind_direction_label(degrees):
    """Convert wind direction degrees to compass label."""
    if degrees is None:
        return "—"
    dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
            "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    idx = round(degrees / 22.5) % 16
    return dirs[idx]


# ─── 1. Fetch Full Weather (rich report) ─────────────────────────────────────
def fetch_full_weather(lat: float, lon: float) -> dict:
    """
    Retrieve comprehensive current weather for the given coordinates
    using the free Open-Meteo API. Returns temperature, humidity, wind,
    pressure, cloud cover, weather description, UV index, sunrise/sunset, etc.
    """
    params = {
        "latitude":  lat,
        "longitude": lon,
        "current_weather": "true",
        "hourly": "cloudcover,relativehumidity_2m,visibility,surface_pressure,"
                  "uv_index,apparent_temperature,windspeed_10m,winddirection_10m",
        "daily": "sunrise,sunset,uv_index_max",
        "forecast_days": 1,
        "timezone": "auto",
    }

    resp = requests.get(_OPEN_METEO_URL, params=params, timeout=10)
    resp.raise_for_status()
    data = resp.json()

    cw = data["current_weather"]
    # Hourly arrays are in the API's local timezone (timezone: "auto"),
    # so derive the local hour from the API's own timestamp.
    try:
        api_time = cw.get("time", "")          # e.g. "2026-03-01T12:00"
        hour_now = int(api_time.split("T")[1].split(":")[0])
    except (IndexError, ValueError):
        hour_now = datetime.now(timezone.utc).hour   # fallback
    hourly = data.get("hourly", {})
    daily = data.get("daily", {})

    def _h(key, fallback=0):
        """Pick current hour from hourly array."""
        arr = hourly.get(key, [])
        return arr[hour_now] if hour_now < len(arr) else fallback

    # Weather description from WMO code
    weather_code = cw.get("weathercode", 0)
    description = _WMO_CODES.get(weather_code, f"Code {weather_code}")

    # Sunrise / Sunset
    sunrise = (daily.get("sunrise") or [""])[0]   # "2026-03-01T06:32"
    sunset  = (daily.get("sunset") or [""])[0]

    return {
        "temperature_c":     float(cw["temperature"]),
        "feels_like_c":      float(_h("apparent_temperature", cw["temperature"])),
        "cloud_cover_pct":   float(_h("cloudcover", 50)),
        "humidity_pct":      float(_h("relativehumidity_2m", 50)),
        "wind_speed_kmh":    float(cw.get("windspeed", 0)),
        "wind_direction_deg": float(cw.get("winddirection", 0)),
        "wind_direction":    _wind_direction_label(cw.get("winddirection")),
        "pressure_hpa":      float(_h("surface_pressure", 1013)),
        "visibility_m":      float(_h("visibility", 10000)),
        "uv_index":          float(_h("uv_index", 0)),
        "uv_index_max":      float((daily.get("uv_index_max") or [0])[0]),
        "weather_code":      weather_code,
        "description":       description,
        "sunrise":           sunrise,
        "sunset":            sunset,
    }


# ─── 1b. Lightweight weather fetch (backward-compatible) ─────────────────────
def fetch_live_weather(lat: float, lon: float, api_key: str = None) -> dict:
    """Lightweight: just temperature and cloud cover."""
    full = fetch_full_weather(lat, lon)
    return {
        "temperature_c":  full["temperature_c"],
        "cloud_cover_pct": full["cloud_cover_pct"],
    }


# ─── 2. Estimate Irradiance ─────────────────────────────────────────────────
def estimate_irradiance(cloud_cover: float, time_of_day: int) -> float:
    """
    Estimate effective solar irradiance (W/m²) from cloud cover and hour.

    Parameters
    ----------
    cloud_cover  : float – Cloud cover percentage [0-100].
    time_of_day  : int   – Current hour in 24-h format (0-23, local solar time).

    Returns
    -------
    float – Effective irradiance in W/m².

    Logic
    -----
    • Nighttime (before 06:00 or after 18:00): returns 0.
    • Daytime:  GHI = CLEAR_SKY_GHI × (1 - cloud_cover/100)
      A simple linear de-rating; sufficient for dashboard-grade simulation.
    """
    # Night check — panels produce nothing outside daylight window
    if time_of_day < 6 or time_of_day >= 18:
        return 0.0

    # Clamp cloud cover to [0, 100]
    cloud_cover = max(0.0, min(cloud_cover, 100.0))

    # Linear reduction from clear-sky maximum
    irradiance = CLEAR_SKY_GHI * (1.0 - cloud_cover / 100.0)
    return round(irradiance, 2)


# ─── 3. Photovoltaic Yield Calculation ───────────────────────────────────────
def calculate_solar_yield(temp_ambient: float, irradiance: float) -> float:
    """
    Compute instantaneous AC power output using the standard PV yield formula:

        E = P_capacity × (G / 1000) × PR × [1 - γ × (T_cell - 25)]

    Parameters
    ----------
    temp_ambient : float – Ambient temperature in °C.
    irradiance   : float – Effective irradiance in W/m².

    Returns
    -------
    float – Energy output in kW (can be 0 when irradiance is 0).
    """
    if irradiance <= 0:
        return 0.0

    # Panel surface runs ~5 °C above ambient (NOCT approximation)
    t_cell = temp_ambient + 5.0

    # Standard single-diode power de-rating
    temp_factor = 1.0 - GAMMA * (t_cell - 25.0)

    energy_kw = P_CAPACITY * (irradiance / 1000.0) * PR * temp_factor
    return round(max(energy_kw, 0.0), 2)      # clamp to non-negative


# ─── 4. Orchestrator / Public Entry-Point ────────────────────────────────────
def get_dynamic_solar_kw(lat: float, lon: float) -> float:
    """
    End-to-end wrapper: fetch weather → estimate irradiance → compute yield.

    Parameters
    ----------
    lat : float – Latitude  of the campus / installation.
    lon : float – Longitude of the campus / installation.

    Returns
    -------
    float – Instantaneous solar power in kW, rounded to 2 decimal places.
            Returns 0.0 gracefully if any upstream call fails.
    """
    try:
        weather     = fetch_live_weather(lat, lon)
        temp_c      = weather["temperature_c"]
        cloud_pct   = weather["cloud_cover_pct"]

        local_hour  = datetime.now().hour          # local system hour
        irradiance  = estimate_irradiance(cloud_pct, local_hour)
        power_kw    = calculate_solar_yield(temp_c, irradiance)

        return round(power_kw, 2)

    except Exception as exc:
        # Graceful degradation — dashboard keeps running even if API is down
        print(f"[solar_simulator] WARNING: {exc!r} — returning 0 kW")
        return 0.0


# ─── Quick self-test ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    # NMIMS Indore campus coordinates
    LAT, LON = 22.9252, 75.8655
    kw = get_dynamic_solar_kw(LAT, LON)
    print(f"☀  Live solar estimate for NMIMS Indore ({LAT}, {LON}): {kw} kW")
