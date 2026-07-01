import { extractPdf } from "../extractors/pdfExtractor.js";

export async function extractDocument(file) {

    if (!file) {
        throw new Error("Файл отсутствует");
    }

    const type = file.mimetype.toLowerCase();

    if (
        type === "application/pdf" ||
        file.originalname.toLowerCase().endsWith(".pdf")
    ) {
        return await extractPdf(file.buffer);
    }

    if (
  type === "text/plain" ||
  file.originalname.toLowerCase().endsWith(".txt")
) {
  return await extractTxt(file.buffer);
}

    throw new Error(
        `Формат пока не поддерживается: ${type}`
    );

}
