import cv2
import numpy as np
from src.preprocessing.engine import PreprocessingEngine
from src.model.inference import DebrisDetector

def test():
    img_path = "../../A SSS image sample.jpg"
    print(f"Testing inference on {img_path}")
    image = cv2.imread(img_path)
    
    preprocessor = PreprocessingEngine()
    detector = DebrisDetector(model_path="../weights/best.onnx", conf_threshold=0.25)
    
    processed = preprocessor.process(image)
    preds = detector.predict(processed)
    
    print("Detections:")
    print(preds)

if __name__ == '__main__':
    test()
