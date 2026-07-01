"""
THERMOS AI — Real-Time Weather & Environmental Data API Module
Fetches live data from Open-Meteo (free, no API key required).
"""

import requests
import time
import math
from datetime import datetime, timedelta

# ──────────────────────────────────────────────────
#  Simple in-memory cache to respect rate limits
# ──────────────────────────────────────────────────
_cache = {}
CACHE_TTL = 600  # 10 minutes


def _cached_get(url, params, cache_key, ttl=CACHE_TTL):
    """GET with simple TTL cache."""
    now = time.time()
    if cache_key in _cache:
        data, ts = _cache[cache_key]
        if now - ts < ttl:
            return data
    try:
        resp = requests.get(url, params=params, timeout=12)
        resp.raise_for_status()
        data = resp.json()
        _cache[cache_key] = (data, now)
        return data
    except Exception as e:
        print(f"[weather_api] Error fetching {url}: {e}")
        # Return stale cache if available
        if cache_key in _cache:
            return _cache[cache_key][0]
        return None


# ──────────────────────────────────────────────────
#  City & Zone Database (research-based coordinates)
# ──────────────────────────────────────────────────
CITIES = {
    "Bengaluru, India": {
        "lat": 12.9716, "lng": 77.5946,
        "zones": {
            "Koramangala":      {"lat": 12.9352, "lng": 77.6245, "uhi_offset": 4.7,  "vegetation": 18, "built_up": 78, "ndvi": 0.18, "population": 324000},
            "Yelahanka":        {"lat": 13.1007, "lng": 77.5963, "uhi_offset": 2.5,  "vegetation": 24, "built_up": 62, "ndvi": 0.25, "population": 141000},
            "Whitefield":       {"lat": 12.9698, "lng": 77.7499, "uhi_offset": 3.8,  "vegetation": 21, "built_up": 70, "ndvi": 0.21, "population": 489000},
            "Peenya":           {"lat": 13.0291, "lng": 77.5188, "uhi_offset": 3.2,  "vegetation": 28, "built_up": 58, "ndvi": 0.28, "population": 282000},
            "Jayanagar":        {"lat": 12.9308, "lng": 77.5838, "uhi_offset": 1.2,  "vegetation": 44, "built_up": 42, "ndvi": 0.52, "population": 84000},
            "Indiranagar":      {"lat": 12.9719, "lng": 77.6412, "uhi_offset": 3.5,  "vegetation": 22, "built_up": 68, "ndvi": 0.22, "population": 195000},
            "Hebbal":           {"lat": 13.0350, "lng": 77.5970, "uhi_offset": 2.0,  "vegetation": 30, "built_up": 55, "ndvi": 0.30, "population": 167000},
            "Electronic City":  {"lat": 12.8399, "lng": 77.6770, "uhi_offset": 3.6,  "vegetation": 20, "built_up": 72, "ndvi": 0.20, "population": 312000},
        }
    },
    "Chennai, India": {
        "lat": 13.0827, "lng": 80.2707,
        "zones": {
            "T. Nagar":         {"lat": 13.0418, "lng": 80.2341, "uhi_offset": 4.2, "vegetation": 15, "built_up": 82, "ndvi": 0.15, "population": 410000},
            "Guindy":           {"lat": 13.0067, "lng": 80.2206, "uhi_offset": 3.5, "vegetation": 22, "built_up": 65, "ndvi": 0.22, "population": 260000},
            "Velachery":        {"lat": 12.9815, "lng": 80.2180, "uhi_offset": 3.8, "vegetation": 18, "built_up": 75, "ndvi": 0.18, "population": 380000},
            "Anna Nagar":       {"lat": 13.0850, "lng": 80.2101, "uhi_offset": 2.8, "vegetation": 28, "built_up": 60, "ndvi": 0.28, "population": 220000},
            "Adyar":            {"lat": 13.0012, "lng": 80.2565, "uhi_offset": 1.5, "vegetation": 38, "built_up": 48, "ndvi": 0.38, "population": 150000},
        }
    },
    "Delhi, India": {
        "lat": 28.6139, "lng": 77.2090,
        "zones": {
            "Connaught Place":  {"lat": 28.6315, "lng": 77.2167, "uhi_offset": 5.2, "vegetation": 12, "built_up": 85, "ndvi": 0.12, "population": 520000},
            "Dwarka":           {"lat": 28.5921, "lng": 77.0460, "uhi_offset": 3.0, "vegetation": 25, "built_up": 62, "ndvi": 0.25, "population": 310000},
            "Rohini":           {"lat": 28.7495, "lng": 77.0640, "uhi_offset": 3.8, "vegetation": 20, "built_up": 70, "ndvi": 0.20, "population": 450000},
            "Lajpat Nagar":     {"lat": 28.5700, "lng": 77.2373, "uhi_offset": 4.5, "vegetation": 14, "built_up": 80, "ndvi": 0.14, "population": 280000},
            "Hauz Khas":        {"lat": 28.5494, "lng": 77.2001, "uhi_offset": 1.8, "vegetation": 40, "built_up": 45, "ndvi": 0.40, "population": 120000},
        }
    },
    "Mumbai, India": {
        "lat": 19.0760, "lng": 72.8777,
        "zones": {
            "Andheri":          {"lat": 19.1136, "lng": 72.8697, "uhi_offset": 3.8, "vegetation": 16, "built_up": 80, "ndvi": 0.16, "population": 680000},
            "Bandra":           {"lat": 19.0596, "lng": 72.8295, "uhi_offset": 2.5, "vegetation": 22, "built_up": 68, "ndvi": 0.22, "population": 420000},
            "Dadar":            {"lat": 19.0178, "lng": 72.8478, "uhi_offset": 4.2, "vegetation": 10, "built_up": 88, "ndvi": 0.10, "population": 520000},
            "Powai":            {"lat": 19.1176, "lng": 72.9060, "uhi_offset": 1.5, "vegetation": 35, "built_up": 50, "ndvi": 0.35, "population": 180000},
            "Borivali":         {"lat": 19.2307, "lng": 72.8567, "uhi_offset": 1.2, "vegetation": 42, "built_up": 45, "ndvi": 0.42, "population": 250000},
        }
    },
    "Hyderabad, India": {
        "lat": 17.3850, "lng": 78.4867,
        "zones": {
            "HITEC City":       {"lat": 17.4435, "lng": 78.3772, "uhi_offset": 4.0, "vegetation": 18, "built_up": 76, "ndvi": 0.18, "population": 350000},
            "Secunderabad":     {"lat": 17.4399, "lng": 78.4983, "uhi_offset": 3.5, "vegetation": 22, "built_up": 70, "ndvi": 0.22, "population": 280000},
            "Gachibowli":       {"lat": 17.4401, "lng": 78.3489, "uhi_offset": 3.2, "vegetation": 25, "built_up": 65, "ndvi": 0.25, "population": 220000},
            "Jubilee Hills":    {"lat": 17.4325, "lng": 78.4072, "uhi_offset": 1.5, "vegetation": 38, "built_up": 48, "ndvi": 0.38, "population": 130000},
            "Kukatpally":       {"lat": 17.4849, "lng": 78.3991, "uhi_offset": 3.8, "vegetation": 16, "built_up": 78, "ndvi": 0.16, "population": 410000},
        }
    },
    "Kolkata, India": {
        "lat": 22.5726, "lng": 88.3639,
        "zones": {
            "Salt Lake":        {"lat": 22.5839, "lng": 88.4193, "uhi_offset": 3.0, "vegetation": 25, "built_up": 62, "ndvi": 0.25, "population": 280000},
            "Park Street":      {"lat": 22.5519, "lng": 88.3523, "uhi_offset": 4.5, "vegetation": 12, "built_up": 85, "ndvi": 0.12, "population": 390000},
            "Howrah":           {"lat": 22.5958, "lng": 88.2636, "uhi_offset": 4.0, "vegetation": 14, "built_up": 80, "ndvi": 0.14, "population": 450000},
            "New Town":         {"lat": 22.5922, "lng": 88.4847, "uhi_offset": 2.0, "vegetation": 32, "built_up": 55, "ndvi": 0.32, "population": 180000},
        }
    },
    "Pune, India": {
        "lat": 18.5204, "lng": 73.8567,
        "zones": {
            "Hinjewadi":        {"lat": 18.5913, "lng": 73.7389, "uhi_offset": 3.5, "vegetation": 20, "built_up": 72, "ndvi": 0.20, "population": 320000},
            "Kothrud":          {"lat": 18.5074, "lng": 73.8077, "uhi_offset": 2.0, "vegetation": 30, "built_up": 58, "ndvi": 0.30, "population": 240000},
            "Viman Nagar":      {"lat": 18.5679, "lng": 73.9143, "uhi_offset": 3.2, "vegetation": 22, "built_up": 68, "ndvi": 0.22, "population": 280000},
            "Shivajinagar":     {"lat": 18.5308, "lng": 73.8475, "uhi_offset": 4.0, "vegetation": 15, "built_up": 80, "ndvi": 0.15, "population": 350000},
        }
    },
    "Ahmedabad, India": {
        "lat": 23.0225, "lng": 72.5714,
        "zones": {
            "SG Highway":       {"lat": 23.0469, "lng": 72.5300, "uhi_offset": 4.2, "vegetation": 14, "built_up": 82, "ndvi": 0.14, "population": 380000},
            "Maninagar":        {"lat": 22.9955, "lng": 72.6031, "uhi_offset": 3.8, "vegetation": 18, "built_up": 76, "ndvi": 0.18, "population": 290000},
            "Vastrapur":        {"lat": 23.0370, "lng": 72.5293, "uhi_offset": 2.5, "vegetation": 28, "built_up": 60, "ndvi": 0.28, "population": 210000},
            "Sabarmati":        {"lat": 23.0676, "lng": 72.5871, "uhi_offset": 1.8, "vegetation": 34, "built_up": 52, "ndvi": 0.34, "population": 180000},
        }
    },
    "Jaipur, India": {
        "lat": 26.9124, "lng": 75.7873,
        "zones": {
            "C-Scheme":         {"lat": 26.9050, "lng": 75.7900, "uhi_offset": 4.0, "vegetation": 16, "built_up": 78, "ndvi": 0.16, "population": 320000},
            "Mansarovar":       {"lat": 26.8623, "lng": 75.7593, "uhi_offset": 3.2, "vegetation": 22, "built_up": 68, "ndvi": 0.22, "population": 450000},
            "Malviya Nagar":    {"lat": 26.8546, "lng": 75.8062, "uhi_offset": 2.8, "vegetation": 26, "built_up": 62, "ndvi": 0.26, "population": 280000},
            "Vaishali Nagar":   {"lat": 26.9120, "lng": 75.7260, "uhi_offset": 3.5, "vegetation": 18, "built_up": 74, "ndvi": 0.18, "population": 350000},
        }
    },
    "Lucknow, India": {
        "lat": 26.8467, "lng": 80.9462,
        "zones": {
            "Hazratganj":       {"lat": 26.8508, "lng": 80.9494, "uhi_offset": 4.2, "vegetation": 14, "built_up": 82, "ndvi": 0.14, "population": 340000},
            "Gomti Nagar":      {"lat": 26.8563, "lng": 81.0054, "uhi_offset": 3.0, "vegetation": 24, "built_up": 64, "ndvi": 0.24, "population": 280000},
            "Aliganj":          {"lat": 26.8883, "lng": 80.9431, "uhi_offset": 2.5, "vegetation": 28, "built_up": 58, "ndvi": 0.28, "population": 220000},
            "Indira Nagar":     {"lat": 26.8747, "lng": 80.9990, "uhi_offset": 3.5, "vegetation": 18, "built_up": 74, "ndvi": 0.18, "population": 310000},
        }
    },
}


# ──────────────────────────────────────────────────
#  Open-Meteo API Calls
# ──────────────────────────────────────────────────

def get_current_weather(lat, lng):
    """Fetch current weather conditions from Open-Meteo."""
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lng,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,uv_index,surface_pressure,cloud_cover",
        "timezone": "auto"
    }
    key = f"current_{lat}_{lng}"
    data = _cached_get(url, params, key)
    if data and "current" in data:
        c = data["current"]
        return {
            "temperature": c.get("temperature_2m"),
            "apparent_temperature": c.get("apparent_temperature"),
            "humidity": c.get("relative_humidity_2m"),
            "wind_speed": c.get("wind_speed_10m"),
            "wind_direction": c.get("wind_direction_10m"),
            "uv_index": c.get("uv_index"),
            "pressure": c.get("surface_pressure"),
            "cloud_cover": c.get("cloud_cover"),
            "units": data.get("current_units", {}),
            "timezone": data.get("timezone", ""),
            "time": c.get("time", "")
        }
    return None


def get_daily_forecast(lat, lng, days=7):
    """Fetch daily forecast (min/max/mean temp) for upcoming days."""
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lng,
        "daily": "temperature_2m_max,temperature_2m_min,temperature_2m_mean,apparent_temperature_max,uv_index_max,precipitation_sum,wind_speed_10m_max",
        "timezone": "auto",
        "forecast_days": days
    }
    key = f"daily_{lat}_{lng}_{days}"
    data = _cached_get(url, params, key)
    if data and "daily" in data:
        d = data["daily"]
        days_list = []
        for i in range(len(d.get("time", []))):
            days_list.append({
                "date": d["time"][i],
                "temp_max": d["temperature_2m_max"][i],
                "temp_min": d["temperature_2m_min"][i],
                "temp_mean": d.get("temperature_2m_mean", [None])[i] if i < len(d.get("temperature_2m_mean", [])) else None,
                "apparent_max": d.get("apparent_temperature_max", [None])[i] if i < len(d.get("apparent_temperature_max", [])) else None,
                "uv_max": d.get("uv_index_max", [None])[i] if i < len(d.get("uv_index_max", [])) else None,
                "precipitation": d.get("precipitation_sum", [None])[i] if i < len(d.get("precipitation_sum", [])) else None,
                "wind_max": d.get("wind_speed_10m_max", [None])[i] if i < len(d.get("wind_speed_10m_max", [])) else None,
            })
        return days_list
    return []


def get_historical_monthly(lat, lng):
    """
    Fetch last 12 months of monthly average temperatures.
    Uses Open-Meteo Historical Weather API.
    """
    url = "https://archive-api.open-meteo.com/v1/archive"
    end_date = datetime.now()
    start_date = end_date - timedelta(days=365)

    params = {
        "latitude": lat,
        "longitude": lng,
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d"),
        "daily": "temperature_2m_max,temperature_2m_min,temperature_2m_mean",
        "timezone": "auto"
    }
    key = f"hist_{lat}_{lng}_{start_date.strftime('%Y%m')}"
    data = _cached_get(url, params, key, ttl=3600)  # Cache 1 hour

    if data and "daily" in data:
        d = data["daily"]
        # Group by month and average
        monthly = {}
        for i, date_str in enumerate(d.get("time", [])):
            month_key = date_str[:7]  # YYYY-MM
            mean = d.get("temperature_2m_mean", [])
            t_max = d.get("temperature_2m_max", [])
            t_min = d.get("temperature_2m_min", [])

            temp = None
            if i < len(mean) and mean[i] is not None:
                temp = mean[i]
            elif i < len(t_max) and i < len(t_min) and t_max[i] is not None and t_min[i] is not None:
                temp = (t_max[i] + t_min[i]) / 2

            if temp is not None:
                if month_key not in monthly:
                    monthly[month_key] = []
                monthly[month_key].append(temp)

        # Compute averages
        result = []
        month_names = []
        for month_key in sorted(monthly.keys()):
            avg = sum(monthly[month_key]) / len(monthly[month_key])
            result.append(round(avg, 1))
            # Parse month name
            dt = datetime.strptime(month_key, "%Y-%m")
            month_names.append(dt.strftime("%b"))

        return {"temperatures": result, "labels": month_names}

    return None


def get_air_quality(lat, lng):
    """Fetch current air quality data from Open-Meteo."""
    url = "https://air-quality-api.open-meteo.com/v1/air-quality"
    params = {
        "latitude": lat,
        "longitude": lng,
        "current": "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,european_aqi,us_aqi",
        "timezone": "auto"
    }
    key = f"aqi_{lat}_{lng}"
    data = _cached_get(url, params, key)
    if data and "current" in data:
        c = data["current"]
        return {
            "pm2_5": c.get("pm2_5"),
            "pm10": c.get("pm10"),
            "co": c.get("carbon_monoxide"),
            "no2": c.get("nitrogen_dioxide"),
            "so2": c.get("sulphur_dioxide"),
            "ozone": c.get("ozone"),
            "european_aqi": c.get("european_aqi"),
            "us_aqi": c.get("us_aqi"),
            "time": c.get("time", "")
        }
    return None


# ──────────────────────────────────────────────────
#  Computed UHI & Risk Analysis
# ──────────────────────────────────────────────────

def compute_zone_temperatures(city_name, weather):
    """
    Compute estimated land surface temperatures for each zone
    using real ambient temperature + UHI offsets.
    """
    city = CITIES.get(city_name)
    if not city or not weather:
        return []

    base_temp = weather.get("temperature", 30)
    zones = city["zones"]
    results = []

    for zone_name, z in zones.items():
        # Land surface temp is typically higher than air temp
        # UHI offset represents the additional heating from urbanization
        lst = base_temp + z["uhi_offset"]

        # Severity classification
        if lst >= 50:
            severity = "Critical"
        elif lst >= 45:
            severity = "Very High"
        elif lst >= 40:
            severity = "High"
        elif lst >= 35:
            severity = "Moderate"
        else:
            severity = "Low"

        results.append({
            "zone": zone_name,
            "lat": z["lat"],
            "lng": z["lng"],
            "temp": round(lst, 1),
            "severity": severity,
            "vegetation": z["vegetation"],
            "built_up": z["built_up"],
            "ndvi": z["ndvi"],
            "population": z["population"],
            "uhi_offset": z["uhi_offset"]
        })

    # Sort by temp descending
    results.sort(key=lambda x: x["temp"], reverse=True)
    return results


def compute_heat_contributors(zone_data):
    """
    Compute heat contributor percentages based on zone characteristics.
    """
    veg = zone_data.get("vegetation", 20)
    built = zone_data.get("built_up", 60)
    ndvi = zone_data.get("ndvi", 0.2)

    # Low vegetation contribution (inverse of vegetation cover)
    low_veg = max(5, min(55, int((100 - veg) * 0.52)))
    # Built-up density contribution
    built_contrib = max(5, min(40, int(built * 0.38)))
    # Surface material (correlated with built-up but separate)
    surface = max(5, min(30, int((100 - ndvi * 100) * 0.22)))
    # Atmospheric (relatively constant)
    atmospheric = max(5, min(15, 12 - int(veg * 0.1)))
    # Others fill the gap
    total = low_veg + built_contrib + surface + atmospheric
    others = max(2, 100 - total)

    # Normalize to 100
    raw = [low_veg, built_contrib, surface, atmospheric, others]
    total = sum(raw)
    normalized = [round(v * 100 / total) for v in raw]
    # Fix rounding to exactly 100
    diff = 100 - sum(normalized)
    normalized[0] += diff

    return {
        "low_vegetation": normalized[0],
        "built_up_density": normalized[1],
        "surface_material": normalized[2],
        "atmospheric": normalized[3],
        "others": normalized[4]
    }


def compute_risk_level(zone_data, current_temp):
    """Compute overall heat risk as a percentage."""
    veg = zone_data.get("vegetation", 20)
    built = zone_data.get("built_up", 60)
    uhi = zone_data.get("uhi_offset", 3.0)

    # Risk factors
    temp_factor = min(1.0, max(0, (current_temp - 25) / 25))  # Normalized 25-50°C
    veg_factor = 1.0 - (veg / 100)  # Less vegetation = more risk
    built_factor = built / 100  # More built-up = more risk
    uhi_factor = min(1.0, uhi / 6.0)  # Normalized 0-6°C UHI

    risk = (temp_factor * 0.35 + veg_factor * 0.25 + built_factor * 0.25 + uhi_factor * 0.15) * 100
    return min(99, max(5, round(risk)))


def generate_ai_insight(zone_name, zone_data, current_temp):
    """Generate contextual AI insight text based on zone characteristics."""
    veg = zone_data.get("vegetation", 20)
    built = zone_data.get("built_up", 60)
    ndvi = zone_data.get("ndvi", 0.2)

    if veg < 20 and built > 75:
        return f"{zone_name} exhibits critically low vegetation cover ({veg}%) combined with very high built-up density ({built}%). Immediate intervention with green canopy expansion and cool roof coatings could reduce temperatures by 2-4°C."
    elif veg < 25:
        return f"Low vegetation coverage ({veg}%) in {zone_name} is a primary heat driver. Increasing tree cover by 15-20% could reduce surface temperatures by approximately 2.5°C."
    elif built > 70:
        return f"High built-up density ({built}%) with urban materials absorbing solar radiation is the dominant factor in {zone_name}. Cool roof implementation is recommended for maximum impact."
    elif ndvi > 0.35:
        return f"{zone_name} benefits from relatively good vegetation cover (NDVI: {ndvi}). Preserving existing green spaces and mature trees is critical to maintaining this thermal advantage."
    else:
        return f"Moderate heat stress detected in {zone_name}. A balanced approach combining green corridors and surface albedo improvements would yield optimal cooling results."


def get_city_list():
    """Return list of supported cities with coordinates."""
    return [
        {"name": name, "lat": data["lat"], "lng": data["lng"], "zone_count": len(data["zones"])}
        for name, data in CITIES.items()
    ]
