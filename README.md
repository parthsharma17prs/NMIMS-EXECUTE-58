<p align="center">
  <img src="https://img.shields.io/badge/python-3.10%2B-blue?logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/react-18-61dafb?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/flask-3.0-black?logo=flask" />
  <img src="https://img.shields.io/badge/tailwindcss-3.4-38bdf8?logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/license-MIT-green" />
</p>

# 🏫 SVKM's NMIMS Indore — Net-Zero Command Center

A **full-stack IoT analytics dashboard** for monitoring and optimizing energy consumption toward net-zero emissions at the **NMIMS Indore campus** (Off Super Corridor, Bada Bangarda, Indore, MP 453112). Built with Flask (Python) and React + Tailwind CSS, it features live simulated IoT data across all 5 schools (STME, SBM, SOC, SOL, SPTM), weather-aware renewable energy tracking using live geolocation, battery storage simulation, and ML-based surge prediction.

---

## ✨ Features

| Module | Description |
|---|---|
| **Real-Time IoT Simulator** | Daemon thread generates realistic energy readings every 5 s for all 5 NMIMS Indore school blocks (STME, SBM, SOC, SOL, SPTM) with time-of-day curves for solar, HVAC and occupancy |
| **Overview Dashboard** | Net-zero gauge, sustainability score, 24 h energy profile, renewable mix, block efficiency cards, activity feed, weather panel |
| **Energy Analytics** | Live line chart polling `/api/live-status`, block-wise breakdown, surge prediction model |
| **Renewable Simulator** | Dynamic donut chart (Grid vs Solar vs Battery), **live browser geolocation → Open-Meteo weather API** — solar output drops in real time based on actual cloud cover |
| **Battery Storage** | 200 kWh simulated battery that charges on solar surplus and discharges during peak demand, with live SoC gauge |
| **ROI Calculator** | Interactive sliders for grid rate & solar budget with payback period and savings projection |
| **ML Surge Prediction** | scikit-learn `LinearRegression` on recent readings to forecast grid demand 1 hour ahead with anomaly alerts |
| **Dual Storage** | Seamlessly works with **MongoDB** *or* falls back to **in-memory** storage — zero config needed to demo |

---

## 📂 Project Structure

```
nmims-indore-net-zero/
├── app.py                  # Flask backend — API + IoT simulator
├── requirements.txt        # Python dependencies
├── .env.example            # Environment variable template
├── .gitignore
├── LICENSE
├── README.md
└── frontend/
    ├── package.json
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── public/
    │   └── index.html
    └── src/
        ├── index.js
        ├── index.css          # Tailwind directives + dark-mode globals
        ├── App.jsx            # Root — nav-based page switching
        └── components/
            ├── DashboardLayout.jsx    # Collapsible sidebar + header shell
            ├── TopMetricsBar.jsx      # 4 KPI stat cards
            ├── AlertBanner.jsx        # Dismissible alert strip
            ├── OverviewPage.jsx       # Comprehensive overview analytics
            ├── LiveEnergyChart.jsx    # Real-time Recharts line chart
            ├── RenewableSimulator.jsx # Donut chart + weather + battery
            └── ROICalculator.jsx      # Interactive ROI sliders
```

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.10+**
- **Node.js 18+** & npm

### 1. Clone the repo

```bash
git clone https://github.com/<your-username>/nmims-indore-net-zero.git
cd nmims-indore-net-zero
```

### 2. Backend setup

```bash
# Create a virtual environment (recommended)
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Copy and configure environment variables
cp .env.example .env
# Edit .env if you have a MongoDB instance — otherwise it auto-uses in-memory storage

# Start the server
python app.py
```

The API will be available at **http://localhost:5000**. You should see:

```
[Setup] -> Using IN-MEMORY storage. Dashboard works with simulated data.
[Setup] Blocks seeded in memory (3).
[IoT Simulator] Starting ...
 * Running on http://127.0.0.1:5000
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm start
```

The React dev server opens at **http://localhost:3000**.

> **Tip:** Allow location access when prompted — the Renewable Simulator uses your browser's live GPS coordinates to fetch real weather data from the Open-Meteo API.

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Service health & endpoint list |
| GET | `/blocks` | List campus blocks |
| GET | `/energy-logs` | Recent 100 energy readings |
| GET | `/latest-readings` | Latest reading per block |
| GET | `/api/live-status` | Real-time status for all blocks |
| GET | `/api/kpis` | Today's aggregated KPIs |
| GET | `/api/overview` | Comprehensive dashboard payload |
| GET | `/api/renewable-mix?lat=X&lon=Y` | Energy mix + live weather + battery state |
| GET | `/api/predict-surge` | ML-based 1-hour surge prediction |

---

## 🛠️ Tech Stack

### Backend
- **Flask 3.0** — lightweight REST API
- **PyMongo 4.6** — MongoDB driver (optional)
- **scikit-learn** — Linear Regression for surge prediction
- **NumPy** — numerical computation
- **Requests** — Open-Meteo weather API integration

### Frontend
- **React 18** — component-driven UI
- **Recharts** — composable charting (Line, Area, Pie, Bar)
- **Tailwind CSS 3.4** — utility-first dark-mode styling
- **Lucide React** — icon library

### External APIs
- **[Open-Meteo](https://open-meteo.com/)** — free, no-API-key weather data (temperature, cloud cover, humidity, wind)

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGO_URI` | *(empty)* | MongoDB connection string. Leave empty to use in-memory mode |
| `MONGO_DB` | `smart_campus` | MongoDB database name |
| `FLASK_HOST` | `0.0.0.0` | Flask bind address |
| `FLASK_PORT` | `5000` | Flask port |

---

## 📸 Screenshots

<details>
<summary>Click to expand</summary>

| Overview Dashboard | Renewable Simulator |
|---|---|
| Net-zero gauge, sustainability score, hourly energy profile, block cards | Live donut chart, weather-linked solar, battery SoC gauge |

| Energy Analytics | ROI Calculator |
|---|---|
| Real-time line chart, block breakdown, surge prediction | Interactive sliders for payback & savings projection |

</details>

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

<p align="center">
  Built for <strong>SVKM's NMIMS Indore — Smart Campus Hackathon</strong> 🏆
</p>
