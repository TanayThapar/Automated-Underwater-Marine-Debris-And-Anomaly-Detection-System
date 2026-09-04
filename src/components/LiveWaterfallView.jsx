import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, Volume2, VolumeX, Scan, AlertTriangle, 
  ChevronRight, Eye, Compass, Activity
} from 'lucide-react';
import { PRESET_SAMPLES, SONAR_PALETTES } from '../data/sonarSamples';

export default function LiveWaterfallView({ onSelectSampleForStudio }) {
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [palette, setPalette] = useState('grayscale');
  const [scrollSpeed, setScrollSpeed] = useState(2);
  const [swathWidth, setSwathWidth] = useState(100);
  const [frequency, setFrequency] = useState('450 kHz');
  const [showAiBoxes, setShowAiBoxes] = useState(true);
  const [showShadowRays, setShowShadowRays] = useState(true);
  
  const [telemetry, setTelemetry] = useState({
    altitude: 12.4,
    depth: 45.2,
    speed: 3.4,
    heading: 142.5,
    pingsProcessed: 48920,
    fps: 59.8,
    inferenceMs: 14.8
  });

  const [recentLogs, setRecentLogs] = useState([]);
  const audioCtxRef = useRef(null);

  const playSonarChirp = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);

    let animationFrameId;
    let lineCounter = 0;
    let spawnTimer = 0;

    const objectsOnScreen = [];

    const render = () => {
      if (isPlaying) {
        const shiftY = scrollSpeed;
        ctx.drawImage(canvas, 0, 0, width, height - shiftY, 0, shiftY, width, height - shiftY);

        const nadirCenterX = width / 2;
        const nadirWidth = width * 0.1;

        // Age every tracked object by the amount the image just scrolled,
        // and drop anything that has scrolled fully off the bottom of the
        // waterfall so it stops being painted forever.
        objectsOnScreen.forEach(obj => { obj.age += shiftY; });
        for (let i = objectsOnScreen.length - 1; i >= 0; i--) {
          if (objectsOnScreen[i].age > height + objectsOnScreen[i].h) {
            objectsOnScreen.splice(i, 1);
          }
        }

        for (let dy = 0; dy < shiftY; dy++) {
          lineCounter++;
          const y = dy;

          for (let x = 0; x < width; x += 2) {
            const distFromCenter = Math.abs(x - nadirCenterX);
            let intensity = 0;

            if (distFromCenter < nadirWidth / 2) {
              intensity = 10 + Math.random() * 8;
            } else {
              const normDist = (distFromCenter - nadirWidth / 2) / (width / 2);
              const grazingFactor = Math.max(0.25, 1.0 - normDist * 0.45);
              const ripple = Math.sin(lineCounter * 0.05 + x * 0.02) * 7;
              const microSpeckle = (Math.random() - 0.5) * 20;
              intensity = (72 * grazingFactor) + ripple + microSpeckle;
            }

            // Only paint a target's acoustic return while it is still being
            // freshly written into the newest scan-lines (age <= h). Once
            // that's done the echo is already baked into the bitmap and will
            // keep scrolling naturally — no further per-frame work needed.
            objectsOnScreen.forEach(obj => {
              if (obj.age > obj.h) return;
              if (x >= obj.x && x < obj.x + obj.w) {
                // Specular highlight: strong direct return
                intensity = Math.min(255, intensity + 120 + Math.random() * 30);
              } else if (x >= obj.x + obj.w && x < obj.x + obj.w + obj.w * 0.6) {
                // Acoustic shadow: null zone cast just beyond the object
                intensity = Math.max(2, intensity * 0.12 - 4);
              }
            });

            intensity = Math.min(255, Math.max(0, intensity));

            if (palette === 'copper') {
              ctx.fillStyle = `rgb(${Math.min(255, 24 + intensity * 0.95)}, ${Math.min(255, 14 + intensity * 0.6)}, ${Math.min(255, 6 + intensity * 0.28)})`;
            } else if (palette === 'cyan') {
              ctx.fillStyle = `rgb(${Math.min(255, intensity * 0.15)}, ${Math.min(255, intensity * 0.95)}, ${Math.min(255, intensity * 1.2)})`;
            } else if (palette === 'emerald') {
              ctx.fillStyle = `rgb(${Math.min(255, intensity * 0.2)}, ${Math.min(255, intensity * 1.1)}, ${Math.min(255, intensity * 0.75)})`;
            } else {
              ctx.fillStyle = `rgb(${intensity}, ${intensity}, ${intensity})`;
            }
            ctx.fillRect(x, y, 2, 1);
          }
        }

        ctx.strokeStyle = 'rgba(229, 229, 229, 0.4)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(nadirCenterX, 0);
        ctx.lineTo(nadirCenterX, shiftY);
        ctx.stroke();
        ctx.setLineDash([]);

        spawnTimer += scrollSpeed;
        if (spawnTimer >= 280) {
          spawnTimer = 0;
          const randomSample = PRESET_SAMPLES[Math.floor(Math.random() * PRESET_SAMPLES.length)];
          const side = Math.random() > 0.5 ? 'starboard' : 'port';
          const targetX = side === 'starboard' ? nadirCenterX + 40 + Math.random() * 120 : nadirCenterX - 160 + Math.random() * 80;

          const newObj = {
            id: `live-${Date.now()}`,
            sampleId: randomSample.id,
            presetData: randomSample,
            label: randomSample.detections[0]?.label || randomSample.name,
            category: randomSample.category,
            risk: randomSample.riskLevel,
            confidence: randomSample.anomalyConfidence,
            range: `${randomSample.slantRange}m`,
            estHeight: randomSample.dimensions.estHeight,
            x: targetX,
            w: 70,
            h: 40,
            age: 0
          };

          objectsOnScreen.push(newObj);
          playSonarChirp();

          setRecentLogs(prev => [newObj, ...prev.slice(0, 15)]);

          setTelemetry(prev => ({
            ...prev,
            pingsProcessed: prev.pingsProcessed + 14,
            altitude: Number((12 + (Math.random() - 0.5) * 0.4).toFixed(1)),
            depth: Number((45 + (Math.random() - 0.5) * 0.6).toFixed(1))
          }));
        }

        if (showAiBoxes) {
          objectsOnScreen.forEach(obj => {
            // The box's on-screen top edge tracks how far the object's
            // baked-in echo has scrolled down from where it was printed.
            const boxY = obj.age - obj.h;
            if (boxY > height || boxY + obj.h < 0) return;

            ctx.strokeStyle = '#e5e5e5';
            ctx.lineWidth = 1.8;
            ctx.strokeRect(obj.x, boxY, obj.w, obj.h);

            ctx.fillStyle = '#e5e5e5';
            ctx.fillRect(obj.x, boxY - 18, Math.max(140, obj.w), 18);
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 10px monospace';
            ctx.fillText(`${obj.label} [${(obj.confidence * 100).toFixed(0)}%]`, obj.x + 4, boxY - 5);

            if (showShadowRays) {
              const shadowX = obj.x + obj.w + 4;
              ctx.strokeStyle = '#d97706';
              ctx.setLineDash([3, 2]);
              ctx.strokeRect(shadowX, boxY, obj.w * 0.6, obj.h);
              ctx.setLineDash([]);

              ctx.fillStyle = '#d97706';
              ctx.font = '9px monospace';
              ctx.fillText(`H: ${obj.estHeight}`, shadowX + 4, boxY + 12);
            }
          });
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, palette, scrollSpeed, showAiBoxes, showShadowRays, soundEnabled]);

  return (
    <div className="space-y-3 font-sans text-slate-100">

      {/* Header Bar */}
      <div className="bg-[#111827] border border-gray-800 rounded-md overflow-hidden">
        {/* Title row */}
        <div className="px-4 py-3 border-b border-gray-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-white rounded-full shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                LIVE SIDE-SCAN SONAR WATERFALL
              </h2>
              <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                450 kHz · Dual-Cue AI · Specular Highlight + 3D Shadow Detection
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-semibold cursor-pointer ${
                isPlaying ? 'bg-neutral-800 text-neutral-200 border-neutral-600' : 'bg-gray-900 text-gray-400 border-gray-800'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause Stream' : 'Resume Stream'}</span>
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-semibold cursor-pointer ${
                soundEnabled ? 'bg-amber-950 text-amber-300 border-amber-800' : 'bg-gray-900 text-gray-400 border-gray-800'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{soundEnabled ? 'Chirp Active' : 'Chirp Muted'}</span>
            </button>

            <div className="flex items-center bg-[#0b0f17] rounded p-0.5 border border-gray-800 text-xs font-mono">
              {Object.keys(SONAR_PALETTES).map(key => (
                <button
                  key={key}
                  onClick={() => setPalette(key)}
                  className={`px-2 py-0.5 rounded text-xs font-semibold uppercase transition-colors cursor-pointer ${
                    palette === key ? 'bg-gray-800 text-white font-bold' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live stat strip */}
        <div className="grid grid-cols-4 divide-x divide-gray-800 bg-[#0b0f17]">
          <div className="px-4 py-2.5">
            <div className="label-caps mb-0.5">Altitude</div>
            <div className="data-value text-white">{telemetry.altitude}<span className="text-sm text-gray-500 ml-1">m</span></div>
          </div>
          <div className="px-4 py-2.5">
            <div className="label-caps mb-0.5">Depth</div>
            <div className="data-value text-white">{telemetry.depth}<span className="text-sm text-gray-500 ml-1">m</span></div>
          </div>
          <div className="px-4 py-2.5">
            <div className="label-caps mb-0.5">Inference</div>
            <div className="data-value text-emerald-400">{telemetry.inferenceMs}<span className="text-sm text-gray-500 ml-1">ms</span></div>
          </div>
          <div className="px-4 py-2.5">
            <div className="label-caps mb-0.5">Pings</div>
            <div className="data-value text-white">{telemetry.pingsProcessed.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Main 12-Col Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">

        {/* Canvas Display (8 Cols) */}
        <div className="lg:col-span-8 bg-[#111827] border border-gray-800 rounded-md overflow-hidden flex flex-col">
          
          <div className="bg-[#0b0f17] px-3 py-1.5 border-b border-gray-800 flex items-center justify-between text-xs font-mono text-gray-300">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold">PORT SWATH</span>
              <span className="text-gray-600">|</span>
              <span className="text-gray-400">ALT: <strong className="text-white">{telemetry.altitude}m</strong></span>
              <span className="text-gray-600">|</span>
              <span className="text-gray-400">DEPTH: <strong className="text-white">{telemetry.depth}m</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-400">SWATH: <strong className="text-white">{swathWidth}m</strong></span>
              <span className="text-gray-600">|</span>
              <span className="text-amber-400 font-bold">STARBOARD SWATH</span>
            </div>
          </div>

          <div className="relative bg-black flex-1 flex items-center justify-center min-h-[460px]">
            <canvas ref={canvasRef} width={720} height={460} className="w-full h-full block bg-black" />

            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none text-xs font-mono">
              <div className="bg-black/90 px-2.5 py-1 rounded border border-gray-800 text-emerald-400 font-bold flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                <span>FPS: {telemetry.fps} | Latency: {telemetry.inferenceMs}ms (TensorRT INT8)</span>
              </div>

              <div className="flex items-center gap-2 pointer-events-auto bg-black/90 px-2.5 py-1 rounded border border-gray-800">
                <label className="flex items-center gap-1 text-xs text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAiBoxes}
                    onChange={(e) => setShowAiBoxes(e.target.checked)}
                    className="accent-neutral-300 rounded"
                  />
                  <span>AI Bounding Boxes</span>
                </label>
                <label className="flex items-center gap-1 text-xs text-gray-300 cursor-pointer ml-1">
                  <input
                    type="checkbox"
                    checked={showShadowRays}
                    onChange={(e) => setShowShadowRays(e.target.checked)}
                    className="accent-amber-500 rounded"
                  />
                  <span>3D Shadow Rays</span>
                </label>
              </div>
            </div>
          </div>

          <div className="p-2.5 bg-[#0b0f17] border-t border-gray-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div>
              <label className="text-gray-400 text-[10px] block mb-1 font-sans">Scroll Speed ({scrollSpeed}x)</label>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={scrollSpeed}
                onChange={(e) => setScrollSpeed(Number(e.target.value))}
                className="w-full accent-neutral-300 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-gray-400 text-[10px] block mb-1 font-sans">Swath Width</label>
              <select
                value={swathWidth}
                onChange={(e) => setSwathWidth(Number(e.target.value))}
                className="w-full bg-[#111827] border border-gray-800 rounded px-2 py-0.5 text-white text-xs font-mono"
              >
                <option value={50}>50m (High Res)</option>
                <option value={100}>100m (Standard)</option>
                <option value={150}>150m (Wide Swath)</option>
                <option value={300}>300m (Deep Swath)</option>
              </select>
            </div>

            <div>
              <label className="text-gray-400 text-[10px] block mb-1 font-sans">Acoustic Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full bg-[#111827] border border-gray-800 rounded px-2 py-0.5 text-white text-xs font-mono"
              >
                <option value="900 kHz">900 kHz (High Res)</option>
                <option value="450 kHz">450 kHz (Standard)</option>
                <option value="100 kHz">100 kHz (Long Range)</option>
              </select>
            </div>

            <div>
              <label className="text-gray-400 text-[10px] block mb-1 font-sans">Heading Gyro</label>
              <div className="flex items-center gap-1.5 text-white bg-[#111827] border border-gray-800 rounded px-2 py-0.5 font-mono">
                <Compass className="w-3.5 h-3.5 text-neutral-300" />
                <span>{telemetry.heading}° SE</span>
              </div>
            </div>
          </div>

        </div>

        {/* Live Anomaly Detection Stream (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="bg-[#111827] border border-gray-800 rounded-md p-3 flex flex-col h-full">
            
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Live Anomaly Detections
                </h3>
              </div>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-gray-800 text-gray-300 border border-gray-700">
                {recentLogs.length} Detections
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 py-2.5 pr-1 min-h-[360px] max-h-[440px]">
              {recentLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-500 space-y-2">
                  <Scan className="w-6 h-6 text-gray-600 animate-pulse" />
                  <p className="text-xs font-mono">Awaiting acoustic sweeps...</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {recentLogs.map((log) => (
                    <div
                      key={log.id}
                      onClick={() => onSelectSampleForStudio(log.presetData)}
                      className="p-2.5 rounded bg-[#0b0f17] border border-gray-800 hover:border-neutral-400 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-xs text-white group-hover:text-neutral-300">
                            {log.label}
                          </span>
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">{log.category}</p>
                        </div>

                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                          log.risk === 'CRITICAL' 
                            ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {log.risk}
                        </span>
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-gray-900 flex items-center justify-between text-[10px] font-mono text-gray-400">
                        <span>CONF: <strong className="text-white">{(log.confidence * 100).toFixed(0)}%</strong></span>
                        <span>RANGE: <strong className="text-white">{log.range}</strong></span>
                        <span>SHADOW: <strong className="text-amber-400">{log.estHeight}</strong></span>
                        
                        <span className="text-neutral-300 font-bold group-hover:underline">
                          INSPECT &gt;
                        </span>
                      </div>
                    </div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            <div className="pt-2.5 border-t border-gray-800">
              <button
                onClick={() => onSelectSampleForStudio(PRESET_SAMPLES[0])}
                className="w-full py-1.5 bg-[#0b0f17] hover:bg-white hover:text-black text-white border border-gray-700 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>INSPECT IN ACOUSTIC STUDIO</span>
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
