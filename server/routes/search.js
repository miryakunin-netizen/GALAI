const express = require("express");
const router = express.Router();

const { googleSearch } = require("../services/google");

router.post("/", async (req, res) => {

    try {

        const { query } = req.body;

        const results = await googleSearch(query);

        res.json(results);

    } catch (e) {

        console.error(e);

        res.status(500).json({
            error: e.message
        });

    }

});

module.exports = router;