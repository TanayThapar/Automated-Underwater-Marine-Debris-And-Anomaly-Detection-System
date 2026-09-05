import React, { createContext, useContext, useState, useEffect } from 'react';
import { PRESET_SAMPLES } from '../data/sonarSamples';

const TelemetryContext = createContext(null);

const INITIAL_BASELINE_PINGS = 1420890;
const INITIAL_BATTERY_PCT = 88.4;
const PING_RATE_HZ = 15; // standard 15 Hz side-scan acoustic ping rate
const BATTERY_DRAIN_PER_SEC = 0.0028; // ~10% discharge per hour at 14.2W continuous draw

export function TelemetryProvider({ children }) {
  // Pings: begins from real mission baseline and increments with real clock & ping rate
  const [pingsProcessed, setPingsProcessed] = useState(() => {
    try {
      const saved = localStorage.getItem('auv_pings_processed');
      return saved ? parseInt(saved, 10) : INITIAL_BASELINE_PINGS;
    } catch {
      return INITIAL_BASELINE_PINGS;
    }
  });

  // Battery: realistic electrochemical discharge based on AUV operational runtime
  const [batteryPct, setBatteryPct] = useState(() => {
    try {
      const saved = localStorage.getItem('auv_battery_pct');
      return saved ? parseFloat(saved) : INITIAL_BATTERY_PCT;
    } catch {
      return INITIAL_BATTERY_PCT;
    }
  });

  // Dynamic threat targets: calculated from PRESET_SAMPLES + any user uploaded scans
  const [uploadedThreats, setUploadedThreats] = useState([]);
  
  // Mission elapsed timer
  const [missionSeconds, setMissionSeconds] = useState(24120); // 06h 42m baseline

  // Continuous real-time mission clock & ping accumulator
  useEffect(() => {
    const interval = setInterval(() => {
      setPingsProcessed(prev => {
        const next = prev + PING_RATE_HZ;
        try { localStorage.setItem('auv_pings_processed', next.toString()); } catch {}
        return next;
      });

      setBatteryPct(prev => {
        const next = Math.max(5.0, Number((prev - BATTERY_DRAIN_PER_SEC).toFixed(2)));
        try { localStorage.setItem('auv_battery_pct', next.toString()); } catch {}
        return next;
      });

      setMissionSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Compute active critical threats dynamically from samples + user uploads
  const baseCriticalCount = PRESET_SAMPLES.filter(s => s.riskLevel === 'CRITICAL').length;
  const uploadedCriticalCount = uploadedThreats.filter(t => t.riskLevel === 'CRITICAL').length;
  const criticalHazardsCount = baseCriticalCount + uploadedCriticalCount;

  // Total debris targets detected
  const baseTotalDebris = PRESET_SAMPLES.reduce((acc, s) => acc + (s.detections?.length || 1), 0);
  const uploadedTotalDebris = uploadedThreats.reduce((acc, t) => acc + (t.detections?.length || 1), 0);
  const totalDebrisCount = baseTotalDebris + uploadedTotalDebris;

  // Format mission duration
  const hours = Math.floor(missionSeconds / 3600);
  const minutes = Math.floor((missionSeconds % 3600) / 60);
  const formattedMissionTime = `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;

  const recordUploadAnalysis = (sample) => {
    if (!sample) return;
    setUploadedThreats(prev => {
      const filtered = prev.filter(p => p.id !== sample.id);
      return [sample, ...filtered];
    });
    // Add extra pings corresponding to lines in this scan
    setPingsProcessed(prev => prev + 640);
  };

  return (
    <TelemetryContext.Provider
      value={{
        pingsProcessed,
        batteryPct: Number(batteryPct.toFixed(1)),
        criticalHazardsCount,
        totalDebrisCount,
        formattedMissionTime,
        recordUploadAnalysis,
      }}
    >
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetry() {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error('useTelemetry must be used within a TelemetryProvider');
  }
  return context;
}
