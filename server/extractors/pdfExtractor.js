import pdfParse from "pdf-parse";

export async function extractPdf(buffer) {
    const data = await pdfParse(buffer);

    return {
        text: data.text,
        pages: data.numpages,
        info: data.info ?? {}
    };
}
