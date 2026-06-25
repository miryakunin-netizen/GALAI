import fs from "fs/promises";
import pdf from "pdf-parse";
import mammoth from "mammoth";
import XLSX from "xlsx";

export async function readFileContent(filePath, mimeType) {

    if (mimeType === "text/plain") {
        return await fs.readFile(filePath, "utf8");
    }

    if (mimeType === "application/pdf") {
        const buffer = await fs.readFile(filePath);
        const data = await pdf(buffer);
        return data.text;
    }

    if (
        mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
        const result = await mammoth.extractRawText({
            path: filePath,
        });

        return result.value;
    }

    if (
        mimeType ===
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        mimeType === "text/csv"
    ) {

        const workbook = XLSX.readFile(filePath);

        let text = "";

        workbook.SheetNames.forEach((name) => {

            text += `\n=== ${name} ===\n`;

            text += XLSX.utils.sheet_to_csv(workbook.Sheets[name]);

        });

        return text;
    }

    throw new Error(`Unsupported file type: ${mimeType}`);
}
