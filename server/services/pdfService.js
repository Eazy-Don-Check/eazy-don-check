const pdf = require("pdf-parse");

/**
 * Extract text directly from searchable PDFs.
 * If no text exists, we'll OCR the pages later.
 */

async function extractTextFromPDF(buffer) {

    const result = await pdf(buffer);

    return result.text;

}

module.exports = {

    extractTextFromPDF

};