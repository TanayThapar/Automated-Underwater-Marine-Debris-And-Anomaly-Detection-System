export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const hasKey = Boolean(process.env.OPENROUTER_API_KEY);

  return res.status(200).json({
    status: 'ok',
    model_loaded: true,
    engine: 'OpenRouter AI Sonar Perception Engine',
    mode: hasKey ? 'openrouter_cloud_inference' : 'hybrid_dsp_fallback'
  });
}
