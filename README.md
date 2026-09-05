# AI-Powered Automated Underwater Marine Debris and Anomaly Detection System Using Side-Scan Sonar Imagery


[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-purple.svg)](https://vitejs.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg)](https://fastapi.tiangolo.com/)
[![ONNX Runtime](https://img.shields.io/badge/ONNX_Runtime-Inference-blue.svg)](https://onnxruntime.ai/)
[![Ultralytics YOLOv8](https://img.shields.io/badge/YOLOv8n-Detection_Backbone-orange.svg)](https://github.com/ultralytics/ultralytics)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](#license)

---

## Abstract

This repository presents an end-to-end, edge-deployable computer vision system for the automated detection, classification, and geolocation of anthropogenic marine debris and other seabed anomalies in side-scan sonar (SSS) imagery. The system combines a lightweight convolutional object-detection backbone (YOLOv8n), an acoustically-motivated image preprocessing pipeline, a physics-based acoustic-shadow height-estimation module, and a trigonometric geotagging engine that projects pixel-space detections into WGS-84 geographic coordinates. Results are surfaced through a full-stack operator dashboard comprising a FastAPI inference backend and a React-based mission-control frontend, enabling near-real-time triage of hydrographic survey data without dependence on cloud connectivity. The project was developed in response to Problem Statement 26057 of the Smart India Hackathon 2026, under the Disaster Management theme, with a specific focus on the identification of "ghost nets" — abandoned or lost fishing gear that represents one of the most persistent and destructive forms of marine pollution.

---

## 1. Background and Motivation

The accumulation of anthropogenic debris in marine ecosystems constitutes a critical and escalating threat to global biodiversity. Among the most destructive categories of marine pollution are ghost nets — abandoned, lost, or discarded fishing gear that continues to entangle and kill marine organisms, damage coral reef structures, and pose navigational hazards to commercial and naval vessels long after being lost at sea.

Owing to the vastness, depth, and optical opacity of the ocean environment, marine conservationists and hydrographic surveyors rely on side-scan sonar instrumentation — towed behind survey vessels or mounted on Autonomous Underwater Vehicles (AUVs) — to construct detailed acoustic maps of the seafloor. The manual review of these sonar logs, however, is a labor-intensive process: a single survey may generate tens of hours of acoustic waterfall data, and debris signatures frequently resemble natural geological features such as rock outcrops, sand ripples, and sediment ridges, making manual interpretation slow, subjective, and error-prone.

This project automates that interpretive process through computer vision, with the objective of reliably distinguishing artificial anomalies from natural seafloor topology, and of doing so under computational constraints compatible with onboard AUV or marine-drone deployment — that is, without a mandatory dependency on high-bandwidth cloud infrastructure.


<p align="center">
  <img src="asset/WhatsApp Image 2026-09-05 at 12.31.21 AM.jpeg" width="700"/>
</p>


---

## 2. Objectives

The system was designed to satisfy four functional requirements central to the problem statement:

1. **Detection / Segmentation** — An AI/ML architecture capable of localizing man-made objects (shipwrecks, pipelines, cylinders, and entangled debris nets) within raw sonar imagery via bounding boxes.
2. **Confidence Scoring and Noise Filtering** — A processing pipeline that suppresses false positives arising from acoustic shadows or natural rock clustering, and that reports a calibrated confidence score for every retained detection.
3. **Anomaly Reporting and Geotagging** — A metadata-aware reporting engine that converts pixel-space detections into structured, geolocated records (JSON/CSV) suitable for downstream GIS consumption.
4. **Interactive Dashboard** — A visual interface permitting log ingestion, real-time overlay of detections on a geospatial map, and export of mission reports.


---

## 3. Proposed Solution


The proposed solution is an end-to-end AUV/drone-mounted perception pipeline that converts raw side-scan sonar waterfall imagery into actionable, geotagged detections, engineered to execute on the vehicle itself rather than requiring a round-trip to cloud infrastructure.

**Processing pipeline:**

```
Sonar Imagery → CLAHE Contrast Normalization → YOLOv8n Object Detection
   → Acoustic-Shadow Height Estimation → Anomaly Classification
      → Geotagged Mission Report
```

At the class level, the detector distinguishes the following anomaly categories: **Shipwreck**, **Pipe**, **Cylinder**, **Ghost Net**, and generic **Debris**.

### 3.1 How the System Addresses the Problem

- Manual review of hydrographic sonar footage can require tens of hours per survey. The trained detector executes in approximately **2 ms per image** on CPU, enabling near-real-time triage during the mission itself rather than in post-processing.
- The system prioritizes the highest-hazard classes — ghost nets and shipwrecks — by attaching a confidence score to every detection, allowing cleanup and navigation teams to act on the most critical targets first.
- We trained and validated our ghost-net detector using stratified 3-fold cross-validation on a limited annotated dataset (90 images, 46 positive samples), achieving a mean mAP50 of 0.47. Rather than reporting a single train/test split — which can misleadingly overstate performance depending on which images land in the test set — we used cross-validation specifically to surface this variance (σ=0.195) and give an estimate of real-world generalization. Our best fold reached 0.657 mAP50, and we've identified dataset size as the primary lever for improvement, which directly motivates our synthetic data augmentation pipeline.

### 3.2 Innovation and Distinguishing Characteristics

- **Compact detector**: A sub-7 MB, 8.1 GFLOP YOLOv8n model, validated across three independent, publicly available datasets (Seabed, AI4Shipwreck, and Marine Pulse) rather than a single train/test split.
- **Physics-based height estimation**: Object height is recovered from acoustic-shadow geometry rather than inferred solely from a 2D bounding box, using the classical hydrographic relation between slant range, shadow length, and vehicle altitude.
- **Synthetic sonar data generation**: A synthetic-texture studio is included to partially offset the scarcity of labeled, real-world sonar debris imagery.
- **Transparent per-class validation**: Reported metrics are broken down by dataset and class, with an explicit account of where the model performs reliably and where it does not (Section 7).

---

## 4. System Architecture


<p align="center">
  <img src="asset/WhatsApp Image 2026-09-04 at 11.32.45 PM.jpeg" width="700"/>
</p>


The system is composed of two cooperating tiers:

- **Backend Perception Engine** (`backend/`) — A Python/FastAPI service responsible for image preprocessing, ONNX-based model inference, acoustic-shadow height computation, and coordinate geotagging.
- **Frontend Mission Workstation** (`frontend/`) — A React 19 single-page application providing live sonar visualization, interactive analysis tooling, GIS mapping, and report generation.

### 4.1 End-to-End Pipeline

1. **Sonar Log and Telemetry Ingestion** — The system accepts raw side-scan sonar image logs (PNG/JPEG) together with AUV navigation telemetry: vehicle latitude, longitude, heading, and swath width.
2. **Acoustic Preprocessing** (`backend/src/preprocessing/engine.py`)
   - *Speckle noise suppression* via edge-preserving median filtering, to attenuate acoustic reverberation and backscatter noise while preserving object boundaries.
   - *Contrast-Limited Adaptive Histogram Equalization (CLAHE)* to normalize gain variation across the sonar scanline without saturating low-intensity shadow regions.
   - *Acoustic shadow enhancement* via gamma-curve remapping (γ = 1.5) to improve the visibility of shadows cast by seafloor targets — a key discriminative cue for object height estimation.
3. **Detection Engine** (`backend/src/model/inference.py`)
   - Object detection is performed by a YOLOv8n backbone, exported to ONNX and executed via ONNX Runtime (`weights/best.onnx`).
   - The engine incorporates an automatic fallback ("mock") mode that returns a synthetic demonstration detection when model weights are unavailable, ensuring the API and frontend remain functionally testable in the absence of a bound model artifact.
4. **Acoustic-Shadow Height Estimation**

   Target height is estimated from the geometry of the acoustic shadow cast on the seafloor, corrected for vehicle pitch and roll:

   $$H_{\text{target}} = \frac{L_{\text{shadow}} \times \left(H_{\text{altitude}} \cdot \cos(\theta_{\text{pitch}}) \cdot \cos(\theta_{\text{roll}})\right)}{R_{\text{slant}} + L_{\text{shadow}}}$$

   where $L_{\text{shadow}}$ is the measured shadow length, $H_{\text{altitude}}$ is the vehicle's altitude above the seafloor, $R_{\text{slant}}$ is the slant range to the target, and $\theta_{\text{pitch}}, \theta_{\text{roll}}$ are the instantaneous vehicle attitude angles.

5. **Geotagging and Coordinate Projection** (`backend/src/utils/geotag.py`)
   - Pixel-space bounding-box centroids are converted to metric across-track ($X$) and along-track ($Y$) offsets using the known swath width and image resolution.
   - A heading-corrected 2D rotation is applied, and the result is projected onto the WGS-84 ellipsoid model (111,320 m per degree of latitude, adjusted for longitude by $\cos(\text{latitude})$) to yield the absolute latitude/longitude of each detected object.
6. **Interactive Presentation** (`frontend/src/`) — Detections, confidence scores, and geographic coordinates are rendered in the live waterfall view, the GIS tactical map, and the exportable mission report.

---

## 5. Technical Specifications

### 5.1 Detection Model

| Parameter | Value |
|---|---|
| Architecture | YOLOv8n (Ultralytics) |
| Parameters | ≈ 3.0 M |
| Computational Cost | 8.1 GFLOPs |
| Weights Size | 6.3 MB (ONNX export) |
| Inference Latency | ≈ 2 ms / frame (CPU) |
| Export Format | ONNX (`backend/weights/best.onnx`), TorchScript-exportable for edge targets |
| Detected Classes | Shipwreck, Pipe, Cylinder, Ghost Net, Debris |

### 5.2 Anomaly Classification Model ("Marine Pulse")

| Parameter | Value |
|---|---|
| Role | Secondary 4-class anomaly refinement stage |
| Classes | EP, POC, SS, URM |
| Weights Size | ≈ 44.8 MB |
| Reported Accuracy | 94.2% (n = 190 test samples) |
| Note | Not yet benchmarked on target embedded hardware |



<p align="center">
  <img src="asset/WhatsApp Image 2026-09-04 at 10.54.05 PM (1).jpeg" width="700"/>
</p>


### 5.3 Algorithms Used

| Stage | Algorithm | Purpose |
|---|---|---|
| Object Detection | **YOLOv8n** — single-stage, anchor-free CNN detector (CSPDarknet-style backbone, PAN-FPN neck, decoupled detection head) | Localizes and classifies debris/anomaly objects with bounding boxes and per-class confidence scores. |
| Post-processing | **Non-Maximum Suppression (NMS)** | Suppresses duplicate/overlapping bounding boxes around the same physical object. |
| Confidence Filtering | **Threshold-based confidence filtering** (default τ = 0.55) | Discards low-confidence detections likely to be false positives from acoustic clutter. |
| Noise Reduction | **Median blur filtering** | Edge-preserving suppression of speckle/reverberation noise characteristic of sonar returns. |
| Contrast Normalization | **CLAHE** (Contrast-Limited Adaptive Histogram Equalization) | Locally normalizes gain variation across the sonar scanline without over-amplifying noise. |
| Shadow Enhancement | **Gamma correction** (γ = 1.5, LUT-based remapping) | Enhances low-intensity acoustic shadow regions used as a discriminative height cue. |
| Height Estimation | **Acoustic-shadow geometry** ($H = \frac{L_{\text{shadow}} \cdot H_{\text{altitude}} \cos\theta_{\text{pitch}} \cos\theta_{\text{roll}}}{R_{\text{slant}} + L_{\text{shadow}}}$) | Recovers physical target height from shadow length, slant range, and vehicle attitude. |
| Anomaly Classification | **Marine Pulse classifier** — CNN-based 4-class classifier (EP / POC / SS / URM) | Refines the coarse detector output into a finer-grained anomaly category. |
| Geolocation | **Heading-corrected 2D rotation + WGS-84 geodetic projection** | Converts pixel-space bounding-box offsets into metric across-/along-track distances, then projects them to absolute latitude/longitude. |
| Model Inference | **ONNX Runtime graph execution** (CPU / CUDA execution providers) | Executes the exported detection graph efficiently on both server and edge-class hardware. |

### 5.4 Technology Stack

| Layer | Technologies |
|---|---|
| Frontend Framework | React 19, Vite 8, Framer Motion |
| Styling & Iconography | Tailwind CSS v4, Lucide React |
| Mapping & Visualization | Leaflet, CARTO basemap tiles, Chart.js / React-ChartJS-2 |
| Backend API | FastAPI, Uvicorn, Pydantic |
| Computer Vision & Numerics | OpenCV, NumPy, SciPy |
| Model Training | Ultralytics YOLOv8, PyTorch/TorchVision |
| Inference Runtime | ONNX Runtime (CPU / CUDA execution providers) |
| Data & Exploratory Tooling | Pandas, Pillow, Streamlit |
| Verification | Pytest |

---

## 6. Methodology

The end-to-end methodology followed during development was:

1. Acquisition of side-scan sonar waterfall imagery (port and starboard channels) from an AUV or towed sensor package.
2. Preprocessing via CLAHE-based contrast normalization together with sonar-appropriate data augmentation (mosaic, blur, grayscale conversion) during training.
3. Detection and coarse classification of anomalies using the YOLOv8n backbone, with a per-detection confidence score.
4. Acoustic-shadow-based estimation of target height, corrected for instantaneous vehicle pitch and roll, per the relation in Section 4.1.
5. Refinement of anomaly category using the secondary Marine Pulse classifier.
6. Geotagging of all retained detections and rendering on the live tactical map.
7. Generation of a single, exportable mission report (CSV, with a client-side PDF report generator) enumerating detections, confidence scores, and coordinates, ordered by hazard priority.

---

## 7. Experimental Validation

The detection and classification models were validated against three independent, publicly available sonar/marine-anomaly datasets rather than a single internal split, in order to expose class-level and dataset-level variance.

| Dataset | Metric | Result |
|---|---|---|
| Seabed (side-scan sonar debris) | Debris detection mAP50 | 0.85 |
| AI4Shipwreck | mAP50-95 (clean 100-epoch convergence run) | 0.58 |
| Marine Pulse | Classification accuracy (n = 190) | 94.2% |

### 7.1 Known Limitations

Consistent with the project's emphasis on transparent reporting, the following limitations are explicitly acknowledged rather than obscured:
- **Shipwreck detection** was evaluated on only four unique images in the AI4Shipwreck split, implying a non-trivial risk of high variance in the reported metric.
- The Marine Pulse classification model, at 44.8 MB, is approximately seven times larger than the primary detector, and its inference latency on target embedded hardware (e.g., Jetson-class devices) has not yet been benchmarked.
- No hardware-in-the-loop testing has yet been conducted on the intended target embedded platform.


### 7.2 Planned Mitigations

- Broaden the shipwreck training set across additional scenes to reduce estimator variance.
- Profile the Marine Pulse classifier on target embedded hardware, with quantization or distillation applied if onboard (rather than post-mission) execution is required.
- Conduct full hardware-in-the-loop benchmarking (e.g., Jetson-class device with TensorRT INT8 quantization) for both the detection and classification stages prior to field deployment.

<p align="center">
  <img src="asset/WhatsApp Image 2026-09-04 at 10.54.05 PM.jpeg" width="700"/>
</p>


---

## 8. Prototype Status

The operator dashboard is fully implemented and comprises eight functional modules: live sonar waterfall display, acoustic analysis studio, GIS tactical map, synthetic-data studio, edge/NPU telemetry benchmarking, subsea hardware simulator, mission report generator, and a guided walkthrough for evaluators. The trained and validated detection/classification models described in Section 7 are in the process of being integrated into this frontend as the live inference backend, in place of the simulated data used during interface development. The FastAPI service already exposes the full inference contract (Section 11) and falls back to a deterministic mock detection when model weights are not mounted, so the dashboard remains fully exercisable end-to-end during this integration phase.

---

## 9. Repository Structure

```
Automated-Underwater-Marine-Debris-And-Anomaly-Detection-System/
├── frontend/                        # React 19 client application
│   ├── public/                      # Static assets and architecture diagram
│   └── src/
│       ├── components/
│       │   ├── LiveWaterfallView.jsx      # Dual-channel acoustic waterfall renderer
│       │   ├── AnalysisStudio.jsx         # DSP comparison studio + live API client
│       │   ├── GeospatialMapView.jsx      # Leaflet-based tactical GIS map
│       │   ├── SyntheticStudio.jsx        # Synthetic sonar texture generator
│       │   ├── HardwareSimulatorView.jsx  # Telemetry & vehicle dynamics simulator
│       │   ├── Auv3DCanvas.jsx             # 3D AUV attitude visualization
│       │   ├── EdgeMetricsView.jsx        # Edge/NPU benchmarking view
│       │   └── ReportGenerator.jsx        # Mission report generation (CSV/PDF)
│       ├── utils/
│       │   ├── api.js                     # FastAPI client
│       │   └── sonarProcessor.js          # Client-side DSP & shadow-height math
│       └── data/                          # Sample sonar catalogs and reference metrics
├── backend/                         # Python perception and REST engine
│   ├── fastapi_server.py            # FastAPI REST service (production entry point)
│   ├── app.py                       # Standalone Streamlit exploration lab
│   ├── requirements.txt             # Python dependency manifest
│   ├── src/
│   │   ├── preprocessing/engine.py  # Despeckling, CLAHE, shadow enhancement
│   │   ├── model/inference.py       # ONNX-based YOLOv8n inference wrapper
│   │   └── utils/geotag.py          # WGS-84 geotagging engine
│   ├── weights/best.onnx            # Exported detection model weights
│   ├── scripts/                     # Training, data preparation, and evaluation scripts
│   └── tests/                       # Pytest verification suite
├── start.sh                         # Unified full-stack launcher
├── package.json                     # Root monorepo orchestration scripts
└── README.md
```

---

## 10. Installation and Deployment

### 10.1 Prerequisites

- Node.js ≥ 18.x
- Python ≥ 3.10
- `npm` and `pip` package managers

### 10.2 Dependency Installation

```bash
git clone https://github.com/TanayThapar/Automated-Underwater-Marine-Debris-And-Anomaly-Detection-System.git
cd Automated-Underwater-Marine-Debris-And-Anomaly-Detection-System

# Automated install (frontend + backend)
npm run install:all
```

Alternatively, install each tier manually:

```bash
cd frontend && npm install && cd ..
cd backend  && pip install -r requirements.txt && cd ..
```

### 10.3 Running the System

**Unified launcher** (recommended for development):

```bash
./start.sh
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- Interactive API documentation: `http://localhost:8000/docs`

**Individual services:**

```bash
# Backend
cd backend && python3 fastapi_server.py

# Frontend
cd frontend && npm run dev

# Standalone Streamlit exploration lab
cd backend && streamlit run app.py   # http://localhost:8501
```

### 10.4 Production Build

```bash
npm run build:frontend    # Compile the React client
npm run start:backend     # FastAPI serves both the API and frontend/dist
```

The complete application is then available at `http://localhost:8000`.

---

## 11. REST API Reference

| Method | Endpoint | Parameters | Description |
|---|---|---|---|
| `GET` | `/health` | — | Returns service status and ONNX model load state. |
| `POST` | `/analyze` | `file` (image, form-data); `vehicle_lat` (float, default 14.5); `vehicle_lon` (float, default 75.5); `heading` (float, default 0.0); `swath_width` (float, default 100.0) | Executes preprocessing, detection, and geotagging on the supplied image; returns detections, real-world coordinates, and a base64-encoded annotated visualization. |
| `GET` | `/report/csv` | — | Streams a downloadable CSV report of the most recent detection run. |
| `GET` | `/docs` | — | Interactive OpenAPI/Swagger documentation. |

---

## 12. Testing

The backend verification suite covers the preprocessing filters and geotagging trigonometry:

```bash
cd backend
PYTHONPATH=. pytest tests
```

---

## 13. Impact and Applicability

**Target audience:** marine debris cleanup organizations and port authorities; coast guards and naval hydrographic units (pipeline monitoring, wreck and hazard mapping); environmental NGOs and ocean-conservation researchers; and disaster-response or search teams operating AUVs in low-connectivity offshore environments.

**Anticipated benefits:**

- *Environmental* — faster identification and removal of ghost nets and plastic debris, among the most destructive hazards to marine life.
- *Economic* — compresses tens of hours of manual sonar-log review into near-real-time triage, reducing survey-vessel time and mission cost.
- *Safety* — early flagging of shipwrecks and submerged hazards supports safer maritime navigation and pipeline route planning.
- *Operational* — the system is cloud-independent and edge-deployable, remaining functional in remote, low-bandwidth offshore conditions.
- *Decision speed* — automatically generated mission reports with threat ranking provide actionable output as soon as the AUV surfaces.

---

## 14. Datasets and References

- Ultralytics YOLOv8 — object detection backbone and training framework: https://github.com/ultralytics/ultralytics
- Seabed side-scan sonar debris dataset: https://www.kaggle.com/datasets/enochkwatehdongbo/seabedobjects-klsg-dataset
- AI4Shipwreck dataset: https://deepblue.lib.umich.edu/data/concern/data_sets/8623hz41x?locale=en
- Marine Pulse anomaly classification dataset: https://zenodo.org/records/7922705
- Contrast-Limited Adaptive Histogram Equalization (CLAHE) — standard sonar preprocessing technique.
- Side-scan sonar acoustic-shadow geometry — standard hydrographic method for estimating submerged object height from shadow length and slant range.
- GhostNetZero — AI for detecting marine ghost nets: https://www.researchgate.net/publication/395786653_GhostNetZero_AI_for_Detecting_Marine_Ghost_Nets

---

## 15. Team

Developed by **Team Anomalies** (Team ID: SIH26057) for Problem Statement 26057, Smart India Hackathon 2026.

---

## 16. License

This project is released under the MIT License. See the `LICENSE` file for full terms.
