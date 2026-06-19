// api/npmai.js - Backend para usar npmai

export default async function handler(req, res) {
    // Solo permitir el método POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        // 1. Extraer la acción y los datos del cuerpo de la petición
        //    El frontend enviará algo como: { action: 'check', questions: [...], answers: [...] }
        const { action, questions, answers } = req.body;

        // 2. Definir la URL de la API de npmai
        const NPM_API_URL = 'https://npmai-api.onrender.com';

        // 3. Manejar la acción de CORREGIR RESPUESTAS
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

            // Hacer la llamada a npmai
            const response = await fetch(NPM_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: prompt,
                    model: "llama3.2",  // Puedes cambiar el modelo. "llama3.2" es muy rápido.
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`npmai API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();

            // ¡IMPORTANTE! La respuesta de npmai viene en data.response [citation:3][citation:4].
            // Debemos procesar ese texto para extraer el JSON con los resultados.
            let resultsData;
            try {
                // Intentamos parsear directamente, por si la IA obedece al pie de la letra.
                resultsData = JSON.parse(data.response);
            } catch (parseError) {
                // Si falla, intentamos extraer el JSON del texto (a veces la IA añade contexto).
                const jsonMatch = data.response.match(/\{[\s\S]*\}/);
                if (!jsonMatch) throw new Error('No se encontró JSON en la respuesta de npmai');
                resultsData = JSON.parse(jsonMatch[0]);
            }

            if (!resultsData.results || !Array.isArray(resultsData.results) || resultsData.results.length !== 5) {
                throw new Error('El formato de la respuesta de npmai no es válido');
            }

            // Devolver los resultados al frontend
            return res.status(200).json(resultsData);

        } else {
            // Si se pide una acción que no sea 'check'
            return res.status(400).json({ error: 'Acción no válida' });
        }

    } catch (error) {
        console.error('Error en el servidor:', error);
        return res.status(500).json({
            error: error.message || 'Error interno del servidor'
        });
    }
}
