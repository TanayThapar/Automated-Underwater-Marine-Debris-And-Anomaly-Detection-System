import math
from typing import List, Dict

class GeotaggingEngine:
    def __init__(self, vehicle_lat: float = 0.0, vehicle_lon: float = 0.0, heading: float = 0.0, 
                 swath_width_m: float = 100.0, img_width_px: int = 1000):
        self.vehicle_lat = vehicle_lat
        self.vehicle_lon = vehicle_lon
        self.heading = heading # in degrees
        self.swath_width_m = swath_width_m
        self.img_width_px = img_width_px
        
        # 1 degree of latitude is ~111,320 meters
        self.meters_per_deg_lat = 111320.0

    def calculate_object_coords(self, bbox: List[int], img_h: int) -> Dict[str, float]:
        """
        Calculates the real-world Lat/Lon of a bounding box.
        Assuming vehicle is at the center line of the image horizontally, and traveling upwards.
        """
        x_min, y_min, x_max, y_max = bbox
        center_x = (x_min + x_max) / 2.0
        center_y = (y_min + y_max) / 2.0
        
        # Calculate horizontal distance from center of swath
        # Center of image is img_width_px / 2
        px_offset_x = center_x - (self.img_width_px / 2.0)
        meters_per_px = self.swath_width_m / self.img_width_px
        
        offset_m_x = px_offset_x * meters_per_px
        
        # Calculate vertical distance (along track) from top of image
        # Assuming vehicle lat/lon is exactly at the top center of the current image frame for simplicity
        px_offset_y = center_y
        offset_m_y = px_offset_y * meters_per_px # Assuming square pixels

        # Convert offset to Lat/Lon degrees
        lat_offset_deg = offset_m_y / self.meters_per_deg_lat
        
        # Adjust for longitude based on latitude
        meters_per_deg_lon = self.meters_per_deg_lat * math.cos(math.radians(self.vehicle_lat))
        if meters_per_deg_lon == 0:
            meters_per_deg_lon = self.meters_per_deg_lat
            
        lon_offset_deg = offset_m_x / meters_per_deg_lon
        
        # Adjust for heading (simplified 2D rotation)
        rad_heading = math.radians(self.heading)
        rotated_lat = lat_offset_deg * math.cos(rad_heading) - lon_offset_deg * math.sin(rad_heading)
        rotated_lon = lat_offset_deg * math.sin(rad_heading) + lon_offset_deg * math.cos(rad_heading)

        return {
            "lat": self.vehicle_lat - rotated_lat, # Subtracted because y goes down
            "lon": self.vehicle_lon + rotated_lon
        }

    def filter_and_geotag(self, detections: List[Dict], img_h: int, conf_thresh: float = 0.5) -> List[Dict]:
        """
        Filters detections by confidence and appends real-world coordinates.
        """
        geotagged_results = []
        for det in detections:
            if det["conf"] >= conf_thresh:
                coords = self.calculate_object_coords(det["bbox"], img_h)
                result = {
                    "class": det["class"],
                    "confidence": det["conf"],
                    "bbox": det["bbox"],
                    "latitude": coords["lat"],
                    "longitude": coords["lon"]
                }
                geotagged_results.append(result)
                
        return geotagged_results
