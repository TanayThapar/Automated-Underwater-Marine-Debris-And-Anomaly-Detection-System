"""
fastapi_server.py
-----------------
FastAPI REST backend that serves the sonar detection pipeline.
Exposes endpoints for the React frontend to call.

Endpoints:
  POST /analyze       - Upload image → returns detections + geotagged results
  GET  /health        - Health check + model status
  GET  /report/csv    - Download last run as CSV
"""

import io
import os
import cv2
import sys
import json
import numpy as np
import pandas as pd
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse

# Add backend/src to path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from src.preprocessing import PreprocessingEngine
from src.model import DebrisDetector
from src.utils import GeotaggingEngine

app = FastAPI(
    title="AeroAqua DeepScan AI – Sonar Detection API",
    description="Marine debris and shipwreck detection from Side-Scan Sonar imagery.",
    version="1.0.0",
)

# Allow all origins for local dev (tighten this for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load models once on startup ────────────────────────────────────────────────
MODEL_PATH = BASE_DIR / "weights" / "best.onnx"

print(f"Loading models (model path: {MODEL_PATH})…")
preprocessor = PreprocessingEngine()
detector     = DebrisDetector(
    model_path=str(MODEL_PATH),
    conf_threshold=0.55,
)
print("Models ready.")

# In-memory store for the last run's results (simple; use a DB in production)
_last_results: list[dict] = []


# ── Helper ─────────────────────────────────────────────────────────────────────
def bytes_to_cv2(data: bytes) -> np.ndarray:
    arr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image. Ensure it is a valid PNG/JPG.")
    return img


def cv2_to_png_bytes(img: np.ndarray) -> bytes:
    _, buf = cv2.imencode(".png", img)
    return buf.tobytes()


def draw_detections(image: np.ndarray, detections: list[dict]) -> np.ndarray:
    """Draw YOLO-style bounding boxes on the image."""
    COLOR_MAP = {
        "shipwreck": (0, 80, 255),
        "aircraft":  (255, 200, 0),
        "ship":      (0, 200, 255),
        "human":     (0, 255, 120),
        "debris":    (255, 60, 60),
    }
    out = image.copy()
    for det in detections:
        x1, y1, x2, y2 = det["bbox"]
        label = det["class"]
        conf  = det["conf"]
        color = COLOR_MAP.get(label, (255, 255, 255))
        # Box
        cv2.rectangle(out, (x1, y1), (x2, y2), color, 2)
        # Label background
        text = f"{label} {conf:.0%}"
        (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
        cv2.rectangle(out, (x1, y1 - th - 6), (x1 + tw + 4, y1), color, -1)
        cv2.putText(out, text, (x1 + 2, y1 - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 1, cv2.LINE_AA)
    return out


# ── Routes ─────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": detector.model_loaded,
        "model_path": str(MODEL_PATH),
        "mode": "real_inference" if detector.model_loaded else "mock_mode",
    }


@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    vehicle_lat:  float = Form(default=14.5),
    vehicle_lon:  float = Form(default=75.5),
    heading:      float = Form(default=0.0),
    swath_width:  float = Form(default=100.0),
):
    """
    Upload a sonar image; receive bounding-box detections, confidence scores,
    annotated image (base64 PNG), and GPS coordinates.
    """
    global _last_results

    # 1 – Decode image
    data = await file.read()
    try:
        image = bytes_to_cv2(data)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    img_h, img_w = image.shape[:2]

    # 2 – Preprocess
    processed = preprocessor.process(image)

    # 3 – Inference
    raw_detections = detector.predict(processed)

    # 4 – Geotag + confidence filter
    geotagger = GeotaggingEngine(
        vehicle_lat=vehicle_lat,
        vehicle_lon=vehicle_lon,
        heading=heading,
        swath_width_m=swath_width,
        img_width_px=img_w,
    )
    results = geotagger.filter_and_geotag(raw_detections, img_h, conf_thresh=0.55)

    # 5 – Draw detections on processed image
    annotated = draw_detections(processed, raw_detections)
    annotated_png = cv2_to_png_bytes(annotated)

    # 6 – Build response payload
    _last_results = results  # cache for /report/csv

    detections_payload = [
        {
            "id":         f"DET-{i+1:03d}",
            "class":      r["class"],
            "confidence": round(r["confidence"] * 100, 1),
            "bbox":       r["bbox"],
            "latitude":   round(r["latitude"], 6),
            "longitude":  round(r["longitude"], 6),
        }
        for i, r in enumerate(results)
    ]

    # Return annotated image as base64 so the frontend can display it directly
    import base64
    img_b64 = base64.b64encode(annotated_png).decode()

    return JSONResponse({
        "filename":       file.filename,
        "image_w":        img_w,
        "image_h":        img_h,
        "total_detected": len(results),
        "detections":     detections_payload,
        "annotated_image_b64": img_b64,   # PNG, base64-encoded
    })


@app.get("/report/csv")
def download_csv():
    """Download the last analysis run as a CSV file."""
    if not _last_results:
        raise HTTPException(status_code=404, detail="No analysis results available yet.")
    df = pd.DataFrame(_last_results)
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    stream.seek(0)
    return StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=hazard_report.csv"},
    )


# ── Mount Production Frontend (if built) ───────────────────────────────────────
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)

