import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
    res.json({
        ok: true,
        message: "File API готов",
        supported: [
            "pdf",
            "docx",
            "pptx",
            "xlsx",
            "png",
            "jpg"
        ]
    });
});

router.post("/", (req, res) => {
    res.json({
        ok: true
    });
});

export default router;
