"""
train_v2.py
-----------
Train YOLOv8n on the combined 5-class marine debris + shipwreck dataset.
Exports best weights to ONNX for edge deployment.
"""

from ultralytics import YOLO
import os
import shutil
from pathlib import Path

def train_model(epochs=5):
    BASE     = Path(__file__).resolve().parents[2]   # SIH/
    BACKEND  = Path(__file__).resolve().parents[1]   # backend/
    DATASETS = BACKEND / "datasets_yolo"
    WEIGHTS  = BACKEND / "weights"

    data_yaml = str(DATASETS / "data.yaml")
    WEIGHTS.mkdir(parents=True, exist_ok=True)

    print(f"Initializing YOLOv8n for training ({epochs} epochs) ...")
    model = YOLO("yolov8n.pt")

    print(f"Training with data: {data_yaml}")
    results = model.train(
        data=data_yaml,
        epochs=epochs,
        imgsz=640,
        device="cpu",
        project=str(BACKEND / "scripts" / "runs" / "detect" / "sonar_training"),
        name="multi_dataset_run",
        exist_ok=True,
        batch=8,        # smaller batch for CPU RAM
        workers=4,
        verbose=True,
    )

    print("\nTraining complete. Exporting to ONNX ...")
    export_result = model.export(format="onnx")

    # Ultralytics saves alongside the best.pt
    run_dir = Path(results.save_dir)
    onnx_path = run_dir / "weights" / "best.onnx"

    if onnx_path.exists():
        dest = WEIGHTS / "best.onnx"
        shutil.copy(onnx_path, dest)
        print(f"ONNX model saved to: {dest}")
    else:
        # Fallback: search nearby
        for candidate in run_dir.rglob("*.onnx"):
            shutil.copy(candidate, WEIGHTS / "best.onnx")
            print(f"ONNX found and copied from: {candidate}")
            break
        else:
            print("WARNING: Could not find best.onnx to copy!")

    print("\nDone! Your model is ready at backend/weights/best.onnx")

if __name__ == "__main__":
    train_model(epochs=100)
