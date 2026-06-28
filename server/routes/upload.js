import express from "express";
import multer from "multer";
import { fileInfo } from "../services/fileService.js";

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 30 * 1024 * 1024
    }
});

router.post("/", upload.single("file"), async (req, res) => {

    if (!req.file) {
        return res.status(400).json({
            error: "Файл не загружен"
        });
    }

    res.json({
        ok: true,
        file: fileInfo(req.file)
    });

});

export default router;
