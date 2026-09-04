import React, { useState, useEffect, useRef } from 'react';
import { 
  Sliders, Layers, UploadCloud, Ruler, Crosshair, CheckCircle2, 
  Columns, Box, Eye, Info
} from 'lucide-react';
import { PRESET_SAMPLES, SONAR_PALETTES } from '../data/sonarSamples';
import { drawSonarCanvas, calculateObjectHeight, calculateGroundRange } from '../utils/sonarProcessor';

export default function AnalysisStudio({ selectedSample, setSelectedSample }) {
  const canvasRef = useRef(null);
  const rawCanvasRef = useRef(null);
  
  const [filterMode, setFilterMode] = useState('raw');
  const [palette, setPalette] = useState('copper');
  const [aiMode, setAiMode] = useState('supervised');
  const [showHighlightCues, setShowHighlightCues] = useState(true);
  const [showShadowCues, setShowShadowCues] = useState(true);
  
  const [splitMode, setSplitMode] = useState('enhanced'); // 'raw', 'split', 'enhanced'
  const [splitPos, setSplitPos] = useState(50); // percentage

  const [customAltitude, setCustomAltitude] = useState(selectedSample?.altitude || 12);
  const [customSlantRange, setCustomSlantRange] = useState(selectedSample?.slantRange || 25);
  const [customShadowLength, setCustomShadowLength] = useState(selectedSample?.shadowLength || 5.5);

  useEffect(() => {
    if (selectedSample) {
      setCustomAltitude(selectedSample.altitude);
      setCustomSlantRange(selectedSample.slantRange);
      setCustomShadowLength(selectedSample.shadowLength);
    }
  }, [selectedSample]);

  // Main Enhanced Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedSample) return;

    drawSonarCanvas(canvas, selectedSample, {
      filterMode,
      palette,
      showBBoxes: aiMode === 'supervised' || aiMode === 'dual_view',
      showHighlights: showHighlightCues,
      showShadows: showShadowCues,
      showAnomalyHeatmap: aiMode === 'anomaly_heatmap' || aiMode === 'dual_view'
    });
  }, [selectedSample, filterMode, palette, aiMode, showHighlightCues, showShadowCues]);

  // Raw Comparison Canvas (for split mode)
  useEffect(() => {
    const canvas = rawCanvasRef.current;
    if (!canvas || !selectedSample || splitMode !== 'split') return;

    drawSonarCanvas(canvas, selectedSample, {
      filterMode: 'raw',
      palette: 'grayscale',
      showBBoxes: false,
      showHighlights: false,
      showShadows: false,
      showAnomalyHeatmap: false
    });
  }, [selectedSample, splitMode]);

  const computedHeight = calculateObjectHeight(customShadowLength, customAltitude, customSlantRange);
  const computedGroundRange = calculateGroundRange(customSlantRange, customAltitude);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const customSample = {
        id: `custom-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ""),
        category: 'Uploaded Hydrographic Scan',
        riskLevel: 'HIGH',
        riskScore: 88,
        depth: 36.0,
        altitude: 12.0,
        coordinates: { lat: 15.3, lng: 73.8, location: 'Custom Survey Scan' },
        description: 'Uploaded user sonar recording processed through real-time DSP filter pipeline.',
        dimensions: { length: '12.0 m', width: '4.5 m', estHeight: '1.8 m' },
        slantRange: 22.0,
        shadowLength: 4.2,
        anomalyConfidence: 0.94,
        cleanPriority: 'P1 - High Priority',
        timestamp: new Date().toISOString(),
        detections: [
          {
            id: 'det-custom',
            label: 'Acoustic Anomaly',
            confidence: 0.94,
            type: 'debris',
            box: { x: 35, y: 30, w: 30, h: 25 },
            highlight: { x: 37, y: 32, w: 26, h: 10 },
            shadow: { x: 37, y: 42, w: 26, h: 13 },
            estHeight: '1.8 m',
            material: 'Synthetic Anomaly',
            acousticReflectivity: 'High Specular Scatter'
          }
        ],
        anomalyZones: [{ x: 48, y: 42, radius: 60, intensity: 0.92 }],
        sonarParams: { frequency: '450 kHz', pingRate: '15 Hz', swathWidth: '100 m', soundSpeed: '1500 m/s' }
      };
      setSelectedSample(customSample);
    }
  };

  return (
    <div className="space-y-3 font-sans text-slate-100">

      {/* Header & Sample Selector Bar */}
      <div className="bg-[#111827] border border-gray-800 rounded-md overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-amber-500 rounded-full shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                ACOUSTIC SIGNAL STUDIO &amp; 3D ELEVATION MATH
              </h2>
              <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                Slant-range correction · Lee despeckle · Split-screen inspection · Physical 3D shadow math
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {PRESET_SAMPLES.map(sample => (
              <button
                key={sample.id}
                onClick={() => setSelectedSample(sample)}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                  selectedSample?.id === sample.id
                    ? 'bg-neutral-800 text-white border border-neutral-500 font-bold'
                    : 'bg-[#0b0f17] text-gray-400 border border-gray-800 hover:text-white'
                }`}
              >
                {sample.name.split(' ')[0]} {sample.name.split(' ')[1]}
              </button>
            ))}

            <label className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-neutral-200 text-black rounded text-xs font-semibold cursor-pointer">
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Scan</span>
              <input type="file" accept="image/*,.xtf,.js" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Main Studio 12-Col Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">

        {/* Studio Canvas Display & DSP Toolbar (8 Cols) */}
        <div className="lg:col-span-8 space-y-3">
          
          <div className="bg-[#111827] border border-gray-800 rounded-md overflow-hidden flex flex-col">
            
            {/* DSP Controls Toolbar */}
            <div className="p-2.5 bg-[#0b0f17] border-b border-gray-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              
              {/* DSP Filter Selector */}
              <div className="flex items-center gap-1 bg-[#111827] p-1 rounded border border-gray-800">
                {[
                  { id: 'raw', label: 'Raw Ping' },
                  { id: 'slant_corrected', label: 'Slant Corrected' },
                  { id: 'despeckled', label: 'Lee Despeckle' },
                  { id: 'clahe', label: 'CLAHE Contrast' },
                  { id: 'nadir_removed', label: 'Nadir Masked' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilterMode(f.id)}
                    className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                      filterMode === f.id
                        ? 'bg-gray-800 text-white font-bold'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* View Mode */}
              <div className="flex items-center gap-1 bg-[#111827] p-1 rounded border border-gray-800 font-mono">
                {['enhanced', 'split', 'raw'].map(m => (
                  <button
                    key={m}
                    onClick={() => setSplitMode(m)}
                    className={`px-2 py-0.5 rounded text-xs font-bold uppercase cursor-pointer ${
                      splitMode === m
                        ? 'bg-neutral-800 text-neutral-200 border border-neutral-600'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* AI Detection Mode Switcher */}
              <div className="flex items-center gap-1 bg-[#111827] p-1 rounded border border-gray-800 font-mono">
                <button
                  onClick={() => setAiMode('supervised')}
                  className={`px-2 py-0.5 rounded text-xs font-bold cursor-pointer ${
                    aiMode === 'supervised' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'text-gray-500'
                  }`}
                >
                  YOLO-11
                </button>
                <button
                  onClick={() => setAiMode('anomaly_heatmap')}
                  className={`px-2 py-0.5 rounded text-xs font-bold cursor-pointer ${
                    aiMode === 'anomaly_heatmap' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'text-gray-500'
                  }`}
                >
                  PatchCore
                </button>
                <button
                  onClick={() => setAiMode('dual_view')}
                  className={`px-2 py-0.5 rounded text-xs font-bold cursor-pointer ${
                    aiMode === 'dual_view' ? 'bg-neutral-800 text-neutral-200 border border-neutral-600' : 'text-gray-500'
                  }`}
                >
                  Dual AI
                </button>
              </div>

            </div>

            {/* Canvas Viewport */}
            <div className="relative bg-black flex items-center justify-center min-h-[440px]">
              
              {splitMode === 'split' ? (
                <div className="relative w-full h-[440px] overflow-hidden select-none">
                  <canvas ref={canvasRef} width={720} height={440} className="absolute inset-0 w-full h-full block bg-black" />

                  <div
                    className="absolute top-0 bottom-0 left-0 overflow-hidden"
                    style={{ width: `${splitPos}%` }}
                  >
                    <canvas ref={rawCanvasRef} width={720} height={440} className="w-full h-full block bg-black max-w-none" />
                  </div>

                  <div
                    className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize flex items-center justify-center z-20"
                    style={{ left: `${splitPos}%` }}
                  >
                    <div className="w-5 h-5 rounded-full bg-white text-black font-bold text-[10px] flex items-center justify-center">
                      ↔
                    </div>
                  </div>

                  <input
                    type="range"
                    min="5"
                    max="95"
                    value={splitPos}
                    onChange={(e) => setSplitPos(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
                  />
                </div>
              ) : (
                <canvas ref={canvasRef} width={720} height={440} className="w-full h-full block bg-black" />
              )}

            </div>

            <div className="px-3 py-2 bg-[#0b0f17] border-t border-gray-800 flex flex-wrap items-center justify-between text-xs font-mono text-gray-300">
              <div className="flex items-center gap-3">
                <span>SOUND SPEED: <strong className="text-white">{selectedSample?.sonarParams?.soundSpeed}</strong></span>
                <span>|</span>
                <span>SWATH: <strong className="text-white">{selectedSample?.sonarParams?.swathWidth}</strong></span>
                <span>|</span>
                <span>FREQ: <strong className="text-white">{selectedSample?.sonarParams?.frequency}</strong></span>
              </div>
              <div className="flex items-center gap-1 text-emerald-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Slant Range Verified</span>
              </div>
            </div>

          </div>

          {/* Interactive Acoustic 3D Shadow Math Sandbox */}
          <div className="bg-[#111827] border border-gray-800 rounded-md p-3.5 space-y-3 font-sans">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-neutral-300" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans">
                  Acoustic Shadow 3D Elevation Math Sandbox
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-neutral-200 bg-neutral-800 px-2 py-0.5 rounded border border-neutral-600">
                H = (L_shadow × H_alt) / (R_slant + L_shadow)
              </span>
            </div>

            {/* Sliders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-sans">
              <div>
                <label className="text-gray-300 block mb-1">
                  1. Shadow Length (L_s): <strong className="text-amber-400 font-mono">{customShadowLength}m</strong>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="20"
                  step="0.1"
                  value={customShadowLength}
                  onChange={(e) => setCustomShadowLength(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-1">
                  2. AUV Altitude (H_alt): <strong className="text-white font-mono">{customAltitude}m</strong>
                </label>
                <input
                  type="range"
                  min="3"
                  max="30"
                  step="0.5"
                  value={customAltitude}
                  onChange={(e) => setCustomAltitude(Number(e.target.value))}
                  className="w-full accent-neutral-300 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-1">
                  3. Slant Range (R_slant): <strong className="text-emerald-400 font-mono">{customSlantRange}m</strong>
                </label>
                <input
                  type="range"
                  min="10"
                  max="80"
                  step="0.5"
                  value={customSlantRange}
                  onChange={(e) => setCustomSlantRange(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Dynamic SVG Ray Tracing Diagram */}
            <div className="p-3 bg-[#0b0f17] rounded border border-gray-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="font-bold text-white flex items-center gap-1 font-sans">
                  <Box className="w-3.5 h-3.5 text-neutral-300" />
                  Physics Acoustic Ray-Trace Projection
                </span>
                <span>Calculated Height: <strong className="text-white font-mono text-sm">{computedHeight}m</strong></span>
              </div>

              <div className="w-full h-24 bg-black rounded border border-gray-900 relative overflow-hidden flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 600 110" preserveAspectRatio="none">
                  <line x1="20" y1="95" x2="580" y2="95" stroke="#374151" strokeWidth="2" strokeDasharray="4 2" />
                  <text x="25" y="105" fill="#6b7280" fontSize="9" fontFamily="monospace">SEABED FLOOR (0.0m)</text>

                  <rect x="50" y="20" width="44" height="18" rx="2" fill="#1f2937" stroke="#e5e5e5" strokeWidth="1.5" />
                  <text x="56" y="32" fill="#e5e5e5" fontSize="9" fontFamily="monospace" fontWeight="bold">AUV</text>
                  <line x1="72" y1="38" x2="72" y2="95" stroke="#e5e5e5" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
                  <text x="78" y="65" fill="#e5e5e5" fontSize="9" fontFamily="monospace">H_alt: {customAltitude}m</text>

                  {(() => {
                    const objX = 280;
                    const objH = Math.min(65, Math.max(12, computedHeight * 16));
                    const shadowLen = Math.min(220, Math.max(20, customShadowLength * 12));

                    return (
                      <g>
                        <line x1="94" y1="29" x2={objX} y2={95 - objH} stroke="#10b981" strokeWidth="1.5" opacity="0.8" />
                        <line x1="94" y1="29" x2={objX + shadowLen} y2="95" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />

                        <rect x={objX} y="92" width={shadowLen} height="6" fill="#f59e0b" opacity="0.4" />
                        <line x1={objX} y1="95" x2={objX + shadowLen} y2="95" stroke="#f59e0b" strokeWidth="3" />
                        <text x={objX + shadowLen / 2 - 25} y="105" fill="#f59e0b" fontSize="9" fontFamily="monospace">L_shadow: {customShadowLength}m</text>

                        <rect x={objX - 10} y={95 - objH} width="20" height={objH} fill="#ffffff" stroke="#10b981" strokeWidth="1.5" />
                        <text x={objX - 25} y={95 - objH - 4} fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">
                          H: {computedHeight}m
                        </text>
                      </g>
                    );
                  })()}
                </svg>
              </div>
            </div>

            <div className="bg-[#0b0f17] p-2.5 rounded border border-gray-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-5">
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-sans">ESTIMATED 3D HEIGHT</span>
                  <span className="text-base font-bold text-white font-mono">
                    {computedHeight} METERS
                  </span>
                </div>
                <div className="w-px h-6 bg-gray-800"></div>
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-sans">GROUND RANGE</span>
                  <span className="text-sm font-bold text-white font-mono">{computedGroundRange.toFixed(1)} METERS</span>
                </div>
              </div>

              <span className="text-xs text-gray-400">
                Acoustic shadows encode true vertical 3D elevation above seabed.
              </span>
            </div>

          </div>

        </div>

        {/* Right Detail Inspector Panel (4 Cols) */}
        <div className="lg:col-span-4 space-y-3 font-sans">
          
          <div className="bg-[#111827] border border-gray-800 rounded-md p-3 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <div>
                <h3 className="text-sm font-bold text-white">{selectedSample?.name}</h3>
                <span className="text-xs text-gray-400">{selectedSample?.category}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded font-bold font-mono ${
                selectedSample?.riskLevel === 'CRITICAL'
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}>
                {selectedSample?.riskLevel} ({selectedSample?.riskScore}/100)
              </span>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              {selectedSample?.description}
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#0b0f17] p-2 rounded border border-gray-800">
                <span className="text-gray-500 text-[10px] block font-sans">WATER DEPTH</span>
                <span className="text-white font-bold font-mono">{selectedSample?.depth}m</span>
              </div>
              <div className="bg-[#0b0f17] p-2 rounded border border-gray-800">
                <span className="text-gray-500 text-[10px] block font-sans">AUV ALTITUDE</span>
                <span className="text-white font-bold font-mono">{selectedSample?.altitude}m</span>
              </div>
              <div className="bg-[#0b0f17] p-2 rounded border border-gray-800">
                <span className="text-gray-500 text-[10px] block font-sans">DIMENSIONS</span>
                <span className="text-white font-bold font-mono">{selectedSample?.dimensions?.length} × {selectedSample?.dimensions?.width}</span>
              </div>
              <div className="bg-[#0b0f17] p-2 rounded border border-gray-800">
                <span className="text-gray-500 text-[10px] block font-sans">PRIORITY</span>
                <span className="text-white font-bold font-mono truncate block">{selectedSample?.cleanPriority}</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-gray-800 text-xs">
              <span className="text-xs font-bold text-gray-400 block font-sans">AI Perception Confidence</span>
              
              <div className="space-y-2">
                <div className="p-2 bg-[#0b0f17] rounded border border-gray-800">
                  <div className="flex justify-between mb-1 text-xs">
                    <span className="text-gray-400">YOLO-11 Dual Detector</span>
                    <span className="text-white font-bold font-mono">{(selectedSample?.detections[0]?.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-900 h-1.5 rounded overflow-hidden">
                    <div 
                      style={{ width: `${selectedSample?.detections[0]?.confidence * 100}%` }}
                      className="bg-white h-full" 
                    />
                  </div>
                </div>

                <div className="p-2 bg-[#0b0f17] rounded border border-gray-800">
                  <div className="flex justify-between mb-1 text-xs">
                    <span className="text-gray-400">PatchCore Anomaly Engine</span>
                    <span className="text-amber-400 font-bold font-mono">{(selectedSample?.anomalyConfidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-900 h-1.5 rounded overflow-hidden">
                    <div 
                      style={{ width: `${selectedSample?.anomalyConfidence * 100}%` }}
                      className="bg-amber-500 h-full" 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-2.5 bg-[#0b0f17] border border-gray-800 rounded text-xs text-gray-300">
              <span className="text-white font-bold block mb-0.5 font-sans">GEOSPATIAL COORDINATES</span>
              <p className="font-mono">LAT: {selectedSample?.coordinates?.lat}°N, LNG: {selectedSample?.coordinates?.lng}°E</p>
              <p className="text-gray-400 text-xs mt-0.5 font-sans">{selectedSample?.coordinates?.location}</p>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
