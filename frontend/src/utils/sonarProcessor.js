/**
 * Side-Scan Sonar DSP & Acoustic Math Utilities
 */

/**
 * Calculates 3D object height above seafloor based on acoustic shadow geometry.
 * Optionally corrects for vehicle pitch/roll angular offsets.
 *
 * Standard formula: H = (L_shadow × H_alt) / (R_slant + L_shadow)
 * Angular correction: effective altitude = H_alt × cos(pitch) × cos(roll)
 *
 * @param {number} shadowLengthMeters
 * @param {number} altitudeMeters
 * @param {number} slantRangeMeters
 * @param {number} [pitchDeg=0] - Vehicle pitch angle in degrees
 * @param {number} [rollDeg=0]  - Vehicle roll angle in degrees
 * @returns {number} Estimated object height in meters
 */
export function calculateObjectHeight(shadowLengthMeters, altitudeMeters, slantRangeMeters, pitchDeg = 0, rollDeg = 0) {
  if (!shadowLengthMeters || !altitudeMeters || !slantRangeMeters) return 0;
  const pitchRad = pitchDeg * Math.PI / 180;
  const rollRad  = rollDeg  * Math.PI / 180;
  const effectiveAlt = altitudeMeters * Math.cos(pitchRad) * Math.cos(rollRad);
  const height = (shadowLengthMeters * effectiveAlt) / (slantRangeMeters + shadowLengthMeters);
  return Number(height.toFixed(2));
}

/**
 * Applies 6-DOF kinematic distortions to an HTML5 Canvas ImageData in-place.
 * Used by HardwareSimulatorView to demonstrate raw sensor artefacts.
 *
 * Distortions applied:
 *  • Pitch → horizontal shear (pixels of shift per row from centre)
 *  • Roll  → port/starboard intensity gain asymmetry
 *  • Heave → modulates nadir zone width sinusoidally (pass heavePhase in radians)
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {number} width
 * @param {number} height
 * @param {{ pitchDeg: number, rollDeg: number, heavePhase: number }} params
 */
export function applyKinematicDistortions(ctx, width, height, { pitchDeg = 0, rollDeg = 0, heavePhase = 0 } = {}) {
  const src = ctx.getImageData(0, 0, width, height);
  const srcData = src.data;
  const dst = new Uint8ClampedArray(srcData.length);

  const pitchShearFactor = Math.tan(pitchDeg * Math.PI / 180) * 5.5; // px shift per row from centre
  const rollGainL = 1.0 + Math.sin(rollDeg  * Math.PI / 180) * 0.48;
  const rollGainR = 1.0 - Math.sin(rollDeg  * Math.PI / 180) * 0.48;
  const centerRow = height / 2;
  const centerCol = width  / 2;

  for (let y = 0; y < height; y++) {
    const shiftX = Math.round(pitchShearFactor * (y - centerRow) / centerRow);

    for (let x = 0; x < width; x++) {
      const srcX = x - shiftX;
      const dstIdx = (y * width + x) * 4;

      if (srcX < 0 || srcX >= width) {
        // Fill shifted-out pixels with low-intensity speckle noise
        const noise = Math.random() * 18;
        dst[dstIdx]     = Math.min(255, noise * 1.15);
        dst[dstIdx + 1] = Math.min(255, noise * 0.72);
        dst[dstIdx + 2] = Math.min(255, noise * 0.22);
        dst[dstIdx + 3] = 255;
        continue;
      }

      const srcIdx = (y * width + srcX) * 4;
      const gain = srcX < centerCol ? rollGainL : rollGainR;

      dst[dstIdx]     = Math.min(255, srcData[srcIdx]     * gain);
      dst[dstIdx + 1] = Math.min(255, srcData[srcIdx + 1] * gain);
      dst[dstIdx + 2] = Math.min(255, srcData[srcIdx + 2] * gain);
      dst[dstIdx + 3] = 255;
    }
  }

  ctx.putImageData(new ImageData(dst, width, height), 0, 0);
}

/**
 * Slant-Range to Ground-Range Conversion
 * Ground Distance Y = sqrt(R^2 - H^2)
 */
export function calculateGroundRange(slantRangeMeters, altitudeMeters) {
  if (slantRangeMeters <= altitudeMeters) return 0;
  return Math.sqrt(Math.pow(slantRangeMeters, 2) - Math.pow(altitudeMeters, 2));
}

/**
 * --- Acoustic Texture Noise Model ---
 * Real side-scan backscatter is granular, multiplicative (Rayleigh/Rician-like)
 * speckle that is correlated along the vehicle's track (vertical, in a
 * waterfall image) but decorrelated across it (horizontal). Plain sine ripples
 * or uniform per-pixel random noise don't reproduce that — they look smooth
 * and "plasticky" instead of grainy. The helpers below build that texture
 * from layered value-noise (fBm) sampled anisotropically, plus a separate
 * high-frequency multiplicative speckle pass and per-ping (per-row) gain
 * jitter to mimic real intensity variation between pings.
 */

// Deterministic 2D hash -> pseudo-random value in [0, 1)
function hash2D(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return h - Math.floor(h);
}

// Smooth (bilinear + smoothstep) value noise in [0, 1)
function valueNoise2D(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const fade = (t) => t * t * (3 - 2 * t);
  const u = fade(xf), v = fade(yf);

  const n00 = hash2D(xi, yi);
  const n10 = hash2D(xi + 1, yi);
  const n01 = hash2D(xi, yi + 1);
  const n11 = hash2D(xi + 1, yi + 1);

  const nx0 = n00 + u * (n10 - n00);
  const nx1 = n01 + u * (n11 - n01);
  return nx0 + v * (nx1 - nx0);
}

// Fractal Brownian Motion: layered octaves of value noise for organic,
// natural-looking granularity (sediment/rock texture) instead of a single
// smooth sine wave.
function fbm2D(x, y, octaves = 5, lacunarity = 2.0, gain = 0.55) {
  let amplitude = 0.5;
  let frequency = 1.0;
  let sum = 0;
  let maxAmp = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise2D(x * frequency, y * frequency) * amplitude;
    maxAmp += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return sum / maxAmp; // normalized ~0..1
}

// Domain-warped fBm: sampling fbm2D directly with anisotropic frequencies
// produces regular, ruler-straight "corduroy" stripes — noticeably fake.
// Warping the sample coordinates through a second, lower-frequency noise
// field first breaks that regularity into irregular, blobby patches, which
// is what real seabed sediment/rock texture actually looks like.
function warpedFbm2D(x, y, warpFreq, warpAmp, mainFreqX, mainFreqY, octaves) {
  const warpX = fbm2D(x * warpFreq, y * warpFreq, 2) * warpAmp;
  const warpY = fbm2D(x * warpFreq + 500, y * warpFreq + 500, 2) * warpAmp;
  return fbm2D(x * mainFreqX + warpX, y * mainFreqY + warpY, octaves);
}

/**
 * Seabed texture presets. Different bottom types look genuinely different
 * in real side-scan — a sandy/grassy lakebed reads as a bright smooth
 * gradient with sparse dark dashes, while a rocky cliff face is much lower
 * and higher-contrast with big blobby mottled patches instead of streaks.
 * One texture model can't represent both convincingly, so each preset
 * tunes the same underlying noise pipeline differently rather than being a
 * separate code path.
 *
 *  brightBase        - base reflectivity level (higher = punchier/brighter)
 *  terrainBaseline/   - large-scale zone brightness = terrainBaseline + terrain*terrainAmp
 *  terrainAmp
 *  streakFreqX/Y      - frequency of the primary dark-feature layer;
 *                       X > Y elongates features vertically (dashes),
 *                       X ≈ Y gives rounder blobby patches (rock)
 *  streakWarpAmp      - domain-warp strength; higher = chunkier/rounder,
 *                       lower = more linear/streaky
 *  streakThreshold     - fraction of the noise range that becomes a dark
 *                       feature; higher = more coverage/denser features
 *  streakDarkenPow/Max - shape and depth of the darkening falloff
 *  fine*              - a second, smaller-scale copy of the same feature
 *                       layer for size variation
 *  fineGritAmp        - amplitude of the light per-pixel dusting noise
 *  shadowShiftPx      - how far (px) toward the sonar each dark feature's
 *                       paired highlight rim sits; bigger = larger implied
 *                       object height casting the shadow
 *  highlightBoostMax  - brightness added at that highlight rim
 */
const TERRAIN_PRESETS = {
  sandy: {
    brightBase: 195,
    terrainBaseline: 0.78, terrainAmp: 0.34,
    streakFreqX: 0.16, streakFreqY: 0.045, streakWarpAmp: 3,
    streakThreshold: 0.44, streakDarkenPow: 1.3, streakDarkenMax: 0.85,
    fineFreqX: 0.28, fineFreqY: 0.09, fineWarpAmp: 2,
    fineThreshold: 0.32, fineDarkenPow: 1.4, fineDarkenMax: 0.55,
    fineGritAmp: 14,
    shadowShiftPx: 4, highlightBoostMax: 55
  },
  rocky: {
    brightBase: 140,
    terrainBaseline: 0.55, terrainAmp: 0.6,
    streakFreqX: 0.095, streakFreqY: 0.085, streakWarpAmp: 6,
    streakThreshold: 0.52, streakDarkenPow: 1.05, streakDarkenMax: 0.72,
    fineFreqX: 0.24, fineFreqY: 0.2, fineWarpAmp: 2.5,
    fineThreshold: 0.4, fineDarkenPow: 1.15, fineDarkenMax: 0.4,
    fineGritAmp: 30,
    shadowShiftPx: 7, highlightBoostMax: 45
  },
  silty: {
    brightBase: 108,
    terrainBaseline: 0.85, terrainAmp: 0.18,
    streakFreqX: 0.1, streakFreqY: 0.06, streakWarpAmp: 4,
    streakThreshold: 0.28, streakDarkenPow: 1.5, streakDarkenMax: 0.4,
    fineFreqX: 0.2, fineFreqY: 0.12, fineWarpAmp: 3,
    fineThreshold: 0.2, fineDarkenPow: 1.6, fineDarkenMax: 0.22,
    fineGritAmp: 8,
    shadowShiftPx: 3, highlightBoostMax: 20
  }
};

/**
 * Validates (and if necessary, corrects) a detection's shadow box against
 * its highlight box and the nadir line — the same physical rule the
 * background texture now follows: a real acoustic shadow falls on the side
 * AWAY from the sonar (away from nadir), never toward it or on the wrong
 * side. This exists so a hand-authored sample in sonarSamples.js can't
 * silently render a physically-backwards highlight/shadow pair.
 *
 * - No shadow provided → auto-derives one, positioned correctly relative
 *   to the highlight and nadir.
 * - Shadow provided but on the wrong side / not far enough from nadir →
 *   nudges it into a consistent position and warns via console.
 * - Shadow already consistent → returned unchanged.
 *
 * Coordinates are all in the sample's 0–100 percent space (same as the
 * rest of sonarSamples.js), not pixels, so this doesn't need canvas size.
 *
 * @param {object} det - a single sample.detections[] entry
 * @param {number} [nadirCenterPct=50] - nadir line position, percent of width
 * @returns {object} det, with a validated/derived `shadow`
 */
export function resolveDetectionGeometry(det, nadirCenterPct = 50) {
  if (!det || !det.highlight) return det;

  const label = det.label || 'unnamed detection';
  const hCenterX = det.highlight.x + det.highlight.w / 2;
  // Which side of nadir the object sits on: shadows must fall further out
  // on this same side, never back toward nadir.
  const directionAwayFromNadir = hCenterX >= nadirCenterPct ? 1 : -1;

  if (!det.shadow) {
    const shadowW = det.highlight.w;
    const shadowH = (det.box && det.box.h)
      ? Math.max(det.box.h - det.highlight.h, det.highlight.h)
      : det.highlight.h * 1.4;
    // Sit the shadow just outside the highlight, offset further from nadir.
    const shadowX = directionAwayFromNadir === 1
      ? det.highlight.x + det.highlight.w * 0.15
      : det.highlight.x - det.highlight.w * 0.15;
    const shadowY = det.highlight.y + det.highlight.h;

    console.warn(`[sonarProcessor] "${label}" had no shadow box — auto-derived one from its highlight and the nadir direction.`);
    return { ...det, shadow: { x: shadowX, y: shadowY, w: shadowW, h: shadowH } };
  }

  const sCenterX = det.shadow.x + det.shadow.w / 2;
  const sameSide = Math.sign(sCenterX - nadirCenterPct) === directionAwayFromNadir;
  const hDist = Math.abs(hCenterX - nadirCenterPct);
  const sDist = Math.abs(sCenterX - nadirCenterPct);

  if (!sameSide || sDist < hDist) {
    console.warn(`[sonarProcessor] "${label}" has a shadow box positioned toward the nadir / on the wrong side relative to its highlight — real acoustic shadows fall AWAY from the sonar. Auto-correcting for render; fix the source sample data.`);
    const targetCenterX = hCenterX + directionAwayFromNadir * Math.max(det.shadow.w * 0.3, 2);
    return { ...det, shadow: { ...det.shadow, x: targetCenterX - det.shadow.w / 2 } };
  }

  return det;
}

/**
 * Generates synthetic acoustic side-scan sonar image texture onto an HTML5 Canvas
 */
export function drawSonarCanvas(canvas, sample, options = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  const {
    filterMode = 'raw', // 'raw', 'slant_corrected', 'nadir_removed', 'despeckled', 'clahe'
    palette = 'copper', // 'copper', 'cyan', 'emerald', 'grayscale'
    // 'sandy' (bright, sparse dash streaks) | 'rocky' (lower, high-contrast
    // blobby patches) | 'silty' (low-contrast, mostly smooth). Falls back to
    // sample.terrainType if the caller doesn't specify one, then to 'sandy'.
    terrainType,
    showBBoxes = true,
    showHighlights = true,
    showShadows = true,
    showAnomalyHeatmap = false
  } = options;

  const preset = TERRAIN_PRESETS[terrainType]
    || TERRAIN_PRESETS[sample && sample.terrainType]
    || TERRAIN_PRESETS.sandy;

  // Resolve every detection's shadow geometry once, up front, rather than
  // re-validating per-pixel in the hot loop below. Both the background
  // pass and the box/label overlay use this resolved list so what's drawn
  // always matches what's physically checked.
  const resolvedDetections = (sample && sample.detections)
    ? sample.detections.map(det => resolveDetectionGeometry(det, 50))
    : null;

  // Background base
  ctx.fillStyle = '#050a14';
  ctx.fillRect(0, 0, width, height);

  // Generate Seabed Backscatter with grazing angle intensity
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  const nadirWidth = filterMode === 'nadir_removed' ? 6 : (width * 0.12);
  const nadirCenterX = width / 2;

  // Random per-render seed offset so repeated draws don't look identical
  const seedX = Math.random() * 1000;
  const seedY = Math.random() * 1000;

  for (let y = 0; y < height; y++) {
    // Per-ping (per-row) gain jitter: real sonar brightness varies slightly
    // ping-to-ping due to vehicle motion/gain control, producing faint
    // horizontal banding. Low-frequency noise sampled on y alone gives a
    // slowly-drifting gain multiplier per row.
    const rowGain = 0.95 + valueNoise2D(seedY + y * 0.06, 0) * 0.14;

    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const distFromCenter = Math.abs(x - nadirCenterX);

      let intensity = 0;

      if (distFromCenter < nadirWidth / 2 && filterMode !== 'nadir_removed') {
        // Water column / Nadir zone: low reflection, faint acoustic noise
        const waterNoise = fbm2D(seedX + x * 0.15, seedY + y * 0.06, 3);
        intensity = 10 + waterNoise * 14;
      } else {
        // Seafloor acoustic reverberation
        // Lambert's Law cosine attenuation
        const normDist = (distFromCenter - nadirWidth / 2) / (width / 2);
        const grazingFactor = Math.max(0.2, 1.0 - normDist * 0.55);

        // Large-scale terrain patchiness: broad zones of slightly higher/
        // lower overall reflectivity across the seabed.
        const terrain = fbm2D(seedX * 0.4 + x * 0.012, seedY * 0.4 + y * 0.012, 3);

        // Primary dark-feature layer (dashes for sandy bottoms, blobby
        // mottled patches for rocky ones — controlled entirely by preset
        // frequencies/warp, same underlying noise pipeline either way).
        const streakField = warpedFbm2D(
          seedX + x, seedY + y,
          0.06, preset.streakWarpAmp, preset.streakFreqX, preset.streakFreqY, 4
        );
        const streakFieldFine = warpedFbm2D(
          seedX + 900 + x, seedY + 900 + y,
          0.08, preset.fineWarpAmp, preset.fineFreqX, preset.fineFreqY, 3
        );

        let streakDarken = 0;
        if (streakField < preset.streakThreshold) {
          const depth = (preset.streakThreshold - streakField) / preset.streakThreshold;
          streakDarken = Math.pow(depth, preset.streakDarkenPow) * preset.streakDarkenMax;
        }
        if (streakFieldFine < preset.fineThreshold) {
          const depth2 = (preset.fineThreshold - streakFieldFine) / preset.fineThreshold;
          streakDarken = Math.max(streakDarken, Math.pow(depth2, preset.fineDarkenPow) * preset.fineDarkenMax);
        }

        // Paired highlight rim: in real side-scan, an object's shadow falls
        // on the side AWAY from the sonar (away from nadir), while the side
        // FACING the sonar (toward nadir) catches a brief bright direct
        // return just before the shadow starts. Every dark streak/patch
        // above is otherwise just a flat dark blob with no such pairing —
        // that's what reads as "not real shadows." We sample the same
        // streak field a few pixels further from nadir than the current
        // pixel; if that sample lands inside a dark feature but the current
        // pixel doesn't, we're standing right on its near-nadir edge, so we
        // brighten this pixel to fake the direct-return rim.
        const directionTowardNadir = x < nadirCenterX ? 1 : -1;
        const awayX = x - directionTowardNadir * preset.shadowShiftPx;
        let highlightBoost = 0;
        if (streakField >= preset.streakThreshold) {
          const streakFieldAway = warpedFbm2D(
            seedX + awayX, seedY + y,
            0.06, preset.streakWarpAmp, preset.streakFreqX, preset.streakFreqY, 4
          );
          if (streakFieldAway < preset.streakThreshold) {
            const shadowDepth = (preset.streakThreshold - streakFieldAway) / preset.streakThreshold;
            highlightBoost = shadowDepth * preset.highlightBoostMax;
          }
        }

        // Very subtle fine grain — real backscatter isn't perfectly smooth,
        // but it's a light dusting, not sandpaper. 'despeckled' mode
        // (simulates a median/Lee-filter pass) softens both the grit and
        // the feature darkening, but never flattens texture completely —
        // real despeckled sonar still shows its dashes/patches, just smoother.
        const despeckleFactor = filterMode === 'despeckled' ? 0.45 : 1.0;
        const fineGrit = valueNoise2D(seedX + x * 0.9, seedY + y * 0.9) - 0.5;

        // Base brightness, shaped by grazing angle, per-row ping jitter,
        // and large-scale terrain zones — all driven by the active preset.
        const brightBase = preset.brightBase * grazingFactor * rowGain
          * (preset.terrainBaseline + terrain * preset.terrainAmp);

        intensity = brightBase * (1 - streakDarken * despeckleFactor)
          + highlightBoost * despeckleFactor
          + fineGrit * preset.fineGritAmp * despeckleFactor;
      }

      // Check if inside object highlight or shadow areas
      if (resolvedDetections) {
        resolvedDetections.forEach(det => {
          const bx = (det.box.x / 100) * width;
          const by = (det.box.y / 100) * height;
          const bw = (det.box.w / 100) * width;
          const bh = (det.box.h / 100) * height;

          const hx = (det.highlight.x / 100) * width;
          const hy = (det.highlight.y / 100) * height;
          const hw = (det.highlight.w / 100) * width;
          const hh = (det.highlight.h / 100) * height;

          const sx = (det.shadow.x / 100) * width;
          const sy = (det.shadow.y / 100) * height;
          const sw = (det.shadow.w / 100) * width;
          const sh = (det.shadow.h / 100) * height;

          // Acoustic Highlight (Strong direct specular echo)
          if (x >= hx - 4 && x <= hx + hw + 4 && y >= hy - 4 && y <= hy + hh + 4) {
            const edgeJitter = (valueNoise2D(seedX + x * 0.4, seedY + y * 0.4) - 0.5) * 0.35;
            const centerDist = Math.hypot((x - (hx + hw/2))/(hw/2), (y - (hy + hh/2))/(hh/2)) + edgeJitter;
            if (centerDist <= 1.0) {
              const grain = valueNoise2D(seedX + 300 + x * 0.6, seedY + 300 + y * 0.6) * 45;
              const boost = (1 - centerDist) * 205 + grain;
              intensity = Math.min(255, intensity + boost);
            }
          }

          // Acoustic Shadow (Null backscatter zone behind object)
          if (x >= sx - 4 && x <= sx + sw + 4 && y >= sy - 4 && y <= sy + sh + 4) {
            const edgeJitter = (valueNoise2D(seedX + 700 + x * 0.4, seedY + 700 + y * 0.4) - 0.5) * 0.4;
            const shadowCenter = Math.hypot((x - (sx + sw/2))/(sw/2), (y - (sy + sh/2))/(sh/2)) + edgeJitter;
            if (shadowCenter <= 1.05) {
              // Shadows are near-zero return, but real ones still carry a
              // trace of sensor-floor grain — a perfectly flat black cutout
              // is one of the clearest "this is fake" tells.
              const grain = valueNoise2D(seedX + 91 + x * 0.5, seedY + 17 + y * 0.5) * 7;
              intensity = Math.max(1, intensity * 0.08 + grain - 3);
            }
          }
        });
      }

      // Apply CLAHE / Dynamic Range Contrast boost
      if (filterMode === 'clahe') {
        intensity = Math.pow(intensity / 255, 0.75) * 255 * 1.15;
      }

      intensity = Math.min(255, Math.max(0, intensity));

      // Natural Side-Scan Sonar Color Mapping
      if (palette === 'copper') {
        // Industry-Standard Natural Acoustic Amber / Copper
        data[idx] = Math.min(255, intensity * 1.15); // R
        data[idx + 1] = Math.min(255, intensity * 0.72); // G
        data[idx + 2] = Math.min(255, intensity * 0.22); // B
      } else if (palette === 'cyan') {
        // Acoustic Deep Ocean Blue / Cyan
        data[idx] = Math.min(255, intensity * 0.15);
        data[idx + 1] = Math.min(255, intensity * 0.95);
        data[idx + 2] = Math.min(255, intensity * 1.2);
      } else if (palette === 'emerald') {
        // Deep Oceanic Emerald
        data[idx] = Math.min(255, intensity * 0.2);
        data[idx + 1] = Math.min(255, intensity * 1.1);
        data[idx + 2] = Math.min(255, intensity * 0.75);
      } else {
        // Raw Grayscale Monochrome
        data[idx] = intensity;
        data[idx + 1] = intensity;
        data[idx + 2] = intensity;
      }
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Overlay Nadir Centerline
  if (filterMode !== 'nadir_removed') {
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(nadirCenterX, 0);
    ctx.lineTo(nadirCenterX, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Channel labels
    ctx.fillStyle = 'rgba(0, 240, 255, 0.75)';
    ctx.font = '10px ui-monospace, SFMono-Regular, monospace';
    ctx.fillText('PORT SWATH ◀', 16, 18);
    ctx.fillText('NADIR', nadirCenterX - 16, 18);
    ctx.fillText('▶ STARBOARD SWATH', width - 130, 18);
  }

  // Draw Anomaly Heatmap (PatchCore unsupervised representation)
  if (showAnomalyHeatmap && sample && sample.anomalyZones) {
    sample.anomalyZones.forEach(zone => {
      const zx = (zone.x / 100) * width;
      const zy = (zone.y / 100) * height;
      const radius = zone.radius * (width / 500);

      const grad = ctx.createRadialGradient(zx, zy, 0, zx, zy, radius);
      grad.addColorStop(0, 'rgba(239, 68, 68, 0.75)');
      grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.45)');
      grad.addColorStop(0.8, 'rgba(16, 185, 129, 0.15)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(zx, zy, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Draw AI Supervised Bounding Boxes & Dual Highlight-Shadow Cues
  if (showBBoxes && resolvedDetections) {
    resolvedDetections.forEach(det => {
      const bx = (det.box.x / 100) * width;
      const by = (det.box.y / 100) * height;
      const bw = (det.box.w / 100) * width;
      const bh = (det.box.h / 100) * height;

      // 1. Overall Bounding Box (Cyan Glow)
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(bx, by, bw, bh);

      // Label badge
      ctx.fillStyle = 'rgba(0, 240, 255, 0.95)';
      ctx.fillRect(bx, by - 22, Math.max(160, bw), 22);
      ctx.fillStyle = '#030712';
      ctx.font = 'bold 11px ui-monospace, SFMono-Regular, monospace';
      ctx.fillText(`${det.label} [${(det.confidence * 100).toFixed(0)}%]`, bx + 6, by - 6);

      // 2. Highlight Box (Acoustic Bright Echo - Emerald)
      if (showHighlights && det.highlight) {
        const hx = (det.highlight.x / 100) * width;
        const hy = (det.highlight.y / 100) * height;
        const hw = (det.highlight.w / 100) * width;
        const hh = (det.highlight.h / 100) * height;

        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 2]);
        ctx.strokeRect(hx, hy, hw, hh);

        ctx.fillStyle = '#10B981';
        ctx.font = '9px ui-monospace, SFMono-Regular, monospace';
        ctx.fillText('● HIGHLIGHT CUE', hx + 4, hy + 12);
      }

      // 3. Shadow Box (Acoustic Blind Shadow - Amber)
      if (showShadows && det.shadow) {
        const sx = (det.shadow.x / 100) * width;
        const sy = (det.shadow.y / 100) * height;
        const sw = (det.shadow.w / 100) * width;
        const sh = (det.shadow.h / 100) * height;

        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 2]);
        ctx.strokeRect(sx, sy, sw, sh);

        ctx.fillStyle = '#F59E0B';
        ctx.font = '9px ui-monospace, SFMono-Regular, monospace';
        ctx.fillText(`▲ SHADOW (${det.estHeight})`, sx + 4, sy + 14);
      }
    });
  }

  // Draw Range Scale Overlay (Meters)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(20, height - 20);
  ctx.lineTo(120, height - 20);
  ctx.moveTo(20, height - 25);
  ctx.lineTo(20, height - 15);
  ctx.moveTo(120, height - 25);
  ctx.lineTo(120, height - 15);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '10px ui-monospace, SFMono-Regular, monospace';
  ctx.fillText('10 METERS', 40, height - 26);
}