"""
NMIMS Indore — Energy Demand Forecasting Engine
================================================
Improvements over original notebook:
  1. Multivariate regression — uses BOTH year AND student-count as features
  2. Polynomial feature expansion (degree-2) to capture non-linear growth
  3. Solar panel degradation modelled at ~0.5 %/year after installation
  4. Confidence band via residual standard error
  5. Per-year renewable offset %, carbon, cost, savings fully computed
  6. Anomaly detection with configurable threshold
  7. Module-ready — importable & callable from Flask API
"""

import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
from sklearn.metrics import r2_score, mean_absolute_error

# ---------------------------------------------------------------------------
# Default Configuration (all overridable via run_forecast kwargs)
# ---------------------------------------------------------------------------
DEFAULT_CONFIG = {
    # Historical actuals
    "years_historical":       [2020, 2021, 2022, 2023, 2024, 2025],
    "consumption_historical": [760000, 720000, 810000, 860000, 920000, 1000000],
    "students_historical":    [950, 900, 1000, 1050, 1100, 1200],

    # Forecast horizon
    "forecast_years": [2026, 2027, 2028, 2029, 2030, 2031, 2032],

    # Student projection (estimated growth ~5-8 % / yr)
    "students_projected": [1280, 1370, 1460, 1550, 1640, 1730, 1820],

    # Solar parameters
    "solar_capacity_kw":   500,        # kW peak
    "sun_hours_per_day":   5.5,        # Indore average
    "system_efficiency":   0.85,       # inverter + soiling + cable losses
    "installation_year":   2028,
    "panel_degradation":   0.005,      # 0.5 % output loss per year

    # Grid & cost
    "grid_emission_factor": 0.82,      # kg CO₂ / kWh (CEA 2024)
    "tariff_per_kwh":       8.0,       # ₹/kWh (MPERC 2025-26)

    # Anomaly detection
    "anomaly_growth_threshold": 0.07,  # flag if YoY growth > 7 %

    # Model
    "poly_degree": 2,                  # polynomial feature degree
}


# ---------------------------------------------------------------------------
# Core Forecast Function
# ---------------------------------------------------------------------------
def run_forecast(**overrides):
    """
    Run the full forecasting pipeline.
    Returns a JSON-serialisable dict with forecast, anomalies, and metadata.
    """
    cfg = {**DEFAULT_CONFIG, **overrides}

    years_hist  = np.array(cfg["years_historical"], dtype=float)
    cons_hist   = np.array(cfg["consumption_historical"], dtype=float)
    studs_hist  = np.array(cfg["students_historical"], dtype=float)

    years_fut   = np.array(cfg["forecast_years"], dtype=float)
    studs_fut   = np.array(cfg["students_projected"], dtype=float)

    # ── 1. Feature Engineering ────────────────────────────────────────────
    # Multivariate: [year, students]  →  Polynomial expansion
    X_hist_raw = np.column_stack([years_hist, studs_hist])
    poly = PolynomialFeatures(degree=cfg["poly_degree"], include_bias=False)
    X_hist = poly.fit_transform(X_hist_raw)

    # ── 2. Train Model ───────────────────────────────────────────────────
    model = LinearRegression()
    model.fit(X_hist, cons_hist)

    # Training metrics
    y_pred_train = model.predict(X_hist)
    r2 = round(r2_score(cons_hist, y_pred_train), 4)
    mae = round(mean_absolute_error(cons_hist, y_pred_train), 0)
    residuals = cons_hist - y_pred_train
    residual_std = float(np.std(residuals))

    # ── 3. Predict Future ────────────────────────────────────────────────
    X_fut_raw = np.column_stack([years_fut, studs_fut])
    X_fut = poly.transform(X_fut_raw)
    predicted = model.predict(X_fut).astype(int)

    # Confidence bands (±1 σ of residual)
    upper_band = (predicted + residual_std).astype(int)
    lower_band = (predicted - residual_std).astype(int)

    # ── 4. Solar Generation (with degradation) ───────────────────────────
    base_annual_kwh = (
        cfg["solar_capacity_kw"]
        * cfg["sun_hours_per_day"]
        * 365
        * cfg["system_efficiency"]
    )

    def solar_gen(year):
        if year < cfg["installation_year"]:
            return 0
        age = year - cfg["installation_year"]
        degradation = (1 - cfg["panel_degradation"]) ** age
        return int(base_annual_kwh * degradation)

    solar_proj = [solar_gen(int(y)) for y in years_fut]

    # ── 5. Net energy, carbon, cost ──────────────────────────────────────
    net_energy  = [max(0, int(predicted[i]) - solar_proj[i]) for i in range(len(years_fut))]
    carbon      = [round(ne * cfg["grid_emission_factor"] / 1000, 1) for ne in net_energy]
    bills       = [int(ne * cfg["tariff_per_kwh"]) for ne in net_energy]
    baseline_bill = int(cons_hist[-1] * cfg["tariff_per_kwh"])  # latest historical year

    # ── 6. Net-Zero Detection ────────────────────────────────────────────
    net_zero_year = None
    for i, y in enumerate(years_fut):
        if solar_proj[i] >= predicted[i]:
            net_zero_year = int(y)
            break

    # ── 7. Anomaly Detection ─────────────────────────────────────────────
    anomalies = []
    for i in range(1, len(predicted)):
        yoy = (predicted[i] - predicted[i - 1]) / predicted[i - 1]
        anomalies.append({
            "year": int(years_fut[i]),
            "yoy_growth_pct": round(float(yoy) * 100, 2),
            "flag": "HIGH GROWTH" if yoy > cfg["anomaly_growth_threshold"] else "Normal",
        })

    # ── 8. Assemble Report ───────────────────────────────────────────────
    forecast_entries = []
    for i, y in enumerate(years_fut):
        offset_pct = round(solar_proj[i] / predicted[i] * 100, 1) if solar_proj[i] > 0 else 0.0
        forecast_entries.append({
            "year":                       int(y),
            "predicted_consumption_kwh":  int(predicted[i]),
            "upper_band_kwh":             int(upper_band[i]),
            "lower_band_kwh":             int(lower_band[i]),
            "solar_generation_kwh":       solar_proj[i],
            "net_grid_dependency_kwh":    net_energy[i],
            "carbon_emissions_tonnes":    carbon[i],
            "annual_electricity_bill_inr": bills[i],
            "savings_vs_baseline_inr":    baseline_bill - bills[i],
            "renewable_offset_pct":       offset_pct,
            "students_projected":         int(studs_fut[i]),
        })

    # Historical entries (for charts)
    historical_entries = []
    for i, y in enumerate(years_hist):
        historical_entries.append({
            "year": int(y),
            "consumption_kwh": int(cons_hist[i]),
            "students": int(studs_hist[i]),
        })

    report = {
        "model": f"Polynomial Regression (degree={cfg['poly_degree']}) — Multivariate (Year + Students)",
        "features": poly.get_feature_names_out(["year", "students"]).tolist(),
        "r_squared": r2,
        "mae_kwh": int(mae),
        "residual_std": round(residual_std, 0),
        "coefficients": model.coef_.tolist(),
        "intercept": round(float(model.intercept_), 2),
        "config": {
            "solar_capacity_kw":   cfg["solar_capacity_kw"],
            "sun_hours_per_day":   cfg["sun_hours_per_day"],
            "system_efficiency":   cfg["system_efficiency"],
            "installation_year":   cfg["installation_year"],
            "panel_degradation":   cfg["panel_degradation"],
            "grid_emission_factor": cfg["grid_emission_factor"],
            "tariff_per_kwh":      cfg["tariff_per_kwh"],
        },
        "baseline_2025": {
            "consumption_kwh": int(cons_hist[-1]),
            "annual_bill_inr": baseline_bill,
            "carbon_emissions_tonnes": round(cons_hist[-1] * cfg["grid_emission_factor"] / 1000, 1),
        },
        "historical": historical_entries,
        "forecast": forecast_entries,
        "anomalies": anomalies,
        "net_zero_year": net_zero_year if net_zero_year else "Post-2032 (increase solar capacity)",
    }

    return report


# ---------------------------------------------------------------------------
# CLI quick-test
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import json
    result = run_forecast()
    print(json.dumps(result, indent=2))
