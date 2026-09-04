import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Compass, Eye, Download, FileSpreadsheet, 
  Layers, CheckCircle2, Share2, Navigation, AlertTriangle
} from 'lucide-react';
import { PRESET_SAMPLES, SURVEY_STATS } from '../data/sonarSamples';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function GeospatialMapView({ onSelectSampleForStudio }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [showSwathCorridor, setShowSwathCorridor] = useState(true);
  const [showHeatmapZones, setShowHeatmapZones] = useState(true);
  const [activePin, setActivePin] = useState(PRESET_SAMPLES[0]);
  const [exportNotice, setExportNotice] = useState(null);

  const centerLat = 14.5;
  const centerLng = 75.5;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 6,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO & OpenStreetMap',
        maxZoom: 18,
      }).addTo(map);

      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;

      const resizeTimer = setTimeout(() => {
        map.invalidateSize();
      }, 200);

      return () => {
        clearTimeout(resizeTimer);
        map.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
      };
    }
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const filteredSamples = PRESET_SAMPLES.filter(s => {
      if (selectedFilter === 'ALL') return true;
      return s.riskLevel === selectedFilter;
    });

    if (showSwathCorridor) {
      const trackPoints = PRESET_SAMPLES.map(s => [s.coordinates.lat, s.coordinates.lng]);
      const polyline = L.polyline(trackPoints, {
        color: '#e5e5e5',
        weight: 2,
        dashArray: '4, 6',
        opacity: 0.8
      });
      markersLayer.addLayer(polyline);

      const swathPolygon = L.polygon([
        [19.5, 71.0], [19.1, 73.2], [15.0, 74.2],
        [9.5, 76.5], [11.5, 80.2], [13.5, 80.5],
        [15.5, 74.0], [19.5, 71.0]
      ], {
        color: '#a3a3a3',
        fillColor: '#737373',
        fillOpacity: 0.1,
        weight: 1
      });
      markersLayer.addLayer(swathPolygon);
    }

    if (showHeatmapZones) {
      filteredSamples.forEach(s => {
        const circle = L.circle([s.coordinates.lat, s.coordinates.lng], {
          radius: s.riskLevel === 'CRITICAL' ? 35000 : 20000,
          color: s.riskLevel === 'CRITICAL' ? '#f43f5e' : '#f59e0b',
          fillColor: s.riskLevel === 'CRITICAL' ? '#f43f5e' : '#f59e0b',
          fillOpacity: 0.15,
          stroke: false
        });
        markersLayer.addLayer(circle);
      });
    }

    filteredSamples.forEach(s => {
      const isSelected = activePin?.id === s.id;
      const markerColor = s.riskLevel === 'CRITICAL' ? '#f43f5e' : '#f59e0b';
      
      const customIcon = L.divIcon({
        className: 'custom-sonar-marker',
        html: `
          <div style="
            width: ${isSelected ? '24px' : '18px'};
            height: ${isSelected ? '24px' : '18px'};
            background: ${markerColor};
            border: 2px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 0 15px ${markerColor};
            cursor: pointer;
            transition: all 0.2s ease;
          "></div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([s.coordinates.lat, s.coordinates.lng], { icon: customIcon });

      marker.on('click', () => {
        setActivePin(s);
        map.flyTo([s.coordinates.lat, s.coordinates.lng], 9, { duration: 1.2 });
      });

      markersLayer.addLayer(marker);
    });

  }, [selectedFilter, showSwathCorridor, showHeatmapZones, activePin]);

  const handleFlyTo = (sample) => {
    setActivePin(sample);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([sample.coordinates.lat, sample.coordinates.lng], 9, { duration: 1.2 });
    }
  };

  const exportGeoJSON = () => {
    const geojson = {
      type: 'FeatureCollection',
      metadata: {
        system: 'DeepScan AUV System',
        surveyRegion: 'Indian Coastal Shelf EEZ',
        generatedAt: new Date().toISOString()
      },
      features: PRESET_SAMPLES.map(s => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [s.coordinates.lng, s.coordinates.lat, -s.depth]
        },
        properties: {
          id: s.id,
          name: s.name,
          category: s.category,
          riskLevel: s.riskLevel,
          confidence: s.anomalyConfidence,
          estimatedHeightM: s.dimensions.estHeight,
          cleanPriority: s.cleanPriority
        }
      }))
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DeepScan_Hydrographic_Survey_${Date.now()}.geojson`;
    a.click();

    setExportNotice('Exported GeoJSON survey features successfully!');
    setTimeout(() => setExportNotice(null), 3000);
  };

  const exportCSV = () => {
    const headers = ['ID,Name,Category,RiskLevel,Latitude,Longitude,Depth_m,Altitude_m,SlantRange_m,ShadowLength_m,Confidence,Priority'];
    const rows = PRESET_SAMPLES.map(s => 
      `"${s.id}","${s.name}","${s.category}","${s.riskLevel}",${s.coordinates.lat},${s.coordinates.lng},${s.depth},${s.altitude},${s.slantRange},${s.shadowLength},${s.anomalyConfidence},"${s.cleanPriority}"`
    );

    const csvContent = headers.concat(rows).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DeepScan_Sonar_Inventory_${Date.now()}.csv`;
    a.click();

    setExportNotice('Exported CSV inventory table successfully!');
    setTimeout(() => setExportNotice(null), 3000);
  };

  return (
    <div className="space-y-4 font-sans text-slate-100">

      {/* Header Bar */}
      <div className="bg-[#111827] border border-gray-800 rounded-md p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-neutral-300" />
            <h2 className="text-sm font-extrabold text-white tracking-tight uppercase">
              GEOSPATIAL BATHYMETRY &amp; HYDROGRAPHIC GIS COMMAND
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Indian EEZ Hydrographic corridor mapping, target spatial clustering &amp; QGIS GeoJSON export
          </p>
        </div>

        {/* Exporters */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportGeoJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-white text-neutral-200 hover:text-black border border-neutral-600 rounded-md text-xs font-semibold transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT GEOJSON</span>
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 hover:text-white border border-emerald-800 rounded-md text-xs font-semibold transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>EXPORT CSV</span>
          </button>
        </div>
      </div>

      {/* Notice Toast */}
      {exportNotice && (
        <div className="p-3 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded-md text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Main 12-Col GIS Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Interactive Leaflet Map Container (8 Cols) */}
        <div className="lg:col-span-8 bg-[#0b0f17] border border-gray-800 rounded-md overflow-hidden flex flex-col">
          
          <div className="p-3 bg-[#111827] border-b border-gray-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            
            {/* Risk Filter */}
            <div className="flex items-center gap-1 bg-[#0b0f17] p-1 rounded-md border border-gray-800 font-mono">
              {['ALL', 'CRITICAL', 'HIGH'].map(f => (
                <button
                  key={f}
                  onClick={() => setSelectedFilter(f)}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    selectedFilter === f ? 'bg-neutral-800 text-neutral-200 border border-neutral-600' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Layer Toggles */}
            <div className="flex items-center gap-3 text-xs text-zinc-300">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSwathCorridor}
                  onChange={(e) => setShowSwathCorridor(e.target.checked)}
                  className="accent-neutral-300 rounded"
                />
                <span>SWATH CORRIDOR</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showHeatmapZones}
                  onChange={(e) => setShowHeatmapZones(e.target.checked)}
                  className="accent-rose-400 rounded"
                />
                <span>HEATMAP DENSITY</span>
              </label>
            </div>

          </div>

          {/* Leaflet Map DOM Element */}
          <div className="relative flex-1 min-h-[520px] bg-[#0b0f17]">
            <div ref={mapContainerRef} className="w-full h-full min-h-[520px] z-10 block" />
          </div>

          <div className="p-3 bg-[#111827] border-t border-gray-800 flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>REGION: INDIAN OCEAN / GOA EEZ</span>
            <span>TOTAL SURVEY AREA: 420 SQ KM</span>
          </div>

        </div>

        {/* Selected Target Inspector & Geotagged Target List (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 font-sans">
          
          {/* Active Target Card */}
          <div className="bg-[#111827] border border-gray-800 rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-white">{activePin?.name}</h3>
                <span className="text-xs text-zinc-400">{activePin?.category}</span>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-md font-bold font-mono ${
                activePin?.riskLevel === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}>
                {activePin?.riskLevel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[#0b0f17] p-2.5 rounded-md border border-gray-800">
              <div>
                <span className="text-zinc-500 text-[10px] block font-sans">LATITUDE</span>
                <span className="text-white font-bold">{activePin?.coordinates?.lat}° N</span>
              </div>
              <div>
                <span className="text-zinc-500 text-[10px] block font-sans">LONGITUDE</span>
                <span className="text-white font-bold">{activePin?.coordinates?.lng}° E</span>
              </div>
              <div>
                <span className="text-zinc-500 text-[10px] block font-sans">DEPTH</span>
                <span className="text-white font-bold">{activePin?.depth}m</span>
              </div>
              <div>
                <span className="text-zinc-500 text-[10px] block font-sans">CONFIDENCE</span>
                <span className="text-white font-bold">{(activePin?.anomalyConfidence * 100).toFixed(1)}%</span>
              </div>
            </div>

            <p className="text-xs text-zinc-300">{activePin?.description}</p>

            <button
              onClick={() => onSelectSampleForStudio(activePin)}
              className="w-full py-2 bg-white hover:bg-neutral-200 text-black rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>ANALYZE IN ACOUSTIC STUDIO</span>
            </button>
          </div>

          {/* Quick Target FlyTo List */}
          <div className="bg-[#111827] border border-gray-800 rounded-md p-4 flex flex-col h-[280px]">
            <span className="text-xs font-bold text-white block mb-2 pb-2 border-b border-gray-800 uppercase tracking-wider">
              SURVEY TARGET INVENTORY ({PRESET_SAMPLES.length})
            </span>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-800">
              {PRESET_SAMPLES.map((sample) => (
                <div
                  key={sample.id}
                  onClick={() => handleFlyTo(sample)}
                  className={`p-2.5 rounded-md cursor-pointer transition-all border text-xs ${
                    activePin?.id === sample.id
                      ? 'bg-neutral-800 border-neutral-400 text-white'
                      : 'bg-[#0b0f17] border-gray-800 text-zinc-400 hover:border-gray-700 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white truncate">{sample.name}</span>
                    <span className="text-xs font-mono text-white">{sample.depth}m</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
                    <span>{sample.coordinates.location}</span>
                    <span className="text-neutral-200 font-bold hover:underline">FLY TO ▶</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
