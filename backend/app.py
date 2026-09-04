import streamlit as st
import cv2
import numpy as np
from PIL import Image
import pandas as pd
import io

from src.preprocessing import PreprocessingEngine, SonarGANEnhancer
from src.model import DebrisDetector
from src.utils import GeotaggingEngine

st.set_page_config(
    page_title="AI Marine Debris & Anomaly Detection", 
    layout="wide",
    initial_sidebar_state="expanded"
)

st.title("🌊 AI-Powered Marine Debris & Anomaly Detection System")
st.markdown("Automated Side-Scan Sonar (SSS) pipeline for detecting ghost nets, shipwrecks, and artificial hazards.")

# ==========================================
# MODEL & PIPELINE LOADING
# ==========================================
@st.cache_resource
def load_pipeline():
    # Traditional Filter Preprocessor
    preprocessor = PreprocessingEngine()
    
    # GAN Model for Sonar Enhancement / Denoising
    gan_enhancer = SonarGANEnhancer(model_path="weights/sonar_cyclegan.onnx")
    
    # YOLO Anomaly Detector
    detector = DebrisDetector(model_path="weights/best.onnx", conf_threshold=0.55)
    
    # Geotagging Engine (Configured for AUV/Towed Body Telemetry)
    geotagger = GeotaggingEngine(
        vehicle_lat=34.0522, 
        vehicle_lon=-118.2437, 
        heading=45.0, 
        swath_width_m=100.0
    )
    
    return preprocessor, gan_enhancer, detector, geotagger

preprocessor, gan_enhancer, detector, geotagger = load_pipeline()

# ==========================================
# SIDEBAR CONTROLS
# ==========================================
st.sidebar.header("⚙️ Pipeline Configuration")

processing_mode = st.sidebar.radio(
    "Enhancement Engine",
    ["Traditional (CLAHE + Median)", "GAN-Assisted (CycleGAN Speckle Denoise)"],
    help="GAN-assisted processing translates noisy sonar returns into high-contrast acoustic profiles."
)

conf_threshold = st.sidebar.slider("Detection Confidence Threshold", 0.1, 1.0, 0.55, 0.05)

st.sidebar.markdown("---")
st.sidebar.subheader("AUV Metadata / Telemetry Override")
lat_input = st.sidebar.number_input("Vehicle Latitude", value=34.0522, format="%.6f")
lon_input = st.sidebar.number_input("Vehicle Longitude", value=-118.2437, format="%.6f")
heading_input = st.sidebar.number_input("Heading (°)", value=45.0, min_value=0.0, max_value=360.0)

# Update geotagger live from UI inputs
geotagger.vehicle_lat = lat_input
geotagger.vehicle_lon = lon_input
geotagger.heading = heading_input

# ==========================================
# MAIN INTERFACE & INFERENCE
# ==========================================
uploaded_file = st.file_uploader("Upload Side-Scan Sonar Image Log (PNG/JPG)", type=["png", "jpg", "jpeg"])

if uploaded_file is not None:
    # Decode Image
    image_bytes = uploaded_file.read()
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    img_h, img_w = image.shape[:2]
    geotagger.img_width_px = img_w
    
    st.subheader("📸 Imagery & Anomaly Inspection")
    
    # 1. Image Enhancement (Standard vs GAN)
    with st.spinner('Running acoustic enhancement pipeline...'):
        if "GAN" in processing_mode:
            # GAN inference to enhance acoustic shadow boundaries
            enhanced_img = gan_enhancer.enhance(image)
        else:
            # Classic spatial filtering
            enhanced_img = preprocessor.process(image)
            
    # 2. Anomaly Detection
    with st.spinner('Running Computer Vision Detection...'):
        detector.conf_threshold = conf_threshold
        raw_detections = detector.predict(enhanced_img)
        
    # 3. Geotagging & Formatting
    results = geotagger.filter_and_geotag(raw_detections, img_h, conf_thresh=conf_threshold)
    
    # Draw Detections
    output_img = enhanced_img.copy()
    for res in results:
        x1, y1, x2, y2 = res["bbox"]
        label = f"{res['class']} ({res['confidence']:.2f})"
        
        # Color coding: Red for high hazard (ghost nets, pipes), Yellow for structures
        color = (0, 0, 255) if res['class'] in ['debris', 'ghost_net', 'pipe'] else (0, 255, 255)
        
        cv2.rectangle(output_img, (x1, y1), (x2, y2), color, 2)
        cv2.putText(output_img, label, (x1, max(y1 - 8, 15)), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

    # 3-Column Visual Layout
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.image(cv2.cvtColor(image, cv2.COLOR_BGR2RGB), caption="1. Raw Sonar Log", use_container_width=True)
        
    with col2:
        caption_text = "2. GAN-Denoised & Contrast Enhanced" if "GAN" in processing_mode else "2. Filter-Enhanced (CLAHE)"
        st.image(cv2.cvtColor(enhanced_img, cv2.COLOR_BGR2RGB), caption=caption_text, use_container_width=True)
        
    with col3:
        st.image(cv2.cvtColor(output_img, cv2.COLOR_BGR2RGB), caption="3. Bounding Boxes & Classes", use_container_width=True)
        
    st.markdown("---")
    
    # 4. Interactive Report & Geolocation
    if results:
        st.success(f"🎯 Successfully identified {len(results)} target anomaly(ies)!")
        
        df = pd.DataFrame(results)
        
        # Format Dataframe for UI Display
        display_df = df[['class', 'confidence', 'latitude', 'longitude']].copy()
        display_df['confidence'] = display_df['confidence'].map(lambda x: f"{x * 100:.1f}%")
        
        map_col, table_col = st.columns([1, 1])
        
        with table_col:
            st.markdown("### 📋 Anomaly Geotagging Summary")
            st.dataframe(display_df, use_container_width=True)
            
            # Export Buttons
            csv_data = df[['class', 'confidence', 'latitude', 'longitude', 'bbox']].to_csv(index=False).encode('utf-8')
            json_data = df[['class', 'confidence', 'latitude', 'longitude', 'bbox']].to_json(orient="records")
            
            c1, c2 = st.columns(2)
            with c1:
                st.download_button("📥 Download CSV Report", csv_data, "sonar_hazards.csv", "text/csv")
            with c2:
                st.download_button("📥 Download JSON Report", json_data, "sonar_hazards.json", "application/json")
                
        with map_col:
            st.markdown("### 📍 Geographic Mapping")
            # Render interactive Streamlit map with detected GPS points
            map_df = df[['latitude', 'longitude']].rename(columns={'latitude': 'lat', 'longitude': 'lon'})
            st.map(map_df, zoom=13)
            
    else:
        st.info("No anomalies detected above the current confidence threshold.")