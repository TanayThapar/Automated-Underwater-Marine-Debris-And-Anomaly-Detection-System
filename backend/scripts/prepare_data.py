import os
import cv2
import shutil
import numpy as np
from pathlib import Path

def mask_to_yolo_bbox(mask_path, img_w, img_h, class_id=0):
    mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)
    if mask is None:
        return []
    
    # Threshold the mask (assuming non-zero is object)
    _, thresh = cv2.threshold(mask, 0, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    bboxes = []
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        # Filter tiny artifacts
        if w < 5 or h < 5:
            continue
            
        # Convert to YOLO normalized format (center_x, center_y, width, height)
        cx = (x + w / 2) / img_w
        cy = (y + h / 2) / img_h
        nw = w / img_w
        nh = h / img_h
        bboxes.append(f"{class_id} {cx:.6f} {cy:.6f} {nw:.6f} {nh:.6f}")
        
    return bboxes

def prepare_ai4shipwrecks(src_dir, dest_dir):
    """
    Reads AI4Shipwrecks (which uses PNG masks) and converts to YOLO bounding boxes.
    """
    src_dir = Path(src_dir)
    dest_dir = Path(dest_dir)
    
    for split in ['train', 'test']:
        img_src_dir = src_dir / split / 'images'
        mask_src_dir = src_dir / split / 'labels'
        
        if not img_src_dir.exists() or not mask_src_dir.exists():
            print(f"Split {split} missing images or labels in {src_dir}")
            continue
            
        # YOLO split naming (test -> val)
        yolo_split = 'val' if split == 'test' else 'train'
        img_dest_dir = dest_dir / 'images' / yolo_split
        lbl_dest_dir = dest_dir / 'labels' / yolo_split
        
        os.makedirs(img_dest_dir, exist_ok=True)
        os.makedirs(lbl_dest_dir, exist_ok=True)
        
        for img_path in img_src_dir.glob('*.*'):
            img_name = img_path.name
            mask_path = mask_src_dir / f"{img_path.stem}.png"
            
            if not mask_path.exists():
                print(f"Mask not found for {img_name} at {mask_path}")
                continue
                
            img = cv2.imread(str(img_path))
            if img is None:
                print(f"cv2.imread failed for {img_path}")
                continue
            h, w = img.shape[:2]
            
            bboxes = mask_to_yolo_bbox(mask_path, w, h, class_id=0)
            
            if bboxes:
                shutil.copy(img_path, img_dest_dir / img_name)
                with open(lbl_dest_dir / f"{img_path.stem}.txt", 'w') as f:
                    f.write('\n'.join(bboxes))
            else:
                print(f"No bounding boxes found for {img_name}!")

if __name__ == "__main__":
    raw_shipwrecks = "../../datasets_raw/AI4Shipwrecks"
    yolo_dataset = "../datasets_yolo"
    
    print(f"Preparing AI4Shipwrecks from {os.path.abspath(raw_shipwrecks)}...")
    prepare_ai4shipwrecks(raw_shipwrecks, yolo_dataset)
    print("Done preparing AI4Shipwrecks to YOLO format.")
    
    os.makedirs(os.path.join(yolo_dataset, "images/train"), exist_ok=True)
    os.makedirs(os.path.join(yolo_dataset, "images/val"), exist_ok=True)
    os.makedirs(os.path.join(yolo_dataset, "labels/train"), exist_ok=True)
    os.makedirs(os.path.join(yolo_dataset, "labels/val"), exist_ok=True)

    # Generate data.yaml
    yaml_content = f"""
path: {os.path.abspath(yolo_dataset)}
train: images/train
val: images/val

names:
  0: shipwreck
"""
    with open(f"{yolo_dataset}/data.yaml", 'w') as f:
        f.write(yaml_content)
    print("data.yaml created.")
