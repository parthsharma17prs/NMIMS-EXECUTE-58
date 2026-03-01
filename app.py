"""
Smart Campus Net-Zero Command Center - NMIMS Indore
Flask Backend with Mock IoT Simulator
-------------------------------------
Works in two modes:
  1. MongoDB mode   - if MONGO_URI is reachable, data persists in MongoDB
  2. In-Memory mode - automatic fallback; all data lives in Python lists/dicts
"""

import math
import os
import random
import threading
import time
from collections import deque
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import requests as http_requests          # for weather API
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from sklearn.linear_model import LinearRegression
from backend.forecasting_model import run_forecast as _run_forecast

# Load env vars: check root .env first, then backend/.env
_env_root = Path(__file__).resolve().parent / ".env"
_env_backend = Path(__file__).resolve().parent / "backend" / ".env"
load_dotenv(_env_root)
load_dotenv(_env_backend)   # second call only adds vars not already set

MONGO_URI = os.getenv("MONGO_URI", "")
MONGO_DB = os.getenv("MONGO_DB", "smart_campus")
FLASK_HOST = os.getenv("FLASK_HOST", "0.0.0.0")
# Railway injects PORT; fall back to FLASK_PORT or 5000 for local dev
FLASK_PORT = int(os.getenv("PORT", os.getenv("FLASK_PORT", "5000")))

SIMULATOR_INTERVAL_SECONDS = 5
SURGE_THRESHOLD_KW = 400

# ---------------------------------------------------------------------------
# Flask App — serve React build as static files in production
# ---------------------------------------------------------------------------
BUILD_DIR = Path(__file__).resolve().parent / "frontend" / "build"
app = Flask(__name__, static_folder=None)   # disable default /static
CORS(app)

# ---------------------------------------------------------------------------
# Storage — MongoDB or In-Memory
# ---------------------------------------------------------------------------
USE_MONGO = False
mongo_client = None
mongo_db = None
blocks_col = None
energy_col = None
kpi_col = None

# In-memory fallback stores
MEM_BLOCKS = []
MEM_ENERGY = deque(maxlen=5000)
MEM_KPIS = {}
MEM_BLOCK_CONSUMPTION = []   # [{year, month, block, kwh, cost, timestamp}]
_consumption_lock = threading.Lock()
_mem_lock = threading.Lock()

# Sustainability input store (managed via Data Management page)
MEM_SUSTAINABILITY_INPUTS = {
    "verified_campus_area_m2": None,
    "baseline_peak_kw": None,
    "students_by_year": {},                 # {"2026": 12000, ...}
    "monthly_renewable_generation": [],     # [{year, month, kwh, timestamp}]
    "occupancy_schedule": {},               # {"STME Block": 82, ...}
}
_sustainability_lock = threading.Lock()

# Data-mode state  (manual | iot)
_data_mode = {"mode": "manual"}   # default to manual
_data_mode_lock = threading.Lock()

# IoT connection state
_iot_connection = {
    "connected": False,
    "device_id": None,
    "device_name": None,
    "connected_at": None,
    "interval_sec": 60,
}
_iot_conn_lock = threading.Lock()

# IoT device logs  (kept in a deque, max 500 entries)
MEM_IOT_LOGS = deque(maxlen=500)
_iot_logs_lock = threading.Lock()

# ---------------------------------------------------------------------------
# Battery Storage Simulation State
# ---------------------------------------------------------------------------
_battery = {
    "capacity_kwh": 200,           # total capacity
    "soc_pct": 65.0,               # state of charge (%)
    "max_charge_kw": 50,
    "max_discharge_kw": 60,
    "current_kw": 0.0,             # +ve = discharging, -ve = charging
}
_battery_lock = threading.Lock()

# ---------------------------------------------------------------------------
# Weather Cache  (to avoid hammering the free API every 5 s)
# ---------------------------------------------------------------------------
_weather_cache = {"data": None, "lat": None, "lon": None, "ts": 0}
WEATHER_CACHE_TTL = 120            # seconds


def _try_connect_mongo():
    """Attempt to connect to MongoDB. Returns True on success."""
    global USE_MONGO, mongo_client, mongo_db, blocks_col, energy_col, kpi_col
    if not MONGO_URI:
        return False
    try:
        from pymongo import MongoClient, DESCENDING
        mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
        mongo_client.admin.command("ping")
        mongo_db = mongo_client[MONGO_DB]
        blocks_col = mongo_db["Campus_Blocks"]
        energy_col = mongo_db["Energy_Logs"]
        kpi_col = mongo_db["Daily_KPIs"]
        energy_col.create_index([("Timestamp", DESCENDING)])
        energy_col.create_index([("Block_ID", 1), ("Timestamp", DESCENDING)])
        kpi_col.create_index([("Date", DESCENDING)], unique=True)
        blocks_col.create_index([("Name", 1)], unique=True)
        USE_MONGO = True
        print("[Setup] Connected to MongoDB")
        return True
    except Exception as exc:
        print(f"[Setup] MongoDB unavailable ({exc})")
        print("[Setup] -> Using IN-MEMORY storage. Dashboard works with simulated data.")
        USE_MONGO = False
        return False


# ---------------------------------------------------------------------------
# Block Profiles  — NMIMS Indore Campus Schools
# ---------------------------------------------------------------------------
BLOCK_SEEDS = [
    {"_id": "block_stme",  "Name": "STME Block",  "Square_Footage": 42000},
    {"_id": "block_sbm",   "Name": "SBM Block",   "Square_Footage": 35000},
    {"_id": "block_soc",   "Name": "SOC Block",   "Square_Footage": 28000},
    {"_id": "block_sol",   "Name": "SOL Block",   "Square_Footage": 22000},
    {"_id": "block_sptm",  "Name": "SPTM Block",  "Square_Footage": 30000},
]

BLOCK_PROFILES = {
    "STME Block":  {"base_grid_kw": 130, "solar_capacity_kw": 85, "base_hvac_kw": 65},
    "SBM Block":   {"base_grid_kw": 90,  "solar_capacity_kw": 60, "base_hvac_kw": 45},
    "SOC Block":   {"base_grid_kw": 70,  "solar_capacity_kw": 45, "base_hvac_kw": 35},
    "SOL Block":   {"base_grid_kw": 55,  "solar_capacity_kw": 35, "base_hvac_kw": 28},
    "SPTM Block":  {"base_grid_kw": 110, "solar_capacity_kw": 70, "base_hvac_kw": 55},
}


def _seed_blocks():
    if USE_MONGO:
        for s in BLOCK_SEEDS:
            if not blocks_col.find_one({"Name": s["Name"]}):
                blocks_col.insert_one({"Name": s["Name"], "Square_Footage": s["Square_Footage"]})
        print(f"[Setup] Blocks seeded in MongoDB ({blocks_col.count_documents({})}).")
    else:
        MEM_BLOCKS.clear()
        for s in BLOCK_SEEDS:
            MEM_BLOCKS.append(dict(s))
        print(f"[Setup] Blocks seeded in memory ({len(MEM_BLOCKS)}).")


# ---------------------------------------------------------------------------
# Energy Generation Helpers
# ---------------------------------------------------------------------------
def _solar_factor(hour):
    if hour < 6 or hour >= 19:
        return 0.0
    return max(0.0, round(math.exp(-0.5 * ((hour - 13) / 3) ** 2), 3))


def _hvac_factor(hour):
    if 12 <= hour <= 15:
        return random.uniform(1.4, 1.8)
    elif 9 <= hour <= 17:
        return random.uniform(0.9, 1.3)
    elif 6 <= hour <= 8 or 18 <= hour <= 21:
        return random.uniform(0.5, 0.8)
    else:
        return random.uniform(0.3, 0.5)


def _occupancy_factor(hour):
    if 9 <= hour <= 17:
        return random.uniform(0.9, 1.2)
    elif 7 <= hour <= 8 or 18 <= hour <= 21:
        return random.uniform(0.5, 0.8)
    else:
        return random.uniform(0.15, 0.35)


def generate_energy_reading(block_name, now):
    profile = BLOCK_PROFILES[block_name]
    hour = now.hour

    solar_kw = profile["solar_capacity_kw"] * _solar_factor(hour)
    solar_kw *= random.uniform(0.85, 1.10)
    solar_kw = max(0.0, round(solar_kw, 2))

    hvac_kw = profile["base_hvac_kw"] * _hvac_factor(hour)
    hvac_kw = round(hvac_kw, 2)

    grid_kw = profile["base_grid_kw"] * _occupancy_factor(hour)
    grid_kw += hvac_kw
    grid_kw -= solar_kw * random.uniform(0.6, 0.9)
    grid_kw += random.uniform(-5, 5)
    grid_kw = max(0.0, round(grid_kw, 2))

    return {
        "Grid_Power_Draw_kW": grid_kw,
        "Solar_Power_Generated_kW": solar_kw,
        "HVAC_Power_kW": hvac_kw,
    }


# ---------------------------------------------------------------------------
# IoT Simulator
# ---------------------------------------------------------------------------
def iot_simulator():
    print("[IoT Simulator] Starting ...")
    while True:
        try:
            now = datetime.now()
            if USE_MONGO:
                _simulate_mongo(now)
            else:
                _simulate_memory(now)
        except Exception as exc:
            print(f"[IoT Simulator] ERROR: {exc}")
        time.sleep(SIMULATOR_INTERVAL_SECONDS)


def _simulate_mongo(now):
    blocks = list(blocks_col.find())
    docs = []
    for block in blocks:
        reading = generate_energy_reading(block["Name"], now)
        docs.append({
            "Block_ID": str(block["_id"]),
            "Block_Name": block["Name"],
            "Timestamp": now,
            **reading,
        })
    if docs:
        energy_col.insert_many(docs)
    start = datetime(now.year, now.month, now.day)
    end = start + timedelta(days=1)
    pipe = [
        {"$match": {"Timestamp": {"$gte": start, "$lt": end}}},
        {"$group": {"_id": None,
                    "total_grid": {"$sum": "$Grid_Power_Draw_kW"},
                    "total_solar": {"$sum": "$Solar_Power_Generated_kW"}}},
    ]
    result = list(energy_col.aggregate(pipe))
    if result:
        g_kwh = (result[0]["total_grid"] * SIMULATOR_INTERVAL_SECONDS) / 3600
        s_kwh = (result[0]["total_solar"] * SIMULATOR_INTERVAL_SECONDS) / 3600
        ds = now.strftime("%Y-%m-%d")
        kpi_col.update_one({"Date": ds}, {"$set": {"Date": ds,
                           "Total_Carbon_Emissions": round(g_kwh * 0.82, 2),
                           "Net_Savings_INR": round(s_kwh * 6.50, 2)}}, upsert=True)
    print(f"[IoT] {now.strftime('%H:%M:%S')} — {len(docs)} readings -> MongoDB")


def _simulate_memory(now):
    with _mem_lock:
        for block in MEM_BLOCKS:
            reading = generate_energy_reading(block["Name"], now)
            MEM_ENERGY.append({
                "Block_ID": block["_id"],
                "Block_Name": block["Name"],
                "Timestamp": now,
                **reading,
            })
    print(f"[IoT] {now.strftime('%H:%M:%S')} — {len(MEM_BLOCKS)} readings -> Memory ({len(MEM_ENERGY)} total)")


# ---------------------------------------------------------------------------
# Memory helpers
# ---------------------------------------------------------------------------
def _mem_get_blocks():
    return list(MEM_BLOCKS)


def _mem_latest_per_block():
    latest = {}
    with _mem_lock:
        for log in reversed(MEM_ENERGY):
            bid = log["Block_ID"]
            if bid not in latest:
                latest[bid] = log
            if len(latest) == len(MEM_BLOCKS):
                break
    return latest


def _mem_recent_logs(n=100):
    with _mem_lock:
        items = list(MEM_ENERGY)
    return items[-n:]


def _get_today_logs(now):
    start = datetime(now.year, now.month, now.day)
    if USE_MONGO:
        end = start + timedelta(days=1)
        return list(energy_col.find({"Timestamp": {"$gte": start, "$lt": end}}))
    with _mem_lock:
        return [lg for lg in MEM_ENERGY if lg["Timestamp"] >= start]


# ---------------------------------------------------------------------------
# REST API
# ---------------------------------------------------------------------------

@app.route("/health")
def health_check():
    """Lightweight health-check endpoint for Railway."""
    return jsonify({"status": "ok"}), 200


@app.route("/api/info")
def api_info():
    return jsonify({
        "service": "NMIMS Indore — Net-Zero Command Center",
        "storage": "MongoDB" if USE_MONGO else "In-Memory",
        "status": "running",
        "endpoints": ["/blocks", "/energy-logs", "/api/live-status",
                      "/api/kpis", "/api/overview", "/api/renewable-mix",
                      "/api/predict-surge", "/api/solar-live",
                      "/api/data-mode", "/api/iot-connection", "/api/iot-logs",
                      "/api/block-consumption", "/api/sustainability-inputs",
                      "/api/sustainability-kpis", "/api/forecast"],
    })


@app.route("/blocks")
def get_blocks():
    if USE_MONGO:
        blocks = list(blocks_col.find())
        for b in blocks:
            b["_id"] = str(b["_id"])
        return jsonify(blocks)
    return jsonify(_mem_get_blocks())


@app.route("/energy-logs")
def get_energy_logs():
    logs = _mem_recent_logs(100) if not USE_MONGO else list(
        energy_col.find().sort("Timestamp", -1).limit(100))
    result = []
    for lg in logs:
        entry = dict(lg)
        if "_id" in entry:
            entry["_id"] = str(entry["_id"])
        entry["Timestamp"] = entry["Timestamp"].isoformat()
        result.append(entry)
    return jsonify(result)


@app.route("/latest-readings")
def get_latest_readings():
    if USE_MONGO:
        from pymongo import DESCENDING as DESC
        blocks = list(blocks_col.find())
        result = []
        for block in blocks:
            log = energy_col.find_one({"Block_ID": str(block["_id"])}, sort=[("Timestamp", DESC)])
            if log:
                log["_id"] = str(log["_id"])
                log["Timestamp"] = log["Timestamp"].isoformat()
                log["Block_Name"] = block["Name"]
                result.append(log)
        return jsonify(result)
    latest = _mem_latest_per_block()
    return jsonify([{**v, "Timestamp": v["Timestamp"].isoformat()} for v in latest.values()])


# ── /api/live-status ──────────────────────────────────────────
@app.route("/api/live-status")
def api_live_status():
    if USE_MONGO:
        from pymongo import DESCENDING as DESC
        blocks = list(blocks_col.find())
        payload = []
        for block in blocks:
            log = energy_col.find_one({"Block_ID": str(block["_id"])}, sort=[("Timestamp", DESC)])
            if log:
                payload.append({
                    "Block_ID": str(block["_id"]),
                    "Block_Name": block["Name"],
                    "Square_Footage": block["Square_Footage"],
                    "Timestamp": log["Timestamp"].isoformat(),
                    "Grid_Power_Draw_kW": round(log["Grid_Power_Draw_kW"], 2),
                    "Solar_Power_Generated_kW": round(log["Solar_Power_Generated_kW"], 2),
                    "HVAC_Power_kW": round(log["HVAC_Power_kW"], 2),
                    "Net_Power_kW": round(log["Grid_Power_Draw_kW"] - log["Solar_Power_Generated_kW"], 2),
                })
        return jsonify({"status": "ok", "blocks": payload})

    # Memory mode
    latest = _mem_latest_per_block()
    payload = []
    for block in MEM_BLOCKS:
        log = latest.get(block["_id"])
        if log:
            payload.append({
                "Block_ID": block["_id"],
                "Block_Name": block["Name"],
                "Square_Footage": block["Square_Footage"],
                "Timestamp": log["Timestamp"].isoformat(),
                "Grid_Power_Draw_kW": round(log["Grid_Power_Draw_kW"], 2),
                "Solar_Power_Generated_kW": round(log["Solar_Power_Generated_kW"], 2),
                "HVAC_Power_kW": round(log["HVAC_Power_kW"], 2),
                "Net_Power_kW": round(log["Grid_Power_Draw_kW"] - log["Solar_Power_Generated_kW"], 2),
            })
    return jsonify({"status": "ok", "blocks": payload})


# ── /api/kpis ─────────────────────────────────────────────────
@app.route("/api/kpis")
def api_kpis():
    now = datetime.now()
    today_logs = _get_today_logs(now)

    total_grid_kw = sum(lg["Grid_Power_Draw_kW"] for lg in today_logs)
    total_solar_kw = sum(lg["Solar_Power_Generated_kW"] for lg in today_logs)
    count = len(today_logs)

    grid_kwh = (total_grid_kw * SIMULATOR_INTERVAL_SECONDS) / 3600
    solar_kwh = (total_solar_kw * SIMULATOR_INTERVAL_SECONDS) / 3600
    total_kwh = grid_kwh + solar_kwh

    return jsonify({
        "status": "ok",
        "date": now.strftime("%Y-%m-%d"),
        "readings_today": count,
        "Total_Carbon_Offset_kg": round(solar_kwh * 0.82, 2),
        "Grid_Independence_Pct": round((solar_kwh / total_kwh * 100), 2) if total_kwh > 0 else 0.0,
        "Financial_Savings_INR": round(solar_kwh * 6.50, 2),
    })


# ── /api/overview ─────────────────────────────────────────────
@app.route("/api/overview")
def api_overview():
    """Comprehensive overview — works with both MongoDB and in-memory data."""
    try:
        now = datetime.now()
        today_logs = _get_today_logs(now)

        # 1. Block-level readings
        latest = {}
        if USE_MONGO:
            from pymongo import DESCENDING as DESC
            for block in blocks_col.find():
                log = energy_col.find_one({"Block_ID": str(block["_id"])}, sort=[("Timestamp", DESC)])
                if log:
                    latest[block["Name"]] = {"log": log, "sqft": block.get("Square_Footage", 1)}
        else:
            latest_per_block = _mem_latest_per_block()
            for block in MEM_BLOCKS:
                log = latest_per_block.get(block["_id"])
                if log:
                    latest[block["Name"]] = {"log": log, "sqft": block.get("Square_Footage", 1)}

        block_data = []
        total_grid = total_solar = total_hvac = total_sqft = 0

        for name, info in latest.items():
            log = info["log"]
            sqft = info["sqft"]
            grid = log.get("Grid_Power_Draw_kW", 0)
            solar = log.get("Solar_Power_Generated_kW", 0)
            hvac = log.get("HVAC_Power_kW", 0)
            total_grid += grid
            total_solar += solar
            total_hvac += hvac
            total_sqft += sqft

            eui = (grid / sqft) * 1000 if sqft else 0
            eff_score = max(0, min(100, round(100 - eui * 15)))

            block_data.append({
                "name": name,
                "grid_kw": round(grid, 2),
                "solar_kw": round(solar, 2),
                "hvac_kw": round(hvac, 2),
                "sqft": sqft,
                "efficiency_score": eff_score,
                "eui": round(eui, 2),
            })

        # 2. Day aggregated KPIs
        sum_grid = sum(lg["Grid_Power_Draw_kW"] for lg in today_logs)
        sum_solar = sum(lg["Solar_Power_Generated_kW"] for lg in today_logs)
        max_grid = max((lg["Grid_Power_Draw_kW"] for lg in today_logs), default=0)

        day_grid_kwh = (sum_grid * SIMULATOR_INTERVAL_SECONDS) / 3600
        day_solar_kwh = (sum_solar * SIMULATOR_INTERVAL_SECONDS) / 3600
        day_total_kwh = day_grid_kwh + day_solar_kwh
        renewable_pct = round((day_solar_kwh / day_total_kwh * 100), 1) if day_total_kwh > 0 else 0
        carbon_saved_kg = round(day_solar_kwh * 0.82, 2)
        savings_inr = round(day_solar_kwh * 6.50, 2)

        # Peak demand
        peak_demand_kw = round(max_grid, 2)
        peak_log = max(today_logs, key=lambda x: x["Grid_Power_Draw_kW"]) if today_logs else None
        peak_demand_time = peak_log["Timestamp"].strftime("%H:%M") if peak_log else now.strftime("%H:%M")

        # 3. Net-Zero Score
        net_zero_progress = min(100, round(
            renewable_pct * 1.3 +
            (100 - (total_grid / max(total_sqft, 1)) * 500) * 0.2, 1))
        net_zero_progress = max(0, net_zero_progress)

        avg_eff = (sum(b["efficiency_score"] for b in block_data) / max(len(block_data), 1))
        sus_score = min(100, round(
            renewable_pct * 0.4 +
            min(50, carbon_saved_kg / 5) * 0.3 +
            avg_eff * 0.3))

        if sus_score >= 90: grade = "A+"
        elif sus_score >= 80: grade = "A"
        elif sus_score >= 70: grade = "B+"
        elif sus_score >= 60: grade = "B"
        elif sus_score >= 50: grade = "C"
        else: grade = "D"

        # 4. Hourly Energy Profile
        hourly_buckets = {}
        for lg in today_logs:
            h = lg["Timestamp"].hour
            if h not in hourly_buckets:
                hourly_buckets[h] = {"grid": [], "solar": [], "hvac": []}
            hourly_buckets[h]["grid"].append(lg["Grid_Power_Draw_kW"])
            hourly_buckets[h]["solar"].append(lg["Solar_Power_Generated_kW"])
            hourly_buckets[h]["hvac"].append(lg["HVAC_Power_kW"])

        hourly_profile = []
        for h in sorted(hourly_buckets.keys()):
            b = hourly_buckets[h]
            hourly_profile.append({
                "hour": f"{h:02d}:00",
                "grid": round(sum(b["grid"]) / len(b["grid"]), 1),
                "solar": round(sum(b["solar"]) / len(b["solar"]), 1),
                "hvac": round(sum(b["hvac"]) / len(b["hvac"]), 1),
            })

        # 5. Activity Feed
        recent = sorted(today_logs, key=lambda x: x["Timestamp"], reverse=True)[:20]
        activity_feed = []
        for lg in recent:
            gk = lg.get("Grid_Power_Draw_kW", 0)
            sk = lg.get("Solar_Power_Generated_kW", 0)
            bn = lg.get("Block_Name", "Unknown")
            ts = lg["Timestamp"].strftime("%H:%M:%S")
            if gk > 200:
                activity_feed.append({"time": ts, "block": bn,
                    "event": f"High grid draw: {gk:.0f} kW", "type": "warning"})
            elif sk > 50:
                activity_feed.append({"time": ts, "block": bn,
                    "event": f"Strong solar output: {sk:.0f} kW", "type": "success"})
            else:
                activity_feed.append({"time": ts, "block": bn,
                    "event": f"Normal — Grid: {gk:.0f} kW, Solar: {sk:.0f} kW", "type": "info"})

        # 6. Weather (simulated)
        hour = now.hour
        base_temp = 28 + 6 * math.sin(math.pi * (hour - 6) / 12) if 6 <= hour <= 18 else 22
        weather = {
            "temp_c": round(base_temp + random.uniform(-1, 1), 1),
            "humidity": round(55 + random.uniform(-10, 15)),
            "condition": random.choice(["Clear Sky", "Partly Cloudy", "Sunny", "Overcast"]),
            "wind_kmh": round(random.uniform(5, 20), 1),
            "solar_irradiance_w_m2": round(max(0, 800 * _solar_factor(hour) + random.uniform(-30, 30))),
        }

        return jsonify({
            "status": "ok",
            "timestamp": now.isoformat(),
            "storage_mode": "MongoDB" if USE_MONGO else "In-Memory",
            "net_zero_progress": net_zero_progress,
            "sustainability_score": sus_score,
            "sustainability_grade": grade,
            "carbon_saved_today_kg": carbon_saved_kg,
            "financial_savings_inr": savings_inr,
            "peak_demand_kw": peak_demand_kw,
            "peak_demand_time": peak_demand_time,
            "peak_target_kw": SURGE_THRESHOLD_KW,
            "renewable_pct": renewable_pct,
            "grid_pct": round(100 - renewable_pct, 1),
            "total_consumption_kwh": round(day_total_kwh, 1),
            "total_solar_kwh": round(day_solar_kwh, 1),
            "total_grid_kwh": round(day_grid_kwh, 1),
            "campus_eui": round((day_total_kwh / max(total_sqft, 1)) * 1000, 2),
            "blocks": block_data,
            "hourly_profile": hourly_profile,
            "weather": weather,
            "activity_feed": activity_feed[:15],
        })

    except Exception as exc:
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(exc)}), 500



# ── Weather Fetch (Open-Meteo — free, no API key) ────────────
def _fetch_weather(lat, lon):
    """Return current weather dict from Open-Meteo or a simulation fallback."""
    global _weather_cache
    now_ts = time.time()

    # Return cache if fresh enough AND coords roughly same
    if (_weather_cache["data"]
            and abs((lat or 0) - (_weather_cache["lat"] or 0)) < 0.05
            and abs((lon or 0) - (_weather_cache["lon"] or 0)) < 0.05
            and (now_ts - _weather_cache["ts"]) < WEATHER_CACHE_TTL):
        return _weather_cache["data"]

    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            f"&current=temperature_2m,relative_humidity_2m,"
            f"cloud_cover,wind_speed_10m,weather_code"
        )
        resp = http_requests.get(url, timeout=5)
        resp.raise_for_status()
        j = resp.json().get("current", {})

        wmo = j.get("weather_code", 0)
        if wmo == 0:
            condition = "Clear Sky"
        elif wmo <= 3:
            condition = "Partly Cloudy"
        elif wmo <= 48:
            condition = "Foggy"
        elif wmo <= 67:
            condition = "Rainy"
        elif wmo <= 77:
            condition = "Snowy"
        elif wmo <= 82:
            condition = "Showers"
        elif wmo <= 99:
            condition = "Thunderstorm"
        else:
            condition = "Unknown"

        data = {
            "source": "live",
            "temp_c": j.get("temperature_2m", 28),
            "humidity_pct": j.get("relative_humidity_2m", 55),
            "cloud_cover_pct": j.get("cloud_cover", 0),
            "wind_kmh": j.get("wind_speed_10m", 10),
            "condition": condition,
        }
        _weather_cache = {"data": data, "lat": lat, "lon": lon, "ts": now_ts}
        return data

    except Exception as exc:
        print(f"[Weather] API error ({exc}) — using simulation")
        hour = datetime.now().hour
        cloud = random.randint(10, 80)
        data = {
            "source": "simulated",
            "temp_c": round(28 + 6 * math.sin(math.pi * max(0, hour - 6) / 12) + random.uniform(-1, 1), 1),
            "humidity_pct": round(55 + random.uniform(-10, 15)),
            "cloud_cover_pct": cloud,
            "wind_kmh": round(random.uniform(5, 20), 1),
            "condition": "Partly Cloudy" if cloud < 50 else "Overcast",
        }
        _weather_cache = {"data": data, "lat": lat, "lon": lon, "ts": now_ts}
        return data


# ── Battery Simulation Tick ───────────────────────────────────
def _battery_tick(total_solar_kw, total_grid_kw):
    """Update battery state-of-charge based on current generation vs demand."""
    with _battery_lock:
        excess_solar = total_solar_kw - total_grid_kw * 0.3  # surplus threshold
        if excess_solar > 5:
            # Charge the battery
            charge_kw = min(excess_solar * 0.6, _battery["max_charge_kw"])
            delta_kwh = (charge_kw * SIMULATOR_INTERVAL_SECONDS) / 3600
            new_soc = _battery["soc_pct"] + (delta_kwh / _battery["capacity_kwh"]) * 100
            _battery["soc_pct"] = min(100.0, round(new_soc, 2))
            _battery["current_kw"] = -round(charge_kw, 2)  # negative = charging
        elif total_grid_kw > total_solar_kw * 1.5 and _battery["soc_pct"] > 10:
            # Discharge the battery to help
            discharge_kw = min(
                (total_grid_kw - total_solar_kw) * 0.4,
                _battery["max_discharge_kw"],
            )
            delta_kwh = (discharge_kw * SIMULATOR_INTERVAL_SECONDS) / 3600
            new_soc = _battery["soc_pct"] - (delta_kwh / _battery["capacity_kwh"]) * 100
            _battery["soc_pct"] = max(0.0, round(new_soc, 2))
            _battery["current_kw"] = round(discharge_kw, 2)  # positive = discharging
        else:
            _battery["current_kw"] = 0.0

        return dict(_battery)


# ── /api/renewable-mix ────────────────────────────────────────
@app.route("/api/renewable-mix")
def api_renewable_mix():
    """
    Energy-Mix Visualiser endpoint.
    Accepts ?lat=XX&lon=YY for live-location weather integration.
    Returns:  grid kW, solar kW (weather-adjusted), battery kW, weather info.
    """
    try:
        lat = request.args.get("lat", type=float)
        lon = request.args.get("lon", type=float)

        # ── Weather ──
        if lat is not None and lon is not None:
            weather = _fetch_weather(lat, lon)
        else:
            weather = {
                "source": "default",
                "temp_c": 30,
                "humidity_pct": 55,
                "cloud_cover_pct": 25,
                "wind_kmh": 12,
                "condition": "Partly Cloudy",
            }

        cloud_pct = weather.get("cloud_cover_pct", 0)
        solar_multiplier = max(0.05, (100 - cloud_pct) / 100)

        # ── Latest readings ──
        if USE_MONGO:
            from pymongo import DESCENDING as DESC
            blocks = list(blocks_col.find())
            latest_map = {}
            for b in blocks:
                log = energy_col.find_one(
                    {"Block_ID": str(b["_id"])}, sort=[("Timestamp", DESC)]
                )
                if log:
                    latest_map[b["Name"]] = log
        else:
            latest_per = _mem_latest_per_block()
            latest_map = {}
            for b in MEM_BLOCKS:
                lg = latest_per.get(b["_id"])
                if lg:
                    latest_map[b["Name"]] = lg

        total_grid = sum(lg["Grid_Power_Draw_kW"] for lg in latest_map.values())
        raw_solar = sum(lg["Solar_Power_Generated_kW"] for lg in latest_map.values())
        adjusted_solar = round(raw_solar * solar_multiplier, 2)

        # ── Battery tick ──
        bat = _battery_tick(adjusted_solar, total_grid)
        battery_kw = bat["current_kw"]  # +ve = discharging to grid

        # Net grid after solar & battery offset
        net_grid = max(0, round(total_grid - adjusted_solar - max(0, battery_kw), 2))

        # Per-block detail
        block_detail = []
        for name, lg in latest_map.items():
            raw_s = lg["Solar_Power_Generated_kW"]
            adj_s = round(raw_s * solar_multiplier, 2)
            block_detail.append({
                "name": name,
                "grid_kw": round(lg["Grid_Power_Draw_kW"], 2),
                "solar_raw_kw": round(raw_s, 2),
                "solar_adjusted_kw": adj_s,
                "hvac_kw": round(lg["HVAC_Power_kW"], 2),
            })

        return jsonify({
            "status": "ok",
            "timestamp": datetime.now().isoformat(),
            "weather": weather,
            "solar_multiplier": round(solar_multiplier, 3),
            "energy_mix": {
                "grid_kw": round(net_grid, 2),
                "solar_kw": round(adjusted_solar, 2),
                "battery_kw": round(battery_kw, 2),
                "total_demand_kw": round(total_grid, 2),
            },
            "battery": {
                "soc_pct": bat["soc_pct"],
                "capacity_kwh": bat["capacity_kwh"],
                "current_kw": bat["current_kw"],
                "status": "Charging" if bat["current_kw"] < 0
                          else "Discharging" if bat["current_kw"] > 0
                          else "Idle",
            },
            "blocks": block_detail,
        })

    except Exception as exc:
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(exc)}), 500


# ── /api/predict-surge ────────────────────────────────────────
@app.route("/api/predict-surge")
def api_predict_surge():
    try:
        if USE_MONGO:
            logs = list(energy_col.find().sort("Timestamp", -1).limit(100))
        else:
            logs = _mem_recent_logs(100)

        if len(logs) < 10:
            return jsonify({
                "status": "ok",
                "model": "LinearRegression",
                "data_points_used": len(logs),
                "predicted_Grid_Power_Draw_kW": 0,
                "prediction_horizon": "1 hour",
                "surge_threshold_kW": SURGE_THRESHOLD_KW,
                "anomaly_alert": False,
                "message": f"Accumulating data ({len(logs)}/10 readings so far).",
            })

        logs_sorted = sorted(logs, key=lambda x: x["Timestamp"])
        base_ts = logs_sorted[0]["Timestamp"].timestamp()

        X = np.array([
            [(lg["Timestamp"].timestamp() - base_ts) / 3600,
             lg["HVAC_Power_kW"],
             lg["Solar_Power_Generated_kW"]]
            for lg in logs_sorted
        ])
        y = np.array([lg["Grid_Power_Draw_kW"] for lg in logs_sorted])

        model = LinearRegression()
        model.fit(X, y)

        last = logs_sorted[-1]
        future_hours = (last["Timestamp"].timestamp() - base_ts) / 3600 + 1.0
        X_pred = np.array([[future_hours, last["HVAC_Power_kW"], last["Solar_Power_Generated_kW"]]])
        predicted_kw = round(float(model.predict(X_pred)[0]), 2)

        is_surge = predicted_kw > SURGE_THRESHOLD_KW
        response = {
            "status": "ok",
            "model": "LinearRegression",
            "data_points_used": len(logs_sorted),
            "predicted_Grid_Power_Draw_kW": predicted_kw,
            "prediction_horizon": "1 hour",
            "surge_threshold_kW": SURGE_THRESHOLD_KW,
            "anomaly_alert": is_surge,
        }
        if is_surge:
            response["alert"] = {
                "severity": "HIGH",
                "message": (f"Predicted grid draw of {predicted_kw} kW exceeds "
                            f"the {SURGE_THRESHOLD_KW} kW threshold. "
                            "Consider activating demand-response protocols."),
                "recommended_actions": [
                    "Shift non-critical loads to off-peak",
                    "Increase battery discharge rate",
                    "Pre-cool buildings to reduce upcoming HVAC demand",
                ],
            }
        return jsonify(response)

    except Exception as exc:
        return jsonify({
            "status": "ok",
            "model": "LinearRegression",
            "data_points_used": 0,
            "predicted_Grid_Power_Draw_kW": 0,
            "prediction_horizon": "1 hour",
            "surge_threshold_kW": SURGE_THRESHOLD_KW,
            "anomaly_alert": False,
            "message": f"Prediction unavailable: {exc}",
        })


# ---------------------------------------------------------------------------
# Solar Energy — Live PV Simulation  (backend/solar_energy_analysis/)
# ---------------------------------------------------------------------------
from backend.solar_energy_analysis import (
    fetch_live_weather,
    fetch_full_weather,
    estimate_irradiance,
    calculate_solar_yield,
    get_dynamic_solar_kw,
    P_CAPACITY,
    CLEAR_SKY_GHI,
    PR,
    GAMMA,
)

# NMIMS Indore campus coordinates (default)
_CAMPUS_LAT = 22.9252
_CAMPUS_LON = 75.8655


@app.route("/api/solar-live")
def api_solar_live():
    """
    Returns real-time solar PV simulation + comprehensive weather report.
    Accepts optional ?lat=&lon= query params for dynamic location.
    """
    try:
        lat = float(request.args.get("lat", _CAMPUS_LAT))
        lon = float(request.args.get("lon", _CAMPUS_LON))

        weather    = fetch_full_weather(lat, lon)
        temp_c     = weather["temperature_c"]
        cloud_pct  = weather["cloud_cover_pct"]

        local_hour = datetime.now().hour
        irr        = estimate_irradiance(cloud_pct, local_hour)
        power_kw   = calculate_solar_yield(temp_c, irr)
        t_cell     = temp_c + 5.0
        is_night   = (local_hour < 6 or local_hour >= 18)

        return jsonify({
            "solar_kw":        round(power_kw, 2),
            "irradiance_wm2":  round(irr, 2),
            "is_nighttime":    is_night,
            "local_hour":      local_hour,
            "t_cell_c":        round(t_cell, 1),
            # ── Full Weather Report ──
            "weather": {
                "temperature_c":     weather["temperature_c"],
                "feels_like_c":      weather["feels_like_c"],
                "cloud_cover_pct":   weather["cloud_cover_pct"],
                "humidity_pct":      weather["humidity_pct"],
                "wind_speed_kmh":    weather["wind_speed_kmh"],
                "wind_direction":    weather["wind_direction"],
                "wind_direction_deg": weather["wind_direction_deg"],
                "pressure_hpa":      weather["pressure_hpa"],
                "visibility_km":     round(weather["visibility_m"] / 1000, 1),
                "uv_index":          weather["uv_index"],
                "uv_index_max":      weather["uv_index_max"],
                "description":       weather["description"],
                "weather_code":      weather["weather_code"],
                "sunrise":           weather["sunrise"],
                "sunset":            weather["sunset"],
            },
            "location": {
                "lat": lat,
                "lon": lon,
                "name": "NMIMS Indore" if (lat == _CAMPUS_LAT and lon == _CAMPUS_LON) else f"{lat}°N, {lon}°E",
            },
        })
    except Exception as exc:
        return jsonify({
            "solar_kw": 0,
            "irradiance_wm2": 0,
            "is_nighttime": True,
            "weather": {
                "temperature_c": 0, "feels_like_c": 0, "cloud_cover_pct": 0,
                "humidity_pct": 0, "wind_speed_kmh": 0, "wind_direction": "—",
                "wind_direction_deg": 0, "pressure_hpa": 0, "visibility_km": 0,
                "uv_index": 0, "uv_index_max": 0, "description": "Unavailable",
                "weather_code": -1, "sunrise": "", "sunset": "",
            },
            "error": str(exc),
        })


# ---------------------------------------------------------------------------
# Data Mode  (manual / iot)
# ---------------------------------------------------------------------------
@app.route("/api/data-mode", methods=["GET"])
def get_data_mode():
    """Return current data input mode."""
    with _data_mode_lock:
        return jsonify(_data_mode)


@app.route("/api/data-mode", methods=["POST"])
def set_data_mode():
    """Set data input mode.  Body: { "mode": "manual" | "iot" }"""
    body = request.get_json(force=True)
    mode = body.get("mode", "manual")
    if mode not in ("manual", "iot"):
        return jsonify({"error": "mode must be 'manual' or 'iot'"}), 400
    with _data_mode_lock:
        _data_mode["mode"] = mode
    return jsonify({"status": "ok", "mode": mode})


# ---------------------------------------------------------------------------
# IoT Connection Management
# ---------------------------------------------------------------------------
@app.route("/api/iot-connection", methods=["GET"])
def get_iot_connection():
    """Return IoT connection status."""
    with _iot_conn_lock:
        return jsonify(dict(_iot_connection))


@app.route("/api/iot-connection", methods=["POST"])
def set_iot_connection():
    """Connect or disconnect IoT device.
    Connect: { "action": "connect", "device_id": "...", "device_name": "...", "interval_sec": 60 }
    Disconnect: { "action": "disconnect" }
    """
    body = request.get_json(force=True)
    action = body.get("action", "connect")
    with _iot_conn_lock:
        if action == "connect":
            _iot_connection["connected"] = True
            _iot_connection["device_id"] = body.get("device_id", f"IOT-{random.randint(1000,9999)}")
            _iot_connection["device_name"] = body.get("device_name", "Smart Energy Meter")
            _iot_connection["connected_at"] = datetime.now().isoformat()
            _iot_connection["interval_sec"] = int(body.get("interval_sec", 60))
            # Also switch data mode to IoT
            with _data_mode_lock:
                _data_mode["mode"] = "iot"
            return jsonify({"status": "connected", **dict(_iot_connection)})
        else:
            _iot_connection["connected"] = False
            _iot_connection["device_id"] = None
            _iot_connection["device_name"] = None
            _iot_connection["connected_at"] = None
            # Switch back to manual mode
            with _data_mode_lock:
                _data_mode["mode"] = "manual"
            return jsonify({"status": "disconnected"})


# ---------------------------------------------------------------------------
# IoT Device Logs
# ---------------------------------------------------------------------------
def _iot_device_logger():
    """Background thread that generates IoT meter readings every interval_sec."""
    while True:
        try:
            with _iot_conn_lock:
                is_connected = _iot_connection["connected"]
                interval = _iot_connection["interval_sec"]
                device_id = _iot_connection["device_id"]

            if is_connected:
                now = datetime.now()
                log_entry = {
                    "timestamp": now.isoformat(),
                    "device_id": device_id,
                    "readings": {},
                }
                total_kwh = 0
                for bseed in BLOCK_SEEDS:
                    block_name = bseed["Name"]
                    reading = generate_energy_reading(block_name, now)
                    # Convert kW to kWh for the interval
                    kwh_interval = round(reading["Grid_Power_Draw_kW"] * (interval / 3600), 2)
                    log_entry["readings"][block_name] = {
                        "grid_kw": reading["Grid_Power_Draw_kW"],
                        "solar_kw": reading["Solar_Power_Generated_kW"],
                        "hvac_kw": reading["HVAC_Power_kW"],
                        "kwh_consumed": kwh_interval,
                    }
                    total_kwh += kwh_interval
                log_entry["total_kwh"] = round(total_kwh, 2)

                with _iot_logs_lock:
                    MEM_IOT_LOGS.append(log_entry)

            time.sleep(interval if is_connected else 5)
        except Exception as exc:
            print(f"[IoT Logger] ERROR: {exc}")
            time.sleep(5)


@app.route("/api/iot-logs", methods=["GET"])
def get_iot_logs():
    """Return IoT device logs.  ?limit=50  (default 50, max 500)"""
    limit = min(int(request.args.get("limit", 50)), 500)
    with _iot_logs_lock:
        logs = list(MEM_IOT_LOGS)
    logs.reverse()  # newest first
    return jsonify({
        "count": len(logs[:limit]),
        "total": len(logs),
        "logs": logs[:limit],
    })


@app.route("/api/iot-logs", methods=["DELETE"])
def clear_iot_logs():
    """Clear IoT device logs."""
    with _iot_logs_lock:
        MEM_IOT_LOGS.clear()
    return jsonify({"status": "ok", "cleared": True})


# ---------------------------------------------------------------------------
# Block Consumption Data  (Analysis Models)
# ---------------------------------------------------------------------------
@app.route("/api/block-consumption", methods=["GET"])
def get_block_consumption():
    """Return all saved block consumption records."""
    with _consumption_lock:
        return jsonify(list(MEM_BLOCK_CONSUMPTION))


@app.route("/api/block-consumption", methods=["POST"])
def save_block_consumption():
    """Save / update monthly block consumption.
    Body: { year, month, blocks: { "STME Block": kwh, ... } }
    """
    body = request.get_json(force=True)
    year = int(body.get("year", 2026))
    month = int(body.get("month", 1))
    blocks_data = body.get("blocks", {})
    rate = float(body.get("rate", 8))  # ₹/kWh
    saved = []
    with _consumption_lock:
        for block_name, kwh_val in blocks_data.items():
            kwh = float(kwh_val)
            # Remove old entry for same year/month/block
            MEM_BLOCK_CONSUMPTION[:] = [
                r for r in MEM_BLOCK_CONSUMPTION
                if not (r["year"] == year and r["month"] == month and r["block"] == block_name)
            ]
            record = {
                "year": year,
                "month": month,
                "block": block_name,
                "kwh": kwh,
                "cost": round(kwh * rate, 2),
                "rate": rate,
                "timestamp": datetime.now().isoformat(),
            }
            MEM_BLOCK_CONSUMPTION.append(record)
            saved.append(record)
    return jsonify({"status": "ok", "saved": len(saved), "records": saved})


@app.route("/api/sustainability-inputs", methods=["GET"])
def get_sustainability_inputs():
    """Return sustainability configuration entered from Data Management."""
    with _sustainability_lock:
        payload = dict(MEM_SUSTAINABILITY_INPUTS)
        payload["students_by_year"] = dict(MEM_SUSTAINABILITY_INPUTS.get("students_by_year", {}))
        payload["monthly_renewable_generation"] = list(MEM_SUSTAINABILITY_INPUTS.get("monthly_renewable_generation", []))
        payload["occupancy_schedule"] = dict(MEM_SUSTAINABILITY_INPUTS.get("occupancy_schedule", {}))
    return jsonify({"status": "ok", **payload})


@app.route("/api/sustainability-inputs", methods=["POST"])
def save_sustainability_inputs():
    """
    Save sustainability inputs from Data Management.
    Supported body keys:
      - verified_campus_area_m2
      - baseline_peak_kw
      - student_year, active_students
      - renewable_entry: {year, month, kwh}
      - occupancy_schedule: {"STME Block": 85, ...}
    """
    body = request.get_json(force=True) or {}

    with _sustainability_lock:
        if "verified_campus_area_m2" in body:
            v = body.get("verified_campus_area_m2")
            MEM_SUSTAINABILITY_INPUTS["verified_campus_area_m2"] = float(v) if v not in (None, "") else None

        if "baseline_peak_kw" in body:
            v = body.get("baseline_peak_kw")
            MEM_SUSTAINABILITY_INPUTS["baseline_peak_kw"] = float(v) if v not in (None, "") else None

        if "student_year" in body and "active_students" in body:
            sy = int(body.get("student_year"))
            sc = int(body.get("active_students"))
            MEM_SUSTAINABILITY_INPUTS.setdefault("students_by_year", {})[str(sy)] = sc

        if "renewable_entry" in body and isinstance(body.get("renewable_entry"), dict):
            re = body.get("renewable_entry")
            ry = int(re.get("year"))
            rm = int(re.get("month"))
            rk = float(re.get("kwh", 0))
            existing = MEM_SUSTAINABILITY_INPUTS.setdefault("monthly_renewable_generation", [])
            existing[:] = [x for x in existing if not (int(x.get("year", 0)) == ry and int(x.get("month", 0)) == rm)]
            existing.append({
                "year": ry,
                "month": rm,
                "kwh": round(rk, 2),
                "timestamp": datetime.now().isoformat(),
            })

        if "occupancy_schedule" in body and isinstance(body.get("occupancy_schedule"), dict):
            cleaned = {}
            for k, v in body.get("occupancy_schedule", {}).items():
                if v in (None, ""):
                    continue
                try:
                    pct = max(0.0, min(100.0, float(v)))
                    cleaned[str(k)] = round(pct, 2)
                except Exception:
                    continue
            MEM_SUSTAINABILITY_INPUTS["occupancy_schedule"] = cleaned

        payload = dict(MEM_SUSTAINABILITY_INPUTS)
        payload["students_by_year"] = dict(MEM_SUSTAINABILITY_INPUTS.get("students_by_year", {}))
        payload["monthly_renewable_generation"] = list(MEM_SUSTAINABILITY_INPUTS.get("monthly_renewable_generation", []))
        payload["occupancy_schedule"] = dict(MEM_SUSTAINABILITY_INPUTS.get("occupancy_schedule", {}))

    return jsonify({"status": "ok", **payload})


# ---------------------------------------------------------------------------
# Sustainability KPIs  (linked to Data Management)
# ---------------------------------------------------------------------------
def _month_key(year, month):
    return f"{int(year)}-{int(month):02d}"


def _month_days(year, month):
    if month in (1, 3, 5, 7, 8, 10, 12):
        return 31
    if month in (4, 6, 9, 11):
        return 30
    leap = (year % 4 == 0 and (year % 100 != 0 or year % 400 == 0))
    return 29 if leap else 28


def _as_period_label(year, month):
    return datetime(int(year), int(month), 1).strftime("%b %Y")


def _signed_pct(current, previous):
    if previous in (None, 0):
        return None
    return round(((current - previous) / abs(previous)) * 100, 1)


def _trend_word(delta_pct, lower_is_better):
    if delta_pct is None:
        return "stable"
    if lower_is_better:
        return "improved" if delta_pct < 0 else "worsened"
    return "improved" if delta_pct > 0 else "worsened"


def _aggregate_manual_monthly(records):
    grouped = {}
    for r in records:
        key = _month_key(r.get("year"), r.get("month"))
        if key not in grouped:
            grouped[key] = {
                "year": int(r.get("year", 0)),
                "month": int(r.get("month", 0)),
                "kwh": 0.0,
                "cost": 0.0,
            }
        grouped[key]["kwh"] += float(r.get("kwh", 0.0))
        grouped[key]["cost"] += float(r.get("cost", 0.0))
    return sorted(grouped.values(), key=lambda x: (x["year"], x["month"]))


def _kpi_item(kpi_id, title, value, unit, lower_is_better, delta_pct, formula, description, sparkline):
    return {
        "id": kpi_id,
        "title": title,
        "value": round(value, 2) if isinstance(value, (int, float)) else value,
        "unit": unit,
        "trend": _trend_word(delta_pct, lower_is_better),
        "delta_pct": abs(delta_pct) if isinstance(delta_pct, (int, float)) else None,
        "delta_signed_pct": delta_pct,
        "lower_is_better": lower_is_better,
        "formula": formula,
        "description": description,
        "sparkline": sparkline,
    }


@app.route("/api/sustainability-kpis", methods=["GET"])
def api_sustainability_kpis():
    """
    Sustainability KPI pack derived from Data Management mode:
      - manual mode -> /api/block-consumption records
      - iot mode    -> /api/iot-logs (last 24h, live)
    """
    with _data_mode_lock:
        mode = _data_mode.get("mode", "manual")

    fallback_students = int(float(os.getenv("CAMPUS_TOTAL_STUDENTS", "12000")))
    fallback_area_m2 = float(os.getenv("CAMPUS_AREA_M2", "120000"))
    fallback_baseline_peak_kw = float(os.getenv("BASELINE_PEAK_KW", "2400"))
    grid_emission_factor = float(os.getenv("GRID_EMISSION_FACTOR_KG_PER_KWH", "0.82"))
    default_load_factor = float(os.getenv("LOAD_FACTOR_ASSUMPTION", "0.45"))

    with _sustainability_lock:
        si = dict(MEM_SUSTAINABILITY_INPUTS)
        si_students = dict(MEM_SUSTAINABILITY_INPUTS.get("students_by_year", {}))
        si_renewable = list(MEM_SUSTAINABILITY_INPUTS.get("monthly_renewable_generation", []))
        si_occupancy = dict(MEM_SUSTAINABILITY_INPUTS.get("occupancy_schedule", {}))

    campus_area_m2 = float(si.get("verified_campus_area_m2") or fallback_area_m2)
    baseline_peak_kw = float(si.get("baseline_peak_kw") or fallback_baseline_peak_kw)

    occ_vals = [float(v) / 100.0 for v in si_occupancy.values() if float(v) > 0]
    occupancy_factor = (sum(occ_vals) / len(occ_vals)) if occ_vals else 1.0

    requirements = {
        "provided": {
            "campus_students": fallback_students,
            "campus_area_m2": campus_area_m2,
            "baseline_peak_kw": baseline_peak_kw,
            "grid_emission_factor_kg_per_kwh": grid_emission_factor,
            "occupancy_factor": round(occupancy_factor, 3),
        },
        "needed_for_full_accuracy": [
            "Monthly solar generation (kWh) per block/month in Data Management",
            "Campus area (m²) verified by facilities team",
            "Active student/headcount by academic year",
            "Baseline peak demand (kW) from historical utility max-demand bills",
            "Block-level occupancy schedule (optional for normalization)",
        ],
    }

    # -----------------------
    # MANUAL mode KPIs
    # -----------------------
    if mode == "manual":
        with _consumption_lock:
            records = list(MEM_BLOCK_CONSUMPTION)

        monthly = _aggregate_manual_monthly(records)
        if not monthly:
            return jsonify({
                "status": "ok",
                "mode": "manual",
                "period": None,
                "kpis": [],
                "message": "No manual entries found. Add monthly block consumption in Data Management.",
                "requirements": requirements,
            })

        latest = monthly[-1]
        previous = monthly[-2] if len(monthly) > 1 else None
        latest_kwh = latest["kwh"]
        prev_kwh = previous["kwh"] if previous else None

        students_for_latest_year = int(si_students.get(str(latest["year"]), fallback_students))

        renewable_map = {
            _month_key(int(x.get("year", 0)), int(x.get("month", 0))): float(x.get("kwh", 0.0))
            for x in si_renewable
        }
        latest_month_key = _month_key(latest["year"], latest["month"])
        prev_month_key = _month_key(previous["year"], previous["month"]) if previous else None
        latest_renewable_kwh = renewable_map.get(latest_month_key)
        prev_renewable_kwh = renewable_map.get(prev_month_key) if prev_month_key else None

        avg_monthly_kwh = sum(m["kwh"] for m in monthly) / max(len(monthly), 1)
        annualised_kwh = avg_monthly_kwh * 12

        kwh_per_student = annualised_kwh / max(students_for_latest_year, 1)
        energy_intensity = annualised_kwh / max((campus_area_m2 * max(occupancy_factor, 0.1)), 1)

        mdays = _month_days(latest["year"], latest["month"])
        estimated_peak_kw = latest_kwh / max((mdays * 24 * default_load_factor), 1)
        peak_reduction_pct = ((baseline_peak_kw - estimated_peak_kw) / max(baseline_peak_kw, 1)) * 100

        renewable_pct = None
        renewable_delta = None
        if latest_renewable_kwh is not None and latest_kwh > 0:
            renewable_pct = (latest_renewable_kwh / latest_kwh) * 100
            if prev_renewable_kwh is not None and previous and previous["kwh"] > 0:
                prev_pct = (prev_renewable_kwh / previous["kwh"]) * 100
                renewable_delta = _signed_pct(renewable_pct, prev_pct)

        spark_labels = [_as_period_label(m["year"], m["month"]) for m in monthly[-6:]]
        spark_kwh_values = [round(m["kwh"], 1) for m in monthly[-6:]]
        spark_intensity_values = [
            round((m["kwh"] * 12) / max((campus_area_m2 * max(occupancy_factor, 0.1)), 1), 2)
            for m in monthly[-6:]
        ]
        spark_peak_values = [
            round((m["kwh"] / max((_month_days(m["year"], m["month"]) * 24 * default_load_factor), 1)), 2)
            for m in monthly[-6:]
        ]
        spark_renew_values = []
        for m in monthly[-6:]:
            mk = _month_key(m["year"], m["month"])
            rk = renewable_map.get(mk)
            spark_renew_values.append(round((rk / m["kwh"] * 100), 2) if rk is not None and m["kwh"] > 0 else None)

        kpis = [
            _kpi_item(
                "kwh_per_student",
                "kWh per Student",
                kwh_per_student,
                "kWh/student-year",
                True,
                _signed_pct(latest_kwh, prev_kwh),
                "(Average Monthly Campus Consumption × 12) ÷ Total Students",
                "Annualized campus consumption normalized by student population.",
                {"labels": spark_labels, "values": spark_kwh_values},
            ),
            _kpi_item(
                "renewable_pct",
                "Renewable % Contribution",
                renewable_pct if renewable_pct is not None else "N/A",
                "%",
                False,
                renewable_delta,
                "(Renewable Generation kWh ÷ Total Consumption kWh) × 100",
                "Uses monthly renewable generation entered in Data Management.",
                {"labels": spark_labels, "values": spark_renew_values},
            ),
            _kpi_item(
                "peak_reduction",
                "Peak Load Reduction",
                peak_reduction_pct,
                "%",
                False,
                None,
                "((Baseline Peak kW − Current Peak kW) ÷ Baseline Peak kW) × 100",
                "Current peak is estimated from monthly consumption and load-factor assumption.",
                {"labels": spark_labels, "values": spark_peak_values},
            ),
            _kpi_item(
                "energy_intensity",
                "Energy Intensity",
                energy_intensity,
                "kWh/m²-year",
                True,
                _signed_pct(latest_kwh, prev_kwh),
                "(Average Monthly Campus Consumption × 12) ÷ (Campus Area × Occupancy Factor)",
                "Annualized energy consumed per square meter with optional occupancy normalization.",
                {"labels": spark_labels, "values": spark_intensity_values},
            ),
        ]

        return jsonify({
            "status": "ok",
            "mode": "manual",
            "period": _as_period_label(latest["year"], latest["month"]),
            "latest_month_total_kwh": round(latest_kwh, 2),
            "latest_month_total_cost_inr": round(latest["cost"], 2),
            "renewable_pct_available": renewable_pct is not None,
            "assumptions": {
                "load_factor_assumption": default_load_factor,
                "baseline_peak_kw": baseline_peak_kw,
                "students_for_latest_year": students_for_latest_year,
                "occupancy_factor": round(occupancy_factor, 3),
            },
            "kpis": kpis,
            "requirements": requirements,
        })

    # -----------------------
    # IOT mode KPIs (24h)
    # -----------------------
    with _iot_logs_lock:
        logs = list(MEM_IOT_LOGS)
    if not logs:
        return jsonify({
            "status": "ok",
            "mode": "iot",
            "period": "Last 24h",
            "kpis": [],
            "message": "No IoT logs available yet. Connect device in Data Management.",
            "requirements": requirements,
        })

    with _iot_conn_lock:
        interval_sec = max(int(_iot_connection.get("interval_sec", 60)), 1)

    now = datetime.now()
    last_24h = []
    for lg in logs:
        try:
            ts = datetime.fromisoformat(lg.get("timestamp"))
            if ts >= now - timedelta(hours=24):
                last_24h.append(lg)
        except Exception:
            continue

    if not last_24h:
        last_24h = logs[-100:]

    total_grid_kwh = 0.0
    total_solar_kwh = 0.0
    peak_grid_kw = 0.0
    time_buckets = {}

    for lg in last_24h:
        try:
            ts = datetime.fromisoformat(lg.get("timestamp"))
        except Exception:
            ts = now

        hour_label = ts.strftime("%H:00")
        if hour_label not in time_buckets:
            time_buckets[hour_label] = {"grid": 0.0, "solar": 0.0, "count": 0}

        for r in (lg.get("readings") or {}).values():
            gkw = float(r.get("grid_kw", 0.0))
            skw = float(r.get("solar_kw", 0.0))
            total_grid_kwh += gkw * (interval_sec / 3600)
            total_solar_kwh += skw * (interval_sec / 3600)
            peak_grid_kw = max(peak_grid_kw, gkw)
            time_buckets[hour_label]["grid"] += gkw
            time_buckets[hour_label]["solar"] += skw
            time_buckets[hour_label]["count"] += 1

    total_kwh = total_grid_kwh + total_solar_kwh
    renewable_pct = (total_solar_kwh / total_kwh * 100) if total_kwh > 0 else 0.0

    # Annualize 24h profile for normalization KPIs
    current_year = datetime.now().year
    students_for_year = int(si_students.get(str(current_year), fallback_students))
    annualised_kwh = total_kwh * 365
    kwh_per_student = annualised_kwh / max(students_for_year, 1)
    energy_intensity = annualised_kwh / max((campus_area_m2 * max(occupancy_factor, 0.1)), 1)
    peak_reduction_pct = ((baseline_peak_kw - peak_grid_kw) / max(baseline_peak_kw, 1)) * 100

    hourly = sorted(time_buckets.items(), key=lambda x: x[0])[-6:]
    spark_labels = [h[0] for h in hourly]
    spark_grid_values = [round((h[1]["grid"] / max(h[1]["count"], 1)), 2) for h in hourly]
    spark_ren_values = [
        round((h[1]["solar"] / max((h[1]["grid"] + h[1]["solar"]), 1)) * 100, 2)
        for h in hourly
    ]

    kpis = [
        _kpi_item(
            "kwh_per_student",
            "kWh per Student",
            kwh_per_student,
            "kWh/student-year",
            True,
            None,
            "(Last 24h Total kWh × 365) ÷ Total Students",
            "Annualized from last 24h IoT profile.",
            {"labels": spark_labels, "values": spark_grid_values},
        ),
        _kpi_item(
            "renewable_pct",
            "Renewable % Contribution",
            renewable_pct,
            "%",
            False,
            None,
            "(Solar Energy kWh ÷ Total Energy kWh) × 100",
            "Share of renewable contribution over the measured period.",
            {"labels": spark_labels, "values": spark_ren_values},
        ),
        _kpi_item(
            "peak_reduction",
            "Peak Load Reduction",
            peak_reduction_pct,
            "%",
            False,
            None,
            "((Baseline Peak kW − Current Peak kW) ÷ Baseline Peak kW) × 100",
            "Current peak derived from max IoT grid draw in selected period.",
            {"labels": spark_labels, "values": spark_grid_values},
        ),
        _kpi_item(
            "energy_intensity",
            "Energy Intensity",
            energy_intensity,
            "kWh/m²-year",
            True,
            None,
            "(Last 24h Total kWh × 365) ÷ (Campus Area × Occupancy Factor)",
            "Annualized consumption per square meter based on IoT telemetry with occupancy normalization.",
            {"labels": spark_labels, "values": spark_grid_values},
        ),
    ]

    return jsonify({
        "status": "ok",
        "mode": "iot",
        "period": "Last 24h",
        "total_grid_kwh": round(total_grid_kwh, 2),
        "total_solar_kwh": round(total_solar_kwh, 2),
        "peak_grid_kw": round(peak_grid_kw, 2),
        "assumptions": {
            "students_for_year": students_for_year,
            "baseline_peak_kw": baseline_peak_kw,
            "occupancy_factor": round(occupancy_factor, 3),
        },
        "kpis": kpis,
        "requirements": requirements,
    })


# ---------------------------------------------------------------------------
# Demand Forecast  (Analysis Models)
# ---------------------------------------------------------------------------
@app.route("/api/forecast", methods=["GET"])
def get_forecast():
    """Return the full energy demand forecast report."""
    try:
        report = _run_forecast()
        return jsonify(report)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


# ---------------------------------------------------------------------------
# Student Portal API  — Full MongoDB-backed with rich mock data
# ---------------------------------------------------------------------------

_student_data_lock = threading.Lock()

# ── In-memory fallback stores ────────────────────────────
MEM_STUDENT_PROFILES = {}
MEM_STUDENT_FEED = []
MEM_STUDENT_CHALLENGES = []
MEM_STUDENT_LEADERBOARD = []
MEM_STUDENT_TASKS = []
MEM_STUDENT_BADGES = {"earned": [], "locked": []}
MEM_STUDENT_SHOP = []
MEM_STUDENT_EVENTS = []
MEM_STUDENT_NOTIFICATIONS = []
MEM_STUDENT_TRANSACTIONS = []
MEM_STUDENT_SCAN_HISTORY = []
MEM_STUDENT_REDEMPTIONS = []
MEM_STUDENT_ANALYTICS = {}

# ── Collection names ─────────────────────────────────────
_STU_COLLECTIONS = [
    "student_profiles", "student_leaderboard", "student_challenges",
    "student_feed", "student_transactions", "student_tasks",
    "student_badges", "student_shop", "student_events",
    "student_notifications", "student_scan_history", "student_redemptions",
    "student_analytics",
]


def _seed_student_data():
    """Seed comprehensive mock data into MongoDB (or in-memory fallback).
       Idempotent: skips if student_profiles already has data."""
    global MEM_STUDENT_PROFILES, MEM_STUDENT_LEADERBOARD, MEM_STUDENT_CHALLENGES
    global MEM_STUDENT_FEED, MEM_STUDENT_TASKS, MEM_STUDENT_BADGES
    global MEM_STUDENT_SHOP, MEM_STUDENT_EVENTS, MEM_STUDENT_NOTIFICATIONS
    global MEM_STUDENT_TRANSACTIONS, MEM_STUDENT_SCAN_HISTORY
    global MEM_STUDENT_REDEMPTIONS, MEM_STUDENT_ANALYTICS

    # ── 1. Leaderboard (15 students) ────────────────────
    leaderboard = [
        {"rank": 1,  "name": "Neha Kulkarni",  "initials": "NK", "dept": "MPSTME",       "coins": 5120, "color": "#b8a042", "streak": 18, "scans": 31},
        {"rank": 2,  "name": "Arjun Shah",      "initials": "AS", "dept": "MBA",           "coins": 4980, "color": "#5a9ba5", "streak": 15, "scans": 27},
        {"rank": 3,  "name": "Priya Rathod",    "initials": "PR", "dept": "MPSTME",       "coins": 4820, "color": "#4a9b6d", "is_user": True, "streak": 12, "scans": 23},
        {"rank": 4,  "name": "Rohan Mehta",     "initials": "RM", "dept": "Architecture",  "coins": 4100, "color": "#8b7ea8", "streak": 9,  "scans": 19},
        {"rank": 5,  "name": "Kavya Singh",     "initials": "KS", "dept": "Law",           "coins": 3850, "color": "#c17a5e", "streak": 14, "scans": 16},
        {"rank": 6,  "name": "Ishan Patel",     "initials": "IP", "dept": "Pharmacy",      "coins": 3600, "color": "#7aa87a", "streak": 7,  "scans": 14},
        {"rank": 7,  "name": "Sneha Sharma",    "initials": "SS", "dept": "Science",       "coins": 3420, "color": "#8a8d87", "streak": 11, "scans": 12},
        {"rank": 8,  "name": "Aman Jain",       "initials": "AJ", "dept": "Commerce",      "coins": 3100, "color": "#8a8d87", "streak": 6,  "scans": 10},
        {"rank": 9,  "name": "Tanya Gupta",     "initials": "TG", "dept": "MPSTME",       "coins": 2950, "color": "#8a8d87", "streak": 8,  "scans": 9},
        {"rank": 10, "name": "Varun Kumar",     "initials": "VK", "dept": "MBA",           "coins": 2880, "color": "#8a8d87", "streak": 5,  "scans": 7},
        {"rank": 11, "name": "Diya Nair",       "initials": "DN", "dept": "Science",       "coins": 2640, "color": "#8a8d87", "streak": 3,  "scans": 6},
        {"rank": 12, "name": "Kabir Deshmukh",  "initials": "KD", "dept": "Architecture",  "coins": 2510, "color": "#8a8d87", "streak": 4,  "scans": 5},
        {"rank": 13, "name": "Ananya Rao",      "initials": "AR", "dept": "Law",           "coins": 2300, "color": "#8a8d87", "streak": 2,  "scans": 4},
        {"rank": 14, "name": "Sahil Verma",     "initials": "SV", "dept": "Pharmacy",      "coins": 2100, "color": "#8a8d87", "streak": 1,  "scans": 3},
        {"rank": 15, "name": "Meera Joshi",     "initials": "MJ", "dept": "Commerce",      "coins": 1950, "color": "#8a8d87", "streak": 2,  "scans": 2},
    ]
    MEM_STUDENT_LEADERBOARD = leaderboard

    # ── 2. Challenges (10 items) ────────────────────────
    challenges = [
        {"id": "c1",  "title": "Dark Hour Friday",     "desc": "Power down non-essentials for 1hr.",                  "reward": 200, "progress": 60, "deadline": "Fri 5PM",  "timer": "3 days left",  "color": "coral",   "category": "Campus-Wide"},
        {"id": "c2",  "title": "AI Scanner Pro",        "desc": "Submit 5 verified waste scans using AI.",             "reward": 150, "progress": 60, "deadline": "Weekly",   "timer": "4 days left",  "color": "accent",  "category": "Weekly",  "progress_text": "3/5 scans"},
        {"id": "c3",  "title": "Streak Keeper",         "desc": "Login 7 days straight to earn bonus.",                "reward": 100, "progress": 71, "deadline": "Daily",    "timer": "5hrs left",    "color": "cyan",    "category": "Daily",   "progress_text": "5/7 days"},
        {"id": "c4",  "title": "Lab Watchdog",          "desc": "Report 3 lab waste incidents via Scanner.",           "reward": 250, "progress": 33, "deadline": "Weekly",   "timer": "4 days left",  "color": "violet",  "category": "Weekly",  "progress_text": "1/3 completed"},
        {"id": "c5",  "title": "Solar Peak Chaser",     "desc": "Open app during 5 solar peak periods.",               "reward": 120, "progress": 40, "deadline": "Daily",    "timer": "Today",        "color": "yellow",  "category": "Daily",   "progress_text": "2/5 completed"},
        {"id": "c6",  "title": "Dept Energy Battle",    "desc": "Help MPSTME reach 500kWh savings before month-end.",  "reward": 300, "progress": 68, "deadline": "Monthly",  "timer": "19 days left", "color": "coral",   "category": "Monthly", "progress_text": "340/500 kWh"},
        {"id": "c7",  "title": "Zero-Waste Wednesday",  "desc": "No single-use plastics on campus for a day.",         "reward": 180, "progress": 0,  "deadline": "Wed 11PM", "timer": "5 days left",  "color": "accent",  "category": "Campus-Wide"},
        {"id": "c8",  "title": "EV Charger Scheduler",  "desc": "Schedule 3 EV charges during solar surplus.",         "reward": 160, "progress": 33, "deadline": "Weekly",   "timer": "3 days left",  "color": "cyan",    "category": "Weekly",  "progress_text": "1/3 done"},
        {"id": "c9",  "title": "Report Water Leak",     "desc": "Find and report a water leakage on campus.",          "reward": 200, "progress": 0,  "deadline": "Anytime",  "timer": "Ongoing",      "color": "violet",  "category": "Special"},
        {"id": "c10", "title": "Green Commuter",        "desc": "Log 5 days of carpool / public transport use.",       "reward": 220, "progress": 20, "deadline": "Monthly",  "timer": "24 days left", "color": "yellow",  "category": "Monthly", "progress_text": "1/5 days"},
    ]
    MEM_STUDENT_CHALLENGES = challenges

    # ── 3. Tasks (25 tasks — daily, weekly, campus-wide) ─
    tasks = [
        # Daily tasks
        {"id": "t1",  "title": "Morning Solar Check",      "desc": "Open the app and view solar dashboard between 8-10 AM.",     "reward": 30,  "category": "daily",   "icon": "☀️", "completed": False, "repeatable": True},
        {"id": "t2",  "title": "Report Idle Lights",        "desc": "Scan and report any unoccupied room with lights on.",        "reward": 50,  "category": "daily",   "icon": "💡", "completed": False, "repeatable": True},
        {"id": "t3",  "title": "AC Efficiency Check",       "desc": "Check if any classroom AC is running below 24°C.",           "reward": 40,  "category": "daily",   "icon": "❄️", "completed": False, "repeatable": True},
        {"id": "t4",  "title": "Campus Walk Scan",          "desc": "Do a 10-min campus walk and submit 1 AI scan.",              "reward": 60,  "category": "daily",   "icon": "🚶", "completed": True,  "repeatable": True},
        {"id": "t5",  "title": "Share Green Tip",           "desc": "Post an energy-saving tip on the campus feed.",              "reward": 25,  "category": "daily",   "icon": "📢", "completed": False, "repeatable": True},
        {"id": "t6",  "title": "Peak Hour Awareness",       "desc": "Avoid using high-power appliances between 2-4 PM.",         "reward": 35,  "category": "daily",   "icon": "⚡", "completed": False, "repeatable": True},
        {"id": "t7",  "title": "Refill, Don't Rebuy",       "desc": "Use a reusable water bottle today — log it here.",           "reward": 20,  "category": "daily",   "icon": "🍶", "completed": True,  "repeatable": True},
        # Weekly tasks
        {"id": "t8",  "title": "Weekly Energy Report",      "desc": "View your full weekly analytics page.",                      "reward": 80,  "category": "weekly",  "icon": "📊", "completed": False, "repeatable": True},
        {"id": "t9",  "title": "5 Quick Reports",           "desc": "Submit 5 quick waste reports this week.",                    "reward": 100, "category": "weekly",  "icon": "📋", "completed": False, "repeatable": True,  "progress": 2, "target": 5},
        {"id": "t10", "title": "Join a Challenge",          "desc": "Participate in at least 1 active challenge.",                "reward": 60,  "category": "weekly",  "icon": "🎯", "completed": True,  "repeatable": True},
        {"id": "t11", "title": "Refer a Friend",            "desc": "Invite a classmate to join CampusZero.",                     "reward": 150, "category": "weekly",  "icon": "👥", "completed": False, "repeatable": True},
        {"id": "t12", "title": "Call Center Hero",          "desc": "Accept and complete 2 AI voice agent calls.",                "reward": 120, "category": "weekly",  "icon": "📞", "completed": False, "repeatable": True,  "progress": 1, "target": 2},
        {"id": "t13", "title": "Lab Energy Audit",          "desc": "Visit 2 labs and scan for energy waste.",                    "reward": 130, "category": "weekly",  "icon": "🧪", "completed": False, "repeatable": True,  "progress": 0, "target": 2},
        {"id": "t14", "title": "Leaderboard Climb",         "desc": "Move up at least 1 rank on the leaderboard.",                "reward": 100, "category": "weekly",  "icon": "📈", "completed": False, "repeatable": True},
        # Campus-wide tasks
        {"id": "t15", "title": "Plant a Sapling",           "desc": "Participate in the campus tree planting drive.",              "reward": 200, "category": "campus",  "icon": "🌱", "completed": False, "repeatable": False},
        {"id": "t16", "title": "E-Waste Collection",        "desc": "Drop off old electronics at the e-waste bin.",               "reward": 180, "category": "campus",  "icon": "♻️", "completed": False, "repeatable": False},
        {"id": "t17", "title": "Solar Panel Tour",          "desc": "Attend the rooftop solar tour this Saturday.",               "reward": 250, "category": "campus",  "icon": "🔆", "completed": False, "repeatable": False},
        {"id": "t18", "title": "Green Ideas Board",         "desc": "Submit a sustainability idea to the campus board.",           "reward": 150, "category": "campus",  "icon": "💡", "completed": False, "repeatable": False},
        {"id": "t19", "title": "Zero-Carbon Commute Day",   "desc": "Walk, cycle, or carpool to campus for one day.",             "reward": 100, "category": "campus",  "icon": "🚲", "completed": True,  "repeatable": False},
        {"id": "t20", "title": "Water Audit Volunteer",     "desc": "Help the facilities team audit water usage.",                "reward": 300, "category": "campus",  "icon": "💧", "completed": False, "repeatable": False},
        {"id": "t21", "title": "Green Mentor Session",      "desc": "Mentor a junior student on energy savings.",                 "reward": 200, "category": "campus",  "icon": "🎓", "completed": False, "repeatable": False},
        {"id": "t22", "title": "Classroom Lights-Off Patrol","desc": "Check 5 classrooms after 6 PM and turn off lights.",        "reward": 120, "category": "daily",   "icon": "🔦", "completed": False, "repeatable": True},
        {"id": "t23", "title": "Smart Plug Setup",          "desc": "Help configure IoT smart plugs in your hostel.",             "reward": 180, "category": "campus",  "icon": "🔌", "completed": False, "repeatable": False},
        {"id": "t24", "title": "Feedback Fridays",          "desc": "Submit sustainability feedback every Friday.",               "reward": 40,  "category": "weekly",  "icon": "✍️", "completed": False, "repeatable": True},
        {"id": "t25", "title": "Carbon Footprint Quiz",     "desc": "Complete the weekly carbon literacy quiz.",                  "reward": 70,  "category": "weekly",  "icon": "🧠", "completed": False, "repeatable": True},
    ]
    MEM_STUDENT_TASKS = tasks

    # ── 4. Feed posts (10) ───────────────────────────────
    feed = [
        {"id": "f1",  "user": "Arjun Shah",     "initials": "AS", "dept": "MBA",          "time": "5min ago",  "content": "Caught empty classroom lights in Block B — reported via AI Scanner! 💡",                    "coins": 75,  "likes": 3,  "color": "#5a9ba5"},
        {"id": "f2",  "user": "Neha Kulkarni",  "initials": "NK", "dept": "MPSTME",       "time": "12min ago", "content": "Lab AC running 2hrs with zero occupancy. Facilities called, resolved in 10 min! ❄️",          "coins": 150, "likes": 8,  "color": "#b8a042"},
        {"id": "f3",  "user": "Campus System",  "initials": "C0", "dept": "Automated",    "time": "18min ago", "content": "Solar panels generating 124% of current demand. Surplus being routed to EV Bay 3.",           "coins": 0,   "likes": 2,  "color": "#4a9b6d", "is_system": True},
        {"id": "f4",  "user": "Priya Rathod",   "initials": "PR", "dept": "MPSTME",       "time": "1hr ago",   "content": "Completed Streak Warrior challenge — 10 day streak! 🔥",                                      "coins": 100, "likes": 12, "color": "#4a9b6d", "is_user": True},
        {"id": "f5",  "user": "Rohan Mehta",    "initials": "RM", "dept": "Architecture",  "time": "2hrs ago",  "content": "5th AI scan this week → unlocked Scanner Pro badge! 📸",                                      "coins": 200, "likes": 7,  "color": "#8b7ea8"},
        {"id": "f6",  "user": "Kavya Singh",    "initials": "KS", "dept": "Law",           "time": "3hrs ago",  "content": "Planted 3 saplings during today's Green Drive. Small steps, big impact! 🌳",                  "coins": 200, "likes": 15, "color": "#c17a5e"},
        {"id": "f7",  "user": "Ishan Patel",    "initials": "IP", "dept": "Pharmacy",      "time": "4hrs ago",  "content": "Just redeemed my Starbucks voucher with GreenCoins. This system is amazing ☕",                "coins": 0,   "likes": 9,  "color": "#7aa87a"},
        {"id": "f8",  "user": "Campus System",  "initials": "C0", "dept": "Automated",    "time": "5hrs ago",  "content": "Daily campus energy usage is 11% below target. Keep it up NMIMS! 🎉",                         "coins": 0,   "likes": 22, "color": "#4a9b6d", "is_system": True},
        {"id": "f9",  "user": "Sneha Sharma",   "initials": "SS", "dept": "Science",       "time": "6hrs ago",  "content": "Reported water leak near Block A fountain. Fixed within 30 mins! 💧",                         "coins": 200, "likes": 11, "color": "#8a8d87"},
        {"id": "f10", "user": "Aman Jain",      "initials": "AJ", "dept": "Commerce",      "time": "Yesterday", "content": "E-waste collection drive was a hit! We collected 47 kg of old electronics ♻️",                 "coins": 180, "likes": 18, "color": "#8a8d87"},
    ]
    MEM_STUDENT_FEED = feed

    # ── 5. Badges ────────────────────────────────────────
    badges = {
        "earned": [
            {"emoji": "🌍", "name": "Eco Champion",   "desc": "Reach top 10 on campus leaderboard.",     "earned_date": "2025-01-15"},
            {"emoji": "🔦", "name": "Light Watcher",  "desc": "Reported 10 unneeded lights.",             "earned_date": "2025-01-20"},
            {"emoji": "❄️", "name": "AC Guardian",    "desc": "Reported empty running ACs.",              "earned_date": "2025-02-01"},
            {"emoji": "🔥", "name": "Streak Warrior", "desc": "Maintained a 10-day streak.",              "earned_date": "2025-02-10"},
            {"emoji": "🏆", "name": "Week Champion",  "desc": "Scored highest in MPSTME a week.",         "earned_date": "2025-02-14"},
            {"emoji": "📸", "name": "Scanner Pro",    "desc": "Completed 20 verified scans.",             "earned_date": "2025-03-01"},
            {"emoji": "☀️", "name": "Solar Star",     "desc": "Checked app during solar peaks.",          "earned_date": "2025-03-05"},
            {"emoji": "🧪", "name": "Lab Sentinel",   "desc": "Conserved lab energy.",                    "earned_date": "2025-03-10"},
            {"emoji": "🌱", "name": "First Step",     "desc": "Earned your first 100 coins.",             "earned_date": "2024-12-01"},
        ],
        "locked": [
            {"emoji": "🔒", "name": "Water Warden",     "desc": "Report 5 water leakages.",               "requirement": "0/5 reports"},
            {"emoji": "🔒", "name": "Energy Ninja",      "desc": "Complete 50 green actions.",             "requirement": "23/50 actions"},
            {"emoji": "🔒", "name": "Carbon Crusher",    "desc": "Save 500kg of CO₂.",                    "requirement": "142/500 kg"},
            {"emoji": "🔒", "name": "Green Mentor",      "desc": "Refer 3 students.",                     "requirement": "0/3 referrals"},
            {"emoji": "🔒", "name": "Challenge Master",  "desc": "Complete 20 challenges.",                "requirement": "4/20 challenges"},
            {"emoji": "🔒", "name": "Apex Guardian",     "desc": "Reach Rank #1 overall.",                 "requirement": "Current: #3"},
            {"emoji": "🔒", "name": "Tree Hugger",       "desc": "Plant 10 saplings on campus.",           "requirement": "3/10 planted"},
            {"emoji": "🔒", "name": "Night Owl Auditor", "desc": "Report 5 after-hours energy wastes.",    "requirement": "1/5 reports"},
        ],
    }
    MEM_STUDENT_BADGES = badges

    # ── 6. Shop rewards (15 items) ───────────────────────
    shop = [
        {"id": "s1",  "emoji": "🍽️", "name": "Canteen 20% Off",       "desc": "Valid at Main Canteen today",          "price": 50,   "category": "food",       "stock": 100},
        {"id": "s2",  "emoji": "🖨️", "name": "50 Print Pages",        "desc": "Added to Library ID instantly",         "price": 200,  "category": "academic",   "stock": 50},
        {"id": "s3",  "emoji": "🛏️", "name": "Priority Hostel",       "desc": "Extra points for room choice",          "price": 500,  "category": "campus",     "stock": 10},
        {"id": "s4",  "emoji": "📱", "name": "Zomato ₹100",           "desc": "Gift voucher via email",                "price": 300,  "category": "food",       "stock": 30},
        {"id": "s5",  "emoji": "🎟️", "name": "Event Priority",        "desc": "VIP seating at next event",             "price": 250,  "category": "campus",     "stock": 20},
        {"id": "s6",  "emoji": "📚", "name": "Elective Priority",     "desc": "Get first pick for tech electives",     "price": 800,  "category": "academic",   "stock": 0, "out_of_stock": True},
        {"id": "s7",  "emoji": "🎬", "name": "BookMyShow ₹150",       "desc": "Digital movie voucher",                 "price": 400,  "category": "entertainment", "stock": 25},
        {"id": "s8",  "emoji": "☕", "name": "Starbucks ₹200",        "desc": "Coffee on CampusZero",                  "price": 350,  "category": "food",       "stock": 40},
        {"id": "s9",  "emoji": "📶", "name": "WiFi +100MB",           "desc": "Boost your daily quota",                "price": 150,  "category": "campus",     "stock": 200},
        {"id": "s10", "emoji": "🎧", "name": "Spotify 1-Week",        "desc": "Premium access for 7 days",             "price": 500,  "category": "entertainment", "stock": 15},
        {"id": "s11", "emoji": "🏋️", "name": "Gym Day Pass",          "desc": "Free gym access for a day",             "price": 100,  "category": "campus",     "stock": 50},
        {"id": "s12", "emoji": "🎽", "name": "CampusZero T-Shirt",    "desc": "Exclusive green campus merch",           "price": 600,  "category": "merch",      "stock": 30},
        {"id": "s13", "emoji": "🌳", "name": "Plant-a-Tree Certificate","desc": "A tree planted in your name",          "price": 250,  "category": "eco",        "stock": 999},
        {"id": "s14", "emoji": "🎮", "name": "Gaming Zone 1hr",       "desc": "Free gaming session at rec room",        "price": 200,  "category": "entertainment", "stock": 20},
        {"id": "s15", "emoji": "💻", "name": "Co-Working Space Pass", "desc": "Priority seat for 1 week",              "price": 450,  "category": "academic",   "stock": 10},
    ]
    MEM_STUDENT_SHOP = shop

    # ── 7. Events (6) ───────────────────────────────────
    events = [
        {"id": "e1", "icon": "🌱", "title": "Energy Hackathon",        "time": "Friday · 10 AM",         "location": "MPSTME Auditorium",  "desc": "48-hr hackathon on green tech solutions",        "reward": 500},
        {"id": "e2", "icon": "🗣️", "title": "Green Panel Talk",        "time": "Next Mon · 2 PM",        "location": "Seminar Hall B",     "desc": "Industry experts discuss net-zero campuses",      "reward": 100},
        {"id": "e3", "icon": "♻️", "title": "E-Waste Drive",           "time": "Next Wed · All Day",      "location": "Main Gate",          "desc": "Collect & recycle old electronics",               "reward": 180},
        {"id": "e4", "icon": "🔬", "title": "Green Lab Workshop",      "time": "Next Thu · 11 AM",       "location": "Chem Lab 204",       "desc": "Learn energy-efficient lab practices",            "reward": 150},
        {"id": "e5", "icon": "🏃", "title": "Campus Green Run 5K",     "time": "Next Sat · 6 AM",        "location": "Sports Ground",      "desc": "Run for sustainability awareness",                "reward": 200},
        {"id": "e6", "icon": "🎤", "title": "Student TED Talk: Net-Zero","time": "In 2 Weeks · 5 PM",    "location": "NMIMS Amphitheatre", "desc": "Student speakers on campus sustainability",       "reward": 120},
    ]
    MEM_STUDENT_EVENTS = events

    # ── 8. Notifications (8) ────────────────────────────
    notifications = [
        {"id": "n1", "icon": "🔥", "title": "Streak at Risk!",        "desc": "Log a green action in 6 hours.",         "time": "2hrs ago",       "unread": True},
        {"id": "n2", "icon": "🏆", "title": "You entered Top 3!",     "desc": "Ranked #3 on campus leaderboard.",       "time": "4hrs ago",       "unread": True},
        {"id": "n3", "icon": "📞", "title": "Missed Call",            "desc": "CampusZero AI called about Lab 204.",     "time": "Today 10:42",    "unread": True},
        {"id": "n4", "icon": "💡", "title": "Waste Near You",         "desc": "Report Classroom B-204 lights.",          "time": "Yesterday",      "unread": False},
        {"id": "n5", "icon": "☀️", "title": "Solar Peak Alert",       "desc": "Peak generation in 30 mins.",            "time": "Yesterday",      "unread": False},
        {"id": "n6", "icon": "🎯", "title": "New Challenge!",         "desc": "Zero-Waste Wednesday just launched.",     "time": "Yesterday",      "unread": False},
        {"id": "n7", "icon": "🪙", "title": "Coins Earned +150",      "desc": "Lab waste scan verified by facilities.",  "time": "2 days ago",     "unread": False},
        {"id": "n8", "icon": "🎖️", "title": "Badge Unlocked!",       "desc": "You earned the Lab Sentinel badge.",      "time": "3 days ago",     "unread": False},
    ]
    MEM_STUDENT_NOTIFICATIONS = notifications

    # ── 9. Transactions (12) ────────────────────────────
    transactions = [
        {"icon": "📸", "title": "AI Scanner — Lab Waste Report",  "sub": "Chemistry Lab",   "amount": 150, "type": "earn",  "time": "Today",       "student_id": "default", "created_at": datetime.now()},
        {"icon": "🎯", "title": "Challenge Complete — Streak Keeper","sub": "7-day streak",  "amount": 100, "type": "earn",  "time": "Today",       "student_id": "default", "created_at": datetime.now()},
        {"icon": "✅", "title": "Task: Campus Walk Scan",          "sub": "Daily task",      "amount": 60,  "type": "earn",  "time": "Today",       "student_id": "default", "created_at": datetime.now()},
        {"icon": "🛍️", "title": "Redeemed: Canteen 20% Off",      "sub": "Used at lunch",   "amount": 50,  "type": "spend", "time": "Yesterday",   "student_id": "default", "created_at": datetime.now()},
        {"icon": "📞", "title": "Call Report — Lab AC Empty",      "sub": "Verified by team","amount": 75,  "type": "earn",  "time": "Yesterday",   "student_id": "default", "created_at": datetime.now()},
        {"icon": "🔥", "title": "Streak Bonus — 10 Days",         "sub": "Milestone reward","amount": 200, "type": "earn",  "time": "2 days ago",  "student_id": "default", "created_at": datetime.now()},
        {"icon": "🛍️", "title": "Redeemed: 50 Print Pages",       "sub": "Library credited","amount": 200, "type": "spend", "time": "3 days ago",  "student_id": "default", "created_at": datetime.now()},
        {"icon": "🌱", "title": "Task: Zero-Carbon Commute",      "sub": "Campus task",     "amount": 100, "type": "earn",  "time": "3 days ago",  "student_id": "default", "created_at": datetime.now()},
        {"icon": "☀️", "title": "Solar Spin Win",                 "sub": "Lucky spin",      "amount": 75,  "type": "earn",  "time": "4 days ago",  "student_id": "default", "created_at": datetime.now()},
        {"icon": "🛍️", "title": "Redeemed: WiFi +100MB",          "sub": "Applied to ID",   "amount": 150, "type": "spend", "time": "5 days ago",  "student_id": "default", "created_at": datetime.now()},
        {"icon": "🧪", "title": "Lab Energy Audit",               "sub": "Weekly task",     "amount": 130, "type": "earn",  "time": "5 days ago",  "student_id": "default", "created_at": datetime.now()},
        {"icon": "🛍️", "title": "Redeemed: Gym Day Pass",         "sub": "Today only",      "amount": 100, "type": "spend", "time": "1 week ago",  "student_id": "default", "created_at": datetime.now()},
    ]
    MEM_STUDENT_TRANSACTIONS = transactions

    # ── 10. Scan History (6) ────────────────────────────
    scan_history = [
        {"id": "sc1", "type": "camera",   "severity": "high",   "reward": 150, "location": "Chemistry Lab 204",  "time": "Today 09:32",      "title": "Unoccupied AC & Lights", "co2_kg": 2.1},
        {"id": "sc2", "type": "camera",   "severity": "medium", "reward": 100, "location": "Block B Room 301",   "time": "Yesterday 14:15",  "title": "Idle Projector Running", "co2_kg": 0.8},
        {"id": "sc3", "type": "camera",   "severity": "low",    "reward": 50,  "location": "Library Level 2",    "time": "Yesterday 11:20",  "title": "Minor Light Waste",      "co2_kg": 0.3},
        {"id": "sc4", "type": "quick",    "severity": "medium", "reward": 50,  "location": "Hostel D Corridor",  "time": "2 days ago",       "title": "Hallway Lights On",      "co2_kg": 0.5},
        {"id": "sc5", "type": "camera",   "severity": "high",   "reward": 150, "location": "MPSTME Lab 102",     "time": "3 days ago",       "title": "AC Running Empty Lab",   "co2_kg": 1.9},
        {"id": "sc6", "type": "camera",   "severity": "medium", "reward": 100, "location": "Admin Block Floor 2","time": "4 days ago",       "title": "Print Room Left On",     "co2_kg": 0.6},
    ]
    MEM_STUDENT_SCAN_HISTORY = scan_history

    # ── 11. Redemption History (5) ───────────────────────
    redemptions = [
        {"id": "r1", "item": "Canteen 20% Off",  "price": 50,  "time": "Yesterday",  "status": "used",    "code": "NMIMS-C0-4821"},
        {"id": "r2", "item": "50 Print Pages",    "price": 200, "time": "3 days ago", "status": "active",  "code": "NMIMS-C0-4822"},
        {"id": "r3", "item": "WiFi +100MB",       "price": 150, "time": "5 days ago", "status": "used",    "code": "NMIMS-C0-4823"},
        {"id": "r4", "item": "Gym Day Pass",      "price": 100, "time": "1 week ago", "status": "expired", "code": "NMIMS-C0-4824"},
        {"id": "r5", "item": "Starbucks ₹200",    "price": 350, "time": "2 weeks ago","status": "used",    "code": "NMIMS-C0-4825"},
    ]
    MEM_STUDENT_REDEMPTIONS = redemptions

    # ── 12. Analytics ────────────────────────────────────
    analytics = {
        "weekly_coins": [320, 480, 210, 650, 890, 540, 760],
        "monthly_coins": [1200, 1580, 2100, 1890, 2400, 2100, 1700, 2300, 2800, 2500, 2900, 3100],
        "radar": [0.85, 0.72, 0.90, 0.68, 0.55, 0.78],
        "radar_labels": ["Scanning", "Challenges", "Streaks", "Reporting", "Social", "Actions"],
        "best_day_coins": 890,
        "longest_streak": 23,
        "most_scans_day": 8,
        "most_co2_saved": 18.4,
        "tasks_completed": 14,
        "tasks_total": 25,
        "challenges_won": 4,
        "total_green_tokens": 12400,
        "action_breakdown": [
            {"label": "Scanning",   "pct": 32, "color": "accent"},
            {"label": "Tasks",      "pct": 24, "color": "yellow"},
            {"label": "Challenges", "pct": 20, "color": "cyan"},
            {"label": "Calls",      "pct": 12, "color": "coral"},
            {"label": "Social",     "pct": 8,  "color": "violet"},
            {"label": "Other",      "pct": 4,  "color": "fog"},
        ],
        "goals": [
            {"title": "Reach Rank #1",   "pct": 67, "sub": "3 positions to go",  "color": "accent"},
            {"title": "Save 200kg CO₂",  "pct": 71, "sub": "142/200 kg",         "color": "cyan"},
            {"title": "50 Total Scans",  "pct": 46, "sub": "23/50 scans",        "color": "yellow"},
            {"title": "25-Day Streak",   "pct": 48, "sub": "12/25 days",         "color": "coral"},
            {"title": "Complete 25 Tasks","pct": 56, "sub": "14/25 tasks",        "color": "violet"},
        ],
    }
    MEM_STUDENT_ANALYTICS = analytics

    # ── 13. Default student profile ──────────────────────
    default_profile = {
        "student_id": "default",
        "name": "Priya Rathod",
        "initials": "PR",
        "email": "priya.rathod@nmims.edu",
        "dept": "MPSTME · Computer Science · 3rd Year · NMIMS Indore",
        "short_dept": "MPSTME · CSE · 3rd Year",
        "level": 7,
        "level_title": "Eco Champion",
        "xp": 8240,
        "xp_next": 10000,
        "coins": 4820,
        "green_tokens": 12400,
        "total_earned": 12400,
        "total_spent": 7580,
        "carbon_score": 87,
        "co2_avoided_kg": 142,
        "campus_rank": 3,
        "total_students": 4200,
        "streak_days": 12,
        "streak_hours_left": 6,
        "total_scans": 23,
        "total_scan_coins": 1490,
        "validated_scans": 18,
        "scan_co2_kg": 31,
        "tasks_completed": 14,
        "tasks_total": 25,
        "challenges_won": 4,
        "badges_earned": 9,
        "badges_total": 17,
        "preferences": {
            "push_notifications": True,
            "ai_call_alerts": True,
            "streak_reminders": True,
            "solar_peak_alerts": True,
            "challenge_updates": False,
            "campus_feed_emails": True,
            "task_reminders": True,
            "weekly_report_email": True,
        },
    }
    MEM_STUDENT_PROFILES["default"] = default_profile

    # ── Seed into MongoDB if available ───────────────────
    if USE_MONGO:
        try:
            # Only seed if profiles collection is empty
            if mongo_db["student_profiles"].count_documents({}) == 0:
                print("[Student Seed] Seeding student data into MongoDB …")
                mongo_db["student_profiles"].insert_one(default_profile.copy())

                for doc in leaderboard:
                    mongo_db["student_leaderboard"].insert_one(doc.copy())

                for doc in challenges:
                    mongo_db["student_challenges"].insert_one(doc.copy())

                for doc in tasks:
                    mongo_db["student_tasks"].insert_one(doc.copy())

                for doc in feed:
                    mongo_db["student_feed"].insert_one({**doc, "created_at": datetime.now()})

                mongo_db["student_badges"].insert_one(badges.copy())

                for doc in shop:
                    mongo_db["student_shop"].insert_one(doc.copy())

                for doc in events:
                    mongo_db["student_events"].insert_one(doc.copy())

                for doc in notifications:
                    mongo_db["student_notifications"].insert_one(doc.copy())

                for doc in transactions:
                    mongo_db["student_transactions"].insert_one(doc.copy())

                for doc in scan_history:
                    mongo_db["student_scan_history"].insert_one(doc.copy())

                for doc in redemptions:
                    mongo_db["student_redemptions"].insert_one(doc.copy())

                mongo_db["student_analytics"].insert_one({"student_id": "default", **analytics})

                print("[Student Seed] ✓ All student collections seeded.")
            else:
                print("[Student Seed] Collections already populated — skipping seed.")
        except Exception as exc:
            print(f"[Student Seed] MongoDB seed failed ({exc}), using in-memory.")

    print(f"[Student Portal] Loaded {len(tasks)} tasks, {len(shop)} shop items, {len(challenges)} challenges")


# Run seed on import
_seed_student_data()


# ── Helpers ──────────────────────────────────────────────
def _get_student_profile(student_id="default"):
    """Get student profile from Mongo or memory."""
    if USE_MONGO:
        try:
            profile = mongo_db["student_profiles"].find_one({"student_id": student_id}, {"_id": 0})
            if profile:
                return profile
        except Exception:
            pass
    return MEM_STUDENT_PROFILES.get(student_id, MEM_STUDENT_PROFILES.get("default"))


def _update_student_profile(student_id, updates):
    """Update student profile in both Mongo and memory."""
    if USE_MONGO:
        try:
            mongo_db["student_profiles"].update_one(
                {"student_id": student_id}, {"$set": updates}, upsert=True
            )
        except Exception:
            pass
    with _student_data_lock:
        if student_id not in MEM_STUDENT_PROFILES:
            MEM_STUDENT_PROFILES[student_id] = dict(MEM_STUDENT_PROFILES.get("default", {}))
        MEM_STUDENT_PROFILES[student_id].update(updates)


def _sync_leaderboard_coins(new_balance):
    """Keep in-memory leaderboard in sync with user coins."""
    with _student_data_lock:
        for s in MEM_STUDENT_LEADERBOARD:
            if s.get("is_user"):
                s["coins"] = new_balance
                break
    if USE_MONGO:
        try:
            mongo_db["student_leaderboard"].update_one(
                {"is_user": True}, {"$set": {"coins": new_balance}}
            )
        except Exception:
            pass


def _record_transaction(student_id, tx_type, amount, title, sub="", icon="🪙"):
    """Write a transaction record to MongoDB and in-memory."""
    tx = {
        "student_id": student_id, "icon": icon, "title": title,
        "sub": sub, "amount": amount, "type": tx_type,
        "time": "Just now", "created_at": datetime.now(),
    }
    MEM_STUDENT_TRANSACTIONS.insert(0, tx)
    if USE_MONGO:
        try:
            mongo_db["student_transactions"].insert_one(tx.copy())
        except Exception:
            pass


# ══════════════════════════════════════════════════════════
#  STUDENT API ENDPOINTS
# ══════════════════════════════════════════════════════════

# ── Profile ──────────────────────────────────────────────
@app.route("/api/student/profile", methods=["GET"])
def student_profile():
    sid = request.args.get("id", "default")
    profile = _get_student_profile(sid)
    return jsonify(profile)


@app.route("/api/student/profile", methods=["POST"])
def update_student_profile():
    sid = request.json.get("id", "default")
    updates = request.json.get("updates", {})
    _update_student_profile(sid, updates)
    return jsonify({"ok": True})


# ── Dashboard ────────────────────────────────────────────
@app.route("/api/student/dashboard", methods=["GET"])
def student_dashboard_data():
    """Aggregate data for the student dashboard page."""
    sid = request.args.get("id", "default")
    profile = _get_student_profile(sid)

    now = datetime.now()
    today_logs = _get_today_logs(now)
    total_solar = sum(lg.get("Solar_Power_Generated_kW", 0) for lg in today_logs)
    solar_kwh = round((total_solar * SIMULATOR_INTERVAL_SECONDS) / 3600, 1)

    # Count today's completed tasks
    tasks_done_today = sum(1 for t in MEM_STUDENT_TASKS if t.get("completed"))

    return jsonify({
        "profile": profile,
        "solar_kwh_today": solar_kwh if solar_kwh > 0 else round(random.uniform(700, 950), 1),
        "agents_online": 6,
        "active_students": random.randint(1100, 1300),
        "campus_energy_score": random.randint(70, 85),
        "waste_prevented_inr": random.randint(11000, 14000),
        "tasks_done_today": tasks_done_today,
        "total_tasks": len(MEM_STUDENT_TASKS),
        "green_tokens_today": random.randint(100, 400),
        "timestamp": now.isoformat(),
    })


# ── Leaderboard ──────────────────────────────────────────
@app.route("/api/student/leaderboard", methods=["GET"])
def student_leaderboard():
    students = MEM_STUDENT_LEADERBOARD
    if USE_MONGO:
        try:
            lb = list(mongo_db["student_leaderboard"].find({}, {"_id": 0}).sort("rank", 1))
            if lb:
                students = lb
        except Exception:
            pass

    dept_standings = [
        {"dept": "MPSTME",       "coins": 14200, "color": "accent"},
        {"dept": "MBA",          "coins": 12500, "color": "cyan"},
        {"dept": "Architecture", "coins": 11100, "color": "violet"},
        {"dept": "Law",          "coins": 8400,  "color": "coral"},
        {"dept": "Pharmacy",     "coins": 7200,  "color": "yellow"},
        {"dept": "Science",      "coins": 5900,  "color": "fog"},
        {"dept": "Commerce",     "coins": 5100,  "color": "accent"},
    ]
    return jsonify({"students": students, "dept_standings": dept_standings})


# ── Challenges ───────────────────────────────────────────
@app.route("/api/student/challenges", methods=["GET"])
def student_challenges():
    if USE_MONGO:
        try:
            ch = list(mongo_db["student_challenges"].find({}, {"_id": 0}))
            if ch:
                return jsonify(ch)
        except Exception:
            pass
    return jsonify(MEM_STUDENT_CHALLENGES)


@app.route("/api/student/challenges/join", methods=["POST"])
def join_challenge():
    cid = request.json.get("challenge_id")
    with _student_data_lock:
        for c in MEM_STUDENT_CHALLENGES:
            if c["id"] == cid:
                c["joined"] = True
                break
    if USE_MONGO:
        try:
            mongo_db["student_challenges"].update_one({"id": cid}, {"$set": {"joined": True}})
        except Exception:
            pass
    return jsonify({"ok": True})


# ── Tasks ────────────────────────────────────────────────
@app.route("/api/student/tasks", methods=["GET"])
def student_tasks():
    """Return all tasks with completion status."""
    category = request.args.get("category")  # optional filter
    if USE_MONGO:
        try:
            filt = {} if not category else {"category": category}
            tasks = list(mongo_db["student_tasks"].find(filt, {"_id": 0}))
            if tasks:
                return jsonify(tasks)
        except Exception:
            pass
    tasks = MEM_STUDENT_TASKS
    if category:
        tasks = [t for t in tasks if t["category"] == category]
    return jsonify(tasks)


@app.route("/api/student/tasks/complete", methods=["POST"])
def complete_task():
    """Mark a task as completed and award green tokens."""
    sid = request.json.get("id", "default")
    task_id = request.json.get("task_id")

    task = None
    with _student_data_lock:
        for t in MEM_STUDENT_TASKS:
            if t["id"] == task_id:
                if t.get("completed") and not t.get("repeatable"):
                    return jsonify({"ok": False, "error": "Task already completed"}), 400
                t["completed"] = True
                task = t
                break

    if not task:
        return jsonify({"ok": False, "error": "Task not found"}), 404

    reward = task["reward"]
    profile = _get_student_profile(sid)
    new_balance = profile.get("coins", 0) + reward
    new_tasks = profile.get("tasks_completed", 0) + 1
    new_xp = profile.get("xp", 0) + (reward // 2)
    new_tokens = profile.get("green_tokens", 0) + reward

    updates = {
        "coins": new_balance,
        "total_earned": profile.get("total_earned", 0) + reward,
        "tasks_completed": new_tasks,
        "xp": new_xp,
        "green_tokens": new_tokens,
    }
    _update_student_profile(sid, updates)
    _sync_leaderboard_coins(new_balance)
    _record_transaction(sid, "earn", reward, f"Task: {task['title']}", task.get("category", ""), task.get("icon", "✅"))

    if USE_MONGO:
        try:
            mongo_db["student_tasks"].update_one({"id": task_id}, {"$set": {"completed": True}})
        except Exception:
            pass

    return jsonify({
        "ok": True,
        "reward": reward,
        "balance": new_balance,
        "green_tokens": new_tokens,
        "tasks_completed": new_tasks,
        "xp": new_xp,
    })


# ── Wallet ───────────────────────────────────────────────
@app.route("/api/student/wallet", methods=["GET"])
def student_wallet():
    sid = request.args.get("id", "default")
    profile = _get_student_profile(sid)

    transactions = MEM_STUDENT_TRANSACTIONS[:20]
    if USE_MONGO:
        try:
            tx = list(mongo_db["student_transactions"].find(
                {"student_id": sid}, {"_id": 0}
            ).sort("created_at", -1).limit(20))
            if tx:
                transactions = tx
        except Exception:
            pass

    return jsonify({
        "balance": profile.get("coins", 0),
        "green_tokens": profile.get("green_tokens", 0),
        "total_earned": profile.get("total_earned", 0),
        "total_spent": profile.get("total_spent", 0),
        "transactions": transactions,
    })


@app.route("/api/student/wallet/earn", methods=["POST"])
def earn_coins():
    sid = request.json.get("id", "default")
    amount = request.json.get("amount", 0)
    reason = request.json.get("reason", "")
    profile = _get_student_profile(sid)
    new_balance = profile.get("coins", 0) + amount
    new_tokens = profile.get("green_tokens", 0) + amount
    _update_student_profile(sid, {
        "coins": new_balance,
        "total_earned": profile.get("total_earned", 0) + amount,
        "green_tokens": new_tokens,
    })
    _sync_leaderboard_coins(new_balance)
    _record_transaction(sid, "earn", amount, reason or "Coins Earned", "", "🪙")
    return jsonify({"ok": True, "balance": new_balance, "green_tokens": new_tokens})


@app.route("/api/student/wallet/spend", methods=["POST"])
def spend_coins():
    sid = request.json.get("id", "default")
    amount = request.json.get("amount", 0)
    item = request.json.get("item", "")
    profile = _get_student_profile(sid)
    balance = profile.get("coins", 0)
    if balance < amount:
        return jsonify({"ok": False, "error": "Insufficient balance"}), 400
    new_balance = balance - amount
    _update_student_profile(sid, {
        "coins": new_balance,
        "total_spent": profile.get("total_spent", 0) + amount,
    })
    _sync_leaderboard_coins(new_balance)
    _record_transaction(sid, "spend", amount, f"Redeemed: {item}", "", "🛍️")

    # Record redemption
    redemption = {
        "student_id": sid, "item": item, "price": amount,
        "time": "Just now", "status": "active",
        "code": f"NMIMS-C0-{random.randint(1000, 9999)}",
        "created_at": datetime.now(),
    }
    MEM_STUDENT_REDEMPTIONS.insert(0, redemption)
    if USE_MONGO:
        try:
            mongo_db["student_redemptions"].insert_one(redemption.copy())
        except Exception:
            pass

    return jsonify({"ok": True, "balance": new_balance})


# ── Badges ───────────────────────────────────────────────
@app.route("/api/student/badges", methods=["GET"])
def student_badges():
    if USE_MONGO:
        try:
            b = mongo_db["student_badges"].find_one({}, {"_id": 0})
            if b:
                return jsonify(b)
        except Exception:
            pass
    return jsonify(MEM_STUDENT_BADGES)


# ── Feed ─────────────────────────────────────────────────
@app.route("/api/student/feed", methods=["GET"])
def student_feed():
    if USE_MONGO:
        try:
            feed = list(mongo_db["student_feed"].find({}, {"_id": 0}).sort("created_at", -1).limit(20))
            if feed:
                return jsonify(feed)
        except Exception:
            pass
    return jsonify(MEM_STUDENT_FEED)


@app.route("/api/student/feed/like", methods=["POST"])
def like_feed_post():
    fid = request.json.get("post_id")
    with _student_data_lock:
        for f in MEM_STUDENT_FEED:
            if f["id"] == fid:
                f["likes"] = f.get("likes", 0) + 1
                if USE_MONGO:
                    try:
                        mongo_db["student_feed"].update_one({"id": fid}, {"$inc": {"likes": 1}})
                    except Exception:
                        pass
                return jsonify({"ok": True, "likes": f["likes"]})
    return jsonify({"ok": False}), 404


# ── Scan ─────────────────────────────────────────────────
@app.route("/api/student/scan", methods=["POST"])
def submit_scan():
    """Simulate an AI scan submission."""
    sid = request.json.get("id", "default")
    scan_type = request.json.get("type", "general")
    locations = ["Chemistry Lab 204", "Block B Room 301", "Library Level 2",
                 "MPSTME Lab 102", "Admin Block Floor 2", "Hostel D Corridor",
                 "Lecture Hall 5", "Canteen Area", "Server Room", "Parking Lot"]
    severity_rewards = {"high": 150, "medium": 100, "low": 50}
    severity = random.choice(["high", "medium", "low"])
    reward = severity_rewards[severity]
    location = random.choice(locations)

    profile = _get_student_profile(sid)
    new_balance = profile.get("coins", 0) + reward
    new_scans = profile.get("total_scans", 0) + 1
    new_tokens = profile.get("green_tokens", 0) + reward
    co2 = round(random.uniform(0.3, 2.5), 1)

    _update_student_profile(sid, {
        "coins": new_balance, "total_scans": new_scans,
        "total_earned": profile.get("total_earned", 0) + reward,
        "green_tokens": new_tokens,
        "scan_co2_kg": profile.get("scan_co2_kg", 0) + co2,
    })
    _sync_leaderboard_coins(new_balance)
    _record_transaction(sid, "earn", reward, f"AI Scan — {location}", severity.title(), "📸")

    scan_record = {
        "id": f"sc{random.randint(100,999)}", "student_id": sid,
        "type": scan_type, "severity": severity, "reward": reward,
        "location": location, "time": "Just now",
        "title": f"{'Unoccupied AC & Lights' if severity == 'high' else 'Idle Equipment' if severity == 'medium' else 'Minor Waste'}",
        "co2_kg": co2, "created_at": datetime.now(),
    }
    MEM_STUDENT_SCAN_HISTORY.insert(0, scan_record)
    if USE_MONGO:
        try:
            mongo_db["student_scan_history"].insert_one(scan_record.copy())
        except Exception:
            pass

    return jsonify({
        "ok": True, "severity": severity, "reward": reward,
        "balance": new_balance, "green_tokens": new_tokens,
        "analysis": {
            "title": f"Waste Detected: {scan_record['title']}",
            "description": f"AI detected energy waste at {location}. Good catch!",
            "rate_kwh": round(random.uniform(1.0, 3.5), 1),
            "cost_inr": round(random.uniform(20, 80)),
            "carbon_kg": co2,
        },
    })


@app.route("/api/student/scan/quick", methods=["POST"])
def quick_report():
    sid = request.json.get("id", "default")
    report_type = request.json.get("type", "")
    reward = 50
    profile = _get_student_profile(sid)
    new_balance = profile.get("coins", 0) + reward
    _update_student_profile(sid, {
        "coins": new_balance,
        "total_earned": profile.get("total_earned", 0) + reward,
        "green_tokens": profile.get("green_tokens", 0) + reward,
    })
    _sync_leaderboard_coins(new_balance)
    _record_transaction(sid, "earn", reward, f"Quick Report: {report_type}", "", "⚡")
    return jsonify({"ok": True, "reward": reward, "balance": new_balance, "type": report_type})


@app.route("/api/student/scan/history", methods=["GET"])
def scan_history():
    """Return scan history for a student."""
    sid = request.args.get("id", "default")
    if USE_MONGO:
        try:
            scans = list(mongo_db["student_scan_history"].find(
                {"student_id": sid}, {"_id": 0}
            ).sort("created_at", -1).limit(20))
            if scans:
                return jsonify(scans)
        except Exception:
            pass
    return jsonify(MEM_STUDENT_SCAN_HISTORY)


# ── Analytics ────────────────────────────────────────────
@app.route("/api/student/analytics", methods=["GET"])
def student_analytics():
    sid = request.args.get("id", "default")
    profile = _get_student_profile(sid)

    analytics_data = MEM_STUDENT_ANALYTICS.copy()
    if USE_MONGO:
        try:
            a = mongo_db["student_analytics"].find_one({"student_id": sid}, {"_id": 0})
            if a:
                analytics_data = a
        except Exception:
            pass

    analytics_data["profile"] = profile
    return jsonify(analytics_data)


# ── Shop ─────────────────────────────────────────────────
@app.route("/api/student/shop", methods=["GET"])
def student_shop():
    category = request.args.get("category")
    if USE_MONGO:
        try:
            filt = {} if not category else {"category": category}
            items = list(mongo_db["student_shop"].find(filt, {"_id": 0}))
            if items:
                return jsonify(items)
        except Exception:
            pass
    items = MEM_STUDENT_SHOP
    if category:
        items = [i for i in items if i.get("category") == category]
    return jsonify(items)


@app.route("/api/student/shop/redeem", methods=["POST"])
def shop_redeem():
    """Redeem a shop item — deducts coins, records redemption."""
    sid = request.json.get("id", "default")
    item_id = request.json.get("item_id")

    item = None
    for s in MEM_STUDENT_SHOP:
        if s["id"] == item_id:
            item = s
            break
    if not item:
        return jsonify({"ok": False, "error": "Item not found"}), 404
    if item.get("out_of_stock") or item.get("stock", 1) <= 0:
        return jsonify({"ok": False, "error": "Out of stock"}), 400

    profile = _get_student_profile(sid)
    price = item["price"]
    balance = profile.get("coins", 0)
    if balance < price:
        return jsonify({"ok": False, "error": "Insufficient balance"}), 400

    new_balance = balance - price
    _update_student_profile(sid, {
        "coins": new_balance,
        "total_spent": profile.get("total_spent", 0) + price,
    })
    _sync_leaderboard_coins(new_balance)

    code = f"NMIMS-C0-{random.randint(1000, 9999)}"
    redemption = {
        "student_id": sid, "item_id": item_id, "item": item["name"],
        "emoji": item.get("emoji", "🎁"), "price": price,
        "time": "Just now", "status": "active", "code": code,
        "created_at": datetime.now(),
    }
    MEM_STUDENT_REDEMPTIONS.insert(0, redemption)
    _record_transaction(sid, "spend", price, f"Redeemed: {item['name']}", code, "🛍️")

    # Decrement stock
    with _student_data_lock:
        item["stock"] = max(0, item.get("stock", 1) - 1)
        if item["stock"] == 0:
            item["out_of_stock"] = True

    if USE_MONGO:
        try:
            mongo_db["student_redemptions"].insert_one(redemption.copy())
            mongo_db["student_shop"].update_one(
                {"id": item_id},
                {"$inc": {"stock": -1}}
            )
        except Exception:
            pass

    return jsonify({"ok": True, "balance": new_balance, "code": code, "item": item["name"]})


@app.route("/api/student/redemptions", methods=["GET"])
def student_redemptions():
    """Return redemption history."""
    sid = request.args.get("id", "default")
    if USE_MONGO:
        try:
            r = list(mongo_db["student_redemptions"].find(
                {"student_id": sid}, {"_id": 0}
            ).sort("created_at", -1).limit(20))
            if r:
                return jsonify(r)
        except Exception:
            pass
    return jsonify(MEM_STUDENT_REDEMPTIONS)


# ── Events ───────────────────────────────────────────────
@app.route("/api/student/events", methods=["GET"])
def student_events():
    if USE_MONGO:
        try:
            ev = list(mongo_db["student_events"].find({}, {"_id": 0}))
            if ev:
                return jsonify(ev)
        except Exception:
            pass
    return jsonify(MEM_STUDENT_EVENTS)


@app.route("/api/student/events/rsvp", methods=["POST"])
def rsvp_event():
    """RSVP for an event — award bonus coins."""
    sid = request.json.get("id", "default")
    event_id = request.json.get("event_id")

    event = None
    with _student_data_lock:
        for e in MEM_STUDENT_EVENTS:
            if e["id"] == event_id:
                e["joined"] = True
                event = e
                break

    if not event:
        return jsonify({"ok": False, "error": "Event not found"}), 404

    reward = event.get("reward", 50)
    profile = _get_student_profile(sid)
    new_balance = profile.get("coins", 0) + reward
    _update_student_profile(sid, {
        "coins": new_balance,
        "total_earned": profile.get("total_earned", 0) + reward,
        "green_tokens": profile.get("green_tokens", 0) + reward,
    })
    _sync_leaderboard_coins(new_balance)
    _record_transaction(sid, "earn", reward, f"Event RSVP: {event['title']}", "", "🎫")

    if USE_MONGO:
        try:
            mongo_db["student_events"].update_one({"id": event_id}, {"$set": {"joined": True}})
        except Exception:
            pass

    return jsonify({"ok": True, "balance": new_balance, "reward": reward})


# ── Notifications ────────────────────────────────────────
@app.route("/api/student/notifications", methods=["GET"])
def student_notifications():
    if USE_MONGO:
        try:
            n = list(mongo_db["student_notifications"].find({}, {"_id": 0}).limit(20))
            if n:
                return jsonify(n)
        except Exception:
            pass
    return jsonify(MEM_STUDENT_NOTIFICATIONS)


@app.route("/api/student/notifications/read", methods=["POST"])
def mark_notifications_read():
    """Mark all notifications as read."""
    with _student_data_lock:
        for n in MEM_STUDENT_NOTIFICATIONS:
            n["unread"] = False
    if USE_MONGO:
        try:
            mongo_db["student_notifications"].update_many({}, {"$set": {"unread": False}})
        except Exception:
            pass
    return jsonify({"ok": True})


# ---------------------------------------------------------------------------
# Voice Agent  — Twilio + Ultravox outbound call
# ---------------------------------------------------------------------------
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN  = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")
ULTRAVOX_API_KEY   = os.getenv("ULTRAVOX_API_KEY", "")

_DEFAULT_VOICE_PROMPT = """
1) Identity
You are Zara, a virtual Green Student Ambassador calling agent for CampusZero AI at NMIMS University.
Your voice character answers in a natural Indian accent.
**CRITICAL LANGUAGE INSTRUCTION: You MUST speak in conversational "Hinglish".**

CampusZero AI is NMIMS's intelligent campus energy management platform.
You make outbound calls to students to inform them about an electricity waste issue.

2) Call Flow Logic
1. Check Availability
2. Reason for Calling — electricity waste detected near the student
3. Issue Confirmation from Student
4. Additional Detail Collection
5. Issue Detection Confirmation — 50 GreenCoins reward
6. Quick Impact Share — rupee saving and CO2 impact
7. App Recommendation — CampusZero AI Scanner
8. Closing — thank the student

3) Style Guidelines
- ONLY speak in Hinglish. Mix Hindi and English words organically.
- Keep the entire call polite, warm, and under three minutes.
- Never make the student feel guilty.
- Always tie the report back to actual rupee saving and CO2 impact.
""".strip()


def _create_ultravox_call(system_prompt: str) -> dict:
    """Call Ultravox API and return the response JSON (contains joinUrl)."""
    payload = {
        "systemPrompt": system_prompt,
        "model": "fixie-ai/ultravox",
        "voice": "ad69ddb2-363f-4279-adf4-5961f127ec2f",
        "languageHint": "en-IN",
        "temperature": 0.3,
        "firstSpeakerSettings": {"user": {}},
        "medium": {"twilio": {}},
    }
    resp = http_requests.post(
        "https://api.ultravox.ai/api/calls",
        json=payload,
        headers={"Content-Type": "application/json", "X-API-Key": ULTRAVOX_API_KEY},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


@app.route("/api/call", methods=["POST"])
def api_voice_call():
    """Initiate an outbound Twilio call powered by Ultravox voice AI."""
    try:
        body = request.get_json(force=True)
        phone = (body.get("phoneNumber") or "").replace(" ", "")
        if not phone:
            return jsonify({"error": "phoneNumber is required"}), 400
        if not phone.startswith("+"):
            phone = "+" + phone

        system_prompt = (body.get("systemPrompt") or "").strip() or _DEFAULT_VOICE_PROMPT

        # 1. Create Ultravox call → get WebSocket joinUrl
        uv = _create_ultravox_call(system_prompt)
        join_url = uv.get("joinUrl")
        if not join_url:
            return jsonify({"error": "No joinUrl from Ultravox"}), 502

        # 2. Initiate Twilio outbound call with TwiML Stream
        from twilio.rest import Client as TwilioClient
        client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        call = client.calls.create(
            twiml=f'<Response><Connect><Stream url="{join_url}"/></Connect></Response>',
            to=phone,
            from_=TWILIO_PHONE_NUMBER,
        )
        return jsonify({"success": True, "sid": call.sid})
    except Exception as exc:
        print(f"[VoiceAgent] Error: {exc}")
        return jsonify({"error": str(exc)}), 500


# ---------------------------------------------------------------------------
# Serve React Frontend  (catch-all MUST be after all /api routes)
# ---------------------------------------------------------------------------
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path):
    """Serve the React SPA from frontend/build."""
    # Never serve HTML for API paths — return proper 404 JSON instead
    if path.startswith("api/") or path.startswith("api"):
        return jsonify({"error": "Not found", "path": f"/{path}"}), 404

    full = BUILD_DIR / path
    if full.is_file():
        return send_from_directory(str(BUILD_DIR), path)
    # Fall back to index.html for client-side routing
    return send_from_directory(str(BUILD_DIR), "index.html")


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
_initialised = False
_init_lock = threading.Lock()


def initialise():
    """Idempotent startup: connect DB, seed data, launch daemon threads."""
    global _initialised
    with _init_lock:
        if _initialised:
            return
        _initialised = True

    _try_connect_mongo()
    _seed_blocks()

    simulator_thread = threading.Thread(target=iot_simulator, daemon=True)
    simulator_thread.start()
    print("[Setup] IoT simulator thread launched.")

    iot_logger_thread = threading.Thread(target=_iot_device_logger, daemon=True)
    iot_logger_thread.start()
    print("[Setup] IoT device logger thread launched.")

    print(f"[Setup] Storage: {'MongoDB' if USE_MONGO else 'In-Memory (no DB needed)'}")
    print(f"[Setup] Server: http://{FLASK_HOST}:{FLASK_PORT}")


# Run initialise() at import-time so gunicorn workers pick it up
initialise()

if __name__ == "__main__":
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=False)
