import numpy as np
import onnxruntime as ort
import os

class DebrisDetector:
    def __init__(self, model_path: str = "model.onnx", conf_threshold: float = 0.5):
        self.conf_threshold = conf_threshold
        self.model_loaded = False
        self.classes = {0: "Shipwreck", 1: "Pipe", 2: "Cylinder", 3: "Ghost Net", 4: "Debris"}
        
        # Load ONNX model if exists, else run in mock mode
        if os.path.exists(model_path):
            self.session = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])
            self.model_loaded = True
        else:
            print(f"Warning: Model not found at {model_path}. Running in mock mode.")
            self.session = None

    def preprocess(self, image: np.ndarray) -> np.ndarray:
        """
        Prepares the preprocessed image for YOLO model input.
        """
        # Resize to typical YOLO input size (e.g., 640x640)
        import cv2
        input_image = cv2.resize(image, (640, 640))
        # HWC to CHW format
        input_image = input_image.transpose((2, 0, 1))
        # Normalize
        input_image = input_image.astype(np.float32) / 255.0
        # Expand dims to represent batch size of 1
        return np.expand_dims(input_image, axis=0)

    def predict(self, image: np.ndarray):
        """
        Runs inference on the image and returns bounding boxes.
        Returns format: list of dicts {'bbox': [x1, y1, x2, y2], 'class': str, 'conf': float}
        """
        img_h, img_w = image.shape[:2]

        if not self.model_loaded:
            # Return dummy detection for demonstration
            return [
                {
                    "bbox": [int(img_w*0.4), int(img_h*0.4), int(img_w*0.6), int(img_h*0.6)],
                    "class": "Ghost Net",
                    "conf": 0.85
                }
            ]

        # Real ONNX inference
        input_tensor = self.preprocess(image)
        input_name = self.session.get_inputs()[0].name
        outputs = self.session.run(None, {input_name: input_tensor})
        
        # NOTE: YOLOv8 ONNX output shape is generally (1, num_classes + 4, num_anchors)
        # We need post-processing (NMS) which we will handle in a simplified way here
        predictions = self.post_process(outputs[0], img_w, img_h)
        return predictions

    def post_process(self, output, img_w, img_h):
        # Simplified post-processing (Requires NMS implementation in full version)
        # This is a placeholder for the actual bounding box parsing
        detections = []
        return detections
