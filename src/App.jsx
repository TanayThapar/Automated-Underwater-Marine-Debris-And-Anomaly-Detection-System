import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import LiveWaterfallView from './components/LiveWaterfallView';
import AnalysisStudio from './components/AnalysisStudio';
import GeospatialMapView from './components/GeospatialMapView';
import SyntheticStudio from './components/SyntheticStudio';
import EdgeMetricsView from './components/EdgeMetricsView';
import ReportGenerator from './components/ReportGenerator';
import SihPitchGuide from './components/SihPitchGuide';
import InitialLoadingScreen from './components/InitialLoadingScreen';
import JudgeTourModal from './components/JudgeTourModal';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import HardwareSimulatorView from './components/HardwareSimulatorView';
import { PRESET_SAMPLES } from './data/sonarSamples';
import { Radar, Keyboard } from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext';

function DashboardContent() {
  const [activeTab, setActiveTab] = useState('waterfall');
  const [selectedSample, setSelectedSample] = useState(PRESET_SAMPLES[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isJudgeTourOpen, setIsJudgeTourOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [shortcutToast, setShortcutToast] = useState(null);

  const handleSelectSampleForStudio = useCallback((sample) => {
    setSelectedSample(sample);
    setActiveTab('analysis');
  }, []);

  const showToast = (msg) => {
    setShortcutToast(msg);
    setTimeout(() => setShortcutToast(null), 2500);
  };

  const handleKeyDown = useCallback((e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

    if (e.key === '1') {
      setActiveTab('waterfall');
      showToast('Hotkey [1]: Live Waterfall');
    } else if (e.key === '2') {
      setActiveTab('analysis');
      showToast('Hotkey [2]: Acoustic Studio');
    } else if (e.key === '3') {
      setActiveTab('map');
      showToast('Hotkey [3]: Geospatial Map');
    } else if (e.key === '4') {
      setActiveTab('synthetic');
      showToast('Hotkey [4]: GAN Synthesizer');
    } else if (e.key === '5') {
      setActiveTab('edge');
      showToast('Hotkey [5]: Edge Telemetry');
    } else if (e.key === '6') {
      setActiveTab('report');
      showToast('Hotkey [6]: Mission Report');
    } else if (e.key === '7') {
      setActiveTab('pitch');
      showToast('Hotkey [7]: SIH Pitch');
    } else if (e.key === '8') {
      setActiveTab('hardware');
      showToast('Hotkey [8]: Hardware Simulator');
    } else if (e.key === 'j' || e.key === 'J') {
      setIsJudgeTourOpen((prev) => !prev);
    } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      setIsShortcutsOpen((prev) => !prev);
    } else if (e.key === 'Escape') {
      setIsJudgeTourOpen(false);
      setIsShortcutsOpen(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const pageVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.15 } },
    exit: { opacity: 0, transition: { duration: 0.1 } }
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans relative">
      
      {/* Initial Loading Screen */}
      <AnimatePresence>
        {isLoading && (
          <InitialLoadingScreen onComplete={() => setIsLoading(false)} />
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {isJudgeTourOpen && (
          <JudgeTourModal
            isOpen={isJudgeTourOpen}
            onClose={() => setIsJudgeTourOpen(false)}
            onNavigateTab={setActiveTab}
            activeTab={activeTab}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isShortcutsOpen && (
          <KeyboardShortcutsModal
            isOpen={isShortcutsOpen}
            onClose={() => setIsShortcutsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Hotkey Toast Notification */}
      <AnimatePresence>
        {shortcutToast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 right-6 z-50 bg-[#1f2937] border border-gray-700 text-white px-3 py-1.5 rounded-md text-xs font-mono flex items-center gap-2 shadow-lg"
          >
            <Keyboard className="w-3.5 h-3.5 text-neutral-300" />
            <span>{shortcutToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navbar */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenJudgeTour={() => setIsJudgeTourOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* Main Viewport */}
      <main className="flex-1 max-w-[1500px] w-full mx-auto p-4 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full"
          >
            {activeTab === 'waterfall' && (
              <LiveWaterfallView onSelectSampleForStudio={handleSelectSampleForStudio} />
            )}

            {activeTab === 'analysis' && (
              <AnalysisStudio
                selectedSample={selectedSample}
                setSelectedSample={setSelectedSample}
              />
            )}

            {activeTab === 'map' && (
              <GeospatialMapView onSelectSampleForStudio={handleSelectSampleForStudio} />
            )}

            {activeTab === 'synthetic' && (
              <SyntheticStudio />
            )}

            {activeTab === 'edge' && (
              <EdgeMetricsView />
            )}

            {activeTab === 'report' && (
              <ReportGenerator />
            )}

            {activeTab === 'pitch' && (
              <SihPitchGuide />
            )}

            {activeTab === 'hardware' && (
              <HardwareSimulatorView />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-[#111827] border-t border-gray-800 py-2 px-4 text-xs text-gray-500 font-sans print:hidden">
        <div className="max-w-[1500px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Radar className="w-3.5 h-3.5 text-gray-500" />
            <span className="font-bold text-gray-300 tracking-tight">DeepScan AUV</span>
            <span className="text-gray-700">·</span>
            <span className="text-gray-500 font-mono text-[10px] uppercase tracking-widest">SIH 2026 · Side-Scan Sonar Perception Workstation</span>
          </div>
          <div className="hidden sm:flex items-center gap-3 font-mono text-[10px] text-gray-600 uppercase tracking-wider">
            <span>450/900 kHz</span>
            <span className="text-gray-800">·</span>
            <span>TensorRT INT8</span>
            <span className="text-gray-800">·</span>
            <span>YOLO-11</span>
            <span className="text-gray-800">·</span>
            <span>ROS 2 Humble</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <DashboardContent />
    </ThemeProvider>
  );
}
