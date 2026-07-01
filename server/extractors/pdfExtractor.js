import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

export async function extractPdf(buffer) {
  const uint8Array = new Uint8Array(buffer);

  const loadingTask = pdfjsLib.getDocument({
    data: uint8Array,
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true
  });

  const pdf = await loadingTask.promise;

  let text = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    const pageText = content.items
      .map(item => item.str || "")
      .join(" ");

    text += `\n\n--- Страница ${pageNumber} ---\n${pageText}`;
  }

  return {
    text: text.trim(),
    pages: pdf.numPages,
    info: {}
  };
}
