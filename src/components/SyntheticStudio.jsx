import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, Sliders, RefreshCw, Database, Box, Binary, Zap, ShieldCheck
} from 'lucide-react';

export default function SyntheticStudio() {
  const canvasRef = useRef(null);
  
  const [selectedDebrisType, setSelectedDebrisType] = useState('container');
  const [grazingAngle, setGrazingAngle] = useState(25);
  const [sedimentType, setSedimentType] = useState('sand');
  const [speckleNoiseLevel, setSpeckleNoiseLevel] = useState(35);
  const [isGenerating, setIsGenerating] = useState(false);

  const DEBRIS_OPTIONS = [
    { id: 'container', name: '40ft Steel Cargo Container', baseReflectivity: 0.92, heightMeters: 2.6, shadowLengthMeters: 6.8 },
    { id: 'net', name: 'Tangled Synthetic Ghost Net', baseReflectivity: 0.65, heightMeters: 1.9, shadowLengthMeters: 4.5 },
    { id: 'drum', name: 'Toxic Chemical Barrel Pair', baseReflectivity: 0.88, heightMeters: 1.1, shadowLengthMeters: 2.7 },
    { id: 'tire', name: 'Heavy Industrial Tire Stack', baseReflectivity: 0.58, heightMeters: 1.4, shadowLengthMeters: 3.2 },
    { id: 'plane', name: 'Downed Aircraft Wing Section', baseReflectivity: 0.95, heightMeters: 3.2, shadowLengthMeters: 8.4 }
  ];

  const currentDebris = DEBRIS_OPTIONS.find(d => d.id === selectedDebrisType);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#040812';
    ctx.fillRect(0, 0, w, h);

    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;

    const centerX = w / 2;
    const centerY = h / 2;

    const angleRad = (grazingAngle * Math.PI) / 180;
    const calculatedShadowLenPx = (currentDebris.heightMeters / Math.tan(angleRad)) * 14;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;

        let baseNoise = 0;
        if (sedimentType === 'sand') {
          baseNoise = 75 + Math.sin(y * 0.1 + x * 0.04) * 16 + (Math.random() - 0.5) * speckleNoiseLevel;
        } else if (sedimentType === 'gravel') {
          baseNoise = 95 + (Math.random() - 0.5) * (speckleNoiseLevel * 1.5);
        } else {
          baseNoise = 50 + Math.sin(y * 0.05) * 8 + (Math.random() - 0.5) * (speckleNoiseLevel * 0.7);
        }

        let intensity = baseNoise;

        const objW = 70;
        const objH = 45;
        const objLeft = centerX - objW / 2;
        const objTop = centerY - objH / 2;

        if (x >= objLeft && x <= objLeft + objW && y >= objTop && y <= objTop + 14) {
          const reflectBoost = currentDebris.baseReflectivity * 170;
          intensity = Math.min(255, baseNoise + reflectBoost + (Math.random() * 30));
        }

        if (x >= objLeft - 6 && x <= objLeft + objW + 6 && y > objTop + 14 && y <= objTop + 14 + calculatedShadowLenPx) {
          const fade = 1 - ((y - (objTop + 14)) / calculatedShadowLenPx);
          intensity = Math.max(3, 8 * (1 - fade) + (Math.random() * 6));
        }

        intensity = Math.min(255, Math.max(0, intensity));

        data[idx] = Math.min(255, intensity * 1.15);     // R
        data[idx + 1] = Math.min(255, intensity * 0.72); // G
        data[idx + 2] = Math.min(255, intensity * 0.22); // B
        data[idx + 3] = 255;                             // Alpha
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Draw AI Bounding Box overlay
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(centerX - 42, centerY - 28, 84, 28);
    ctx.fillStyle = 'rgba(0, 240, 255, 0.95)';
    ctx.fillRect(centerX - 42, centerY - 46, 140, 18);
    ctx.fillStyle = '#030712';
    ctx.font = 'bold 10px font-mono, monospace';
    ctx.fillText(`SYNTH: ${currentDebris.name.split(' ')[0]} [98%]`, centerX - 38, centerY - 33);
  }, [selectedDebrisType, grazingAngle, sedimentType, speckleNoiseLevel]);

  const handleGenerateNew = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setSpeckleNoiseLevel(Math.floor(20 + Math.random() * 30));
      setIsGenerating(false);
    }, 600);
  };

  return (
    <div className="space-y-4 font-sans text-slate-100">

      {/* Header Bar */}
      <div className="bg-[#111827] border border-gray-800 rounded-md p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-neutral-300" />
            <h2 className="text-sm font-extrabold text-white tracking-tight uppercase">
              SYNTHETIC CYCLEGAN &amp; ACOUSTIC RAY-TRACING ENGINE
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Data augmentation pipeline generating realistic subsea side-scan acoustic backscatter from 3D CAD models
          </p>
        </div>

        <button
          onClick={handleGenerateNew}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-white text-neutral-200 hover:text-black border border-neutral-600 rounded-md text-xs font-bold transition-all cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          <span>{isGenerating ? 'GENERATING CYCLEGAN...' : 'GENERATE NEW SYNTHETIC PAIR'}</span>
        </button>
      </div>

      {/* Main 12-Col Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Generative Controls (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#111827] border border-gray-800 rounded-md p-4 space-y-4">
            
            <div className="flex items-center gap-2 pb-3 border-b border-gray-800">
              <Sliders className="w-4 h-4 text-neutral-300" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Acoustic Generative Parameters
              </h3>
            </div>

            {/* Target 3D CAD Model Selector */}
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-300 font-medium">1. Target CAD Geometry</label>
              <div className="space-y-1.5">
                {DEBRIS_OPTIONS.map(debris => (
                  <button
                    key={debris.id}
                    onClick={() => setSelectedDebrisType(debris.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-md border text-xs transition-all cursor-pointer ${
                      selectedDebrisType === debris.id
                        ? 'bg-neutral-800 border-neutral-400 text-white font-semibold shadow-sm'
                        : 'bg-[#0b0f17] border-gray-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{debris.name}</span>
                      <span className="font-mono text-white font-bold">{debris.heightMeters}m</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Grazing Angle Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-baseline text-xs">
                <label className="text-zinc-300 font-medium">2. Sonar Grazing Angle</label>
                <span className="font-mono font-bold text-white">{grazingAngle}°</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                step="1"
                value={grazingAngle}
                onChange={(e) => setGrazingAngle(Number(e.target.value))}
                className="w-full accent-neutral-300 cursor-pointer"
              />
            </div>

            {/* Seabed Sediment Selector */}
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-300 font-medium">3. Seabed Sediment Type</label>
              <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
                {[
                  { id: 'sand', label: 'Fine Sand' },
                  { id: 'gravel', label: 'Coarse Gravel' },
                  { id: 'mud', label: 'Soft Mud' }
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSedimentType(s.id)}
                    className={`py-1.5 rounded-md border font-bold transition-all cursor-pointer ${
                      sedimentType === s.id
                        ? 'bg-zinc-800 text-white border-zinc-700 shadow-sm'
                        : 'bg-[#0b0f17] text-zinc-500 border-gray-800'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Speckle Noise Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-baseline text-xs">
                <label className="text-zinc-300 font-medium">4. Rayleigh Speckle Noise</label>
                <span className="font-mono font-bold text-amber-400">{speckleNoiseLevel}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                step="5"
                value={speckleNoiseLevel}
                onChange={(e) => setSpeckleNoiseLevel(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

          </div>
        </div>

        {/* Synthetic Canvas & 3-Stage Pipeline (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          <div className="bg-[#0b0f17] border border-gray-800 rounded-md overflow-hidden flex flex-col">
            <div className="p-3.5 bg-[#111827] border-b border-gray-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-neutral-300" />
                <span className="font-bold text-white uppercase font-sans">
                  CycleGAN Synthesized Side-Scan Sonar Texture
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-neutral-200 bg-neutral-800 px-2.5 py-0.5 rounded border border-neutral-600">
                Acoustic Backscatter Model
              </span>
            </div>

            <div className="relative bg-black flex items-center justify-center p-4 min-h-[380px]">
              <canvas ref={canvasRef} width={640} height={380} className="w-full h-auto block bg-black rounded-lg border border-zinc-900" />
            </div>

            <div className="p-3 bg-[#111827] border-t border-gray-800 flex flex-wrap items-center justify-between text-xs font-mono text-zinc-400">
              <span>TARGET: {currentDebris.name}</span>
              <span>CALCULATED SHADOW: {(currentDebris.heightMeters / Math.tan((grazingAngle * Math.PI) / 180)).toFixed(1)}m</span>
            </div>
          </div>

          {/* 3-Stage Generative Pipeline Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-[#111827] border border-gray-800 rounded-md p-3.5 space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold block">STAGE 1: 3D MESH</span>
              <p className="text-xs font-bold text-white font-sans">{currentDebris.name}</p>
              <p className="text-[11px] text-zinc-400 font-mono">Cad Mesh Render (STL)</p>
            </div>

            <div className="bg-[#111827] border border-gray-800 rounded-md p-3.5 space-y-1">
              <span className="text-[10px] text-neutral-300 uppercase font-mono font-bold block">STAGE 2: RAY-TRACE</span>
              <p className="text-xs font-bold text-white font-sans">Lambertian Refraction</p>
              <p className="text-[11px] text-zinc-400 font-mono">Shadow = {currentDebris.shadowLengthMeters}m</p>
            </div>

            <div className="bg-[#111827] border border-gray-800 rounded-md p-3.5 space-y-1">
              <span className="text-[10px] text-emerald-400 uppercase font-mono font-bold block">STAGE 3: CYCLEGAN</span>
              <p className="text-xs font-bold text-white font-sans">Sonar Domain Texture</p>
              <p className="text-[11px] text-emerald-400 font-mono font-bold">+26.4% mAP Accuracy</p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
