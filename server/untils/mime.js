export function isPdf(file) {
    return (
        file.mimetype === "application/pdf" ||
        file.originalname.toLowerCase().endsWith(".pdf")
    );
}
