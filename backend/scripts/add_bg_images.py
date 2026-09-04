import os
import glob
import shutil
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]

# Paths
raw_sss_folder = BASE_DIR / "datasets_raw/AI4Shipwrecks/extras/terrain/images"
yolo_train_img_dir = BASE_DIR / "backend/datasets_yolo/images/train"
yolo_train_lbl_dir = BASE_DIR / "backend/datasets_yolo/labels/train"

os.makedirs(yolo_train_img_dir, exist_ok=True)
os.makedirs(yolo_train_lbl_dir, exist_ok=True)

# Find raw images
image_paths = glob.glob(os.path.join(raw_sss_folder, "*.jpg")) + \
              glob.glob(os.path.join(raw_sss_folder, "*.png"))

count = 0
max_bg_samples = 100

for img_path in image_paths:
    if count >= max_bg_samples:
        break
        
    base_name = os.path.splitext(os.path.basename(img_path))[0]
    dst_img = os.path.join(yolo_train_img_dir, f"bg_{base_name}.jpg")
    dst_lbl = os.path.join(yolo_train_lbl_dir, f"bg_{base_name}.txt")
    
    # Copy image
    shutil.copy(img_path, dst_img)
    
    # Create empty text label file for YOLO negative sampling
    with open(dst_lbl, "w") as f:
        pass  # Intentionally empty file
        
    count += 1

print(f"Successfully added {count} pure background seafloor samples to YOLO training set!")
