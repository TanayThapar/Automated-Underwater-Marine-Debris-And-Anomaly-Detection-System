from ultralytics import YOLO
import os
import shutil

def train_model():
    print("Initializing YOLOv8n for training...")
    # Load a pretrained model
    model = YOLO("yolov8n.pt") 
    
    # Path to data.yaml
    data_yaml_path = os.path.abspath("../datasets_yolo/data.yaml")
    
    print(f"Training using {data_yaml_path} for 3 epochs (Proof of Concept)...")
    # Train the model
    results = model.train(
        data=data_yaml_path,
        epochs=3, # Minimal epochs for quick demonstration
        imgsz=640,
        device="cpu", # Assuming CPU for this demo
        project="sonar_training",
        name="run_poc"
    )
    
    print("Training complete. Exporting to ONNX...")
    # Export the best model to ONNX format
    success = model.export(format="onnx")
    
    print("Copying exported ONNX model to backend weights directory...")
    # Find the exported file
    export_path = "sonar_training/run_poc/weights/best.onnx"
    target_dir = "../weights"
    
    os.makedirs(target_dir, exist_ok=True)
    if os.path.exists(export_path):
        shutil.copy(export_path, f"{target_dir}/best.onnx")
        print(f"Successfully copied to {target_dir}/best.onnx")
    else:
        print("Exported ONNX file not found!")

if __name__ == "__main__":
    train_model()
