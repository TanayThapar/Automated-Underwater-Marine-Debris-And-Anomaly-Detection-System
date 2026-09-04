// Presets of Side-Scan Sonar Datasets with realistic acoustic properties

export const SONAR_PALETTES = {
  copper: {
    name: 'Natural Sonar Copper / Amber',
    bg: '#140c02',
    accent: '#f59e0b',
    cssFilter: 'sepia(90%) hue-rotate(-20deg) saturate(220%) brightness(90%) contrast(120%)'
  },
  cyan: {
    name: 'Acoustic Deep Ocean Cyan',
    bg: '#041527',
    accent: '#00f0ff',
    cssFilter: 'sepia(80%) hue-rotate(160deg) saturate(200%) brightness(95%) contrast(125%)'
  },
  emerald: {
    name: 'Deep Oceanic Emerald',
    bg: '#021814',
    accent: '#10b981',
    cssFilter: 'sepia(80%) hue-rotate(110deg) saturate(180%) brightness(85%) contrast(115%)'
  },
  grayscale: {
    name: 'Raw Acoustic Monochrome',
    bg: '#0a0a0a',
    accent: '#e2e8f0',
    cssFilter: 'grayscale(100%) brightness(100%) contrast(130%)'
  }
};

export const PRESET_SAMPLES = [
  {
    id: 'ghost-net-01',
    name: 'Abandoned Ghost Fishing Net',
    category: 'Ghost Netting / Polypropylene',
    riskLevel: 'CRITICAL',
    riskScore: 94,
    depth: 42.5,
    altitude: 12.0, // AUV altitude above seafloor in meters
    coordinates: { lat: 15.2993, lng: 73.7844, location: 'Goa Coastal Waters (Shelf)' },
    description: 'Tangled synthetic gillnet snagged on rocky outcrop. High hazard for endangered marine life and propeller entanglement.',
    dimensions: { length: '18.4 m', width: '6.2 m', estHeight: '2.3 m' },
    slantRange: 24.8, // meters
    shadowLength: 5.6, // meters
    anomalyConfidence: 0.962,
    cleanPriority: 'P1 - Immediate Extraction',
    timestamp: '2026-08-25T14:22:10Z',
    detections: [
      {
        id: 'det-1',
        label: 'Ghost Net Cluster',
        confidence: 0.96,
        type: 'debris',
        box: { x: 38, y: 32, w: 32, h: 26 }, // percentage coordinates
        highlight: { x: 40, y: 34, w: 28, h: 10 },
        shadow: { x: 40, y: 44, w: 28, h: 14 },
        estHeight: '2.3 m',
        material: 'Nylon / Monofilament polymer',
        acousticReflectivity: 'Diffuse High Scatter'
      }
    ],
    anomalyZones: [
      { x: 50, y: 45, radius: 65, intensity: 0.92 }
    ],
    sonarParams: {
      frequency: '450 kHz',
      pingRate: '15 Hz',
      swathWidth: '100 m',
      soundSpeed: '1500 m/s'
    }
  },
  {
    id: 'container-02',
    name: 'Lost Standard 40ft Shipping Container',
    category: 'Industrial Cargo Debris',
    riskLevel: 'CRITICAL',
    riskScore: 91,
    depth: 28.3,
    altitude: 10.5,
    coordinates: { lat: 18.9218, lng: 72.8347, location: 'Mumbai Port Approach Fairway' },
    description: 'Corroded steel container half-buried in silt. Critical collision risk for commercial deep-draft tankers and submarines.',
    dimensions: { length: '12.2 m', width: '2.4 m', estHeight: '2.6 m' },
    slantRange: 18.2,
    shadowLength: 6.4,
    anomalyConfidence: 0.984,
    cleanPriority: 'P0 - Navigational Warning / Urgent Salvage',
    timestamp: '2026-08-25T11:05:40Z',
    detections: [
      {
        id: 'det-2',
        label: 'ISO 40ft Container',
        confidence: 0.98,
        type: 'container',
        box: { x: 32, y: 28, w: 36, h: 32 },
        highlight: { x: 34, y: 30, w: 32, h: 12 },
        shadow: { x: 34, y: 42, w: 32, h: 18 },
        estHeight: '2.6 m',
        material: 'Corrugated Corten Steel',
        acousticReflectivity: 'Specular Strong Echo'
      }
    ],
    anomalyZones: [
      { x: 48, y: 42, radius: 80, intensity: 0.98 }
    ],
    sonarParams: {
      frequency: '900 kHz',
      pingRate: '20 Hz',
      swathWidth: '50 m',
      soundSpeed: '1520 m/s'
    }
  },
  {
    id: 'metal-drums-03',
    name: 'Submerged Chemical Drum Cluster (5x Barrels)',
    category: 'Hazardous Waste & Toxic Munitions',
    riskLevel: 'HIGH',
    riskScore: 86,
    depth: 54.0,
    altitude: 15.0,
    coordinates: { lat: 13.0827, lng: 80.2707, location: 'Chennai Outer Anchorage' },
    description: '55-gallon steel barrels leaking unknown residues. High acoustic impedance with prominent acoustic ringback echoes.',
    dimensions: { length: '4.8 m', width: '3.1 m', estHeight: '1.1 m' },
    slantRange: 32.0,
    shadowLength: 2.8,
    anomalyConfidence: 0.891,
    cleanPriority: 'P1 - Hazmat Recovery',
    timestamp: '2026-08-24T18:40:12Z',
    detections: [
      {
        id: 'det-3',
        label: 'Chemical Drum Array',
        confidence: 0.89,
        type: 'drum',
        box: { x: 42, y: 35, w: 24, h: 22 },
        highlight: { x: 44, y: 36, w: 20, h: 8 },
        shadow: { x: 44, y: 44, w: 20, h: 12 },
        estHeight: '1.1 m',
        material: 'Galvanized Steel / Chemical Residue',
        acousticReflectivity: 'Multi-target Hard Reflection'
      }
    ],
    anomalyZones: [
      { x: 52, y: 44, radius: 50, intensity: 0.88 }
    ],
    sonarParams: {
      frequency: '450 kHz',
      pingRate: '12 Hz',
      swathWidth: '150 m',
      soundSpeed: '1490 m/s'
    }
  },
  {
    id: 'tire-reef-04',
    name: 'Artificial Dumped Industrial Tire Pile',
    category: 'Rubber & Polymer Pollution',
    riskLevel: 'MEDIUM',
    riskScore: 68,
    depth: 18.5,
    altitude: 8.0,
    coordinates: { lat: 9.9312, lng: 76.2673, location: 'Kochi Backwater Inlets' },
    description: 'Scattered vulcanized rubber tires releasing microplastics and heavy zinc into benthic nursery grounds.',
    dimensions: { length: '8.0 m', width: '5.5 m', estHeight: '1.4 m' },
    slantRange: 16.5,
    shadowLength: 3.5,
    anomalyConfidence: 0.825,
    cleanPriority: 'P2 - Coastal Clean-up Dredge',
    timestamp: '2026-08-24T09:12:00Z',
    detections: [
      {
        id: 'det-4',
        label: 'Tire Dump Cluster',
        confidence: 0.83,
        type: 'tire',
        box: { x: 36, y: 38, w: 28, h: 24 },
        highlight: { x: 38, y: 39, w: 24, h: 9 },
        shadow: { x: 38, y: 48, w: 24, h: 12 },
        estHeight: '1.4 m',
        material: 'Synthetic Rubber Polymer',
        acousticReflectivity: 'Absorptive Moderate Scatter'
      }
    ],
    anomalyZones: [
      { x: 48, y: 48, radius: 45, intensity: 0.79 }
    ],
    sonarParams: {
      frequency: '450 kHz',
      pingRate: '15 Hz',
      swathWidth: '80 m',
      soundSpeed: '1505 m/s'
    }
  },
  {
    id: 'pipeline-scour-05',
    name: 'Subsea Pipeline Scour & Concrete Coating Rupture',
    category: 'Underwater Infrastructure Anomaly',
    riskLevel: 'HIGH',
    riskScore: 88,
    depth: 72.0,
    altitude: 18.0,
    coordinates: { lat: 19.4167, lng: 71.3167, location: 'Bombay High Offshore Basin' },
    description: 'Suspended pipeline section with extensive sediment scour underneath and acoustic highlight indicating missing weight coat.',
    dimensions: { length: '35.0 m', width: '1.8 m', estHeight: '1.9 m' },
    slantRange: 38.4,
    shadowLength: 4.8,
    anomalyConfidence: 0.941,
    cleanPriority: 'P0 - Offshore Asset Safety',
    timestamp: '2026-08-23T16:50:30Z',
    detections: [
      {
        id: 'det-5',
        label: 'Exposed 24in Hydrocarbon Line',
        confidence: 0.94,
        type: 'infrastructure',
        box: { x: 20, y: 40, w: 60, h: 20 },
        highlight: { x: 22, y: 42, w: 56, h: 6 },
        shadow: { x: 22, y: 48, w: 56, h: 10 },
        estHeight: '1.9 m',
        material: 'Carbon Steel / Concrete Armor',
        acousticReflectivity: 'Linear Continuous Specular'
      }
    ],
    anomalyZones: [
      { x: 50, y: 46, radius: 90, intensity: 0.95 }
    ],
    sonarParams: {
      frequency: '450 kHz',
      pingRate: '10 Hz',
      swathWidth: '200 m',
      soundSpeed: '1510 m/s'
    }
  },
  {
    id: 'historical-uxo-06',
    name: 'Unexploded Ordnance (Historical Torpedo Casing)',
    category: 'Explosive Ordnance / Defense Hazard',
    riskLevel: 'CRITICAL',
    riskScore: 97,
    depth: 34.0,
    altitude: 11.2,
    coordinates: { lat: 11.9139, lng: 79.8145, location: 'Puducherry Coast (War Heritage Sector)' },
    description: 'Cylindrical metal casing consistent with Mk-VIII historical torpedo. Extreme explosive risk during bottom trawling or dredging.',
    dimensions: { length: '6.5 m', width: '0.6 m', estHeight: '0.7 m' },
    slantRange: 21.0,
    shadowLength: 1.8,
    anomalyConfidence: 0.978,
    cleanPriority: 'P0 - Immediate Naval EOD Neutralization',
    timestamp: '2026-08-23T08:15:00Z',
    detections: [
      {
        id: 'det-6',
        label: 'Torpedo Munition (UXO)',
        confidence: 0.98,
        type: 'uxo',
        box: { x: 40, y: 36, w: 26, h: 20 },
        highlight: { x: 42, y: 38, w: 22, h: 6 },
        shadow: { x: 42, y: 44, w: 22, h: 9 },
        estHeight: '0.7 m',
        material: 'Machined Brass & Armor Plate',
        acousticReflectivity: 'Intense Point Specular Highlight'
      }
    ],
    anomalyZones: [
      { x: 52, y: 42, radius: 55, intensity: 0.98 }
    ],
    sonarParams: {
      frequency: '900 kHz',
      pingRate: '25 Hz',
      swathWidth: '40 m',
      soundSpeed: '1515 m/s'
    }
  }
];

export const SURVEY_STATS = {
  totalSweepAreaSqKm: '142.8',
  totalPingsProcessed: '1,420,890',
  totalDebrisDetected: 48,
  criticalHazards: 7,
  auvBatteryPct: 88,
  missionDurationHours: '06h 42m',
  dataThroughputMbps: '48.5',
  modelAccuracyF1: '94.8%'
};
