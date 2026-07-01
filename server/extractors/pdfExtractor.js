import pdf from "pdf-parse";

export async function extractPdf(buffer) {

    const result = await pdf(buffer);

    return {

        text: result.text,

        pages: result.numpages,

        info: result.info

    };

}
