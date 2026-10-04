const Tesseract = require('tesseract.js');
const path = require('path');

// Common clinical terms and keywords dictionary for categorization
const MEDICAL_KEYWORDS_MAP = {
    'Blood Sugar / Diabetes': ['blood sugar', 'glucose', 'fasting blood sugar', 'fbs', 'ppbs', 'hba1c', 'diabetes', 'insulin', 'glycemic'],
    'Hematology / CBC': ['hemoglobin', 'wbc', 'white blood cell', 'rbc', 'platelet', 'hematocrit', 'erythrocyte', 'cbc', 'anemia'],
    'Radiology / Orthopedic': ['fracture', 'x-ray', 'mri', 'ct scan', 'ultrasound', 'bone', 'lumbar', 'spine', 'joint', 'trauma', 'displacement'],
    'Cardiovascular': ['ecg', 'electrocardiogram', 'troponin', 'cholesterol', 'triglycerides', 'lipid', 'hdl', 'ldl', 'blood pressure', 'hypertension', 'arrhythmia'],
    'Renal / Kidney': ['creatinine', 'urea', 'bun', 'uric acid', 'kidney', 'renal', 'gfr', 'urine protein'],
    'Hepatic / Liver': ['bilirubin', 'sgot', 'sgpt', 'alt', 'ast', 'alkaline phosphatase', 'liver function', 'lft', 'albumin'],
    'Respiratory': ['pneumonia', 'chest x-ray', 'bronchitis', 'pulmonary', 'copd', 'asthma', 'lung'],
    'Endocrine': ['thyroid', 'tsh', 't3', 't4', 'vitamin d', 'calcium']
};

/**
 * Extracts recognized medical tags and keywords from raw clinical text
 * @param {string} rawText 
 * @returns {Array<{ category: string, keyword: string }>}
 */
function extractMedicalKeywords(rawText) {
    if (!rawText) return [];
    const textLower = rawText.toLowerCase();
    const matchedTags = new Set();
    const matchedCategories = new Set();

    for (const [category, keywords] of Object.entries(MEDICAL_KEYWORDS_MAP)) {
        for (const kw of keywords) {
            // Whole word or boundary regex
            const regex = new RegExp(`\\b${kw}\\b`, 'i');
            if (regex.test(textLower)) {
                matchedTags.add(kw.charAt(0).toUpperCase() + kw.slice(1));
                matchedCategories.add(category);
            }
        }
    }

    return {
        keywords: Array.from(matchedTags),
        categories: Array.from(matchedCategories),
        rawSnippet: rawText.slice(0, 300).trim()
    };
}

/**
 * Performs OCR on image buffer using Tesseract.js with graceful fallback
 * @param {Buffer|string} inputBufferOrPath 
 * @param {string} mimeType 
 * @param {string} [hintText] Optional hint text from doctor/lab staff notes
 * @returns {Promise<{ extractedText: string, keywords: string[], categories: string[] }>}
 */
async function processReportOCR(inputBufferOrPath, mimeType = '', hintText = '') {
    let extractedText = '';

    // If text hint was provided in metadata or user description, include it
    if (hintText) {
        extractedText += hintText + ' ';
    }

    // Try Tesseract OCR on images (PNG, JPEG, TIFF)
    const isImage = mimeType.startsWith('image/') || 
                   (typeof inputBufferOrPath === 'string' && /\.(png|jpe?g|bmp|webp)$/i.test(inputBufferOrPath));

    if (isImage) {
        try {
            // Run Tesseract with 10s timeout to prevent hanging in testing
            const ocrPromise = Tesseract.recognize(inputBufferOrPath, 'eng', {
                logger: () => {} // quiet mode
            });

            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('OCR Timeout')), 12000)
            );

            const result = await Promise.race([ocrPromise, timeoutPromise]);
            if (result && result.data && result.data.text) {
                extractedText += ' ' + result.data.text;
            }
        } catch (err) {
            console.warn('[OCR Engine] Tesseract recognition fallback:', err.message);
            // Non-fatal fallback: use text buffer strings if any
            if (Buffer.isBuffer(inputBufferOrPath)) {
                const asciiGuess = inputBufferOrPath.toString('utf8', 0, Math.min(2048, inputBufferOrPath.length));
                extractedText += ' ' + asciiGuess.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ');
            }
        }
    } else {
        // PDF or plain document stream inspection
        if (Buffer.isBuffer(inputBufferOrPath)) {
            const raw = inputBufferOrPath.toString('latin1');
            // Extract text tokens from PDF streams
            const textMatches = raw.match(/\(([^()]+)\)\s*Tj/g) || [];
            const pdfText = textMatches.map(m => m.replace(/^\(|\)\s*Tj$/g, '')).join(' ');
            extractedText += ' ' + pdfText;
        }
    }

    const { keywords, categories, rawSnippet } = extractMedicalKeywords(extractedText);

    return {
        extractedText: extractedText.trim(),
        keywords,
        categories,
        rawSnippet
    };
}

module.exports = {
    processReportOCR,
    extractMedicalKeywords,
    MEDICAL_KEYWORDS_MAP
};
