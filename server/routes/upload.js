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

    console.log("====== PDF DEBUG ======");
console.log("Name:", req.file.originalname);
console.log("Type:", req.file.mimetype);
console.log("Size:", req.file.size);

const head = req.file.buffer.slice(0, 20);

console.log("HEX :", head.toString("hex"));
console.log("TEXT:", head.toString("utf8"));

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
