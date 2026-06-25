import express from "express";
import multer from "multer";
import { readFileContent } from "../services/fileReader.js";

const router = express.Router();

const upload = multer({
    dest: "uploads/"
});

router.post("/", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: "Файл не загружен"
            });
        }

        const text = await readFileContent(
            req.file.path,
            req.file.mimetype
        );

        res.json({
            filename: req.file.originalname,
            text
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: error.message
        });
    }
});

export default router;
