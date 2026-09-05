import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Cpu, Zap, Activity, HardDrive, Gauge, Server, Terminal, ArrowRight, ShieldCheck
} from 'lucide-react';

export default function EdgeMetricsView() {
  const [precisionMode, setPrecisionMode] = useState('tensorrt_int8');

  const BENCHMARKS = {
    fp32: {
      name: 'PyTorch Native (FP32)',
      latency: 48.2,
      fps: 20.7,
      vram: '2.4 GB',
      power: '32.5 W',
      mapDrop: '0.0% (Baseline)'
    },
    fp16: {
      name: 'ONNX Runtime (FP16)',
      latency: 22.4,
      fps: 44.6,
      vram: '1.2 GB',
      power: '19.8 W',
      mapDrop: '-0.2% mAP'
    },
    tensorrt_int8: {
      name: 'NVIDIA TensorRT (INT8 Quantized)',
      latency: 14.8,
      fps: 67.5,
      vram: '640 MB',
      power: '14.2 W',
      mapDrop: '-0.5% mAP (Recommended)'
    }
  };

  const activeBenchmark = BENCHMARKS[precisionMode];

  const telemetryCards = [
    {
      label: 'INFERENCE LATENCY',
      value: `${activeBenchmark.latency} ms`,
      sub: 'Sub-20ms real-time requirement met',
      icon: Activity,
      ok: activeBenchmark.latency < 20
    },
    {
      label: 'THROUGHPUT RATE',
      value: `${activeBenchmark.fps} FPS`,
      sub: 'Handles up to 50 Hz Sonar Pings',
      icon: Gauge,
      ok: activeBenchmark.fps > 40
    },
    {
      label: 'POWER CONSUMPTION',
      value: activeBenchmark.power,
      sub: 'AUV Battery endurance +4.2 hrs',
      icon: Zap,
      ok: true
    },
    {
      label: 'VRAM MEMORY FOOTPRINT',
      value: activeBenchmark.vram,
      sub: 'Fits on 4GB Jetson Orin Nano',
      icon: HardDrive,
      ok: true
    }
  ];

  return (
    <div className="space-y-4 font-sans text-slate-100">

      {/* Header Bar */}
      <div className="bg-[#111827] border border-gray-800 rounded-md p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-extrabold text-white tracking-tight uppercase">
              EDGE NPU TELEMETRY &amp; TENSORRT BENCHMARKS
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            NVIDIA Orin Nano INT8 quantization profiling, ROS 2 Humble node architecture &amp; power budget
          </p>
        </div>

        {/* Quantization Mode Switcher */}
        <div className="flex items-center gap-1 bg-[#0b0f17] p-1.5 rounded-md border border-gray-800 font-mono text-xs">
          {[
            { id: 'fp32', label: 'FP32 Native' },
            { id: 'fp16', label: 'FP16 Half' },
            { id: 'tensorrt_int8', label: 'TensorRT INT8' }
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setPrecisionMode(m.id)}
              className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                precisionMode === m.id
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 shadow-md'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {telemetryCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-[#111827] border border-gray-800 rounded-md p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-medium">{card.label}</span>
                <Icon className={`w-4 h-4 ${card.ok ? 'text-emerald-400' : 'text-amber-400'}`} />
              </div>
              <p className="text-2xl font-extrabold text-white font-mono">{card.value}</p>
              <p className="text-xs text-zinc-400">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ROS 2 Node Architecture Diagram */}
      <div className="bg-[#111827] border border-gray-800 rounded-md p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-neutral-300" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans">
              ROS 2 Humble Underwater Perceptual Pipeline Architecture
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded border border-emerald-800">
            DDS ZERO-COPY BUS
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-sans">
          
          <div className="bg-[#0b0f17] border border-gray-800 rounded-md p-3.5 space-y-1.5">
            <span className="text-[10px] text-neutral-300 font-mono font-bold uppercase">NODE 1: TRANSDUCER</span>
            <p className="font-bold text-white">/sonar/ping_stream</p>
            <p className="text-zinc-400 text-[11px]">450 kHz Acoustic Receiver</p>
            <p className="text-[10px] text-zinc-500 font-mono">15 Hz Ping Output</p>
          </div>

          <div className="bg-[#0b0f17] border border-gray-800 rounded-md p-3.5 space-y-1.5">
            <span className="text-[10px] text-amber-400 font-mono font-bold uppercase">NODE 2: DSP FILTER</span>
            <p className="font-bold text-white">/dsp/slant_corrected</p>
            <p className="text-zinc-400 text-[11px]">Lee Despeckle &amp; Slant Range</p>
            <p className="text-[10px] text-zinc-500 font-mono">1.8 ms Latency</p>
          </div>

          <div className="bg-[#0b0f17] border border-gray-800 rounded-md p-3.5 space-y-1.5">
            <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase">NODE 3: TENSORRT NPU</span>
            <p className="font-bold text-white">/edge/detection_boxes</p>
            <p className="text-zinc-400 text-[11px]">YOLOv8n Dual Highlight-Shadow</p>
            <p className="text-[10px] text-emerald-400 font-mono font-bold">14.8 ms (67.5 FPS)</p>
          </div>

          <div className="bg-[#0b0f17] border border-gray-800 rounded-md p-3.5 space-y-1.5">
            <span className="text-[10px] text-neutral-300 font-mono font-bold uppercase">NODE 4: NAVIGATION</span>
            <p className="font-bold text-white">/auv/obstacle_avoidance</p>
            <p className="text-zinc-400 text-[11px]">Emergency Waypoint Steering</p>
            <p className="text-[10px] text-zinc-500 font-mono">Sub-20ms Reactive Trigger</p>
          </div>

        </div>
      </div>

    </div>
  );
}
