import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Radar, Activity, CheckCircle2, ChevronRight } from 'lucide-react';

const BOOT_LOGS = [
  { text: 'Initializing AUV Side-Scan Acoustic Transducers...', detail: 'Dual-frequency 450/900 kHz array active' },
  { text: 'Establishing GNSS-Denied Inertial Hydro-Acoustic Link...', detail: 'USBL positioning locked (14.5°N, 75.5°E)' },
  { text: 'Loading ONNX Acoustic Anomaly Detection Weights...', detail: 'YOLOv8n Dual Cue compiled for Edge TensorRT' },
  { text: 'Synchronizing Seafloor Bathymetric GIS Heatmaps...', detail: 'Loaded Arabian Sea & Bay of Bengal corridors' },
  { text: 'Deploying Real-Time Slant-Range Correction Filter...', detail: 'Shadow analysis & geometric height estimation ready' },
  { text: 'DeepScan AUV System Initialized & Online', detail: 'Mission parameters verified — All nodes green' }
];

export default function InitialLoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [currentLogIndex, setCurrentLogIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const increment = prev < 60 ? Math.floor(Math.random() * 5) + 3 : Math.floor(Math.random() * 8) + 5;
        return Math.min(100, prev + increment);
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const idx = Math.min(
      BOOT_LOGS.length - 1,
      Math.floor((progress / 100) * BOOT_LOGS.length)
    );
    setCurrentLogIndex(idx);

    if (progress >= 100) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [progress, onComplete]);

  const handleSkip = useCallback(() => {
    setProgress(100);
    setTimeout(() => {
      onComplete?.();
    }, 100);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      onClick={handleSkip}
      className="fixed inset-0 z-[200] bg-[#0b0f17] text-slate-100 flex flex-col items-center justify-center p-6 cursor-pointer select-none font-sans"
    >
      <div className="max-w-md w-full space-y-6 text-center">
        
        {/* Brand Icon & Pulsing Subsea Radar */}
        <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-md bg-[#111827] border border-neutral-600 text-white">
          <Radar className="w-10 h-10" />
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-xl font-extrabold tracking-tight text-white uppercase">
            DeepScan AUV System
          </h1>
          <p className="text-xs text-zinc-400 font-mono">
            SIH 2026 · Autonomous Side-Scan Sonar Perception Engine
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-zinc-400">System Initialization</span>
            <span className="text-white font-bold">{progress}%</span>
          </div>

          <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-gray-800">
            <motion.div
              style={{ width: `${progress}%` }}
              className="h-full bg-white rounded-full"
            />
          </div>
        </div>

        {/* Dynamic Boot Log */}
        <div className="bg-[#111827] border border-gray-800 rounded-md p-3.5 text-left font-mono text-xs space-y-1">
          <div className="flex items-center gap-2 text-neutral-200 font-bold">
            <Activity className="w-3.5 h-3.5" />
            <span>{BOOT_LOGS[currentLogIndex].text}</span>
          </div>
          <p className="text-[11px] text-zinc-400 pl-5">
            {BOOT_LOGS[currentLogIndex].detail}
          </p>
        </div>

        <p className="text-[11px] text-zinc-500 font-mono">
          Click anywhere or press any key to enter immediately
        </p>

      </div>
    </motion.div>
  );
}
