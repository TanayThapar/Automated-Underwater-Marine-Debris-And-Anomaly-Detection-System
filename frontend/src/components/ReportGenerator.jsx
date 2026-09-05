import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Printer, ShieldCheck, Download } from 'lucide-react';
import { PRESET_SAMPLES } from '../data/sonarSamples';
import { useTelemetry } from '../context/TelemetryContext';

export default function ReportGenerator() {
  const { pingsProcessed, criticalHazardsCount, totalDebrisCount } = useTelemetry();
  const [reportDate] = useState('2026-08-26');
  const [missionName] = useState('DeepScan-Alpha-Coastal-Survey-2026');
  const [surveyorOrg] = useState('National Institute of Oceanography (NIO) / Indian Coast Guard');

  const handlePrint = () => { window.print(); };

  return (
    <div className="space-y-4 font-sans text-slate-100">
      
      {/* Top Banner */}
      <div className="bg-[#111827] border border-gray-800 rounded-md p-4 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-neutral-300" />
            <h2 className="text-sm font-extrabold text-white tracking-tight uppercase">
              MARITIME DEBRIS &amp; HYDROGRAPHIC INCIDENT REPORT
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Automated survey dossier generator for Ministry of Ports, Shipping &amp; Waterways &amp; Indian Coast Guard
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-white text-neutral-200 hover:text-black border border-neutral-600 rounded-md text-xs font-bold transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>PRINT / SAVE PDF DOSSIER</span>
        </button>
      </div>

      {/* Report Document Box */}
      <div className="bg-[#0b0f17] text-zinc-100 p-8 sm:p-12 rounded-md border border-gray-800 max-w-5xl mx-auto font-sans print:p-0 print:border-none print:shadow-none space-y-8">
        
        {/* Header */}
        <div className="border-b border-gray-800 pb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-neutral-800 text-neutral-200 border border-neutral-600 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold">
                SIH 2026 OFFICIAL DOSSIER
              </span>
              <span className="text-xs font-mono text-zinc-400">DOC-REF: NIO-AUV-2026-SSS-091</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
              Autonomous Underwater Marine Debris &amp; Seabed Anomaly Survey Report
            </h1>
            <p className="text-xs text-zinc-400 mt-1">Issued by {surveyorOrg}</p>
          </div>

          <div className="text-right text-xs font-mono text-zinc-400 space-y-1">
            <p>DATE: <strong className="text-white">{reportDate}</strong></p>
            <p>MISSION: <strong className="text-white">{missionName}</strong></p>
            <p>STATUS: <strong className="text-emerald-400">VERIFIED COMPLETE</strong></p>
          </div>
        </div>

        {/* Survey Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[#111827] rounded-md border border-gray-800 font-mono text-xs">
          <div>
            <span className="text-zinc-500 text-[10px] block font-sans uppercase">TOTAL AREA SURVEYED</span>
            <span className="text-base font-bold text-white">420 SQ KM</span>
          </div>
          <div>
            <span className="text-zinc-500 text-[10px] block font-sans uppercase">ACOUSTIC PINGS</span>
            <span className="text-base font-bold text-white">{pingsProcessed.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-zinc-500 text-[10px] block font-sans uppercase">HAZARDS IDENTIFIED</span>
            <span className="text-base font-bold text-amber-400">{totalDebrisCount} TARGETS</span>
          </div>
          <div>
            <span className="text-zinc-500 text-[10px] block font-sans uppercase">CRITICAL PRIORITY</span>
            <span className="text-base font-bold text-rose-400">{criticalHazardsCount} THREATS</span>
          </div>
        </div>

        {/* Anomaly Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            ANOMALY INVENTORY &amp; RECOVERY ACTION MATRIX
          </h3>

          <div className="overflow-x-auto border border-gray-800 rounded-md bg-[#111827]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0b0f17] text-zinc-400 border-b border-gray-800 font-sans">
                <tr>
                  <th className="p-3">Target Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Risk</th>
                  <th className="p-3">Depth</th>
                  <th className="p-3">3D Height</th>
                  <th className="p-3">Confidence</th>
                  <th className="p-3">Action Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {PRESET_SAMPLES.map(sample => (
                  <tr key={sample.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="p-3 font-bold text-white font-sans">{sample.name}</td>
                    <td className="p-3 text-zinc-400">{sample.category}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        sample.riskLevel === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {sample.riskLevel}
                      </span>
                    </td>
                    <td className="p-3 text-zinc-300">{sample.depth}m</td>
                    <td className="p-3 text-amber-400 font-bold">{sample.dimensions.estHeight}</td>
                    <td className="p-3 text-white font-bold">{(sample.anomalyConfidence * 100).toFixed(1)}%</td>
                    <td className="p-3 text-zinc-300 font-sans">{sample.cleanPriority}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Verification Footer */}
        <div className="pt-6 border-t border-gray-800 flex items-center justify-between text-xs text-zinc-400 font-mono">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Digital Signature Verified: DeepScan AUV Perception Engine v2.4</span>
          </div>
          <span>Page 1 of 1</span>
        </div>

      </div>

    </div>
  );
}
