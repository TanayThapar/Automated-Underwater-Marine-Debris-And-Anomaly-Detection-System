import React from 'react';
import {
  Radar, Layers, MapPin, Sparkles, Cpu, FileText,
  Compass, Radio, Battery, Zap, Keyboard, AlertTriangle
} from 'lucide-react';
import { SURVEY_STATS } from '../data/sonarSamples';
import { useTelemetry } from '../context/TelemetryContext';

const NAV_ITEMS = [
  { id: 'waterfall',  label: 'Live Sonar',  icon: Radar,      key: '1' },
  { id: 'analysis',   label: 'Studio',      icon: Layers,     key: '2' },
  { id: 'map',        label: 'Geospatial',  icon: MapPin,     key: '3' },
  { id: 'synthetic',  label: 'GAN Synth',   icon: Sparkles,   key: '4' },
  { id: 'edge',       label: 'Edge NPU',    icon: Cpu,        key: '5' },
  { id: 'report',     label: 'Report',      icon: FileText,   key: '6' },
  { id: 'pitch',      label: 'SIH Pitch',   icon: Compass,    key: '7' },
  { id: 'hardware',   label: 'HW Simulator',icon: Cpu,        key: '8' },
];

export default function Navbar({ activeTab, setActiveTab, onOpenJudgeTour, onOpenShortcuts }) {
  const { pingsProcessed, batteryPct, criticalHazardsCount } = useTelemetry();

  return (
    <header className="sticky top-0 z-50 bg-[#111827] border-b border-gray-800 font-sans">
      <div className="max-w-[1500px] mx-auto px-4 py-0 flex items-center justify-between gap-4 h-14">

        {/* Brand */}
        <div
          onClick={() => setActiveTab('waterfall')}
          className="flex items-center gap-3 cursor-pointer shrink-0"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded bg-white text-black">
            <Radar className="w-4 h-4" />
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-sm text-white tracking-tight leading-none block">
              DeepScan AUV
            </span>
            <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider leading-none block mt-0.5">
              Side-Scan Sonar Workstation
            </span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-gray-800 text-gray-400 border border-gray-700 shrink-0">
            SIH 2026
          </span>
        </div>

        {/* Navigation Tabs — bottom-border indicator style */}
        <nav className="flex items-stretch h-full overflow-x-auto flex-1 min-w-0">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center gap-1.5 px-3 py-1 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors border-b-2 ${
                  isActive
                    ? 'text-white border-white'
                    : 'text-gray-500 border-transparent hover:text-gray-300 hover:border-gray-600'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : ''}`} />
                <span>{item.label}</span>
                <span className={`text-[9px] font-mono px-1 rounded ${
                  isActive ? 'text-neutral-300' : 'text-gray-600'
                }`}>{item.key}</span>
              </button>
            );
          })}
        </nav>

        {/* Right side — Telemetry + Actions */}
        <div className="hidden lg:flex items-center gap-2 shrink-0 py-2">

          {/* Live Telemetry Strip */}
          <div className="flex items-center gap-3 text-xs bg-[#0b0f17] px-3 py-1.5 rounded border border-gray-800 font-mono">
            <div className="flex items-center gap-1.5" title="Acoustic Sonar Pings (Live Transducer Count)">
              <Radio className="w-3 h-3 text-neutral-300 animate-pulse" />
              <span className="text-gray-500">Pings</span>
              <span className="text-white font-bold tabular-nums">{pingsProcessed.toLocaleString()}</span>
            </div>
            <div className="w-px h-3 bg-gray-700" />
            <div className="flex items-center gap-1.5" title="AUV Subsea Battery Bank Status (Active Discharge Model)">
              <Battery className={`w-3 h-3 ${batteryPct > 30 ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span className={`font-bold tabular-nums ${batteryPct > 30 ? 'text-emerald-400' : 'text-amber-400'}`}>{batteryPct.toFixed(1)}%</span>
            </div>
            <div className="w-px h-3 bg-gray-700" />
            <div className="flex items-center gap-1.5 text-rose-400 font-bold" title="Critical Navigational & Environmental Hazards">
              <AlertTriangle className="w-3 h-3" />
              <span>{criticalHazardsCount} {criticalHazardsCount === 1 ? 'Threat' : 'Threats'}</span>
            </div>
          </div>

          {/* Judge Tour */}
          <button
            onClick={onOpenJudgeTour}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-neutral-200 text-black rounded text-xs font-bold transition-colors cursor-pointer"
            title="Launch 60-Second Guided Evaluation Walkthrough (Hotkey: J)"
          >
            <Zap className="w-3.5 h-3.5 fill-black" />
            <span>60s TOUR</span>
          </button>

          {/* Shortcuts */}
          <button
            onClick={onOpenShortcuts}
            className="p-1.5 rounded bg-[#0b0f17] hover:bg-gray-800 border border-gray-800 text-gray-500 hover:text-white transition-colors cursor-pointer"
            title="Keyboard Shortcuts (?)"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile Tour */}
        <button
          onClick={onOpenJudgeTour}
          className="flex lg:hidden items-center gap-1 px-2 py-1.5 my-auto rounded bg-white text-black font-bold text-xs shrink-0"
        >
          <Zap className="w-3.5 h-3.5 fill-black" />
          <span>TOUR</span>
        </button>

      </div>
    </header>
  );
}

