export default async function handler(req, res) {
  // 1. Configuramos los encabezados para permitir peticiones desde tu web
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { prompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // 2. Llamada a la API de Google Gemini
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();

    // 3. Extraemos el texto de la respuesta de la IA
    const aiText = data.candidates[0].content.parts[0].text;

    // 4. Enviamos la respuesta limpia a tu HTML
    res.status(200).json({ content: aiText });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al conectar con la IA' });
  }
}