import cv2
import numpy as np
import cv2.dnn as dnn

class SonarGANEnhancer:
    def __init__(self, model_path="weights/sonar_cyclegan.onnx"):
        """
        Loads lightweight ONNX-quantized GAN for real-time edge enhancement.
        """
        self.net = dnn.readNetFromONNX(model_path) if model_path else None

    def enhance(self, image: np.ndarray) -> np.ndarray:
        if self.net is None:
            # Fallback if weights aren't present
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            enhanced = clahe.apply(gray)
            return cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)
            
        h, w = image.shape[:2]
        # Preprocess input tensor for GAN (e.g., 256x256 normalized [-1, 1])
        blob = dnn.blobFromImage(image, 1.0 / 127.5, (256, 256), (127.5, 127.5, 127.5), swapRB=True)
        self.net.setInput(blob)
        out = self.net.forward()
        
        # Postprocess out tensor back to BGR image
        out = out.squeeze().transpose(1, 2, 0)
        out = ((out + 1.0) * 127.5).clip(0, 255).astype(np.uint8)
        out = cv2.resize(out, (w, h))
        return cv2.cvtColor(out, cv2.COLOR_RGB2BGR)