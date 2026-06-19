// api/gemini.js - Este archivo se ejecuta en el servidor de Vercel
// La API key está segura aquí, no en el frontend

export default async function handler(req, res) {
    // Solo permitir POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { action, questions, answers } = req.body;
        
        // Obtener la API key de las variables de entorno de Vercel
        const API_KEY = process.env.GEMINI_API_KEY;
        
        if (!API_KEY) {
            return res.status(500).json({ 
                error: 'GEMINI_API_KEY no está configurada en Vercel' 
            });
        }

        const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

        if (action === 'generate') {
            // ============================================
            // ACCIÓN 1: Generar preguntas de matemáticas
            // ============================================
            const prompt = `Genera 5 preguntas de matemáticas básica para estudiantes de primaria. 
            Las preguntas deben ser variadas (suma, resta, multiplicación, división, problemas simples).
            Devuelve SOLO un objeto JSON con este formato exacto:
            {
                "questions": [
                    {"id": 1, "question": "¿Cuánto es 5 + 3?", "answer": "8"},
                    {"id": 2, "question": "¿Cuánto es 12 - 7?", "answer": "5"},
                    {"id": 3, "question": "¿Cuánto es 4 x 6?", "answer": "24"},
                    {"id": 4, "question": "¿Cuánto es 15 ÷ 3?", "answer": "5"},
                    {"id": 5, "question": "Si tengo 10 manzanas y como 3, ¿cuántas me quedan?", "answer": "7"}
                ]
            }
            Las respuestas deben ser números exactos. No incluyas texto adicional.`;

            const response = await fetch(`${GEMINI_URL}?key=${API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Error en Gemini API');
            }

            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            
            // Extraer JSON del texto
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No se encontró JSON en la respuesta');
            
            const parsed = JSON.parse(jsonMatch[0]);
            
            return res.status(200).json(parsed);

        } else if (action === 'check') {
            // ============================================
            // ACCIÓN 2: Revisar respuestas del estudiante
            // ============================================
            if (!questions || !answers || !Array.isArray(questions) || !Array.isArray(answers)) {
                return res.status(400).json({ error: 'Datos incompletos' });
            }

            const questionsText = questions.map((q, i) => 
                `Pregunta ${i+1}: "${q.question}" - Respuesta del estudiante: "${answers[i]}" (Respuesta correcta: ${q.answer})`
            ).join('\n');

            const prompt = `Eres un profesor de matemáticas. Revisa las siguientes respuestas de un estudiante.
            Para cada pregunta, indica si es correcta o incorrecta y da una retroalimentación breve y educativa.
            Devuelve SOLO un objeto JSON con este formato exacto:
            {
                "results": [
                    {"correct": true, "feedback": "¡Excelente! 5 + 3 es exactamente 8."},
                    {"correct": false, "feedback": "Casi. 12 - 7 = 5, no 4. Recuerda restar el número menor del mayor."}
                ]
            }
            
            Preguntas y respuestas:
            ${questionsText}`;

            const response = await fetch(`${GEMINI_URL}?key=${API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Error en Gemini API');
            }

            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No se encontró JSON en la respuesta');
            
            const parsed = JSON.parse(jsonMatch[0]);
            
            return res.status(200).json(parsed);

        } else {
            return res.status(400).json({ error: 'Acción no válida. Usa "generate" o "check"' });
        }

    } catch (error) {
        console.error('Error en el servidor:', error);
        return res.status(500).json({ 
            error: error.message || 'Error interno del servidor' 
        });
    }
}
