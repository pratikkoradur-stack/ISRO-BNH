from flask import Flask, render_template, jsonify, request
from datetime import datetime
import json
import os

from weather_api import (
    get_current_weather,
    get_daily_forecast,
    get_historical_monthly,
    get_air_quality,
    compute_zone_temperatures,
    compute_heat_contributors,
    compute_risk_level,
    generate_ai_insight,
    get_city_list,
    CITIES,
)

app = Flask(__name__)

# Load zone metadata (kept as fallback / supplementary)
DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'sample_data.json')
with open(DATA_PATH, 'r', encoding='utf-8') as f:
    STATIC_DATA = json.load(f)

DEFAULT_CITY = 'Bengaluru, India'


def _get_city(req):
    """Extract city from request, defaulting to Bengaluru."""
    city = req.args.get('city', DEFAULT_CITY)
    if city not in CITIES:
        city = DEFAULT_CITY
    return city


# ──────────────── Page Routes ────────────────

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/heatmap')
def heatmap():
    return render_template('heatmap.html')

@app.route('/analytics')
def analytics():
    return render_template('analytics.html')

@app.route('/simulator')
def simulator():
    return render_template('simulator.html')

@app.route('/recommendations')
def recommendations():
    return render_template('recommendations.html')

@app.route('/about')
def about():
    return render_template('about.html')


# ──────────────── API Routes — Real Data ────────────────

@app.route('/api/cities')
def api_cities():
    """Return list of supported cities."""
    return jsonify({"cities": get_city_list()})


@app.route('/api/weather/current')
def api_weather_current():
    """Fetch real-time weather for a city."""
    city = _get_city(request)
    city_data = CITIES[city]
    weather = get_current_weather(city_data["lat"], city_data["lng"])
    if weather:
        return jsonify({
            "city": city,
            "weather": weather,
            "timestamp": datetime.now().isoformat()
        })
    return jsonify({"error": "Unable to fetch weather data", "city": city}), 503


@app.route('/api/weather/forecast')
def api_weather_forecast():
    """Fetch 7-day forecast for a city."""
    city = _get_city(request)
    city_data = CITIES[city]
    days = int(request.args.get('days', 7))
    forecast = get_daily_forecast(city_data["lat"], city_data["lng"], days)
    return jsonify({
        "city": city,
        "forecast": forecast,
        "timestamp": datetime.now().isoformat()
    })


@app.route('/api/weather/history')
def api_weather_history():
    """Fetch 12-month historical temperature data."""
    city = _get_city(request)
    city_data = CITIES[city]
    history = get_historical_monthly(city_data["lat"], city_data["lng"])
    if history:
        return jsonify({
            "city": city,
            "history": history,
            "timestamp": datetime.now().isoformat()
        })
    return jsonify({"error": "Unable to fetch historical data", "city": city}), 503


@app.route('/api/air-quality')
def api_air_quality():
    """Fetch real-time air quality data."""
    city = _get_city(request)
    city_data = CITIES[city]
    aq = get_air_quality(city_data["lat"], city_data["lng"])
    if aq:
        return jsonify({
            "city": city,
            "air_quality": aq,
            "timestamp": datetime.now().isoformat()
        })
    return jsonify({"error": "Unable to fetch air quality data", "city": city}), 503


@app.route('/api/dashboard-data')
def api_dashboard():
    """
    Dashboard overview — combines real weather with zone analysis.
    """
    city = _get_city(request)
    city_data = CITIES[city]

    # Fetch real weather
    weather = get_current_weather(city_data["lat"], city_data["lng"])
    # Fetch real 12-month history
    history = get_historical_monthly(city_data["lat"], city_data["lng"])
    # Fetch 7-day forecast
    forecast = get_daily_forecast(city_data["lat"], city_data["lng"])
    # Fetch air quality
    aq = get_air_quality(city_data["lat"], city_data["lng"])

    # Compute zone hotspots with real temperatures
    hotspots = compute_zone_temperatures(city, weather)

    # Compute overview stats
    if weather and hotspots:
        base_temp = weather["temperature"]
        max_hotspot = max(z["temp"] for z in hotspots) if hotspots else base_temp + 5
        risk_zones = sum(1 for z in hotspots if z["severity"] in ("High", "Very High", "Critical"))
        total_pop = sum(z["population"] for z in hotspots)

        overview = {
            "avg_land_temp": round(base_temp + 2.5, 1),  # LST offset from air temp
            "max_hotspot": round(max_hotspot, 1),
            "risk_zones": risk_zones,
            "population_at_risk": total_pop,
            "current_air_temp": base_temp,
            "humidity": weather.get("humidity"),
            "wind_speed": weather.get("wind_speed"),
            "uv_index": weather.get("uv_index"),
            "cloud_cover": weather.get("cloud_cover"),
            "apparent_temp": weather.get("apparent_temperature"),
        }
    else:
        overview = STATIC_DATA["overview"]

    # Build 12-month trend data
    if history:
        trend_data = history["temperatures"]
        trend_labels = history["labels"]
    else:
        trend_data = STATIC_DATA.get("zones", {}).get("Koramangala", {}).get("temp_trend", [])
        trend_labels = STATIC_DATA.get("timeline", [])

    # Build forecast risk data
    forecast_risk = []
    if forecast:
        for day in forecast:
            if day["temp_max"] is not None:
                forecast_risk.append(round(day["temp_max"], 1))

    return jsonify({
        "overview": overview,
        "hotspot_alerts": hotspots[:8],
        "city": city,
        "date": datetime.now().strftime("%B %d, %Y"),
        "time": datetime.now().strftime("%I:%M %p"),
        "trend_data": trend_data,
        "trend_labels": trend_labels,
        "forecast": forecast_risk,
        "air_quality": aq,
        "is_live": weather is not None
    })


@app.route('/api/heatmap-data')
def api_heatmap():
    """
    Heatmap — zone hotspots with real temperatures.
    """
    city = _get_city(request)
    city_data = CITIES[city]

    weather = get_current_weather(city_data["lat"], city_data["lng"])
    hotspots = compute_zone_temperatures(city, weather)

    # Generate heat points (more spread for realistic heatmap)
    heat_points = []
    for z in hotspots:
        intensity = min(1.0, max(0.3, (z["temp"] - 30) / 25))
        heat_points.append({"lat": z["lat"], "lng": z["lng"], "intensity": round(intensity, 2)})
        # Add surrounding points
        for dx, dy in [(0.005, 0.005), (-0.005, 0.005), (0.005, -0.005), (-0.003, -0.003)]:
            heat_points.append({
                "lat": round(z["lat"] + dx, 4),
                "lng": round(z["lng"] + dy, 4),
                "intensity": round(intensity * 0.85, 2)
            })

    # Compute overall stats
    avg_temp = round(sum(z["temp"] for z in hotspots) / len(hotspots), 1) if hotspots else 0
    risk_count = sum(1 for z in hotspots if z["severity"] in ("High", "Very High", "Critical"))
    total_pop = sum(z["population"] for z in hotspots)

    return jsonify({
        "heat_points": heat_points,
        "hotspot_alerts": hotspots,
        "center": {"lat": city_data["lat"], "lng": city_data["lng"]},
        "city": city,
        "date": datetime.now().strftime("%B %d, %Y"),
        "stats": {
            "avg_temp": avg_temp,
            "risk_zones": risk_count,
            "total_zones": len(hotspots),
            "population_at_risk": total_pop,
            "area_sqkm": len(hotspots) * 8  # Approximate
        },
        "is_live": weather is not None
    })


@app.route('/api/analytics/<zone>')
def api_analytics(zone):
    """
    Zone-level analytics — real data + computed insights.
    """
    city = _get_city(request)
    city_data = CITIES.get(city, CITIES[DEFAULT_CITY])
    zones = city_data["zones"]

    # Find the zone (case-insensitive match)
    zone_data = None
    zone_name = zone
    for name, data in zones.items():
        if name.lower() == zone.lower():
            zone_data = data
            zone_name = name
            break
    if not zone_data:
        # Fall back to first zone
        zone_name = list(zones.keys())[0]
        zone_data = zones[zone_name]

    # Fetch real weather for zone's location
    weather = get_current_weather(zone_data["lat"], zone_data["lng"])
    # Fetch 12-month history
    history = get_historical_monthly(zone_data["lat"], zone_data["lng"])

    # Compute zone temperature
    current_temp = (weather["temperature"] if weather else 32) + zone_data["uhi_offset"]

    # Compute heat contributors
    contributors = compute_heat_contributors(zone_data)

    # Compute risk
    risk = compute_risk_level(zone_data, current_temp)

    # Generate AI insight
    insight = generate_ai_insight(zone_name, zone_data, current_temp)

    # Green deficit vs city average
    city_avg_veg = round(sum(z["vegetation"] for z in zones.values()) / len(zones))
    city_avg_built = round(sum(z["built_up"] for z in zones.values()) / len(zones))
    green_deficit = zone_data["vegetation"] - city_avg_veg

    # Historical trend data
    if history:
        temp_trend = history["temperatures"]
        timeline = history["labels"]
    else:
        temp_trend = [current_temp - 4 + i * 0.5 for i in range(12)]
        timeline = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    # Predicted future risk (next 12 months)
    predicted = [round(current_temp + i * 0.15 + (1 if i > 6 else 0), 1) for i in range(12)]

    # YoY trend (difference between first and latest month)
    yoy_trend = round(temp_trend[-1] - temp_trend[0], 1) if len(temp_trend) >= 2 else 0

    return jsonify({
        "zone": zone_name,
        "city": city,
        "data": {
            "heat_contributors": contributors,
            "vegetation_cover": zone_data["vegetation"],
            "city_avg_vegetation": city_avg_veg,
            "built_up_density": zone_data["built_up"],
            "city_avg_density": city_avg_built,
            "ndvi": zone_data["ndvi"],
            "heat_impact": "Critical" if risk > 75 else "High" if risk > 55 else "Moderate" if risk > 35 else "Low",
            "ai_insight": insight,
            "temp_trend": temp_trend,
            "current_temp": round(current_temp, 1),
            "population": zone_data["population"],
            "heat_risk": risk,
            "green_deficit": green_deficit,
            "yoy_trend": yoy_trend,
            "confidence": min(95, max(75, 90 - abs(green_deficit))),
        },
        "timeline": timeline,
        "predicted": predicted,
        "date": datetime.now().strftime("%B %d, %Y"),
        "is_live": weather is not None
    })


@app.route('/api/simulate', methods=['POST'])
def api_simulate():
    """
    Simulation engine — uses real base temperature.
    """
    body = request.get_json() or {}
    city = body.get('city', DEFAULT_CITY)

    tree_cover = float(body.get('tree_cover', 0))
    cool_roofs = float(body.get('cool_roofs', 0))
    water_bodies = float(body.get('water_bodies', 0))
    green_corridors = float(body.get('green_corridors', 0))

    # Fetch real current weather for base temperature
    city_data = CITIES.get(city, CITIES[DEFAULT_CITY])
    weather = get_current_weather(city_data["lat"], city_data["lng"])

    if weather:
        base_avg_temp = weather["temperature"] + 2.5  # LST offset
    else:
        base_avg_temp = STATIC_DATA['simulation_base']['avg_temp']

    # Compute hotspot count
    hotspot_count = len(city_data["zones"])

    # Fetch 12-month history for baseline chart
    history = get_historical_monthly(city_data["lat"], city_data["lng"])

    # Simplified impact model
    temp_reduction = (
        tree_cover * 0.056 +
        cool_roofs * 0.042 +
        water_bodies * 0.053 +
        green_corridors * 0.048
    )
    max_reduction = temp_reduction * 1.56
    hotspot_reduction_pct = min(
        (tree_cover * 1.26 + cool_roofs * 0.92 + water_bodies * 1.0 + green_corridors * 0.85),
        95
    )
    area_improved = (
        tree_cover * 0.32 + cool_roofs * 0.25 +
        water_bodies * 0.40 + green_corridors * 0.35
    )

    result = {
        'avg_temp_after': round(base_avg_temp - temp_reduction, 1),
        'avg_temp_before': round(base_avg_temp, 1),
        'avg_temp_reduction': round(temp_reduction, 1),
        'max_reduction': round(max_reduction, 1),
        'hotspot_reduction_pct': round(hotspot_reduction_pct, 0),
        'area_improved': round(area_improved, 1),
        'hotspots_after': max(0, int(hotspot_count - hotspot_reduction_pct * hotspot_count / 100)),
        'is_live': weather is not None,
    }

    # Include real historical baseline for chart
    if history:
        result['baseline_trend'] = history['temperatures']
        result['baseline_labels'] = history['labels']

    return jsonify(result)


@app.route('/api/recommendations')
def api_recommendations():
    """
    Recommendations — strategies with real temperature context.
    """
    city = _get_city(request)
    city_data = CITIES.get(city, CITIES[DEFAULT_CITY])

    weather = get_current_weather(city_data["lat"], city_data["lng"])
    history = get_historical_monthly(city_data["lat"], city_data["lng"])

    if weather:
        current_temp = weather["temperature"] + 2.5
    else:
        current_temp = 42.6

    # Dynamic strategies based on real temperature
    strategies = [
        {
            "name": "Increase Tree Cover", "icon": "🌳",
            "temp_reduction": -2.8, "energy_savings": "18.7%",
            "cost_crore": 48, "benefit_ratio": 3.2,
            "population": 1900000
        },
        {
            "name": "Cool Roof Implementation", "icon": "🏠",
            "temp_reduction": -2.1, "energy_savings": "14.2%",
            "cost_crore": 32, "benefit_ratio": 2.8,
            "population": 1400000
        },
        {
            "name": "Green Corridors", "icon": "🌿",
            "temp_reduction": -1.9, "energy_savings": "11.5%",
            "cost_crore": 25, "benefit_ratio": 2.4,
            "population": 1100000
        },
        {
            "name": "Water Bodies Restoration", "icon": "💧",
            "temp_reduction": -1.6, "energy_savings": "9.8%",
            "cost_crore": 20, "benefit_ratio": 2.1,
            "population": 900000
        },
        {
            "name": "Hybrid Green + Cool Roof", "icon": "🏙️",
            "temp_reduction": -6.5, "energy_savings": "32.4%",
            "cost_crore": 75, "benefit_ratio": 4.1,
            "population": 3200000, "recommended": True
        },
    ]

    # Build future risk projection from real forecast if available
    if history:
        # Extrapolate from historical trend
        temps = history["temperatures"]
        future_risk = [round(t + 1.5 + i * 0.12, 1) for i, t in enumerate(temps)]
        timeline = history["labels"]
    else:
        future_risk = STATIC_DATA.get("future_risk", [])
        timeline = STATIC_DATA.get("timeline", [])

    # Build baseline trend
    if history:
        baseline = history["temperatures"]
    else:
        baseline = [current_temp - 4 + i * 0.6 for i in range(12)]

    return jsonify({
        "strategies": strategies,
        "future_risk": future_risk,
        "timeline": timeline,
        "baseline": baseline,
        "current_temp": round(current_temp, 1),
        "city": city,
        "date": datetime.now().strftime("%B %d, %Y"),
        "is_live": weather is not None
    })


@app.route('/api/zones')
def api_zones():
    """Return list of zones for a city."""
    city = _get_city(request)
    city_data = CITIES.get(city, CITIES[DEFAULT_CITY])
    zones = [
        {"name": name, "lat": z["lat"], "lng": z["lng"]}
        for name, z in city_data["zones"].items()
    ]
    return jsonify({"city": city, "zones": zones})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
