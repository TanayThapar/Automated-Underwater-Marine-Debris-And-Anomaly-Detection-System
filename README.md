# Automated Underwater Marine Debris & Anomaly Detection System

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-purple.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

> **Autonomous Underwater Vehicle (AUV) Side-Scan Sonar Intelligence Pipeline**  
> AI-Powered perception and telemetry system combining dual-cue object detection, 3D acoustic shadow height profiling, CycleGAN synthetic data augmentation, and sub-20ms edge deployment on hardware simulators.

---

## 🌊 Overview

Optical RGB subsea cameras fail rapidly past shallow depths due to marine snow, silt, and extreme water turbidity. Traditional hydrographic review of hundreds of kilometers of side-scan sonar waterfall imagery requires tens of hours of manual post-processing, introducing hazardous delays for maritime navigation, pipeline monitoring, and marine debris cleanup.

**Automated Underwater Marine Debris & Anomaly Detection System** provides an edge-native perception and telemetry workstation designed for AUVs. It inspects specular acoustic highlights and paired acoustic shadows in real time to locate, classify, and physically estimate the 3D dimensions of underwater anomalies.

---

## 🏛️ System Architecture

![AeroAqua DeepScan System Architecture Blueprint](frontend/public/architecture_diagram.jpg)


### Algorithmic & Layer Breakdown

1. **Physical Sensor & Acoustic Ingestion**:
   - **Dual-frequency CHIRP Transducers**: 450 kHz (long-range search swath up to 150m) and 900 kHz (ultra-fine target acoustic imaging).
   - **6-DOF IMU & Doppler Velocity Log (DVL)**: Real-time attitude ingestion (Pitch $\theta_p$, Roll $\theta_r$, Yaw $\psi$) and seabed bottom tracking.
   - **ROS 2 Humble Bridge**: Deterministic DDS telemetry pub/sub bridge orchestrating ping buffers with microsecond timestamps.

2. **Acoustic Digital Signal Processing (DSP)**:
   - **Slant-Range to Ground-Range Projection**: Converts raw slant range $R_{\text{slant}}$ into true horizontal seabed distance $Y$:
     $$Y = \sqrt{R_{\text{slant}}^2 - H_{\text{alt}}^2}$$
   - **Multiplicative Rayleigh Despeckling**: Eliminates high-frequency backscatter speckle while preserving hard debris highlight edges.
   - **Contrast-Limited Adaptive Histogram Equalization (CLAHE)**: Prevents noise over-amplification in low-backscatter seabed areas while enhancing weak acoustic shadows.
   - **Time-Varied Gain (TVG)**: Spherical spreading and sound attenuation compensation $\text{TVG}(R) = 20 \log_{10}(R) + 2\alpha R$.
   - **6-DOF Kinematic Rectification**: Corrects pitch shear, roll gain asymmetry, and heave nadir modulation dynamically.

3. **Edge AI Perception & Physics Engine**:
   - **YOLO-11 Dual-Cue Detection**: Jointly detects specular acoustic highlights paired with their down-range acoustic shadows.
   - **3D Geometric Elevation Equation**: Estimates true target height $H$ above seabed using vehicle pitch/roll angular offsets:
     $$H = \frac{L_{\text{shadow}} \cdot \left(H_{\text{alt}} \cdot \cos(\theta_p) \cdot \cos(\theta_r)\right)}{R_{\text{slant}} + L_{\text{shadow}}}$$
   - **PatchCore Unsupervised Anomaly Engine**: Detects rare anomalies and uncataloged debris via a coreset memory bank of mid-level features.
   - **CycleGAN Acoustic Synthesizer**: Augmented synthetic acoustic texture generator yielding +26.4% mAP gain on rare debris classes.
   - **TensorRT INT8 Edge Profiling**: Quantized edge pipeline deployed on NVIDIA Jetson Orin Nano / Xavier NX running at **67.5 FPS** with **<18ms** latency.

4. **Tactical GIS & Telemetry Services**:
   - **60 FPS HTML5 Canvas Waterfall Engine**: Real-time dual-channel acoustic rasterizer with multiple colormaps.
   - **Tactical Geospatial GIS**: Leaflet mapping with CARTO Dark Matter basemap authentication and WGS84 geodesic projections.
   - **Incident Dossier**: Auto-generates standard GeoJSON layers and printable PDF survey dossiers.

5. **Workstation UI & Hardware Simulator**:
   - **3D AUV Dynamic Orientation Canvas**: Real-time attitude visualization reflecting vehicle dynamics.
   - **Hardware Telemetry Strip**: Monitors thruster PWM, battery discharge curves, transducer frequency, and ping counter telemetry.
   - **60s Guided Tour & Hotkeys**: Rapid evaluation walkthrough and keyboard hotkey navigation (`1`-`8`, `J`, `Space`, `?`).

---

## 🚀 Key Features

- **Live Sonar Waterfall Display**: High-resolution continuous acoustic waterfall view with port/starboard channel sweeps, real-time gain/contrast adjustments, and bounding box highlights.
- **Acoustic Analysis Studio**: Deep inspection tool for detected anomalies featuring intensity colormaps, acoustic shadow measurement crosshairs, and 3D elevation profiling using:
  $$\text{Target Height } (H) = \frac{L_{\text{shadow}} \times H_{\text{altitude}}}{R_{\text{slant}} + L_{\text{shadow}}}$$
- **Geospatial Tactical Map**: Interactive Leaflet GIS mapping plotting mission survey waypoints, real-time AUV coordinates, detected debris clusters, and hazardous anomalies with GeoJSON export capability.
- **GAN Synthetic Data Studio**: Synthetic sonar generation simulating turbidity, acoustic speckle noise, and reverberation using CycleGAN pipelines to augment rare submerged object datasets.
- **Edge NPU Profiling & Telemetry**: Performance benchmarking for edge hardware (NVIDIA Jetson Orin Nano / Xavier NX), monitoring TensorRT INT8 inference latency, FPS throughput, wattage, and temperature.
- **Hardware Simulator**: Real-time thruster, IMU, depth transducer, and sidescan acoustic transducer simulator for testing mission scenarios.
- **Mission Intelligence & Report Generation**: One-click generation of hydrographic survey logs and PDF mission reports with threat rankings and spatial tags.
- **Judge Walkthrough Tour & Hotkey Navigation**: Interactive 60-second evaluation walkthrough and ergonomic keyboard hotkeys (`1`-`8`, `J`, `?`).

---

## 🛠️ Tech Stack

- **Frontend & UI**: [React 19](https://react.dev/), [Vite 8](https://vitejs.dev/), [TailwindCSS v4](https://tailwindcss.com/), [Framer Motion](https://www.framer.motion)
- **Backend & AI Inference**: [FastAPI](https://fastapi.tiangolo.com/), [Ultralytics YOLO](https://github.com/ultralytics/ultralytics), [ONNX Runtime](https://onnxruntime.ai/), [OpenCV](https://opencv.org/), [NumPy](https://numpy.org/), [Pandas](https://pandas.pydata.org/), [Streamlit](https://streamlit.io/)
- **Data Visualization & GIS**: [Chart.js](https://www.chartjs.org/) & [React-ChartJS-2](https://react-chartjs-2.js.org/), [Leaflet](https://leafletjs.com/)
- **Icons & UI Components**: [Lucide React](https://lucide.dev/), [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)
- **Reporting**: [jsPDF](https://github.com/parallax/jsPDF) & [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable)
- **Code Quality & Testing**: [Oxlint](https://oxc.rs/), [Pytest](https://pytest.org/)

---

## 🏁 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18.x or later recommended)
- [Python](https://www.python.org/) (version 3.10 or later)
- `npm` and `pip`

### 1. Clone the repository

```bash
git clone https://github.com/TanayThapar/Automated-Underwater-Marine-Debris-And-Anomaly-Detection-System.git
cd Automated-Underwater-Marine-Debris-And-Anomaly-Detection-System
```

### 2. Install Dependencies

**Full-stack in one command:**
```bash
npm run install:all
```

*Or manually:*
```bash
# Frontend
cd frontend && npm install && cd ..

# Backend
cd backend && pip install -r requirements.txt && cd ..
```

### 3. Running the Application

#### Option A: One-Command Full-Stack Runner
```bash
./start.sh
```
This boots the FastAPI REST backend at `http://localhost:8000` and Vite React workstation at `http://localhost:5173` simultaneously.

#### Option B: Individual Services

- **FastAPI REST API**:
  ```bash
  cd backend
  python3 fastapi_server.py
  # API docs live at http://localhost:8000/docs
  ```

- **Frontend Development Server**:
  ```bash
  cd frontend
  npm run dev
  # Workstation UI at http://localhost:5173
  ```

- **Standalone Streamlit Acoustic Lab**:
  ```bash
  cd backend
  streamlit run app.py
  # Lab UI at http://localhost:8501
  ```

### 4. Build & Production Deployment

```bash
# Build optimized frontend bundle
npm run build:frontend

# Run unified production server (serves both API + React SPA from port 8000)
npm run start:backend
```

---

## 📡 REST API Endpoints

The FastAPI backend exposes the following endpoints:

| Method | Endpoint | Description |
|:---:|:---|:---|
| `GET` | `/health` | Server status and YOLO ONNX model readiness |
| `POST` | `/analyze` | Ingests sonar image + telemetry; returns bounding boxes, 3D math, GPS tags, and base64 visualization |
| `GET` | `/report/csv` | Streams a downloadable CSV export of the latest survey detections |
| `GET` | `/docs` | Interactive Swagger API documentation |

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|:---:|:---|
| `1` | Live Sonar Waterfall View |
| `2` | Acoustic Studio & Analysis |
| `3` | Geospatial Map View |
| `4` | GAN Synthesizer Studio |
| `5` | Edge NPU Telemetry |
| `6` | Mission Report Generator |
| `7` | SIH Pitch Proposal Guide |
| `8` | Hardware Simulator View |
| `J` | 60-Second Guided Evaluation Tour |
| `?` | Keyboard Shortcuts Cheat Sheet |

---

## 📂 Project Structure

```
Automated-Underwater-Marine-Debris-And-Anomaly-Detection-System/
├── frontend/                     # React 19 + Vite + Tailwind Workstation
│   ├── public/                   # Static assets, icons, and architecture blueprint
│   ├── src/
│   │   ├── assets/               # Sonar acoustic textures and brand assets
│   │   ├── components/           # Modular perception & telemetry UI components
│   │   │   ├── AnalysisStudio.jsx       # Acoustic highlight/shadow inspection & API client
│   │   │   ├── Auv3DCanvas.jsx          # 3D AUV orientation render
│   │   │   ├── EdgeMetricsView.jsx      # Jetson Orin NPU benchmarks
│   │   │   ├── GeospatialMapView.jsx    # Tactical GIS map with Leaflet
│   │   │   ├── HardwareSimulatorView.jsx# Subsea AUV hardware telemetry
│   │   │   ├── LiveWaterfallView.jsx    # Dual-channel side-scan sonar waterfall
│   │   │   ├── ReportGenerator.jsx      # Automated survey PDF export
│   │   │   ├── SihPitchGuide.jsx        # SIH project architecture & specs
│   │   │   └── SyntheticStudio.jsx      # CycleGAN synthesis pipeline
│   │   ├── context/              # Theme and telemetry state context
│   │   ├── data/                 # Sonar sample catalogs, survey metrics
│   │   ├── utils/                # API client, 3D shadow math, DSP filters
│   │   │   ├── api.js            # FastAPI integration client
│   │   │   └── sonarProcessor.js # DSP canvas rasterizer & elevation calculations
│   │   ├── App.jsx               # Main dashboard layout & router
│   │   ├── index.css             # Tailwind v4 theme styling rules
│   │   └── main.jsx              # Application entry point
│   ├── package.json              # Frontend dependencies & scripts
│   └── vite.config.js            # Vite bundler configuration & API proxy
├── backend/                      # Python FastAPI & AI Perception Engine
│   ├── app.py                    # Streamlit acoustic analysis lab
│   ├── fastapi_server.py         # Production FastAPI REST backend + static server
│   ├── requirements.txt          # Python dependencies
│   ├── src/                      # Core AI & DSP logic
│   │   ├── model/                # YOLO-11 ONNX inference engine
│   │   ├── preprocessing/        # CLAHE, Rayleigh despeckling, slant-range projection
│   │   └── utils/                # WGS84 Geotagging and 3D elevation math
│   ├── weights/                  # Pretrained model weights (best.onnx)
│   ├── scripts/                  # Dataset preparation, training, & evaluation scripts
│   └── tests/                    # Pytest verification suites
├── start.sh                      # Full-stack dev runner script
├── package.json                  # Root monorepo orchestration scripts
├── .gitignore                    # Global ignore rules
└── README.md                     # Documentation
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

