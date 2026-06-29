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
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "Файл не загружен"
      });
    }

    console.log("UPLOAD FILE:", {
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size,
      head: req.file.buffer.slice(0, 16).toString("hex")
    });

    const document = await extractDocument(req.file);

    return res.json({
      ok: true,
      file: fileInfo(req.file),
      pages: document.pages,
      text: document.text.substring(0, 1000)
    });

  } catch (e) {
    console.error("UPLOAD ERROR:", e);

    return res.status(500).json({
      ok: false,
      error: e.message || "Ошибка обработки файла"
    });
  }
});

export default router;
