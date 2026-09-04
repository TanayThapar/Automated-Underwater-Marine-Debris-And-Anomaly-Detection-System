import numpy as np
from src.preprocessing.engine import PreprocessingEngine
from src.utils.geotag import GeotaggingEngine

def test_preprocessing():
    engine = PreprocessingEngine()
    dummy_image = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
    processed = engine.process(dummy_image)
    
    assert processed is not None
    assert processed.shape == (100, 100, 3)

def test_geotagging():
    # Vehicle at 0, 0, heading North (0 degrees)
    engine = GeotaggingEngine(vehicle_lat=0.0, vehicle_lon=0.0, heading=0.0, swath_width_m=100.0, img_width_px=1000)
    
    # Bounding box in top-right quadrant
    # center is x=750, y=250
    # px_offset_x = 750 - 500 = 250 px right = 25m East
    # px_offset_y = 250 px down = 25m South
    bbox = [700, 200, 800, 300]
    
    coords = engine.calculate_object_coords(bbox, img_h=1000)
    
    # Approx 111320 meters per degree lat
    # 25m South -> -25 / 111320 = -0.0002245 degrees lat (since vehicle is at 0, target is south of top line)
    # Actually our code assumes vehicle is at top, so moving down in Y means moving south.
    assert "lat" in coords
    assert "lon" in coords
    assert coords["lat"] < 0.0 # South of vehicle
    assert coords["lon"] > 0.0 # East of vehicle
