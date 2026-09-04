#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "  AeroAqua DeepScan AI: Full-Stack Perception System     "
echo "=========================================================="

MODE="${1:-fullstack}"

cleanup() {
  echo ""
  echo "Shutting down servers..."
  kill $(jobs -p) 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

if [ "$MODE" = "backend" ]; then
  echo "Starting FastAPI Backend on http://localhost:8000..."
  cd backend && python3 fastapi_server.py
elif [ "$MODE" = "frontend" ]; then
  echo "Starting Vite Frontend on http://localhost:5173..."
  cd frontend && npm run dev
elif [ "$MODE" = "streamlit" ]; then
  echo "Starting Streamlit App on http://localhost:8501..."
  cd backend && streamlit run app.py
else
  echo "Starting Backend and Frontend in full-stack mode..."
  (cd backend && python3 fastapi_server.py) &
  (cd frontend && npm run dev) &
  wait
fi
