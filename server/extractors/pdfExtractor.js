import pdf from "pdf-parse";

export async function extractPdf(buffer) {
    const data = await pdf(buffer);

    return {
        text: data.text,
        pages: data.numpages,
        info: data.info
    };
}
