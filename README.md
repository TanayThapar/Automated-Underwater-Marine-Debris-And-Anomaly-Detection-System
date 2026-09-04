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

- **Frontend & UI**: [React 19](https://react.dev/), [Vite](https://vitejs.dev/), [TailwindCSS v4](https://tailwindcss.com/), [Framer Motion](https://www.framer.motion)
- **Data Visualization & GIS**: [Chart.js](https://www.chartjs.org/) & [React-ChartJS-2](https://react-chartjs-2.js.org/), [Leaflet](https://leafletjs.com/)
- **Icons & UI Components**: [Lucide React](https://lucide.dev/), [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)
- **Reporting**: [jsPDF](https://github.com/parallax/jsPDF) & [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable)
- **Code Quality**: [Oxlint](https://oxc.rs/)

---

## 🏁 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18.x or later recommended)
- `npm` or `pnpm` or `yarn`

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/TanayThapar/Automated-Underwater-Marine-Debris-And-Anomaly-Detection-System.git
   cd Automated-Underwater-Marine-Debris-And-Anomaly-Detection-System
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

5. **Preview production build**:
   ```bash
   npm run preview
   ```

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
├── public/                 # Static assets and icons
├── src/
│   ├── assets/             # Images and acoustic textures
│   ├── components/         # React modular UI components
│   │   ├── AnalysisStudio.jsx       # Acoustic highlight/shadow inspection
│   │   ├── Auv3DCanvas.jsx          # 3D AUV orientation render
│   │   ├── EdgeMetricsView.jsx      # Jetson Orin NPU benchmarks
│   │   ├── GeospatialMapView.jsx    # GIS map with Leaflet
│   │   ├── HardwareSimulatorView.jsx# Subsea AUV hardware telemetry
│   │   ├── LiveWaterfallView.jsx    # Side-scan sonar waterfall screen
│   │   ├── ReportGenerator.jsx      # PDF survey export
│   │   ├── SihPitchGuide.jsx        # SIH project architecture & specs
│   │   └── SyntheticStudio.jsx      # CycleGAN synthesis pipeline
│   ├── context/            # Global React context (theme, telemetry state)
│   ├── data/               # Sonar sample catalogs, survey metrics
│   ├── utils/              # Calculation helpers & PDF utilities
│   ├── App.jsx             # Main dashboard layout & router
│   ├── index.css           # Tailwind styling rules
│   └── main.jsx            # Application entry point
├── .gitignore              # Git ignore configuration
├── package.json            # Project dependencies & scripts
├── vite.config.js          # Vite configuration
└── README.md               # Documentation
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
