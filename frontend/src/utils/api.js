/**
 * api.js
 * -------
 * Centralized API client for the AeroAqua DeepScan backend (FastAPI).
 * Base URL is configured via the VITE_API_URL env variable so it works
 * in both local dev (http://localhost:8000) and any deployed environment.
 */

// In dev, Vite proxies /api → http://localhost:8000
// In production, set VITE_API_URL to your deployed FastAPI URL
const BASE_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : '/api';

/**
 * Check if the backend is reachable and the model is loaded.
 * @returns {Promise<{status: string, model_loaded: boolean, mode: string}>}
 */
export async function checkHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error('Backend health check failed');
  return res.json();
}

/**
 * Analyze a sonar image file through the full pipeline.
 *
 * @param {File}   file          - Image file (PNG/JPG) from the user's upload
 * @param {Object} telemetry     - Optional vehicle telemetry
 * @param {number} telemetry.lat - Vehicle latitude  (default 14.5)
 * @param {number} telemetry.lon - Vehicle longitude (default 75.5)
 * @param {number} telemetry.heading     - Heading in degrees (default 0)
 * @param {number} telemetry.swathWidth  - Swath width in metres (default 100)
 *
 * @returns {Promise<{
 *   filename: string,
 *   image_w: number,
 *   image_h: number,
 *   total_detected: number,
 *   detections: Array<{
 *     id: string,
 *     class: string,
 *     confidence: number,
 *     bbox: number[],
 *     latitude: number,
 *     longitude: number,
 *   }>,
 *   annotated_image_b64: string,
 * }>}
 */
export async function analyzeSonarImage(file, telemetry = {}) {
  const {
    lat        = 14.5,
    lon        = 75.5,
    heading    = 0.0,
    swathWidth = 100.0,
  } = telemetry;

  const form = new FormData();
  form.append('file', file);
  form.append('vehicle_lat',  lat);
  form.append('vehicle_lon',  lon);
  form.append('heading',      heading);
  form.append('swath_width',  swathWidth);

  const res = await fetch(`${BASE_URL}/analyze`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Analysis request failed');
  }

  return res.json();
}

/**
 * Trigger a CSV download of the last analysis run.
 * Opens the URL directly so the browser handles the file download.
 */
export function downloadLastReportCSV() {
  window.open(`${BASE_URL}/report/csv`, '_blank');
}
