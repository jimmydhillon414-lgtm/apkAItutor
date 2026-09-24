export default async function handler(req, res) {
  // Allow CORS for local testing if needed
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, targetLanguage, level } = req.body;

    const EXTERNAL_API_URL = "https://aiix-dev-pa7udv7pc7uwarzilieus-669284669157.asia-southeast1.run.app/api/speak-to-speak";
    const API_KEY = "sts_live_human_speech_v1_free";

    // Server-to-server call (No CORS issue here!)
    const externalResponse = await fetch(EXTERNAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt || "Hello",
        targetLanguage: targetLanguage || "English",
        level: level || "Beginner"
      })
    });

    const data = await externalResponse.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Proxy Server Error:', error);
    return res.status(500).json({
      hasCorrection: false,
      reply: "I am right here with you. What would you like to discuss next?"
    });
  }
}
