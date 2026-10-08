const { GoogleGenAI } = require('@google/genai');

/**
 * Fallback Clinical Rule-based NLP Extractor
 * Operates 100% offline with zero dependencies or API keys.
 */
function extractOfflineClinicalHighlights(rawText, metadata = {}) {
    const text = (rawText || '').trim();
    const textLower = text.toLowerCase();

    const keyFindings = [];
    const abnormalFlags = [];
    let diagnosticImpression = '';
    let recommendedAction = '';

    // Split text into sentences/lines
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // 1. Look for numeric lab measurements or key diagnostic observations
    const labPatterns = [
        { name: 'Fasting Blood Glucose', regex: /(?:glucose|fbs|fasting\s*sugar)[^\d]*(\d+(?:\.\d+)?)\s*(mg\/dl)?/i, normalMax: 100, normalMin: 70, unit: 'mg/dL' },
        { name: 'Post-Prandial Glucose', regex: /(?:ppbs|post\s*prandial)[^\d]*(\d+(?:\.\d+)?)\s*(mg\/dl)?/i, normalMax: 140, normalMin: 80, unit: 'mg/dL' },
        { name: 'HbA1c Glycated Hemoglobin', regex: /(?:hba1c|glycated\s*hemoglobin)[^\d]*(\d+(?:\.\d+)?)\s*(%)?/i, normalMax: 5.7, normalMin: 4.0, unit: '%' },
        { name: 'Total Hemoglobin', regex: /(?:hemoglobin|hb)[^\d]*(\d+(?:\.\d+)?)\s*(g\/dl)?/i, normalMax: 17.5, normalMin: 12.0, unit: 'g/dL' },
        { name: 'Total Leukocyte Count (WBC)', regex: /(?:wbc|leukocyte)[^\d]*(\d+(?:,\d+)?|\d+)/i, normalMax: 11000, normalMin: 4000, unit: '/mcL' },
        { name: 'Platelet Count', regex: /(?:platelet)[^\d]*(\d+(?:,\d+)?|\d+)/i, normalMax: 450000, normalMin: 150000, unit: '/mcL' },
        { name: 'Serum Creatinine', regex: /(?:creatinine)[^\d]*(\d+(?:\.\d+)?)\s*(mg\/dl)?/i, normalMax: 1.2, normalMin: 0.6, unit: 'mg/dL' },
        { name: 'Blood Urea Nitrogen', regex: /(?:bun|urea)[^\d]*(\d+(?:\.\d+)?)\s*(mg\/dl)?/i, normalMax: 20, normalMin: 7, unit: 'mg/dL' }
    ];

    for (const p of labPatterns) {
        const match = text.match(p.regex);
        if (match) {
            const valNum = parseFloat(match[1].replace(/,/g, ''));
            const findingStr = `${p.name}: ${match[1]} ${p.unit}`;
            keyFindings.push(findingStr);

            if (valNum > p.normalMax) {
                abnormalFlags.push(`Elevated ${p.name} (${match[1]} ${p.unit}) - Above normal threshold (${p.normalMax} ${p.unit})`);
            } else if (valNum < p.normalMin) {
                abnormalFlags.push(`Low ${p.name} (${match[1]} ${p.unit}) - Below normal threshold (${p.normalMin} ${p.unit})`);
            }
        }
    }

    // 2. Scan radiology / pathological descriptors
    if (textLower.includes('fracture')) {
        abnormalFlags.push('Radiological evidence of cortical bone discontinuity / fracture identified');
        keyFindings.push('Fracture identified on radiographic projection');
    }
    if (textLower.includes('cardiomegaly')) {
        abnormalFlags.push('Enlarged cardiac silhouette (Cardiomegaly) noted');
        keyFindings.push('Cardiomegaly observed');
    }
    if (textLower.includes('infiltrate') || textLower.includes('consolidation') || textLower.includes('pneumonia')) {
        abnormalFlags.push('Pulmonary opacity / consolidation suspicious for acute respiratory infection');
        keyFindings.push('Pulmonary parenchymal changes detected');
    }

    // 3. Extract doctor's note or title as impression if available
    if (metadata.title) {
        keyFindings.unshift(`Investigation: ${metadata.title}`);
    }

    if (lines.length > 0 && keyFindings.length < 2) {
        for (const line of lines.slice(0, 4)) {
            if (line.length > 10 && !line.includes('Page') && !line.includes('---')) {
                keyFindings.push(line.slice(0, 120));
            }
        }
    }

    // 4. Synthesize diagnostic impression
    if (abnormalFlags.length > 0) {
        diagnosticImpression = `Clinical findings show ${abnormalFlags.length} significant out-of-range parameter(s). ${abnormalFlags[0]}.`;
        recommendedAction = 'Recommend clinical correlation with attending physician and timely therapeutic intervention.';
    } else {
        diagnosticImpression = 'Investigated parameters appear consistent with expected clinical thresholds or baseline physiological limits.';
        recommendedAction = 'Maintain routine clinical observation and follow-up as indicated by attending specialist.';
    }

    if (keyFindings.length === 0) {
        keyFindings.push(metadata.title || 'Standard clinical diagnostic investigation recorded.');
        keyFindings.push(`Specimen Category: ${metadata.reportType || 'Pathology / Diagnostic'}`);
    }

    return {
        keyFindings: keyFindings.slice(0, 5),
        abnormalFlags: abnormalFlags.length > 0 ? abnormalFlags : ['No critical out-of-range anomalies flagged'],
        diagnosticImpression,
        recommendedAction,
        aiEngine: 'Local Clinical NLP Engine (Offline Fallback)',
        analyzedAt: new Date().toISOString()
    };
}

/**
 * Hybrid Clinical AI Summarizer
 * Tries Google Gemini AI if API key is configured.
 * Automatically falls back to offline rule-based clinical NLP on any error or missing key.
 *
 * @param {string} rawText OCR text or clinical report content
 * @param {Object} metadata Report metadata (title, patient, type)
 * @returns {Promise<Object>} Structured clinical highlights
 */
async function generateClinicalHighlights(rawText, metadata = {}) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.log('[AI Summarizer] GEMINI_API_KEY not found. Running smart Offline Clinical NLP fallback.');
        return extractOfflineClinicalHighlights(rawText, metadata);
    }

    try {
        console.log('[AI Summarizer] Calling Google Gemini API for clinical document summarization...');
        const ai = new GoogleGenAI({ apiKey });

        const prompt = `You are a certified senior clinical pathologist and medical document AI specialist.
Analyze this medical investigation report text and extract a concise, structured diagnostic summary.

REPORT DETAILS:
Title: ${metadata.title || 'Diagnostic Report'}
Patient: ${metadata.patientName || 'Patient'}
Report Category: ${metadata.reportType || 'Clinical Investigation'}

RAW REPORT CONTENT / OCR SCAN:
"""
${(rawText || '').slice(0, 4000)}
"""

Return a valid JSON object matching this EXACT schema:
{
  "keyFindings": ["3 to 4 concise bullet points describing key findings, observed numbers, and test observations"],
  "abnormalFlags": ["List of out-of-range, high, low, or pathological results. If all normal, state 'No critical out-of-range anomalies flagged'"],
  "diagnosticImpression": "1 to 2 sentence overall clinical summary conclusion",
  "recommendedAction": "1 concise sentence recommending clinical follow-up or correlate"
}

Provide ONLY the valid JSON response, with no markdown code fences or conversational text.`;

        // Use gemini-3.8-flash for fast, free-tier supported structured clinical analysis
        const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
                temperature: 0.1,
                maxOutputTokens: 600
            }
        });

        const responseText = response.text || '';
        const cleanedJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedJson);

        return {
            keyFindings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings : [String(parsed.keyFindings)],
            abnormalFlags: Array.isArray(parsed.abnormalFlags) ? parsed.abnormalFlags : [String(parsed.abnormalFlags)],
            diagnosticImpression: parsed.diagnosticImpression || 'Clinical findings reviewed.',
            recommendedAction: parsed.recommendedAction || 'Correlate clinically with attending physician.',
            aiEngine: 'Google Gemini 3.8 Flash (Live Cloud AI)',
            analyzedAt: new Date().toISOString()
        };
    } catch (err) {
        console.warn('[AI Summarizer] Gemini API call error or timeout. Falling back to Offline Clinical NLP:', err.message);
        const fallback = extractOfflineClinicalHighlights(rawText, metadata);
        fallback.aiEngine = `Local Clinical NLP (Fallback: ${err.message.slice(0, 40)}...)`;
        return fallback;
    }
}

async function testGeminiApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
        throw new Error('Please provide a valid, non-empty Google Gemini API key.');
    }
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: 'ping',
        config: {
            maxOutputTokens: 5
        }
    });
    return !!response;
}

module.exports = {
    generateClinicalHighlights,
    extractOfflineClinicalHighlights,
    testGeminiApiKey
};

