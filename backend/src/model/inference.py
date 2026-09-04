import numpy as np
import onnxruntime as ort
import cv2
import os

class DebrisDetector:
    """
    YOLOv8 ONNX detector for marine debris and anomaly detection.

    Trained class mapping (from model metadata):
        0: shipwreck
        1: aircraft
        2: ship
        3: human
        4: debris
    """

    # Class names as the model was trained — must match data.yaml exactly
    CLASSES = {
        0: "shipwreck",
        1: "aircraft",
        2: "ship",
        3: "human",
        4: "debris",
    }

    # YOLO input resolution used during training
    INPUT_SIZE = 640

    def __init__(self, model_path: str = "model.onnx", conf_threshold: float = 0.5,
                 nms_iou_threshold: float = 0.45):
        self.conf_threshold = conf_threshold
        self.nms_iou_threshold = nms_iou_threshold
        self.model_loaded = False

        # Keep legacy attribute name so existing callers (e.g. app.py) still work
        self.classes = self.CLASSES

        if os.path.exists(model_path):
            self.session = ort.InferenceSession(
                model_path, providers=["CPUExecutionProvider"]
            )
            self.model_loaded = True
        else:
            print(f"Warning: Model not found at {model_path}. Running in mock mode.")
            self.session = None

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _letterbox(self, image: np.ndarray):
        """
        Resize image to INPUT_SIZE x INPUT_SIZE with letterboxing (padding),
        preserving aspect ratio.

        Returns:
            resized_image (np.ndarray): padded image, shape (INPUT_SIZE, INPUT_SIZE, 3)
            scale  (float): scale factor applied to the shorter side
            pad_x  (int):   horizontal padding (total pixels added)
            pad_y  (int):   vertical padding (total pixels added)
        """
        h, w = image.shape[:2]
        s = self.INPUT_SIZE
        scale = min(s / w, s / h)
        new_w, new_h = int(round(w * scale)), int(round(h * scale))
        resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_LINEAR)

        pad_x = s - new_w
        pad_y = s - new_h
        top, bottom = pad_y // 2, pad_y - pad_y // 2
        left, right  = pad_x // 2, pad_x - pad_x // 2

        padded = cv2.copyMakeBorder(
            resized, top, bottom, left, right,
            cv2.BORDER_CONSTANT, value=(114, 114, 114)
        )
        return padded, scale, pad_x, pad_y

    def _preprocess(self, image: np.ndarray):
        """
        Full pre-processing pipeline: letterbox → CHW → float32 → batch.
        Returns the tensor and the letterbox meta needed to rescale boxes.
        """
        padded, scale, pad_x, pad_y = self._letterbox(image)
        tensor = padded.transpose(2, 0, 1).astype(np.float32) / 255.0
        tensor = np.expand_dims(tensor, axis=0)          # (1, 3, 640, 640)
        return tensor, scale, pad_x, pad_y

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def predict(self, image: np.ndarray):
        """
        Run detection on *image* (BGR, uint8, any resolution).

        Returns:
            list of dicts:
                {
                    'bbox': [x1, y1, x2, y2],   # pixel coords in original image
                    'class': str,
                    'conf': float
                }
        """
        img_h, img_w = image.shape[:2]

        if not self.model_loaded:
            # Fallback mock detection for UI demonstration
            return [
                {
                    "bbox": [
                        int(img_w * 0.4), int(img_h * 0.4),
                        int(img_w * 0.6), int(img_h * 0.6),
                    ],
                    "class": "debris",
                    "conf": 0.85,
                }
            ]

        # --- Preprocess ---
        input_tensor, scale, pad_x, pad_y = self._preprocess(image)
        input_name = self.session.get_inputs()[0].name
        raw_output = self.session.run(None, {input_name: input_tensor})[0]
        # raw_output shape: (1, 9, 8400)  →  9 = [cx, cy, w, h, cls0…cls4]

        return self.post_process(raw_output, img_w, img_h, scale, pad_x, pad_y)

    def post_process(self, output: np.ndarray, img_w: int, img_h: int,
                     scale: float = 1.0, pad_x: int = 0, pad_y: int = 0):
        """
        Decode YOLOv8 ONNX output into bounding boxes.

        YOLOv8 ONNX (non-end2end) output layout:
            shape = (1, 4 + num_classes, num_anchors)
            rows  = [cx, cy, w, h, score_cls0, score_cls1, …]
            coords are in the 640×640 letterboxed space.

        Args:
            output:  raw model output, shape (1, 9, 8400)
            img_w, img_h:   original image dimensions (pixels)
            scale:   letterbox scale factor (used to map back to original coords)
            pad_x, pad_y:   total letterbox padding (pixels)

        Returns:
            list of detection dicts matching the predict() contract.
        """
        # --- Transpose: (1, 9, 8400) → (8400, 9) ---
        preds = output[0].T  # (8400, 9)

        boxes_xywh  = preds[:, :4]                    # (8400, 4)  cx, cy, w, h
        class_scores = preds[:, 4:]                   # (8400, 5)

        conf    = class_scores.max(axis=1)             # best class score per anchor
        cls_ids = class_scores.argmax(axis=1)          # class index

        # Filter by confidence threshold
        mask = conf >= self.conf_threshold
        if not mask.any():
            return []

        boxes_xywh  = boxes_xywh[mask]
        conf        = conf[mask]
        cls_ids     = cls_ids[mask]

        # --- Convert cx,cy,w,h (letterboxed 640 space) → x1,y1,x2,y2 (original) ---
        cx, cy, bw, bh = boxes_xywh[:, 0], boxes_xywh[:, 1], \
                         boxes_xywh[:, 2], boxes_xywh[:, 3]

        # Remove letterbox padding, then scale back to original resolution
        half_px, half_py = pad_x / 2.0, pad_y / 2.0
        x1 = ((cx - bw / 2.0) - half_px) / scale
        y1 = ((cy - bh / 2.0) - half_py) / scale
        x2 = ((cx + bw / 2.0) - half_px) / scale
        y2 = ((cy + bh / 2.0) - half_py) / scale

        # Clamp to image bounds
        x1 = np.clip(x1, 0, img_w).astype(int)
        y1 = np.clip(y1, 0, img_h).astype(int)
        x2 = np.clip(x2, 0, img_w).astype(int)
        y2 = np.clip(y2, 0, img_h).astype(int)

        # --- Non-Maximum Suppression via OpenCV ---
        # cv2.dnn.NMSBoxes expects [x, y, w, h] format
        boxes_for_nms = np.stack(
            [x1, y1, x2 - x1, y2 - y1], axis=1
        ).tolist()
        scores_for_nms = conf.tolist()

        indices = cv2.dnn.NMSBoxes(
            boxes_for_nms,
            scores_for_nms,
            score_threshold=self.conf_threshold,
            nms_threshold=self.nms_iou_threshold,
        )

        detections = []
        if len(indices) > 0:
            # cv2.dnn.NMSBoxes returns either a list or (N,1) array depending on version
            indices = np.array(indices).flatten()
            for i in indices:
                class_name = self.CLASSES.get(int(cls_ids[i]), "unknown")
                detections.append(
                    {
                        "bbox": [int(x1[i]), int(y1[i]), int(x2[i]), int(y2[i])],
                        "class": class_name,
                        "conf": float(conf[i]),
                    }
                )

        return detections
