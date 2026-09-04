"""
prepare_data_v2.py
------------------
Unified dataset preparation for YOLO training from three sources:
  1. AI4Shipwrecks   - PNG segmentation masks  → contour → BBox
  2. SCTD            - Pascal VOC XML (xmin,ymin,xmax,ymax)
  3. Marine Debris FLS - Custom XML (x,y,w,h COCO style)

Merged YOLO class map:
  0: shipwreck
  1: aircraft      (SCTD)
  2: ship          (SCTD)
  3: human         (SCTD)
  4: debris        (marine debris: Can, Wall, Bottle, Tire, etc.)
"""

import os
import cv2
import shutil
import random
import xml.etree.ElementTree as ET
import numpy as np
from pathlib import Path

random.seed(42)

# ── Class mapping ──────────────────────────────────────────────────────────────
SCTD_CLASS_MAP = {
    "aircraft": 1,
    "ship":     2,
    "human":    3,
}

# All marine debris object names from FLS dataset → class 4
MARINE_DEBRIS_NAMES = {
    "Can", "Wall", "Bottle", "Tire", "Hook", "Propeller",
    "Shampoo bottle", "standing bottle", "Metal can", "Valve",
    "Pipe", "Glass bottle", "Drink carton", "Plastic bottle",
    "Metal box", "Plastic bidon", "Drink sachet",
}

YOLO_CLASS_NAMES = {
    0: "shipwreck",
    1: "aircraft",
    2: "ship",
    3: "human",
    4: "debris",
}

VAL_SPLIT = 0.15   # 15% validation

# ── Helpers ────────────────────────────────────────────────────────────────────
def save_yolo(dest_dir_images, dest_dir_labels, img_path, bboxes, split):
    """Copy image + write label file into the correct train/val folder."""
    split_img = dest_dir_images / split
    split_lbl = dest_dir_labels / split
    split_img.mkdir(parents=True, exist_ok=True)
    split_lbl.mkdir(parents=True, exist_ok=True)

    dst_img = split_img / img_path.name
    shutil.copy(img_path, dst_img)

    lbl_path = split_lbl / (img_path.stem + ".txt")
    with open(lbl_path, "w") as f:
        f.write("\n".join(bboxes))


def assign_split():
    return "val" if random.random() < VAL_SPLIT else "train"


def clamp(v, lo=0.0, hi=1.0):
    return max(lo, min(hi, v))


# ── 1. AI4Shipwrecks (PNG masks) ───────────────────────────────────────────────
def mask_to_yolo_bbox(mask_path, img_w, img_h, class_id=0):
    mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)
    if mask is None:
        return []
    _, thresh = cv2.threshold(mask, 0, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    bboxes = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if w < 5 or h < 5:
            continue
        cx = clamp((x + w / 2) / img_w)
        cy = clamp((y + h / 2) / img_h)
        nw = clamp(w / img_w)
        nh = clamp(h / img_h)
        bboxes.append(f"{class_id} {cx:.6f} {cy:.6f} {nw:.6f} {nh:.6f}")
    return bboxes


def prepare_ai4shipwrecks(src_dir, dest_images, dest_labels):
    src_dir = Path(src_dir)
    count = 0
    for split in ["train", "test"]:
        img_src_dir  = src_dir / split / "images"
        mask_src_dir = src_dir / split / "labels"
        if not img_src_dir.exists() or not mask_src_dir.exists():
            print(f"  [AI4Shipwrecks] Skipping split {split} — dirs missing")
            continue
        yolo_split = "val" if split == "test" else "train"
        for img_path in img_src_dir.glob("*.*"):
            mask_path = mask_src_dir / f"{img_path.stem}.png"
            if not mask_path.exists():
                continue
            img = cv2.imread(str(img_path))
            if img is None:
                continue
            h, w = img.shape[:2]
            bboxes = mask_to_yolo_bbox(mask_path, w, h, class_id=0)
            if bboxes:
                save_yolo(dest_images, dest_labels, img_path, bboxes, yolo_split)
                count += 1
    print(f"  [AI4Shipwrecks] {count} images prepared")


# ── 2. SCTD (Pascal VOC XML — xmin, ymin, xmax, ymax) ─────────────────────────
def voc_xml_to_yolo(xml_path, img_w, img_h):
    tree = ET.parse(xml_path)
    root = tree.getroot()
    bboxes = []
    for obj in root.findall("object"):
        name = obj.find("name").text.strip()
        class_id = SCTD_CLASS_MAP.get(name)
        if class_id is None:
            continue
        bbox = obj.find("bndbox")
        xmin = float(bbox.find("xmin").text)
        ymin = float(bbox.find("ymin").text)
        xmax = float(bbox.find("xmax").text)
        ymax = float(bbox.find("ymax").text)
        cx = clamp(((xmin + xmax) / 2) / img_w)
        cy = clamp(((ymin + ymax) / 2) / img_h)
        nw = clamp((xmax - xmin) / img_w)
        nh = clamp((ymax - ymin) / img_h)
        bboxes.append(f"{class_id} {cx:.6f} {cy:.6f} {nw:.6f} {nh:.6f}")
    return bboxes


def prepare_sctd(src_dir, dest_images, dest_labels):
    src_dir = Path(src_dir)
    ann_dir = src_dir / "Annotations"
    img_dir = src_dir / "JPEGImages"
    count = 0
    for xml_path in ann_dir.glob("*.xml"):
        img_path = img_dir / f"{xml_path.stem}.jpg"
        if not img_path.exists():
            img_path = img_dir / f"{xml_path.stem}.JPG"
        if not img_path.exists():
            continue
        img = cv2.imread(str(img_path))
        if img is None:
            continue
        h, w = img.shape[:2]
        bboxes = voc_xml_to_yolo(xml_path, w, h)
        if bboxes:
            save_yolo(dest_images, dest_labels, img_path, bboxes, assign_split())
            count += 1
    print(f"  [SCTD] {count} images prepared")


# ── 3. Marine Debris FLS (custom XML — x, y, w, h COCO style) ─────────────────
def fls_xml_to_yolo(xml_path, img_w, img_h):
    tree = ET.parse(xml_path)
    root = tree.getroot()
    bboxes = []
    for obj in root.findall("object"):
        name = obj.find("name").text.strip()
        # Map all debris types to class 4
        class_id = 4  # generic debris
        bbox = obj.find("bndbox")
        if bbox is None:
            continue
        # Format: x, y, w, h  (COCO-like)
        x  = float(bbox.find("x").text)
        y  = float(bbox.find("y").text)
        bw = float(bbox.find("w").text)
        bh = float(bbox.find("h").text)
        cx = clamp((x + bw / 2) / img_w)
        cy = clamp((y + bh / 2) / img_h)
        nw = clamp(bw / img_w)
        nh = clamp(bh / img_h)
        bboxes.append(f"{class_id} {cx:.6f} {cy:.6f} {nw:.6f} {nh:.6f}")
    return bboxes


def prepare_marine_debris_fls(src_dir, dest_images, dest_labels):
    """
    Expects the watertank-segmentation subfolder structure:
      BoxAnnotations/*.xml   → annotations
      Images/*.png           → images
    """
    src_dir = Path(src_dir)
    ann_dir = src_dir / "BoxAnnotations"
    img_dir = src_dir / "Images"

    if not ann_dir.exists() or not img_dir.exists():
        print(f"  [MarineDebrisFLS] dirs not found inside {src_dir}")
        return

    count = 0
    for xml_path in ann_dir.glob("*.xml"):
        img_path = img_dir / f"{xml_path.stem}.png"
        if not img_path.exists():
            continue
        img = cv2.imread(str(img_path))
        if img is None:
            continue
        h, w = img.shape[:2]
        bboxes = fls_xml_to_yolo(xml_path, w, h)
        if bboxes:
            save_yolo(dest_images, dest_labels, img_path, bboxes, assign_split())
            count += 1
    print(f"  [MarineDebrisFLS] {count} images prepared")


# ── Main ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    BASE    = Path(__file__).resolve().parents[2]          # SIH/
    RAW     = BASE / "datasets_raw"
    YOLO    = Path(__file__).resolve().parents[1] / "datasets_yolo"   # backend/datasets_yolo

    dest_images = YOLO / "images"
    dest_labels = YOLO / "labels"

    # Ensure clean output dirs
    for sp in ["train", "val"]:
        (dest_images / sp).mkdir(parents=True, exist_ok=True)
        (dest_labels / sp).mkdir(parents=True, exist_ok=True)

    print("== Preparing datasets ==")

    prepare_ai4shipwrecks(
        RAW / "AI4Shipwrecks",
        dest_images, dest_labels
    )

    prepare_sctd(
        RAW / "SCTD" / "SCTD",
        dest_images, dest_labels
    )

    prepare_marine_debris_fls(
        RAW / "marine-debris" / "marine-debris-fls-datasets-master"
            / "md_fls_dataset" / "data" / "watertank-segmentation",
        dest_images, dest_labels
    )

    # Count final stats
    n_train_img = len(list((dest_images / "train").glob("*.*")))
    n_val_img   = len(list((dest_images / "val").glob("*.*")))
    print(f"\nDataset ready: {n_train_img} train  |  {n_val_img} val images")

    # Write data.yaml
    yaml_path = YOLO / "data.yaml"
    with open(yaml_path, "w") as f:
        f.write(f"path: {YOLO}\n")
        f.write("train: images/train\n")
        f.write("val:   images/val\n\n")
        f.write(f"nc: {len(YOLO_CLASS_NAMES)}\n")
        names = [YOLO_CLASS_NAMES[i] for i in sorted(YOLO_CLASS_NAMES)]
        f.write(f"names: {names}\n")

    print(f"data.yaml written to {yaml_path}")
