import express from "express";

const router = express.Router();

router.post("/", async (req, res) => {
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

export default router;
