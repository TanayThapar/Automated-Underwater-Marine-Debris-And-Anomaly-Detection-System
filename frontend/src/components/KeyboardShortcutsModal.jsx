import React from 'react';
import { motion } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';

export const SHORTCUTS = [
  { key: '1', description: 'Jump to Live Sonar Waterfall' },
  { key: '2', description: 'Jump to Acoustic Signal Studio' },
  { key: '3', description: 'Jump to Geospatial Bathymetry Map' },
  { key: '4', description: 'Jump to GAN Synthetic Simulator' },
  { key: '5', description: 'Jump to Edge Telemetry & Hardware' },
  { key: '6', description: 'Jump to Official Maritime Report' },
  { key: '7', description: 'Jump to SIH Project Pitch Deck' },
  { key: '8', description: 'Jump to 3D Hardware Simulator' },
  { key: 'J', description: 'Launch 60-Second Jury Tour Walkthrough' },
  { key: '?', description: 'Toggle Keyboard Shortcut Help' },
  { key: 'Esc', description: 'Close active modal / overlay' }
];

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 font-sans">
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-lg bg-[#111827] border border-gray-800 rounded-md shadow-lg overflow-hidden text-slate-100 p-5 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-md bg-neutral-800 border border-neutral-600 text-neutral-200">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                KEYBOARD SHORTCUTS
              </h3>
              <p className="text-xs text-zinc-400">
                Hydrographic navigation &amp; jury evaluation hotkeys
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {SHORTCUTS.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between p-2 rounded-md bg-[#0b0f17] border border-gray-800"
            >
              <span className="text-zinc-300">{item.description}</span>
              <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-200 font-mono font-bold text-xs border border-neutral-600">
                {item.key}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
