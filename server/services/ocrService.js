const Tesseract = require("tesseract.js");
const sharp = require("sharp");

/**
 * Improve image quality before OCR
 */
async function preprocessImage(buffer) {

    return await sharp(buffer)
        .grayscale()
        .normalize()
        .sharpen()
        .png()
        .toBuffer();

}

/**
 * Extract text using Tesseract
 */
async function extractTextFromImage(buffer) {

    const processed = await preprocessImage(buffer);

    const result = await Tesseract.recognize(
        processed,
        "eng",
        {
            logger: m => {

                if (m.status === "recognizing text") {

                    console.log(
                        `OCR Progress ${Math.round(m.progress * 100)}%`
                    );

                }

            }
        }
    );

    return result.data.text;

}

module.exports = {

    extractTextFromImage

};