export function fileInfo(file) {
    if (!file) {
        return null;
    }

    return {
        name: file.originalname,
        size: file.size,
        type: file.mimetype,
        uploaded: new Date().toISOString()
    };
}
