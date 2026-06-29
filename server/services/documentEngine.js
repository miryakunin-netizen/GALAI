const extractors = new Map();

export function registerExtractor(mime, extractor) {
    extractors.set(mime, extractor);
}

export async function parseDocument(file) {

    if (!file) {
        throw new Error("Файл отсутствует");
    }

    const extractor =
        extractors.get(file.mimetype);

    if (!extractor) {
        throw new Error(
            `Нет обработчика для ${file.mimetype}`
        );
    }

    return await extractor(file);

}
