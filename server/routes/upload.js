import express from "express";
import multer from "multer";
import { fileInfo } from "../services/fileService.js";
import { extractDocument } from "../services/extractorService.js";

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
    
    console.log("========== FILE ==========");
console.log(req.file.originalname);
console.log(req.file.mimetype);
console.log(req.file.size);

console.log(
    req.file.buffer
        .slice(0, 16)
        .toString("hex")
);
    
const document =
    await extractDocument(req.file);
    
      res.json({
        ok: true,
        file: fileInfo(req.file),
        pages: document.pages,
        text: document.text.substring(0, 1000)
    });
});

export default router;
