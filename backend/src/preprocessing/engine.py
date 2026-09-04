import cv2
import numpy as np
from scipy.signal import wiener

class PreprocessingEngine:
    def __init__(self, clip_limit=2.0, tile_grid_size=(8, 8)):
        self.clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)

    def reduce_noise(self, image: np.ndarray) -> np.ndarray:
        """
        Reduces speckle noise common in sonar imagery.
        Uses a combination of median blur (fast) or wiener filter.
        """
        # Convert to float for wiener filtering if grayscale
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image

        # Using Median Blur as a fast edge-preserving noise filter
        # It's better for real-time edge processing than Wiener in pure python
        denoised = cv2.medianBlur(gray, 3)
        return denoised

    def normalize_contrast(self, image: np.ndarray) -> np.ndarray:
        """
        Normalizes contrast using CLAHE (Contrast Limited Adaptive Histogram Equalization).
        This helps in standardizing varying sonar gain across logs.
        """
        return self.clahe.apply(image)

    def enhance_shadows(self, image: np.ndarray) -> np.ndarray:
        """
        Enhances the acoustic shadows (dark regions).
        """
        # Enhance dark regions using gamma correction
        gamma = 1.5
        inv_gamma = 1.0 / gamma
        table = np.array([((i / 255.0) ** inv_gamma) * 255
                          for i in np.arange(0, 256)]).astype("uint8")
        return cv2.LUT(image, table)

    def process(self, image: np.ndarray) -> np.ndarray:
        """
        Executes the full preprocessing pipeline.
        """
        denoised = self.reduce_noise(image)
        normalized = self.normalize_contrast(denoised)
        enhanced = self.enhance_shadows(normalized)
        
        # Convert back to BGR for AI model input if needed
        return cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)
