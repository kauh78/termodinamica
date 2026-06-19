// api/npmai.js - Backend para usar npmai (corrección de respuestas)

export default async function handler(req, res) {
    // Solo permitir el método POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { action, questions, answers } = req.body;
        const NPM_API_URL = 'https://npmai-api.onrender.com';

        // ACCIÓN: Corregir respuestas
        if (action === 'check') {
            if (!questions || !answers || !Array.isArray(questions) || !Array.isArray(answers)) {
                return res.status(400).json({ error: 'Datos incompletos' });
            }

            // Construir el prompt para npmai
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

            // Llamar a npmai
            const response = await fetch(NPM_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: prompt,
                    model: "llama3.2",
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`npmai API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();

            // Procesar la respuesta de npmai
            let resultsData;
            try {
                resultsData = JSON.parse(data.response);
            } catch (parseError) {
                const jsonMatch = data.response.match(/\{[\s\S]*\}/);
                if (!jsonMatch) throw new Error('No se encontró JSON en la respuesta de npmai');
                resultsData = JSON.parse(jsonMatch[0]);
            }

            if (!resultsData.results || !Array.isArray(resultsData.results) || resultsData.results.length !== 5) {
                throw new Error('El formato de la respuesta de npmai no es válido');
            }

            return res.status(200).json(resultsData);

        } else {
            return res.status(400).json({ error: 'Acción no válida' });
        }

    } catch (error) {
        console.error('Error en el servidor:', error);
        return res.status(500).json({
            error: error.message || 'Error interno del servidor'
        });
    }
}
