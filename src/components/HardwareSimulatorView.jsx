import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu, Activity, Thermometer, Zap, Play, Pause,
  RotateCcw, Gauge, Navigation, Terminal, Sliders, ShieldCheck
} from 'lucide-react';
import Auv3DCanvas from './Auv3DCanvas';

// ── Edge Board Profiles ───────────────────────────────────────────────────
const BOARDS = {
  jetson_orin_nano: {
    id: 'jetson_orin_nano', name: 'Jetson Orin Nano',
    chip: 'NVIDIA Ampere · 1024 CUDA Cores',
    maxPowerW: 15, baseLatencyMs: 18.4, baseFPS: 54.3,
    vram: '4 GB LPDDR5', dlops: '40 TOPS', color: '#10b981',
  },
  jetson_orin_agx: {
    id: 'jetson_orin_agx', name: 'Jetson AGX Orin',
    chip: 'NVIDIA Ampere · 2048 CUDA Cores',
    maxPowerW: 60, baseLatencyMs: 14.8, baseFPS: 67.5,
    vram: '32 GB LPDDR5', dlops: '275 TOPS', color: '#3b82f6',
  },
  rpi5_coral: {
    id: 'rpi5_coral', name: 'RPi 5 + Coral TPU',
    chip: 'BCM2712 · Google Edge TPU',
    maxPowerW: 10, baseLatencyMs: 28.2, baseFPS: 35.5,
    vram: '8 GB LPDDR4X', dlops: '4 TOPS', color: '#f59e0b',
  },
};

const POWER_MODES = [
  { watts: 5,  label: '5W' },
  { watts: 10, label: '10W' },
  { watts: 15, label: '15W' },
  { watts: 30, label: '30W' },
];

function computeMetrics(boardId, powerW, thermalThrottle) {
  const b = BOARDS[boardId];
  const clamped = Math.min(powerW, b.maxPowerW);
  const ratio = clamped / b.maxPowerW;
  const throttleMult = thermalThrottle ? 0.52 + Math.random() * 0.12 : 1.0;
  const latency = Number((b.baseLatencyMs / Math.sqrt(ratio) * (thermalThrottle ? 1.48 : 1.0)).toFixed(1));
  const fps = Number((b.baseFPS * ratio * throttleMult).toFixed(1));
  const powerDraw = Number((clamped * ratio * (thermalThrottle ? 0.93 : 1.0)).toFixed(1));
  const tempC = Number((42 + ratio * 28 + (thermalThrottle ? 19 : 0) + (Math.random() - 0.5) * 2).toFixed(1));
  const vramMB = Math.round(380 + (1 - ratio) * 220 + (thermalThrottle ? 65 : 0));
  return { latency, fps, powerDraw, tempC, vramMB };
}

function makePacket(type, kinematics, metrics) {
  const ts = new Date().toLocaleTimeString();
  const heave = (Math.sin(Date.now() / 1200) * kinematics.heaveAmp).toFixed(2);
  const bodies = {
    nav: {
      topic: '/auv/telemetry/nav_state',
      summary: `Surge: ${kinematics.surge}kts | Alt: ${kinematics.altitude}m | Pitch: ${kinematics.pitch}° | Roll: ${kinematics.roll}°`,
      data: { surge_kts: kinematics.surge, altitude_m: kinematics.altitude,
               pitch_deg: kinematics.pitch, roll_deg: kinematics.roll, heave_m: +heave },
    },
    ping: {
      topic: '/sonar/ping_header',
      summary: `Freq: 450kHz | Swath: 100m | Slant Range: ${(kinematics.altitude / Math.max(0.01, Math.cos(Math.abs(kinematics.pitch) * Math.PI / 180))).toFixed(2)}m`,
      data: { freq_khz: 450, ping_hz: 15, swath_m: 100,
               slant_m: +(kinematics.altitude / Math.max(0.01, Math.cos(Math.abs(kinematics.pitch) * Math.PI / 180))).toFixed(2) },
    },
    npu: {
      topic: '/edge/npu_status',
      summary: `Latency: ${metrics.latency}ms | FPS: ${metrics.fps} | Power: ${metrics.powerDraw}W | Temp: ${metrics.tempC}°C`,
      data: { inf_ms: metrics.latency, fps: metrics.fps, power_w: metrics.powerDraw,
               temp_c: metrics.tempC, throttled: kinematics.thermalThrottle },
    },
  };
  return { ...bodies[type], stamp: ts };
}

function paintRaw(canvas, kin, frame, target, scroll) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.drawImage(canvas, 0, 0, W, H - scroll, 0, scroll, W, H - scroll);

  const nadirX = W / 2;
  const heavePhase = frame * 0.055;
  const nadirW = W * 0.09 + Math.sin(heavePhase) * kin.heaveAmp * 11;
  const pitchPx = Math.tan(kin.pitch * Math.PI / 180) * 5.8;
  const rollGainL = 1.0 + Math.sin(kin.roll * Math.PI / 180) * 0.50;
  const rollGainR = 1.0 - Math.sin(kin.roll * Math.PI / 180) * 0.50;
  const targetX = target.x * W;

  for (let dy = 0; dy < scroll; dy++) {
    const shift = pitchPx * dy;
    for (let x = 0; x < W; x += 2) {
      const sx = x - shift;
      const dist = Math.abs(sx - nadirX);
      let v;
      if (dist < nadirW / 2) {
        v = 10 + Math.random() * 14;
      } else {
        const norm = (dist - nadirW / 2) / (W / 2);
        const graze = Math.max(0.22, 1.0 - norm * 0.50);
        const ripple = Math.sin(frame * 0.05 + x * 0.025) * 6;
        const speckle = (Math.random() - 0.5) * 22;
        const gain = sx < nadirX ? rollGainL : rollGainR;
        v = 70 * graze * gain + ripple + speckle;
      }

      // Debris echo: only paint it while it's still being freshly printed
      // into the newest scan-lines (age <= h). Once printed it's baked into
      // the scrolling bitmap and needs no further per-frame repainting.
      if (target.active && target.age <= target.h) {
        const dxT = Math.abs(sx - targetX);
        if (dxT < 15) v = 185 + Math.random() * 40;
        else if (dxT < 28) v = 5 + Math.random() * 10;
      }

      v = Math.min(255, Math.max(0, v));
      ctx.fillStyle = `rgb(${Math.min(255, 22 + v * 0.92)},${Math.min(255, 13 + v * 0.58)},${Math.min(255, 5 + v * 0.26)})`;
      ctx.fillRect(x, dy, 2, 1);
    }
  }

  ctx.strokeStyle = 'rgba(255,70,70,0.22)';
  ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(nadirX + pitchPx * H, 0);
  ctx.lineTo(nadirX - pitchPx * H, H);
  ctx.stroke(); ctx.setLineDash([]);
}

function paintDSP(canvas, kin, frame, metrics, target, scroll) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.drawImage(canvas, 0, 0, W, H - scroll, 0, scroll, W, H - scroll);

  const nadirX = W / 2;
  const nadirW = W * 0.09; // heave-induced nadir wobble is fully corrected out here
  const targetX = target.x * W;

  // DSP compensation: pitch shear and roll gain asymmetry are corrected
  // down to a small residual (~8%) rather than eliminated outright, so the
  // "compensated" panel still visibly (if subtly) reacts to aggressive
  // vehicle motion instead of looking identical no matter what the
  // kinematics sliders are set to.
  const RESIDUAL = 0.08;
  const pitchPx = Math.tan(kin.pitch * Math.PI / 180) * 5.8 * RESIDUAL;
  const rollGainL = 1.0 + Math.sin(kin.roll * Math.PI / 180) * 0.50 * RESIDUAL;
  const rollGainR = 1.0 - Math.sin(kin.roll * Math.PI / 180) * 0.50 * RESIDUAL;

  for (let dy = 0; dy < scroll; dy++) {
    const shift = pitchPx * dy;
    for (let x = 0; x < W; x += 2) {
      const sx = x - shift;
      const dist = Math.abs(sx - nadirX);
      let v;
      if (dist < nadirW / 2) {
        v = 10 + Math.random() * 8;
      } else {
        const norm = (dist - nadirW / 2) / (W / 2);
        const graze = Math.max(0.25, 1.0 - norm * 0.45);
        const slantCorr = 1.0 + norm * 0.15;
        const ripple = Math.sin(frame * 0.05 + x * 0.025) * 4;
        const speckle = (Math.random() - 0.5) * 10;
        const gain = sx < nadirX ? rollGainL : rollGainR;
        v = 78 * graze * slantCorr * gain + ripple + speckle;
      }

      if (target.active && target.age <= target.h) {
        const dxT = Math.abs(sx - targetX);
        if (dxT < 13) v = 200 + Math.random() * 30;
        else if (dxT < 24) v = 4 + Math.random() * 6;
      }

      v = Math.min(255, Math.max(0, v));
      ctx.fillStyle = `rgb(${Math.min(255, v * 0.14)},${Math.min(255, v * 0.94)},${Math.min(255, v * 1.22)})`;
      ctx.fillRect(x, dy, 2, 1);
    }
  }

  ctx.strokeStyle = 'rgba(0,240,255,0.5)';
  ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
  ctx.beginPath(); ctx.moveTo(nadirX, 0); ctx.lineTo(nadirX, H);
  ctx.stroke(); ctx.setLineDash([]);

  // AI detection box: only drawn while the target's echo is actually
  // on-screen, and its top edge tracks the same scroll position as the
  // pixel data underneath it — so it travels down and disappears with the
  // echo instead of floating fixed on screen forever.
  if (target.active) {
    const boxH = target.h;
    const boxY = target.age - boxH;
    if (boxY < H && boxY + boxH > 0) {
      const bw = W * 0.16;
      const bx = targetX - bw / 2;
      const conf = metrics.fps > 30 ? 96 : 87;

      ctx.strokeStyle = '#00F0FF'; ctx.lineWidth = 1.8; ctx.setLineDash([]);
      ctx.strokeRect(bx, boxY, bw, boxH);
      ctx.fillStyle = 'rgba(0,240,255,0.93)';
      ctx.fillRect(bx, boxY - 18, 148, 18);
      ctx.fillStyle = '#030712'; ctx.font = 'bold 10px ui-monospace, monospace';
      ctx.fillText(`Debris Target  [${conf}%]`, bx + 5, boxY - 5);

      ctx.strokeStyle = '#10B981'; ctx.lineWidth = 1.2; ctx.setLineDash([3, 2]);
      ctx.strokeRect(bx + 3, boxY + 3, bw - 6, boxH * 0.34);
      ctx.fillStyle = '#10B981'; ctx.font = '9px ui-monospace, monospace';
      ctx.fillText('● HIGHLIGHT', bx + 6, boxY + 16);

      ctx.strokeStyle = '#F59E0B';
      ctx.strokeRect(bx + 3, boxY + boxH * 0.34 + 3, bw - 6, boxH * 0.62);
      ctx.fillStyle = '#F59E0B';
      ctx.fillText('▲ SHADOW', bx + 6, boxY + boxH * 0.34 + 16);
      ctx.setLineDash([]);
    }
  }
}

function Slider({ label, unit, value, min, max, step, onChange, valColor, bipolar }) {
  return (
    <div className="space-y-1.5 font-sans">
      <div className="flex justify-between items-baseline text-xs">
        <label className="text-zinc-300 font-medium select-none">{label}</label>
        <span className={`font-semibold font-mono tabular-nums ${valColor || 'text-zinc-100'}`}>
          {bipolar && value > 0 ? '+' : ''}{value.toFixed(1)}{unit}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-lg appearance-none bg-zinc-800 accent-neutral-300 cursor-pointer"
      />
    </div>
  );
}

function MetricCard({ label, value, sub, Icon, ok }) {
  return (
    <div className="bg-[#0b0f17] border border-gray-800 rounded-md p-4 font-sans">
      <div className="flex items-center justify-between mb-2">
        <span className="label-caps">{label}</span>
        <div className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-amber-400'}`} />
      </div>
      <p className="data-value">{value}</p>
      {sub && <p className="text-[10px] text-zinc-500 font-mono mt-1">{sub}</p>}
    </div>
  );
}

export default function HardwareSimulatorView() {
  const rawRef = useRef(null);
  const dspRef = useRef(null);
  const frameRef = useRef(0);
  const rafRef = useRef(null);
  const stateRef = useRef({});
  const targetRef = useRef({ active: false, x: 0.5, age: 0, h: 46, spawnTimer: 60 });

  const [running, setRunning] = useState(true);

  const [surge, setSurge] = useState(2.5);
  const [altitude, setAltitude] = useState(12.0);
  const [pitch, setPitch] = useState(0.0);
  const [roll, setRoll] = useState(0.0);
  const [heaveAmp, setHeaveAmp] = useState(0.0);

  const [boardId, setBoardId] = useState('jetson_orin_nano');
  const [powerW, setPowerW] = useState(15);
  const [thermalThrottle, setThermalThrottle] = useState(false);

  const [metrics, setMetrics] = useState(() => computeMetrics('jetson_orin_nano', 15, false));
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    stateRef.current = { surge, altitude, pitch, roll, heaveAmp, thermalThrottle };
  }, [surge, altitude, pitch, roll, heaveAmp, thermalThrottle]);

  useEffect(() => {
    setMetrics(computeMetrics(boardId, powerW, thermalThrottle));
  }, [boardId, powerW, thermalThrottle]);

  useEffect(() => {
    [rawRef.current, dspRef.current].forEach(c => {
      if (!c) return;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, c.width, c.height);
    });

    const tick = () => {
      if (running) {
        frameRef.current++;
        const s = stateRef.current;
        const m = computeMetrics(boardId, powerW, s.thermalThrottle);
        const scroll = Math.max(1, Math.round(s.surge * 0.45));
        const canvasH = rawRef.current ? rawRef.current.height : 250;

        // Advance the shared debris-target lifecycle: print in, scroll down
        // and off screen, then wait before spawning the next one — instead
        // of redrawing forever at a fixed spot.
        const t = targetRef.current;
        if (t.active) {
          t.age += scroll;
          if (t.age > canvasH + t.h) {
            t.active = false;
            t.spawnTimer = 90 + Math.random() * 100;
          }
        } else {
          t.spawnTimer -= scroll;
          if (t.spawnTimer <= 0) {
            t.active = true;
            t.age = 0;
            t.x = 0.3 + Math.random() * 0.4;
          }
        }

        paintRaw(rawRef.current, s, frameRef.current, t, scroll);
        paintDSP(dspRef.current, s, frameRef.current, m, t, scroll);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, boardId, powerW]);

  // Smooth Live Telemetry Log Stream (Silent & Smooth)
  useEffect(() => {
    if (!running) return;
    const types = ['nav', 'ping', 'npu'];
    let i = 0;
    const interval = setInterval(() => {
      const pkt = makePacket(types[i++ % 3], stateRef.current, metrics);
      setLogs(prev => [pkt, ...prev.slice(0, 20)]);
    }, 700);
    return () => clearInterval(interval);
  }, [running, metrics]);

  const reset = () => {
    frameRef.current = 0;
    targetRef.current = { active: false, x: 0.5, age: 0, h: 46, spawnTimer: 60 };
    setSurge(2.5); setAltitude(12); setPitch(0); setRoll(0); setHeaveAmp(0);
    setThermalThrottle(false);
    [rawRef.current, dspRef.current].forEach(c => {
      if (!c) return;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, c.width, c.height);
    });
  };

  const board = BOARDS[boardId];
  const distMag = Math.min(1, Math.sqrt(pitch*pitch/100 + roll*roll/225 + heaveAmp*heaveAmp/4));
  const distLabel = distMag < 0.2 ? 'Stable' : distMag < 0.55 ? 'Moderate Motion' : 'High Motion';
  const distColor = distMag < 0.2 ? 'text-emerald-400' : distMag < 0.55 ? 'text-amber-400' : 'text-rose-400';

  return (
    <div className="space-y-4 font-sans text-zinc-100">

      {/* Header */}
      <div className="bg-[#111827] border border-gray-800 rounded-md p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-emerald-500 rounded-full shrink-0" />
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              HARDWARE &amp; PHYSICS SIMULATION MODULE
            </h2>
            <p className="text-[11px] text-gray-500 font-mono mt-0.5">
              3D subsea kinematics · Edge NPU profiling · Real-time DSP compensation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setRunning(r => !r)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-md border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold transition-all cursor-pointer"
          >
            {running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {running ? 'Pause' : 'Resume'}
          </button>
          <button
            onClick={reset}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 text-xs font-medium transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

        {/* LEFT — Controls */}
        <div className="xl:col-span-3 space-y-4">

          {/* Kinematics */}
          <div className="bg-[#111827] border border-gray-800 rounded-md p-4 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-800">
              <Sliders className="w-4 h-4 text-neutral-300" />
              <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">Vehicle Kinematics</h3>
            </div>
            <Slider label="Surge Speed" unit=" kts" value={surge} min={1.0} max={6.0} step={0.1} onChange={setSurge} />
            <Slider label="Altitude" unit=" m" value={altitude} min={4.0} max={25.0} step={0.5} onChange={setAltitude} valColor="text-white" />
            <Slider label="Pitch (θ)" unit="°" value={pitch} min={-10} max={10} step={0.5} onChange={setPitch} valColor="text-amber-400" bipolar />
            <Slider label="Roll (φ)" unit="°" value={roll} min={-15} max={15} step={0.5} onChange={setRoll} valColor="text-white" bipolar />
            <Slider label="Heave Amplitude" unit=" m" value={heaveAmp} min={0} max={2.0} step={0.1} onChange={setHeaveAmp} valColor="text-purple-300" />

            <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-medium">Motion State</span>
              <span className={`font-semibold ${distColor}`}>{distLabel}</span>
            </div>
          </div>

          {/* Edge Hardware */}
          <div className="bg-[#111827] border border-gray-800 rounded-md p-4 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-800">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">Edge Processor</h3>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-zinc-400 font-medium">Target Board</p>
              {Object.values(BOARDS).map(b => (
                <button
                  key={b.id}
                  onClick={() => { setBoardId(b.id); setPowerW(Math.min(powerW, b.maxPowerW)); }}
                  className={`w-full text-left px-3 py-2.5 rounded-md border text-xs transition-all cursor-pointer ${
                    boardId === b.id
                      ? 'bg-gray-800 border-gray-600 text-white font-semibold'
                      : 'bg-[#0b0f17] border-gray-800 text-zinc-400 hover:text-zinc-200 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{b.name}</span>
                    <span className="font-mono font-semibold" style={{ color: b.color }}>{b.dlops}</span>
                  </div>
                  <span className="text-[11px] text-zinc-500 block mt-0.5 font-mono">{b.chip}</span>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-xs text-zinc-400 font-medium">Power Budget</p>
              <div className="grid grid-cols-4 gap-1.5">
                {POWER_MODES.map(m => {
                  const disabled = m.watts > board.maxPowerW;
                  return (
                    <button
                      key={m.watts}
                      onClick={() => !disabled && setPowerW(m.watts)}
                      className={`py-1.5 rounded-md text-xs font-medium border transition-all ${
                        disabled
                          ? 'opacity-30 cursor-not-allowed border-zinc-900 text-zinc-600 bg-zinc-950'
                          : powerW === m.watts
                          ? 'bg-white text-zinc-950 border-white font-semibold cursor-pointer'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200 cursor-pointer'
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              onClick={() => setThermalThrottle(t => !t)}
              className={`flex items-center justify-between p-3 rounded-md border cursor-pointer transition-all ${
                thermalThrottle ? 'border-rose-900/80 bg-rose-950/20' : 'border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Thermometer className={`w-4 h-4 ${thermalThrottle ? 'text-rose-400' : 'text-zinc-500'}`} />
                <div>
                  <p className="text-xs font-medium text-white">Thermal Throttling</p>
                  <p className="text-[11px] text-zinc-500">Simulate NPU high temp</p>
                </div>
              </div>
              <div className={`w-8 h-4 rounded-full transition-colors relative flex-shrink-0 ${thermalThrottle ? 'bg-rose-500' : 'bg-zinc-700'}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${thermalThrottle ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
            </div>
          </div>
        </div>

        {/* CENTER — 3D WebGL Canvas & Dual Sonar Canvases */}
        <div className="xl:col-span-6 space-y-4">
          
          <Auv3DCanvas pitch={pitch} roll={roll} heaveAmp={heaveAmp} altitude={altitude} surge={surge} />

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#111827] border border-gray-800 rounded-md overflow-hidden">
              <div className="px-3.5 py-2.5 border-b border-gray-800 flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-200">Raw Sonar Stream</span>
                <span className="text-[10px] text-rose-400 font-mono font-medium">UNCORRECTED</span>
              </div>
              <canvas ref={rawRef} width={480} height={250} className="w-full h-auto block bg-[#050505]" />
            </div>

            <div className="bg-[#111827] border border-gray-800 rounded-md overflow-hidden">
              <div className="px-3.5 py-2.5 border-b border-gray-800 flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-200">DSP Compensated</span>
                <span className="text-[10px] text-emerald-400 font-mono font-medium">AI ENHANCED</span>
              </div>
              <canvas ref={dspRef} width={480} height={250} className="w-full h-auto block bg-[#050a14]" />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            <MetricCard label="Inference" value={`${metrics.latency} ms`} sub="TensorRT INT8" Icon={Activity} ok={metrics.latency < 20} />
            <MetricCard label="Throughput" value={`${metrics.fps} FPS`} sub="Ping rate" Icon={Gauge} ok={metrics.fps > 40} />
            <MetricCard label="Power Draw" value={`${metrics.powerDraw} W`} sub={`${board.vram}`} Icon={Zap} ok={metrics.powerDraw < 20} />
            <MetricCard label="NPU Temp" value={`${metrics.tempC}°C`} sub={thermalThrottle ? 'Throttled' : 'Nominal'} Icon={Thermometer} ok={metrics.tempC < 72} />
          </div>
        </div>

        {/* RIGHT — Clean Live Telemetry Log Stream */}
        <div className="xl:col-span-3">
          <div className="bg-[#111827] border border-gray-800 rounded-md flex flex-col overflow-hidden" style={{ height: '740px' }}>
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between bg-zinc-950/60 text-xs">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-neutral-300" />
                <h3 className="font-semibold text-zinc-200">Telemetry Stream</h3>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono font-medium px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800/60">
                ROS 2 LIVE
              </span>
            </div>

            {/* Smooth Rolling Log Stream — Silent, Clean Insertions */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 font-mono text-[11px] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-800">
              {logs.map((pkt, idx) => {
                const topicColor = pkt.topic.includes('nav') ? 'text-neutral-200' : pkt.topic.includes('sonar') ? 'text-amber-400' : 'text-emerald-400';
                return (
                  <div
                    key={`${pkt.stamp}-${idx}`}
                    className="bg-[#0b0f17] border border-gray-800 rounded-md p-3 space-y-1.5 transition-all"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={`font-bold ${topicColor}`}>{pkt.topic}</span>
                      <span className="text-zinc-500 font-mono">{pkt.stamp}</span>
                    </div>
                    <p className="text-zinc-300 text-xs font-sans leading-snug">
                      {pkt.summary}
                    </p>
                  </div>
                );
              })}

              {logs.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 text-zinc-600 text-xs space-y-1 font-sans">
                  <Terminal className="w-5 h-5 opacity-40 mb-1" />
                  <span>Connecting to telemetry daemon...</span>
                </div>
              )}
            </div>

            <div className="border-t border-gray-800 px-3.5 py-2.5 flex-shrink-0 bg-zinc-950/80 text-[10px] text-zinc-500 flex justify-between">
              <span>Protocol: ROS 2 DDS</span>
              <span className="text-emerald-400 font-medium">Connected</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
